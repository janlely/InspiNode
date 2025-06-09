import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { BlockType } from '../Types';
import { getBlockTypeIcon, getBlockTypeName } from '../utils/BlockTypeUtils';

interface KeyboardToolbarProps {
  currentBlockType: BlockType;
  onBlockTypeChange: (type: BlockType) => void;
  onFormatText: (format: string) => void;
  onInsertText: (text: string) => void;
}

export const KeyboardToolbar: React.FC<KeyboardToolbarProps> = ({
  currentBlockType,
  onBlockTypeChange,
  onFormatText,
  onInsertText,
}) => {
  // 块类型按钮数据
  const blockTypes = [
    BlockType.PARAGRAPH,
    BlockType.H1,
    BlockType.H2,
    BlockType.H3,
    BlockType.H4,
    BlockType.H5,
    BlockType.H6,
    BlockType.IMAGE,
  ];

  // 格式化按钮数据
  const formatButtons = [
    { label: 'B', format: '**', title: '加粗' },
    { label: 'I', format: '*', title: '斜体' },
    { label: '~~', format: '~~', title: '删除线' },
    { label: '`', format: '`', title: '行内代码' },
    { label: '[]', format: 'link', title: '链接' },
    { label: 'f(x)', format: '$$', title: '数学公式' },
    { label: '```', format: '```', title: '代码块' },
  ];

  // 处理格式化按钮
  const handleFormatPress = (format: string) => {
    if (format === 'link') {
      onInsertText('[](url)');
    } else if (format === '```') {
      onInsertText('\n```\n\n```\n');
    } else if (format === '$$') {
      onInsertText('$$$$');
    } else {
      onFormatText(format);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 块类型选择区域 */}
        <View style={styles.section}>
          {blockTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.blockTypeButton,
                currentBlockType === type && styles.activeBlockTypeButton
              ]}
              onPress={(event) => {
                event.stopPropagation();
                event.preventDefault();
                onBlockTypeChange(type);
              }}
            >
              <Text style={[
                styles.blockTypeButtonText,
                currentBlockType === type && styles.activeBlockTypeButtonText
              ]}>
                {getBlockTypeIcon(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 分隔线 */}
        <View style={styles.separator} />

        {/* 格式化按钮区域 */}
        <View style={styles.section}>
          {formatButtons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={styles.formatButton}
              onPress={(event) => {
                event.stopPropagation?.();
                event.preventDefault?.();
                handleFormatPress(button.format);
              }}
            >
              <Text style={styles.formatButtonText}>
                {button.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#dee2e6',
    marginHorizontal: 12,
  },
  blockTypeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  activeBlockTypeButton: {
    backgroundColor: '#007AFF',
  },
  blockTypeButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  activeBlockTypeButtonText: {
    color: '#ffffff',
  },
  formatButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  formatButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
}); 