import { Block, BlockType, NavigationProps, RootStackParamList, BlockRecord } from "../Types";
import { useState, useEffect, useRef } from "react";
import { FlatList, StyleSheet, Text, TouchableWithoutFeedback, View, Dimensions, StatusBar, Platform, TouchableOpacity, KeyboardAvoidingView, Keyboard, Alert, TextInput, Image } from "react-native";
import Markdown from "react-native-markdown-display";
import { KeyboardToolbar } from '../components/KeyboardToolbar'
import { ImageBlock } from '../components/ImageBlock'
import { ideaDB } from '../utils/IdeaDatabase';
import React from "react";

type EditorProps = NavigationProps<'Editor'>;

export default function Editor({ navigation, route }: EditorProps) {

  const { idea } = route.params;
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [originalBlockIds, setOriginalBlockIds] = useState<Set<string>>(new Set()); // 跟踪从数据库加载的原始block IDs
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  const [showKeyboardToolbar, setShowKeyboardToolbar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 创建 ref map 来持有所有 TextInput 的 ref
  const textInputRefs = useRef<Map<string, any>>(new Map());
  
  // 自动保存的引用
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedBlocksRef = useRef<string>('');
  
  // 使用ref保存最新的blocks和originalBlockIds，确保卸载时能访问到最新状态
  const currentBlocksRef = useRef<Block[]>([]);
  const currentOriginalBlockIdsRef = useRef<Set<string>>(new Set());

  // 加载数据
  useEffect(() => {
    loadBlocks();
  }, [idea.id]);

  // 页面卸载时清理和保存
  useEffect(() => {
    return () => {
      // 清理定时器
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // 最终保存
      const currentBlocks = currentBlocksRef.current;
      const currentOriginalIds = currentOriginalBlockIdsRef.current;
      
      if (currentBlocks.length > 0 || currentOriginalIds.size > 0) {
        saveDirtyBlocksWithData(currentBlocks, currentOriginalIds);
      }
    };
  }, []);

  // 同步最新状态到ref
  useEffect(() => {
    currentBlocksRef.current = blocks;
    currentOriginalBlockIdsRef.current = originalBlockIds;
  }, [blocks, originalBlockIds]);

  // 智能自动保存逻辑
  useEffect(() => {
    if (isLoading) return;

    const currentSnapshot = JSON.stringify(blocks.map(b => ({ 
      id: b.id, content: b.content, isDirty: b.isDirty 
    })));
    const hasDirtyBlocks = blocks.some(b => b.isDirty);
    const snapshotChanged = currentSnapshot !== lastSavedBlocksRef.current;
    
    // 只有在内容变化且有待保存的更改时才触发自动保存
    if (snapshotChanged && hasDirtyBlocks) {
      // 清除之前的定时器
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // 设置5秒延迟自动保存
      autoSaveTimerRef.current = setTimeout(() => {
        const latestBlocks = currentBlocksRef.current;
        const latestOriginalIds = currentOriginalBlockIdsRef.current;
        
        if (latestBlocks.length > 0) {
          saveDirtyBlocksWithData(latestBlocks, latestOriginalIds);
        } else {
          saveDirtyBlocks();
        }
      }, 5000);
    }
  }, [blocks, isLoading]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
    });
    return () => subscription?.remove();
  }, []);

  // 监听键盘显示/隐藏
  useEffect(() => {
    const showToolbar = () => setShowKeyboardToolbar(true);
    const hideToolbar = () => setShowKeyboardToolbar(false);

    const listeners = [
      Keyboard.addListener('keyboardDidShow', showToolbar),
      Keyboard.addListener('keyboardDidHide', hideToolbar),
      Keyboard.addListener('keyboardWillShow', showToolbar),
      Keyboard.addListener('keyboardWillHide', hideToolbar),
    ];

    return () => listeners.forEach(listener => listener.remove());
  }, []);

  // 监听活跃block变化，显示工具栏
  useEffect(() => {
    const hasActiveBlock = blocks.some(block => block.isActive);
    if (hasActiveBlock) {
      setShowKeyboardToolbar(true);
    }
  }, [blocks]);

  // 获取 TextInput ref 的辅助函数
  const getTextInputRef = (blockId: string) => {
    return textInputRefs.current.get(blockId);
  };

  // 设置 TextInput ref 的辅助函数
  const setTextInputRef = (blockId: string, ref: any) => {
    if (ref) {
      textInputRefs.current.set(blockId, ref);
    } else {
      textInputRefs.current.delete(blockId);
    }
  };

  // 清理已删除 block 的 ref
  useEffect(() => {
    const currentBlockIds = new Set(blocks.map(block => block.id));
    const refsToDelete: string[] = [];
    
    textInputRefs.current.forEach((_, blockId) => {
      if (!currentBlockIds.has(blockId)) {
        refsToDelete.push(blockId);
      }
    });
    
    refsToDelete.forEach(blockId => {
      textInputRefs.current.delete(blockId);
    });
  }, [blocks]);

  // 实用方法：聚焦到指定的 block
  const focusBlock = (blockId: string) => {
    const textInputRef = getTextInputRef(blockId);
    if (textInputRef) {
      textInputRef.focus();
    }
  };

  // 实用方法：失焦指定的 block
  const blurBlock = (blockId: string) => {
    const textInputRef = getTextInputRef(blockId);
    if (textInputRef) {
      textInputRef.blur();
    }
  };

  // 实用方法：设置指定 block 的光标位置
  const setCursorPosition = (blockId: string, position: number) => {
    const textInputRef = getTextInputRef(blockId);
    if (textInputRef) {
      textInputRef.setNativeProps({
        selection: { start: position, end: position }
      });
    }
  };

  // 实用方法：获取当前活跃的 TextInput ref
  const getActiveTextInputRef = () => {
    const activeBlock = blocks.find(block => block.isActive);
    return activeBlock ? getTextInputRef(activeBlock.id) : null;
  };

  // 获取当前活跃的 block
  const getActiveBlock = () => {
    return blocks.find(block => block.isActive);
  };

  // 在当前活跃block后面添加新block
  // 通用的创建新block函数，支持智能列表处理
  const createNewBlockAfterCurrent = (currentBlockContent?: string) => {
    const activeBlock = getActiveBlock();
    const currentContent = currentBlockContent || (activeBlock ? activeBlock.content : '');
    
    // 检测当前block是否是列表项
    const listPrefix = getListPrefix(currentContent);
    const newContent = listPrefix || '';
    const newCursorPosition = newContent.length;
    
    const newBlock: Block = {
      id: Date.now().toString(),
      type: BlockType.MARKDOWN,
      content: newContent,
      isActive: true,
      cursorPosition: newCursorPosition,
      isDirty: true, // 新block需要保存，包括空block（用于渲染空白行）
    };

    if (!activeBlock) {
      // 如果没有活跃block，在末尾添加
      setBlocks(prev => [
        ...prev.map(block => ({ ...block, isActive: false })),
        newBlock
      ]);
    } else {
      // 在当前活跃block后面插入新block
      const activeIndex = blocks.findIndex(block => block.id === activeBlock.id);
      setBlocks(prev => {
        const newBlocks = [...prev];
        // 将当前block设为非活跃状态
        newBlocks[activeIndex] = { ...newBlocks[activeIndex], isActive: false };
        // 在当前block后插入新block
        newBlocks.splice(activeIndex + 1, 0, newBlock);
        return newBlocks;
      });
    }

    // 延迟聚焦到新block
    setTimeout(() => {
      focusBlock(newBlock.id);
    }, 100);
  };

  // 为KeyboardToolbar提供的简化接口
  const addNewBlockAfterCurrent = () => {
    createNewBlockAfterCurrent();
  };

  // 处理block颜色变化
  const handleBlockColorChange = (color: string) => {
    const activeBlock = getActiveBlock();
    if (!activeBlock) return;

    setBlocks(prev => prev.map(block => {
      if (block.id === activeBlock.id) {
        return {
          ...block,
          color: color === '#000000' ? undefined : color, // 黑色使用默认值
          isDirty: true,
        };
      }
      return block;
    }));
  };

  // 处理图片选择
  const handleImageSelect = (imageUri: string) => {
    const activeBlock = getActiveBlock();
    if (activeBlock) {
      setBlocks(prev => prev.map(block => 
        block.id === activeBlock.id ? { 
          ...block, 
          type: BlockType.IMAGE, 
          content: imageUri,
          isDirty: true
        } : block
      ));
      
    } else {
      // 如果没有活跃block，创建新的图片block
      const newBlock: Block = {
        id: Date.now().toString(),
        type: BlockType.IMAGE,
        content: imageUri,
        isActive: false,
        cursorPosition: 0,
        isDirty: true,
      };
      
      setBlocks(prev => [
        ...prev.map(block => ({ ...block, isActive: false })),
        newBlock
      ]);
      
    }
  };

  // 立即保存函数 - 用于关键操作
  const saveImmediately = async () => {
    // 清除任何待执行的自动保存
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    
    // 立即执行保存
    await saveDirtyBlocks();
  };

  // 从数据库加载blocks
  const loadBlocks = async () => {
    try {
      setIsLoading(true);
      const blockRecords = await ideaDB.getBlocksByIdeaId(idea.id);
      
      if (blockRecords.length === 0) {
        // 如果没有数据，创建一个空的paragraph block
        const defaultBlocks = [{
          id: Date.now().toString(),
          type: BlockType.MARKDOWN,
          content: '',
          isActive: true,
          cursorPosition: 0,
          isDirty: false,
        }];
        setBlocks(defaultBlocks);
        setOriginalBlockIds(new Set());
        
        // 初始化快照
        lastSavedBlocksRef.current = JSON.stringify(defaultBlocks.map(b => ({ id: b.id, content: b.content, isDirty: b.isDirty })));
      } else {
        // 转换数据库记录为UI Block
        const uiBlocks: Block[] = blockRecords.map((record, index) => ({
          id: record.block_id,
          type: record.type,
          content: record.content,
          isActive: false,
          cursorPosition: 0,
          isDirty: false,
          color: record.color,
        }));
        
        setBlocks(uiBlocks);
        const originalIds = new Set(blockRecords.map(record => record.block_id));
        setOriginalBlockIds(originalIds);
        
        // 初始化快照
        lastSavedBlocksRef.current = JSON.stringify(uiBlocks.map(b => ({ id: b.id, content: b.content, isDirty: b.isDirty })));
      }
    } catch (error) {
      console.error('❌ Error loading blocks:', error);
      Alert.alert('加载失败', '无法加载编辑器内容，请重试');
      // 创建一个空的block作为备选
      const fallbackBlocks = [{
        id: Date.now().toString(),
        type: BlockType.MARKDOWN,
        content: '',
        isActive: true,
        cursorPosition: 0,
        isDirty: false,
      }];
      setBlocks(fallbackBlocks);
      lastSavedBlocksRef.current = JSON.stringify(fallbackBlocks.map(b => ({ id: b.id, content: b.content, isDirty: b.isDirty })));
    } finally {
      setIsLoading(false);
    }
  };

  // 统一的保存逻辑核心函数
  const performSave = async (blocksData: Block[], originalIds: Set<string>, updateState = true) => {
    
    try {
      const currentBlockIds = new Set(blocksData.map(block => block.id));
      
      // 1. 识别需要删除的blocks
      const blocksToDelete = Array.from(originalIds).filter(id => !currentBlockIds.has(id));
      
      // 2. 识别需要保存的blocks
      const blocksToSave = blocksData
        .filter(block => !originalIds.has(block.id) || block.isDirty)
        .map((block, index) => ({
          blockId: block.id,
          type: block.type,
          content: block.content,
          orderIndex: blocksData.indexOf(block),
          color: block.color,
        }));
      
      // 如果没有变更，直接返回
      if (blocksToDelete.length === 0 && blocksToSave.length === 0) {
        return;
      }

      // 3. 执行数据库操作
      for (const blockId of blocksToDelete) {
        await ideaDB.deleteBlock(idea.id, blockId);
      }

      if (blocksToSave.length > 0) {
        await ideaDB.saveDirtyBlocks(idea.id, blocksToSave);
      }
      
      // 4. 更新状态（仅在非卸载时执行）
      if (updateState) {
        setBlocks(prev => prev.map(block => ({ ...block, isDirty: false })));
        setOriginalBlockIds(new Set(blocksData.map(block => block.id)));
        lastSavedBlocksRef.current = JSON.stringify(blocksData.map(b => ({ 
          id: b.id, content: b.content, isDirty: false 
        })));
             }
    } catch (error) {
      console.error('❌ Error saving blocks:', error);
      if (updateState) {
        Alert.alert('保存失败', '无法保存编辑器内容，请检查网络连接');
      }
    }
  };

  // 使用当前状态保存
  const saveDirtyBlocks = () => performSave(blocks, originalBlockIds, true);
  
  // 使用指定数据保存（页面卸载时）
  const saveDirtyBlocksWithData = (blocksData: Block[], originalIds: Set<string>) => 
    performSave(blocksData, originalIds, false);

  // 更新当前活跃 block 的文本内容
  const updateActiveBlockText = (text: string, newCursorPosition?: number) => {
    const activeBlock = getActiveBlock();
    if (activeBlock) {
      setBlocks(prev => prev.map(block => 
        block.id === activeBlock.id ? { 
          ...block, 
          content: text,
          cursorPosition: newCursorPosition !== undefined ? newCursorPosition : block.cursorPosition,
          isDirty: true
        } : block
      ));
      
      // 如果提供了新的光标位置，直接设置到 TextInput
      if (newCursorPosition !== undefined) {
        const textInputRef = getActiveTextInputRef();
        if (textInputRef) {
          setTimeout(() => {
            textInputRef.setNativeProps({
              selection: { start: newCursorPosition, end: newCursorPosition }
            });
          }, 50);
        }
      }
    }
  };

  // 渲染MARKDOWN类型的block
  const renderMarkdownBlock = (item: Block) => {
    // 根据block的颜色创建动态样式
    const blockTextStyle = [
      styles.blockText,
      item.color && { color: item.color }
    ];

    // 为Markdown创建动态样式
    const dynamicMarkdownStyles = {
      ...markdownStyles,
      body: {
        ...markdownStyles.body,
        color: item.color || markdownStyles.body.color
      },
      paragraph: {
        ...markdownStyles.paragraph,
        color: item.color || markdownStyles.paragraph.color
      },
      em: {
        ...markdownStyles.em,
        color: item.color || markdownStyles.em.color
      },
      strong: {
        ...markdownStyles.strong,
        color: item.color || markdownStyles.strong.color
      },
      heading1: {
        ...markdownStyles.heading1,
        color: item.color || markdownStyles.heading1.color
      },
      heading2: {
        ...markdownStyles.heading2,
        color: item.color || markdownStyles.heading2.color
      },
      heading3: {
        ...markdownStyles.heading3,
        color: item.color || markdownStyles.heading3.color
      },
      heading4: {
        ...markdownStyles.heading4,
        color: item.color || markdownStyles.heading4.color
      },
      heading5: {
        ...markdownStyles.heading5,
        color: item.color || markdownStyles.heading5.color
      },
    };

    return item.isActive ? (
      <TextInput
        ref={(ref) => setTextInputRef(item.id, ref)}
        value={item.content}
        selection={item.cursorPosition ? { start: item.cursorPosition, end: item.cursorPosition } : undefined}
        onChangeText={text => {
          // Filter out newline characters to prevent unwanted line breaks from Enter key
          const filteredText = text.replace(/\n/g, '');
          setBlocks(prev => prev.map(block => block.id === item.id ? { ...block, content: filteredText, isDirty: true } : block));
        }}
        onSubmitEditing={() => {
          // 使用通用的创建新block函数
          createNewBlockAfterCurrent(item.content);
        }}
        onKeyPress={(event) => {
          // 处理backspace按键
          if (event.nativeEvent.key === 'Backspace') {
            handleBackspacePress(item);
          }
        }}
        returnKeyType="done"
        submitBehavior="submit"
        onSelectionChange={(event) => {
          const { start } = event.nativeEvent.selection;
          setBlocks(prev => prev.map(block => 
            block.id === item.id ? { ...block, cursorPosition: start } : block
          ));
        }}
        onFocus={() => {
          setBlocks(prev => prev.map(block => ({ ...block, isActive: block.id === item.id })));
        }}
        onBlur={() => {
          setBlocks(prev => prev.map(block => {
            if (block.id === item.id) {
              return { ...block, isActive: false };
            }
            return block;
          }));
          // 延迟执行清理，给其他操作时间完成
          setTimeout(() => {
            cleanupEmptyBlocks();
          }, 200);
        }}
        autoFocus={item.isActive}
        style={blockTextStyle}
        multiline={true}
      />
    ) : (
      <TouchableOpacity 
        style={styles.markdownBlock}
        onPress={() => {
          setBlocks(prev => prev.map(block => ({ ...block, isActive: block.id === item.id })));
          focusBlock(item.id);
        }}
      >
        <Markdown style={dynamicMarkdownStyles} >
          {item.content}
        </Markdown>
      </TouchableOpacity>
    );
  };

  // 渲染IMAGE类型的block
  const renderImageBlock = (item: Block) => {
    const handleDeleteImage = () => {
      setBlocks(prev => prev.map(block => 
        block.id === item.id ? { 
          ...block, 
          type: BlockType.MARKDOWN, 
          content: '', 
          isDirty: true 
        } : block
      ));
    };

    return (
      <ImageBlock 
        uri={item.content} 
        onDelete={handleDeleteImage} 
      />
    );
  };

  // 主渲染函数，根据BlockType分发到不同的渲染函数
  const renderBlock = ({ item }: { item: Block }) => {
    switch (item.type) {
      case BlockType.MARKDOWN:
        return renderMarkdownBlock(item);
      case BlockType.IMAGE:
        return renderImageBlock(item);
      default:
        return renderMarkdownBlock(item); // 默认使用markdown渲染
    }
  };


  // 渲染列表底部的空白区域 - 占据剩余所有空间
  const renderFooterComponent = () => {
    return (
      <TouchableWithoutFeedback onPress={handleEmptyAreaPress}>
        <View style={[styles.footerSpace, { height: screenHeight }]} />
      </TouchableWithoutFeedback>
    );
  };
  
  const isEmptyBlock = (block: Block) => {
    return block.type === BlockType.MARKDOWN && block.content === '';
  }

  const handleEmptyAreaPress = () => {
    setBlocks(prev => {
      if (prev.length === 0 || prev[prev.length - 1].type !== BlockType.MARKDOWN || !isEmptyBlock(prev[prev.length - 1])) {
        return [...prev.map(block => ({ ...block, isActive: false })), {
          id: Date.now().toString(), // 使用时间戳生成唯一ID
          type: BlockType.MARKDOWN,
          content: '',
          isActive: true,
          cursorPosition: 0,
          isDirty: true, // 新创建的block需要保存，包括空block（用于渲染空白行）
        }];
      }
      return prev.map((block, idx) => ({ ...block, isActive: idx === prev.length - 1 }));
    });
  }

  const getCurrentBlockType = () => {
    const activeBlock = blocks.find(block => block.isActive);
    return activeBlock ? activeBlock.type : BlockType.MARKDOWN;
  }

  // 优化的列表前缀检测函数
  const getListPrefix = (text: string): string | null => {
    const trimmedText = text.trim();
    
    // 如果文本为空，不返回任何前缀
    if (!trimmedText) return null;
    
    // 检测无序列表 (- 或 * 或 + 开头，后跟空格)
    const unorderedMatch = trimmedText.match(/^([-*+])\s+/);
    if (unorderedMatch) {
      return `${unorderedMatch[1]} `;
    }
    
    // 检测有序列表 (数字. 开头，后跟空格)
    const orderedMatch = trimmedText.match(/^(\d+)\.\s+/);
    if (orderedMatch) {
      const currentNumber = parseInt(orderedMatch[1], 10);
      const nextNumber = currentNumber + 1;
      return `${nextNumber}. `;
    }
    
    // 检测任务列表 (- [ ] 或 - [x] 格式)
    const taskMatch = trimmedText.match(/^([-*+])\s+\[[x\s]\]\s+/i);
    if (taskMatch) {
      return `${taskMatch[1]} [ ] `;
    }
    
    return null;
  }

  // 处理backspace按键逻辑
  const handleBackspacePress = (currentBlock: Block) => {
    // 如果只有一个block，不删除
    if (blocks.length <= 1) return;
    
    // 如果当前block为空，则删除它
    if (currentBlock.content === '') {
      const currentIndex = blocks.findIndex(block => block.id === currentBlock.id);
      
      setBlocks(prev => {
        const newBlocks = [...prev];
        newBlocks.splice(currentIndex, 1);
        
        // 标记相邻block为dirty以触发自动保存
        const targetIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        if (targetIndex < newBlocks.length) {
          newBlocks[targetIndex] = { 
            ...newBlocks[targetIndex], 
            isActive: true,
            isDirty: true
          };
        }
        
        // 聚焦到相邻block
        setTimeout(() => {
          const targetBlock = newBlocks[targetIndex];
          focusBlock(targetBlock.id);
          
          // 如果是聚焦到前一个block，光标移到末尾
          if (currentIndex > 0) {
            setTimeout(() => {
              const textInputRef = getTextInputRef(targetBlock.id);
              if (textInputRef && targetBlock.content) {
                textInputRef.setNativeProps({
                  selection: { start: targetBlock.content.length, end: targetBlock.content.length }
                });
              }
            }, 50);
          }
        }, 100);
        
        return newBlocks;
      });
    }
  }

  // 清理空block的函数 - 当用户停止编辑时自动清理多余的空block
  const cleanupEmptyBlocks = () => {
    setBlocks(prev => {
      const nonEmptyBlocks = [];
      let lastEmptyIndex = -1;
      
      // 找出所有非空blocks和最后一个空block的位置
      for (let i = 0; i < prev.length; i++) {
        const block = prev[i];
        if (block.content.trim() === '') {
          lastEmptyIndex = i;
        } else {
          nonEmptyBlocks.push(block);
        }
      }
      
      const originalLength = prev.length;
      
      // 如果所有blocks都为空，保留最后一个
      if (nonEmptyBlocks.length === 0 && prev.length > 0) {
        return [prev[prev.length - 1]];
      }
      
      // 保留最后一个空block或创建新的空block
      if (lastEmptyIndex === prev.length - 1) {
        nonEmptyBlocks.push(prev[lastEmptyIndex]);
      } else if (nonEmptyBlocks.length > 0) {
        const lastBlock = nonEmptyBlocks[nonEmptyBlocks.length - 1];
        if (lastBlock.content.trim() !== '') {
          nonEmptyBlocks.push({
            id: Date.now().toString(),
            type: BlockType.MARKDOWN,
            content: '',
            isActive: false,
            cursorPosition: 0,
            isDirty: true,
          });
        }
      }
      
      // 如果删除了blocks，标记一个block为dirty以触发自动保存
      if (nonEmptyBlocks.length < originalLength && nonEmptyBlocks.length > 0) {
        const lastIndex = nonEmptyBlocks.length - 1;
        nonEmptyBlocks[lastIndex] = {
          ...nonEmptyBlocks[lastIndex],
          isDirty: true
        };
      }
      
      return nonEmptyBlocks;
    });
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <Text style={styles.headerText}>{idea.hint}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <Text style={styles.headerText}>{idea.hint}</Text>
      </View>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -10 : 0}
      >
        <FlatList
          data={blocks}
          renderItem={renderBlock}
          keyExtractor={(item) => item.id}
          style={styles.flatList}
          contentContainerStyle={styles.flatListContent}
          scrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={renderFooterComponent}
          showsVerticalScrollIndicator={false}
        />
        {showKeyboardToolbar && (
          <KeyboardToolbar
            textInputRef={getActiveTextInputRef()}
            currentText={getActiveBlock()?.content || ''}
            onTextChange={updateActiveBlockText}
            cursorPosition={getActiveBlock()?.cursorPosition || 0}
            onAddNewBlock={addNewBlockAfterCurrent}
            onImageSelect={handleImageSelect}
            onBlockColorChange={handleBlockColorChange}
            currentBlockColor={getActiveBlock()?.color}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  )
}

const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 1,
    color: '#333333',
  },
  heading1: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 1,
    lineHeight: 30,
  },
  heading2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 1,
    lineHeight: 26,
  },
  heading3: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 0,
    lineHeight: 22,
  },
  heading4: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 0,
    lineHeight: 20,
  },
  heading5: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 0,
    lineHeight: 18,
  },
  paragraph: {
    marginBottom: 0,
    color: '#333333',
  },
  bullet_list: {
    marginBottom: 0,
  },
  list_item: {
    marginBottom: 0,
  },
  strong: {
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
  },
  em: {
    fontStyle: 'italic' as const,
    color: '#333333',
  },
};

// 自定义渲染规则来处理颜色语法 [text](color:value)
const markdownRules = {
  link: (node: any, children: any, parent: any, styles: any) => {
    // 检查是否是颜色链接语法
    if (node.attributes && node.attributes.href && node.attributes.href.startsWith('color:')) {
      const colorValue = node.attributes.href.substring(6); // 移除 'color:' 前缀
      console.log('colorValue', colorValue);
      return (
        <Text key={node.key} style={{ color: 'red'}}>
          {children}
        </Text>
      );
    }
    
    // 普通链接的默认处理
    return (
      <Text key={node.key} style={styles.link}>
        {children}
      </Text>
    );
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    textAlign: 'center' as const,
  },
  flatList: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  flatListContent: {
    flexGrow: 1,
    paddingTop: 4,
  },
  blockText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 16,
    color: '#333333',
    minHeight: 32,
  },
  markdownBlock: {
    marginHorizontal: 16,
    minHeight: 32,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: 'center',
  },
  footerSpace: {
    width: '100%',
    minHeight: 200,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center' as const,
  },

});