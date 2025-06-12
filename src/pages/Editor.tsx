import { Block, BlockType, NavigationProps, RootStackParamList, BlockRecord } from "../Types";
import { useState, useEffect, useRef } from "react";
import { FlatList, StyleSheet, Text, TouchableWithoutFeedback, View, Dimensions, StatusBar, Platform, TouchableOpacity, KeyboardAvoidingView, Keyboard, Alert, TextInput } from "react-native";
import Markdown from "react-native-markdown-display";
import { KeyboardToolbar } from '../components/KeyboardToolbar'
import { ideaDB } from '../utils/IdeaDatabase';
import React from "react";

type EditorProps = NavigationProps<'Editor'>;

export default function Editor({ navigation, route }: EditorProps) {

  const { idea } = route.params;
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [originalBlockIds, setOriginalBlockIds] = useState<Set<string>>(new Set()); // 跟踪从数据库加载的原始block IDs
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  const [showKeyboardToolbar, setShowKeyboardToolbar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  // 页面卸载时保存数据
  useEffect(() => {
    return () => {
      console.log('🚪 Page unloading, performing final save');
      // 清理自动保存定时器
      if (autoSaveTimerRef.current) {
        console.log('🧹 Clearing auto-save timer on unmount');
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // 页面卸载时执行最后一次保存 - 使用ref中的最新状态
      console.log('💾 Calling saveDirtyBlocks on unmount with ref data');
      const currentBlocks = currentBlocksRef.current;
      const currentOriginalIds = currentOriginalBlockIdsRef.current;
      
      console.log('🔍 Unmount blocks count:', currentBlocks.length);
      console.log('🔍 Unmount originalBlockIds count:', currentOriginalIds.size);
      
      if (currentBlocks.length > 0 || currentOriginalIds.size > 0) {
        saveDirtyBlocksWithData(currentBlocks, currentOriginalIds);
      }
    };
  }, []);

  // 同步最新状态到ref
  useEffect(() => {
    currentBlocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    currentOriginalBlockIdsRef.current = originalBlockIds;
  }, [originalBlockIds]);

  // 优化的自动保存 - 只在实际有变更时触发
  useEffect(() => {
    console.log('🔄 Auto-save effect triggered, isLoading:', isLoading, 'blocks count:', blocks.length);
    
    if (!isLoading) {
      // 创建blocks的快照用于比较
      const currentSnapshot = JSON.stringify(blocks.map(b => ({ id: b.id, content: b.content, isDirty: b.isDirty })));
      const hasDirtyBlocks = blocks.some(b => b.isDirty);
      const snapshotChanged = currentSnapshot !== lastSavedBlocksRef.current;
      
      console.log('📸 Current snapshot:', currentSnapshot);
      console.log('📸 Last saved snapshot:', lastSavedBlocksRef.current);
      console.log('🔍 Has dirty blocks:', hasDirtyBlocks);
      console.log('🔍 Snapshot changed:', snapshotChanged);
      
      // 只有在blocks真正变化且有dirty标记时才设置自动保存
      if (snapshotChanged && hasDirtyBlocks) {
        console.log('⏰ Setting up auto-save timer (5 seconds)');
        
        // 清除之前的定时器
        if (autoSaveTimerRef.current) {
          console.log('🧹 Clearing previous auto-save timer');
          clearTimeout(autoSaveTimerRef.current);
        }
        
        // 设置新的定时器 - 缩短到5秒以提供更好的用户体验
        autoSaveTimerRef.current = setTimeout(() => {
          console.log('⏰ Auto-save timer triggered, calling saveDirtyBlocks');
          // 使用当前ref中的最新数据，确保能获取到最新状态
          const latestBlocks = currentBlocksRef.current;
          const latestOriginalIds = currentOriginalBlockIdsRef.current;
          console.log('⏰ Using latest data - blocks count:', latestBlocks.length, 'originalIds count:', latestOriginalIds.size);
          
          if (latestBlocks.length > 0) {
            saveDirtyBlocksWithData(latestBlocks, latestOriginalIds);
          } else {
            console.log('⚠️ No blocks available for auto-save, falling back to regular save');
            saveDirtyBlocks();
          }
        }, 5000);
      } else {
        console.log('❌ Auto-save not triggered - snapshotChanged:', snapshotChanged, 'hasDirtyBlocks:', hasDirtyBlocks);
      }
    }
  }, [blocks, isLoading]); // 移除saveDirtyBlocks依赖以避免循环

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
    });
    return () => subscription?.remove();
  }, []);

  // 监听键盘显示/隐藏
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      console.log('键盘显示', e);
      setShowKeyboardToolbar(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', (e) => {
      console.log('键盘隐藏', e);
      setShowKeyboardToolbar(false);
    });

    // 也监听 TextInput 的 focus 和 blur 事件作为备选方案
    const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', (e) => {
      console.log('键盘即将显示', e);
      setShowKeyboardToolbar(true);
    });
    const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', (e) => {
      console.log('键盘即将隐藏', e);
      setShowKeyboardToolbar(false);
    });

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // 监听活跃 block 变化，如果有活跃 block 则显示工具栏
  useEffect(() => {
    const hasActiveBlock = blocks.some(block => block.isActive);
    console.log('活跃 block 状态:', hasActiveBlock);
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
      type: BlockType.PARAGRAPH,
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
    console.log('📥 Loading blocks for idea:', idea.id);
    try {
      setIsLoading(true);
      const blockRecords = await ideaDB.getBlocksByIdeaId(idea.id);
      console.log('📥 Loaded block records from DB:', blockRecords.map(r => ({
        block_id: r.block_id,
        content: r.content.substring(0, 20) + (r.content.length > 20 ? '...' : ''),
        type: r.type,
        order_index: r.order_index
      })));
      
      if (blockRecords.length === 0) {
        console.log('📭 No blocks found, creating default empty block');
        // 如果没有数据，创建一个空的paragraph block
        const defaultBlocks = [{
          id: Date.now().toString(),
          type: BlockType.PARAGRAPH,
          content: '',
          isActive: true,
          cursorPosition: 0,
          isDirty: false,
        }];
        setBlocks(defaultBlocks);
        setOriginalBlockIds(new Set());
        
        // 初始化快照
        lastSavedBlocksRef.current = JSON.stringify(defaultBlocks.map(b => ({ id: b.id, content: b.content, isDirty: b.isDirty })));
        console.log('📸 Initial snapshot for empty blocks:', lastSavedBlocksRef.current);
      } else {
        // 转换数据库记录为UI Block
        const uiBlocks: Block[] = blockRecords.map((record, index) => ({
          id: record.block_id,
          type: record.type,
          content: record.content,
          isActive: false,
          cursorPosition: 0,
          isDirty: false,
        }));
        console.log('🔄 Converted to UI blocks:', uiBlocks.map(b => ({
          id: b.id,
          content: b.content.substring(0, 20) + (b.content.length > 20 ? '...' : ''),
          type: b.type,
          isDirty: b.isDirty
        })));
        
        setBlocks(uiBlocks);
        const originalIds = new Set(blockRecords.map(record => record.block_id));
        setOriginalBlockIds(originalIds);
        console.log('📊 Set originalBlockIds:', Array.from(originalIds));
        
        // 初始化快照
        lastSavedBlocksRef.current = JSON.stringify(uiBlocks.map(b => ({ id: b.id, content: b.content, isDirty: b.isDirty })));
        console.log('📸 Initial snapshot for loaded blocks:', lastSavedBlocksRef.current);
      }
    } catch (error) {
      console.error('❌ Error loading blocks:', error);
      Alert.alert('加载失败', '无法加载编辑器内容，请重试');
      // 创建一个空的block作为备选
      const fallbackBlocks = [{
        id: Date.now().toString(),
        type: BlockType.PARAGRAPH,
        content: '',
        isActive: true,
        cursorPosition: 0,
        isDirty: false,
      }];
      setBlocks(fallbackBlocks);
      lastSavedBlocksRef.current = JSON.stringify(fallbackBlocks.map(b => ({ id: b.id, content: b.content, isDirty: b.isDirty })));
    } finally {
      setIsLoading(false);
      console.log('📥 loadBlocks completed, isLoading set to false');
    }
  };

  // 使用指定数据保存blocks（用于页面卸载时）
  const saveDirtyBlocksWithData = async (blocksData: Block[], originalIds: Set<string>) => {
    console.log('💾 saveDirtyBlocksWithData called with specific data');
    console.log('📊 Blocks data:', blocksData.map(b => ({
      id: b.id,
      content: b.content.substring(0, 20) + (b.content.length > 20 ? '...' : ''),
      isDirty: b.isDirty,
      type: b.type
    })));
    console.log('📊 Original IDs:', Array.from(originalIds));
    
    try {
      const currentBlockIds = new Set(blocksData.map(block => block.id));
      
      // 1. 识别需要删除的blocks (在原始列表中但不在当前列表中)
      const blocksToDelete = Array.from(originalIds).filter(id => !currentBlockIds.has(id));
      
      // 2. 识别需要新增或更新的blocks
      const blocksToSave = blocksData
        .filter(block => {
          // 新block或者dirty block需要保存
          const isNew = !originalIds.has(block.id);
          const isDirty = block.isDirty;
          console.log(`🔍 Block ${block.id}: isNew=${isNew}, isDirty=${isDirty}, content="${block.content.substring(0, 20)}..."`);
          return isNew || isDirty;
        })
        .map((block, index) => ({
          blockId: block.id,
          type: block.type,
          content: block.content,
          orderIndex: blocksData.indexOf(block), // 使用在数组中的位置作为顺序
        }));
      
      console.log('🗑️ Blocks to delete:', blocksToDelete);
      console.log('💾 Blocks to save:', blocksToSave.map(b => ({
        id: b.blockId,
        content: b.content.substring(0, 20) + (b.content.length > 20 ? '...' : ''),
        type: b.type,
        orderIndex: b.orderIndex
      })));
      
      // 如果没有任何变更，直接返回
      if (blocksToDelete.length === 0 && blocksToSave.length === 0) {
        console.log('❌ No changes to save, returning early');
        return;
      }

      console.log(`🔄 Saving changes: ${blocksToSave.length} to save, ${blocksToDelete.length} to delete`);

      // 3. 执行删除操作
      for (const blockId of blocksToDelete) {
        console.log(`🗑️ Deleting block: ${blockId}`);
        await ideaDB.deleteBlock(idea.id, blockId);
      }

      // 4. 执行新增/更新操作
      if (blocksToSave.length > 0) {
        console.log(`💾 Saving ${blocksToSave.length} blocks to database`);
        await ideaDB.saveDirtyBlocks(idea.id, blocksToSave);
      }

      console.log(`✅ Successfully saved changes for idea ${idea.id} (unmount)`);

    } catch (error) {
      console.error('❌ Error saving blocks on unmount:', error);
    }
  };

  // 保存需要保存的blocks
  const saveDirtyBlocks = async () => {
    console.log('💾 saveDirtyBlocks called');
    console.log('📊 Current blocks state:', blocks.map(b => ({
      id: b.id,
      content: b.content.substring(0, 20) + (b.content.length > 20 ? '...' : ''),
      isDirty: b.isDirty,
      type: b.type
    })));
    console.log('📊 Original block IDs:', Array.from(originalBlockIds));
    
    try {
      const currentBlockIds = new Set(blocks.map(block => block.id));
      
      // 1. 识别需要删除的blocks (在原始列表中但不在当前列表中)
      const blocksToDelete = Array.from(originalBlockIds).filter(id => !currentBlockIds.has(id));
      
      // 2. 识别需要新增或更新的blocks
      const blocksToSave = blocks
        .filter(block => {
          // 新block或者dirty block需要保存
          const isNew = !originalBlockIds.has(block.id);
          const isDirty = block.isDirty;
          console.log(`🔍 Block ${block.id}: isNew=${isNew}, isDirty=${isDirty}, content="${block.content.substring(0, 20)}..."`);
          return isNew || isDirty;
        })
        .map((block, index) => ({
          blockId: block.id,
          type: block.type,
          content: block.content,
          orderIndex: blocks.indexOf(block), // 使用在数组中的位置作为顺序
        }));
      
      console.log('🗑️ Blocks to delete:', blocksToDelete);
      console.log('💾 Blocks to save:', blocksToSave.map(b => ({
        id: b.blockId,
        content: b.content.substring(0, 20) + (b.content.length > 20 ? '...' : ''),
        type: b.type,
        orderIndex: b.orderIndex
      })));
      
      // 如果没有任何变更，直接返回
      if (blocksToDelete.length === 0 && blocksToSave.length === 0) {
        console.log('❌ No changes to save, returning early');
        return;
      }

      console.log(`🔄 Saving changes: ${blocksToSave.length} to save, ${blocksToDelete.length} to delete`);

      // 3. 执行删除操作
      for (const blockId of blocksToDelete) {
        console.log(`🗑️ Deleting block: ${blockId}`);
        await ideaDB.deleteBlock(idea.id, blockId);
      }

      // 4. 执行新增/更新操作
      if (blocksToSave.length > 0) {
        console.log(`💾 Saving ${blocksToSave.length} blocks to database`);
        await ideaDB.saveDirtyBlocks(idea.id, blocksToSave);
      }
      
      // 5. 更新状态：清除isDirty标记，更新originalBlockIds
      console.log('🧹 Clearing isDirty flags and updating originalBlockIds');
      setBlocks(prev => prev.map(block => ({
        ...block,
        isDirty: false
      })));
      
      const newOriginalBlockIds = new Set(blocks.map(block => block.id));
      setOriginalBlockIds(newOriginalBlockIds);
      console.log('📊 Updated originalBlockIds:', Array.from(newOriginalBlockIds));
      
      // 6. 更新lastSavedBlocks快照
      const newSnapshot = JSON.stringify(blocks.map(b => ({ id: b.id, content: b.content, isDirty: false })));
      lastSavedBlocksRef.current = newSnapshot;
      console.log('📸 Updated snapshot:', newSnapshot);

      console.log(`✅ Successfully saved changes for idea ${idea.id}`);

    } catch (error) {
      console.error('❌ Error saving blocks:', error);
      Alert.alert('保存失败', '无法保存编辑器内容，请检查网络连接');
    }
  };

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

  const renderBlock = ({ item }: { item: Block }) => {
    return (
      item.isActive ? (
        <TextInput
          ref={(ref) => setTextInputRef(item.id, ref)}
          value={item.content}
          selection={ item.cursorPosition ? { start: item.cursorPosition, end: item.cursorPosition } : undefined }
          onChangeText={text => {
            // Filter out newline characters to prevent unwanted line breaks from Enter key
            const filteredText = text.replace(/\n/g, '');
            console.log(`✏️ Text changed for block ${item.id}: "${filteredText}" (isDirty: true)`);
            setBlocks(prev => prev.map(block => block.id === item.id ? { ...block, content: filteredText, isDirty: true } : block));
          }}
          onSubmitEditing={() => {
            console.log('onSubmitEditing');
            // 使用通用的创建新block函数
            createNewBlockAfterCurrent(item.content);
          }}
          onKeyPress={(event) => {
            // 处理backspace按键
            if (event.nativeEvent.key === 'Backspace') {
              handleBackspacePress(item);
            }
          }}
          // blurOnSubmit={false}
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
          style={styles.blockText}
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
            <Markdown style={markdownStyles} rules={markdownRules}>
              {item.content}
            </Markdown>
        </TouchableOpacity>
      )
    );
  }


  // 渲染列表底部的空白区域 - 占据剩余所有空间
  const renderFooterComponent = () => {
    return (
      <TouchableWithoutFeedback onPress={handleEmptyAreaPress}>
        <View style={[styles.footerSpace, { height: screenHeight }]} />
      </TouchableWithoutFeedback>
    );
  };
  
  const isEmptyBlock = (block: Block) => {
    return block.type === BlockType.PARAGRAPH && block.content === '';
  }

  const handleEmptyAreaPress = () => {
    setBlocks(prev => {
      if (prev.length === 0 || prev[prev.length - 1].type !== BlockType.PARAGRAPH || !isEmptyBlock(prev[prev.length - 1])) {
        return [...prev.map(block => ({ ...block, isActive: false })), {
          id: Date.now().toString(), // 使用时间戳生成唯一ID
          type: BlockType.PARAGRAPH,
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
    return activeBlock ? activeBlock.type : BlockType.PARAGRAPH;
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
    // 如果当前block为空且不是唯一的block，则删除它
    if (currentBlock.content === '' && blocks.length > 1) {
      console.log(`🗑️ Deleting empty block ${currentBlock.id} via backspace`);
      const currentIndex = blocks.findIndex(block => block.id === currentBlock.id);
      
      setBlocks(prev => {
        const newBlocks = [...prev];
        // 删除当前block - 这将自动触发auto-save逻辑来处理数据库删除
        newBlocks.splice(currentIndex, 1);
        
        // 标记一个现存的block为dirty以触发自动保存
        let targetIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        if (targetIndex < newBlocks.length) {
          newBlocks[targetIndex] = { 
            ...newBlocks[targetIndex], 
            isActive: true,
            isDirty: true // 关键：标记为dirty以触发自动保存
          };
          console.log(`🗑️ Marked block ${newBlocks[targetIndex].id} as dirty after deletion`);
        }
        
        // 如果不是第一个block，聚焦到前一个block
        if (currentIndex > 0) {
          // 延迟聚焦到前一个block的末尾
          setTimeout(() => {
            const prevBlock = newBlocks[currentIndex - 1];
            focusBlock(prevBlock.id);
            // 设置光标到文本末尾
            setTimeout(() => {
              const textInputRef = getTextInputRef(prevBlock.id);
              if (textInputRef && prevBlock.content) {
                textInputRef.setNativeProps({
                  selection: { start: prevBlock.content.length, end: prevBlock.content.length }
                });
              }
            }, 50);
          }, 100);
        } else {
          // 如果是第一个block被删除，聚焦到新的第一个block
          setTimeout(() => {
            focusBlock(newBlocks[0].id);
          }, 100);
        }
        
        return newBlocks;
      });
    }
  }

  // 清理空block的函数 - 当用户停止编辑时自动清理多余的空block
  const cleanupEmptyBlocks = () => {
    setBlocks(prev => {
      console.log('🧹 cleanupEmptyBlocks called, current blocks:', prev.length);
      
      // 保留至少一个block，移除连续的空block（保留最后一个）
      const nonEmptyBlocks = [];
      let lastEmptyIndex = -1;
      let hasChanges = false;
      
      for (let i = 0; i < prev.length; i++) {
        const block = prev[i];
        if (block.content.trim() === '') {
          lastEmptyIndex = i;
        } else {
          nonEmptyBlocks.push(block);
          lastEmptyIndex = -1;
        }
      }
      
      // 检测是否有blocks被删除
      const originalLength = prev.length;
      
      // 如果所有blocks都为空，保留最后一个
      if (nonEmptyBlocks.length === 0 && prev.length > 0) {
        console.log('🧹 All blocks empty, keeping last one');
        return [prev[prev.length - 1]];
      }
      
      // 如果有非空blocks，在末尾保留一个空block方便编辑
      if (lastEmptyIndex === prev.length - 1) {
        nonEmptyBlocks.push(prev[lastEmptyIndex]);
      } else if (nonEmptyBlocks.length > 0) {
        // 确保末尾有一个空block
        const lastBlock = nonEmptyBlocks[nonEmptyBlocks.length - 1];
        if (lastBlock.content.trim() !== '') {
          nonEmptyBlocks.push({
            id: Date.now().toString(),
            type: BlockType.PARAGRAPH,
            content: '',
            isActive: false,
            cursorPosition: 0,
            isDirty: true,
          });
          hasChanges = true;
        }
      }
      
      // 检测是否有变化（删除了blocks）
      if (nonEmptyBlocks.length < originalLength) {
        hasChanges = true;
        console.log(`🧹 Removed ${originalLength - nonEmptyBlocks.length} empty blocks`);
        
        // 为了触发自动保存，我们需要标记一个现存的block为dirty
        // 这样系统就知道有变更需要保存（包括删除的blocks）
        if (nonEmptyBlocks.length > 0) {
          const lastBlock = nonEmptyBlocks[nonEmptyBlocks.length - 1];
          nonEmptyBlocks[nonEmptyBlocks.length - 1] = {
            ...lastBlock,
            isDirty: true // 标记为dirty以触发自动保存
          };
          console.log(`🧹 Marked block ${lastBlock.id} as dirty to trigger save`);
        }
      }
      
      console.log('🧹 Cleanup result:', {
        originalLength,
        newLength: nonEmptyBlocks.length,
        hasChanges
      });
      
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
          />
        )}
      </KeyboardAvoidingView>
    </View>
  )
}

const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 26,
    paddingVertical: 2,
    color: '#333333',
  },
  heading1: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 2,
    lineHeight: 32,
  },
  heading2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 2,
    lineHeight: 28,
  },
  heading3: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 1,
    lineHeight: 24,
  },
  heading4: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 1,
    lineHeight: 22,
  },
  heading5: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginBottom: 0,
    lineHeight: 20,
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
      return (
        <Text key={node.key} style={{ color: colorValue }}>
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
    paddingTop: 8,
  },
  blockText: {
    fontSize: 16,
    lineHeight: 26,
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginHorizontal: 16,
    color: '#333333',
    minHeight: 40,
  },
  markdownBlock: {
    marginHorizontal: 16,
    minHeight: 40, // 与 blockText 的 minHeight 保持一致
    paddingHorizontal: 6, // 与 blockText 的 paddingHorizontal 保持一致
    paddingVertical: 6, // 与 blockText 的 paddingVertical 保持一致
    justifyContent: 'center', // 当内容较少时垂直居中
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