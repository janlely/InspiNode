import { Block, BlockType, NavigationProps, RootStackParamList } from "../Types";
import { useState, useEffect, useRef } from "react";
import { FlatList, StyleSheet, Text, TouchableWithoutFeedback, View, Dimensions, StatusBar, Platform, TouchableOpacity, KeyboardAvoidingView, Keyboard } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import Markdown from "react-native-markdown-display";
import { KeyboardToolbar } from '../components/KeyboardToolbar'
import React from "react";

type EditorProps = NavigationProps<'Editor'>;

export default function Editor({ navigation, route }: EditorProps) {

  const { idea } = route.params;
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);
  const [showKeyboardToolbar, setShowKeyboardToolbar] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // 创建 ref map 来持有所有 TextInput 的 ref
  const textInputRefs = useRef<Map<string, any>>(new Map());

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

  // 更新当前活跃 block 的文本内容
  const updateActiveBlockText = (text: string, newCursorPosition?: number) => {
    const activeBlock = getActiveBlock();
    if (activeBlock) {
      setBlocks(prev => prev.map(block => 
        block.id === activeBlock.id ? { 
          ...block, 
          content: text,
          cursorPosition: newCursorPosition !== undefined ? newCursorPosition : block.cursorPosition
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
            setBlocks(prev => prev.map(block => block.id === item.id ? { ...block, content: text } : block));
          }}
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
        }];
      }
      return prev.map((block, idx) => ({ ...block, isActive: idx === prev.length - 1 }));
    });
  }

  const getCurrentBlockType = () => {
    const activeBlock = blocks.find(block => block.isActive);
    return activeBlock ? activeBlock.type : BlockType.PARAGRAPH;
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
    paddingHorizontal: 6,
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
});