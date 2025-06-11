import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Block, BlockType } from '../Types';
import { 
  getBlockTypeIcon, 
  getBlockTypeName,
  getAllBlockTypes,
} from '../utils/BlockTypeUtils';

interface BlockEditorProps {
  block: Block;
  onContentChange: (blockId: string, content: string) => void;
  onAddBlock: (blockId: string) => void;
  onFocus: (blockId: string) => void;
  onBlur: (blockId: string) => void;
  onEnterPress: (blockId: string) => void;
  onFormatAction?: (action: 'bold' | 'italic', isActivating: boolean) => void;
  isActive: boolean;
  cursorPosition?: number;
  onCursorPositionSet?: () => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  onContentChange,
  onAddBlock,
  onFocus,
  onBlur,
  onEnterPress,
  onFormatAction,
  isActive,
  cursorPosition,
  onCursorPositionSet,
}) => {

  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);

  // 当isActive变化时，控制输入框焦点
  useEffect(() => {
    if (isActive && inputRef.current && block.type !== BlockType.IMAGE) {
      // 延迟focus，避免与其他操作冲突
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isActive, block.type]);

  // 处理光标位置设置
  useEffect(() => {
    if (cursorPosition !== undefined && isActive) {
      console.log('🎯 Setting cursor position:', {
        blockId: block.id,
        cursorPosition,
        currentContent: block.content,
        isActive,
        hasInputRef: !!inputRef.current
      });
      
      // 方法1: 使用selection state
      setSelection({ start: cursorPosition, end: cursorPosition });
      
      // 方法2: 也尝试setNativeProps作为备用
      setTimeout(() => {
        if (inputRef.current) {
          console.log('🎯 Applying cursor position with setNativeProps');
          try {
            inputRef.current.setNativeProps({
              selection: { start: cursorPosition, end: cursorPosition }
            });
            console.log('🎯 setNativeProps applied successfully');
          } catch (error) {
            console.error('🎯 Error applying setNativeProps:', error);
          }
        } else {
          console.log('🎯 inputRef.current is null when trying to set cursor');
        }
      }, 50);
      
      // 清理光标位置状态
      setTimeout(() => {
        onCursorPositionSet?.();
      }, 200);
    }
  }, [cursorPosition, isActive, onCursorPositionSet, block.id, block.content]);

  // 处理文本变化
  const handleTextChange = (text: string) => {
    console.log('🔄 Text changed:', { blockId: block.id, text, hasNewline: text.includes('\n') });
    
    // 检测是否包含换行符（回车）
    if (text.includes('\n')) {
      console.log('↩️ Enter detected, creating new block');
      // 移除换行符
      const cleanText = text.replace('\n', '');
      onContentChange(block.id, cleanText);
      // 触发插入新block
      onEnterPress(block.id);
    } else {
      onContentChange(block.id, text);
    }
  };

  // 处理输入框聚焦
  const handleFocus = () => {
    console.log('🎯 BlockEditor focus:', block.id);
    onFocus(block.id);
  };

  // 处理输入框失焦
  const handleBlur = () => {
    console.log('🎯 BlockEditor blur:', block.id);
    // 暂时移除onBlur调用，避免焦点管理冲突
    // onBlur(block.id);
  };

  // 渲染markdown文本
  const renderMarkdownContent = () => {
    if (isActive) {
      // 编辑状态，显示原始markdown
      return null;
    }

    // 显示状态，渲染markdown
    let content = block.content;
    
    // 处理标题
    if (content.startsWith('### ')) {
      return <Text style={[styles.h3Text]}>{content.replace('### ', '')}</Text>;
    } else if (content.startsWith('## ')) {
      return <Text style={[styles.h2Text]}>{content.replace('## ', '')}</Text>;
    } else if (content.startsWith('# ')) {
      return <Text style={[styles.h1Text]}>{content.replace('# ', '')}</Text>;
    }
    
    // 处理加粗和斜体
    const parts = content.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|<color:#[0-9a-fA-F]{6}>.*?<\/color>)/);
    
    return (
      <Text style={styles.renderedText}>
        {parts.map((part, index) => {
          if (part.startsWith('***') && part.endsWith('***')) {
            return (
              <Text key={index} style={[styles.boldText, styles.italicText]}>
                {part.slice(3, -3)}
              </Text>
            );
          } else if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={index} style={styles.boldText}>
                {part.slice(2, -2)}
              </Text>
            );
          } else if (part.startsWith('*') && part.endsWith('*')) {
            return (
              <Text key={index} style={styles.italicText}>
                {part.slice(1, -1)}
              </Text>
            );
          } else if (part.startsWith('<color:') && part.endsWith('</color>')) {
            // 解析颜色标记
            const colorMatch = part.match(/<color:(#[0-9a-fA-F]{6})>(.*?)<\/color>/);
            if (colorMatch) {
              const [, color, text] = colorMatch;
              return (
                <Text key={index} style={{ color }}>
                  {text}
                </Text>
              );
            }
          }
          return part;
        })}
      </Text>
    );
  };

  // 处理回车键提交
  const handleSubmitEditing = () => {
    console.log('↩️ Submit editing (Enter pressed):', block.id);
    onEnterPress(block.id);
  };

  // 当接收到格式化操作请求时
  React.useEffect(() => {
    if (onFormatAction && isActive) {
      // 这里只是一个占位，实际的光标控制比较复杂
      // 暂时先实现简单的在末尾插入功能
    }
  }, [onFormatAction, isActive]);



  // 处理添加新block
  const handleAddBlock = () => {
    onAddBlock(block.id);
  };

  // 处理图片选择
  const handleImageSelect = () => {
    Alert.alert('选择图片', '图片选择功能待实现', [
      {
        text: '输入URL',
        onPress: () => {
          Alert.prompt('图片URL', '请输入图片链接', (url) => {
            if (url) {
              onContentChange(block.id, url);
            }
          });
        },
      },
      { text: '取消', style: 'cancel' },
    ]);
  };



  // 渲染输入区域（根据类型决定是输入框还是图片选择器）
  const renderInputArea = () => {
    if (block.type === BlockType.IMAGE) {
      return (
        <TouchableOpacity
          style={styles.imageSelector}
          onPress={handleImageSelect}
        >
          <Text style={styles.imageSelectorText}>
            {block.content ? '更换图片' : '选择图片'}
          </Text>
          {block.content && (
            <Text style={styles.imageUrl} numberOfLines={1}>
              {block.content}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    // 如果不是活跃状态且有内容，显示渲染后的markdown
    if (!isActive && block.content.trim() !== '') {
      return (
        <TouchableOpacity
          style={[styles.renderedContainer]}
          onPress={handleFocus}
          activeOpacity={0.7}
        >
          {renderMarkdownContent()}
        </TouchableOpacity>
      );
    }

    // 活跃状态或空内容，显示输入框
    return (
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          isActive && styles.activeInput,
        ]}
        value={block.content}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmitEditing}
        placeholder={`输入${getBlockTypeName(block.type)}...`}
        multiline={false}
        returnKeyType="done"
        blurOnSubmit={false}
        selection={selection}
        onSelectionChange={(event) => {
          // 当用户手动改变选择时，清除我们设置的selection
          if (selection && event.nativeEvent.selection.start !== selection.start) {
            setSelection(undefined);
          }
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.blockRow}>
        {/* 输入区域 */}
        {renderInputArea()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addButton: {
    width: 24,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addButtonText: {
    fontSize: 32,
    color: '#999',
    fontWeight: 'normal',
  },

  input: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 32,
    backgroundColor: 'transparent',
    textAlignVertical: 'top',
    includeFontPadding: false,
  },
  activeInput: {
    backgroundColor: '#f8f9fa',
  },
  renderedContainer: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 4,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  renderedText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    includeFontPadding: false,
  },
  h1Text: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
    color: '#333',
  },
  h2Text: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
    color: '#333',
  },
  h3Text: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 28,
    color: '#333',
  },
  imageSelector: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    minHeight: 40,
  },
  imageSelectorText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  imageUrl: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

}); 