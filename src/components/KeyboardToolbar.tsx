import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { BlockType } from '../Types';

interface KeyboardToolbarProps {
  currentBlockType: BlockType;
  onBlockTypeChange: (type: BlockType) => void;
  onFormatText: (format: string) => void;
  onInsertText: (text: string) => void;
  onFormatStateChange?: (format: 'bold' | 'italic', isActive: boolean) => void;
  isTextStyleMode?: boolean;
  onTextStyleModeChange?: (isTextStyle: boolean) => void;
}

export const KeyboardToolbar: React.FC<KeyboardToolbarProps> = ({
  currentBlockType,
  onBlockTypeChange,
  onFormatText,
  onInsertText,
  onFormatStateChange,
  isTextStyleMode = false,
  onTextStyleModeChange,
}) => {
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);

  // 默认模式的按钮数据
  const defaultButtons = [
    { label: 'Aa', action: 'textStyle', title: '文本样式' },
    { label: '🖼️', action: 'image', title: '插入图片' },
  ];

  // 文本样式模式的按钮数据
  const textStyleButtons = [
    { label: '<<', action: 'back', title: '返回' },
    { label: '●', action: 'color', title: '颜色', color: '#ff4444' },
    { type: BlockType.PARAGRAPH, label: '正文', title: '正文' },
    { type: BlockType.H1, label: 'H1', title: '标题1' },
    { type: BlockType.H2, label: 'H2', title: '标题2' },
    { type: BlockType.H3, label: 'H3', title: '标题3' },
    { label: 'B', action: 'bold', title: '加粗', isActive: isBoldActive },
    { label: 'I', action: 'italic', title: '斜体', isActive: isItalicActive },
    { label: '∑', action: 'formula', title: '数学公式' },
  ];

  // 处理按钮点击
  const handleButtonPress = (button: any) => {
    if (button.action === 'textStyle') {
      onTextStyleModeChange?.(true);
    } else if (button.action === 'back') {
      onTextStyleModeChange?.(false);
    } else if (button.action === 'image') {
      onBlockTypeChange(BlockType.IMAGE);
    } else if (button.action === 'formula') {
      onInsertText('$$$$');
    } else if (button.action === 'bold') {
      const newBoldState = !isBoldActive;
      setIsBoldActive(newBoldState);
      onFormatStateChange?.('bold', newBoldState);
      
      if (newBoldState) {
        // 插入加粗标记
        onInsertText('****');
      } else {
        // 取消加粗，需要处理光标位置和可能删除标记
        onFormatText('bold_cancel');
      }
    } else if (button.action === 'italic') {
      const newItalicState = !isItalicActive;
      setIsItalicActive(newItalicState);
      onFormatStateChange?.('italic', newItalicState);
      
      if (newItalicState) {
        // 插入斜体标记
        onInsertText('**');
      } else {
        // 取消斜体，需要处理光标位置和可能删除标记
        onFormatText('italic_cancel');
      }
    } else if (button.action === 'color') {
      // 显示颜色选择面板
      onFormatText('show_color_picker');
    } else if (button.type) {
      // 处理块类型变化
      onBlockTypeChange(button.type);
    }
  };

  // 渲染默认模式
  const renderDefaultMode = () => (
    <View style={styles.scrollContent}>
      <View style={styles.section}>
        {defaultButtons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={styles.defaultButton}
            onPress={(event) => {
              event.stopPropagation();
              event.preventDefault();
              handleButtonPress(button);
            }}
          >
            <Text style={styles.defaultButtonText}>
              {button.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // 渲染文本样式模式
  const renderTextStyleMode = () => (
    <View style={styles.scrollContent}>
      <View style={styles.section}>
        {textStyleButtons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.textStyleButton,
              (button.type && currentBlockType === button.type) && styles.activeTextStyleButton,
              button.isActive && styles.activeTextStyleButton
            ]}
            onPress={(event) => {
              event.stopPropagation();
              event.preventDefault();
              handleButtonPress(button);
            }}
          >
            <Text style={[
              styles.textStyleButtonText,
              button.color && { color: button.color },
              (button.type && currentBlockType === button.type) && styles.activeTextStyleButtonText,
              button.isActive && styles.activeTextStyleButtonText
            ]}>
              {button.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isTextStyleMode ? renderTextStyleMode() : renderDefaultMode()}
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
    flexDirection: 'row',
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
  insertButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  insertButtonText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  defaultButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  defaultButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  textStyleButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  activeTextStyleButton: {
    backgroundColor: '#007AFF',
  },
  textStyleButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  activeTextStyleButtonText: {
    color: '#ffffff',
  },
}); 