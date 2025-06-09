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
  isActive: boolean;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  onContentChange,
  onAddBlock,
  onFocus,
  onBlur,
  isActive,
}) => {

  const inputRef = useRef<TextInput>(null);

  // 当isActive变化时，控制输入框焦点
  useEffect(() => {
    if (isActive && inputRef.current && block.type !== BlockType.IMAGE) {
      inputRef.current.focus();
    }
  }, [isActive, block.type]);

  // 处理文本变化
  const handleTextChange = (text: string) => {
    onContentChange(block.id, text);
  };

  // 处理输入框聚焦
  const handleFocus = () => {
    console.log('🎯 BlockEditor focus:', block.id);
    onFocus(block.id);
  };

  // 处理输入框失焦
  const handleBlur = () => {
    console.log('🎯 BlockEditor blur:', block.id);
    onBlur(block.id);
  };



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

    return (
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          block.type.startsWith('h') && styles.headingInput,
          isActive && styles.activeInput,
        ]}
        value={block.content}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={`输入${getBlockTypeName(block.type)}...`}
        multiline={block.type === BlockType.PARAGRAPH}
        returnKeyType="done"
        blurOnSubmit={true}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.blockRow}>
        {/* 加号按钮 */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddBlock}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>

        {/* 输入区域 */}
        {renderInputArea()}
      </View>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
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
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minHeight: 40,
    backgroundColor: '#fff',
  },
  headingInput: {
    fontWeight: 'bold',
  },
  activeInput: {
    borderColor: '#007AFF',
    borderWidth: 2,
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