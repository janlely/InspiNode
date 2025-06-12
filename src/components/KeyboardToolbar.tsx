import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import Feather from '@react-native-vector-icons/feather';

export interface KeyboardToolbarProps {
  textInputRef: TextInput | null; // TextInput 引用
  currentText?: string; // 当前文本内容
  onTextChange?: (text: string, newCursorPosition?: number) => void; // 文本变化回调，包含新光标位置
  cursorPosition?: number; // 当前光标位置
}

// 常用颜色配置
const COLORS = [
  { name: '黑色', value: '#000000', isDefault: true },
  { name: '红色', value: '#dc3545' },
  { name: '蓝色', value: '#007bff' },
  { name: '绿色', value: '#28a745' },
  { name: '橙色', value: '#fd7e14' },
  { name: '紫色', value: '#6f42c1' },
  { name: '粉色', value: '#e83e8c' },
  { name: '灰色', value: '#6c757d' },
];

export const KeyboardToolbar: React.FC<KeyboardToolbarProps> = ({
  textInputRef,
  currentText = '',
  onTextChange,
  cursorPosition = 0,
}) => {

  const [showColorPanel, setShowColorPanel] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]); // 默认黑色

  const handleHeaderPress = (level: number) => {
    if (!textInputRef || !onTextChange) return;
    
    const headerPrefix = '#'.repeat(level) + ' ';
    
    let newText: string;
    let characterChange: number; // 文本长度的变化
    
    // 检查当前文本是否已经是标题
    const isCurrentlyHeader = currentText.match(/^#+\s/);
    
    if (isCurrentlyHeader) {
      // 已经是标题，替换标题级别
      const oldHeaderPrefix = isCurrentlyHeader[0]; // 例如 "## "
      newText = currentText.replace(/^#+\s/, headerPrefix);
      
      // 计算字符变化：新前缀长度 - 旧前缀长度
      // 正数表示增加字符，负数表示减少字符
      characterChange = headerPrefix.length - oldHeaderPrefix.length;
    } else {
      // 不是标题，在开头添加标题前缀
      newText = headerPrefix + currentText;
      
      // 计算字符变化：增加了标题前缀的长度
      characterChange = headerPrefix.length; // 总是正数，表示增加字符
    }
    
    // 光标位置变化：
    // - 增加字符（characterChange > 0）→ 光标位置增加（向右移动）
    // - 减少字符（characterChange < 0）→ 光标位置减少（向左移动）
    const newCursorPosition = cursorPosition + characterChange;
    
    // 确保光标位置在有效范围内
    const finalCursorPosition = Math.max(0, Math.min(newCursorPosition, newText.length));
    
    console.log('标题处理:', {
      原文本: currentText,
      新文本: newText,
      原光标位置: cursorPosition,
      字符变化: characterChange,
      新光标位置: finalCursorPosition
    });
    
    onTextChange(newText, finalCursorPosition);
  };

  const handleBoldPress = () => {
    if (!textInputRef || !onTextChange) return;
    
    const boldMarker = '****';
    const beforeCursor = currentText.substring(0, cursorPosition);
    const afterCursor = currentText.substring(cursorPosition);
    
    const newText = beforeCursor + boldMarker + afterCursor;
    const newCursorPosition = cursorPosition + 2; // 移动到第一个 ** 后面，第二个 ** 前面（中间位置）
    
    console.log('加粗处理:', {
      原文本: currentText,
      新文本: newText,
      原光标位置: cursorPosition,
      新光标位置: newCursorPosition
    });
    
    onTextChange(newText, newCursorPosition);
  };

  const handleItalicPress = () => {
    if (!textInputRef || !onTextChange) return;
    
    const italicMarker = '**';
    const beforeCursor = currentText.substring(0, cursorPosition);
    const afterCursor = currentText.substring(cursorPosition);
    
    const newText = beforeCursor + italicMarker + afterCursor;
    const newCursorPosition = cursorPosition + 1; // 移动到第一个 * 后面，第二个 * 前面（中间位置）
    
    console.log('斜体处理:', {
      原文本: currentText,
      新文本: newText,
      原光标位置: cursorPosition,
      新光标位置: newCursorPosition
    });
    
    onTextChange(newText, newCursorPosition);
  };

  const handleParagraphPress = () => {
    if (!textInputRef || !onTextChange) return;
    
    // 检查当前文本是否是标题
    const isCurrentlyHeader = currentText.match(/^#+\s/);
    
    if (isCurrentlyHeader) {
      // 是标题，移除标题前缀转换为正文
      const headerPrefix = isCurrentlyHeader[0]; // 例如 "## "
      const newText = currentText.replace(/^#+\s/, '');
      
      // 计算字符变化：减少了标题前缀的长度
      const characterChange = -headerPrefix.length;
      
      let newCursorPosition: number;
      if (cursorPosition <= headerPrefix.length) {
        // 光标在标题前缀内，移动到文本开头
        newCursorPosition = 0;
      } else {
        // 光标在标题内容中，向前移动标题前缀的长度
        newCursorPosition = cursorPosition + characterChange;
      }
      
      // 确保光标位置在有效范围内
      const finalCursorPosition = Math.max(0, Math.min(newCursorPosition, newText.length));
      
      console.log('正文处理:', {
        原文本: currentText,
        新文本: newText,
        原光标位置: cursorPosition,
        字符变化: characterChange,
        新光标位置: finalCursorPosition
      });
      
      onTextChange(newText, finalCursorPosition);
    } else {
      // 已经是正文，无需改变
      console.log('已经是正文，无需改变');
    }
  };

  const handleListPress = () => {
    if (!textInputRef || !onTextChange) return;
    
    const listPrefix = '- ';
    let newText: string;
    let characterChange: number;
    
    // 检查当前文本是否已经是列表项
    const isCurrentlyList = currentText.match(/^-\s/);
    
    if (isCurrentlyList) {
      // 已经是列表，移除列表前缀转换为正文
      newText = currentText.replace(/^-\s/, '');
      characterChange = -listPrefix.length;
    } else {
      // 检查是否是标题，如果是先移除标题前缀
      const isCurrentlyHeader = currentText.match(/^#+\s/);
      
      if (isCurrentlyHeader) {
        // 是标题，移除标题前缀后添加列表前缀
        const headerPrefix = isCurrentlyHeader[0];
        const contentWithoutHeader = currentText.replace(/^#+\s/, '');
        newText = listPrefix + contentWithoutHeader;
        characterChange = listPrefix.length - headerPrefix.length;
      } else {
        // 不是标题也不是列表，在开头添加列表前缀
        newText = listPrefix + currentText;
        characterChange = listPrefix.length;
      }
    }
    
    // 光标位置变化
    let newCursorPosition: number;
    if (!isCurrentlyList && cursorPosition <= (currentText.match(/^#+\s/)?.[0]?.length || 0)) {
      // 如果光标在标题前缀内，移动到列表前缀后
      newCursorPosition = listPrefix.length;
    } else {
      newCursorPosition = cursorPosition + characterChange;
    }
    
    // 确保光标位置在有效范围内
    const finalCursorPosition = Math.max(0, Math.min(newCursorPosition, newText.length));
    
    console.log('列表处理:', {
      原文本: currentText,
      新文本: newText,
      原光标位置: cursorPosition,
      字符变化: characterChange,
      新光标位置: finalCursorPosition
    });
    
    onTextChange(newText, finalCursorPosition);
  };

  const handleColorButtonPress = () => {
    setShowColorPanel(!showColorPanel);
  };

  const handleColorSelect = (color: typeof COLORS[0]) => {
    if (!textInputRef || !onTextChange) return;

    setSelectedColor(color);

    const beforeCursor = currentText.substring(0, cursorPosition);
    const afterCursor = currentText.substring(cursorPosition);
    
    // 使用封闭的颜色标记语法：[文本](color:颜色值)
    if (!color.isDefault) {
      // 插入颜色标记，光标放在方括号内
      const colorMarker = `[](color:${color.value})`;
      const newText = beforeCursor + colorMarker + afterCursor;
      const newCursorPosition = cursorPosition + 1; // 光标放在第一个方括号内
      
      onTextChange(newText, newCursorPosition);
    }
    // 如果选择黑色（默认色），不添加任何标记

    console.log('颜色选择:', {
      选择颜色: color.name,
      原文本: currentText,
      光标位置: cursorPosition
    });
  };

  return (
    <View style={styles.container}>
      {/* 颜色面板 */}
      {showColorPanel && (
        <View style={styles.colorPanel}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.colorPanelContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
            {COLORS.map((color, index) => (
              <TouchableOpacity 
                key={index}
                style={[styles.colorButton, { backgroundColor: color.value }]}
                onPress={() => handleColorSelect(color)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* 主工具栏 */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
        nestedScrollEnabled={false}
        keyboardDismissMode="none"
      >
        {/* 标题按钮 */}
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleHeaderPress(1)}
        >
          <FontAwesome5 name="heading" size={18} color="#6f42c1" iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleHeaderPress(2)}
        >
          <FontAwesome5 name="heading" size={16} color="#6f42c1" iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleHeaderPress(3)}
        >
          <FontAwesome5 name="heading" size={14} color="#6f42c1" iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleHeaderPress(4)}
        >
          <FontAwesome5 name="heading" size={12} color="#6f42c1" iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleHeaderPress(5)}
        >
          <FontAwesome5 name="heading" size={10} color="#6f42c1" iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleParagraphPress}
        >
          <FontAwesome5 name="align-left" size={14} color="#6c757d" iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleListPress}
        >
          <Feather name="list" size={16} color="#28a745" />
        </TouchableOpacity>

        {/* 分隔线 */}
        <View style={styles.separator} />

        {/* 格式化按钮 */}
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleBoldPress}
        >
          <FontAwesome5 name="bold" size={14} color="#dc3545" iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleItalicPress}
        >
          <FontAwesome5 name="italic" size={14} color="#fd7e14" iconStyle="solid" />
        </TouchableOpacity>

        {/* 颜色按钮 */}
        <TouchableOpacity 
          style={[
            styles.button, 
            showColorPanel && styles.activeButton
          ]} 
          onPress={handleColorButtonPress}
        >
          <View style={[styles.colorIndicator, { backgroundColor: selectedColor.value }]} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingVertical: 0,
    marginBottom: -1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  button: {
    width: 40,
    height: 40,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
  headerText: {
    fontSize: 12,
    color: '#6f42c1',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#dc3545',
  },
  italicText: {
    fontStyle: 'italic',
    color: '#fd7e14',
  },
  paragraphText: {
    fontSize: 12,
    color: '#6c757d',
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: '#dee2e6',
    marginHorizontal: 8,
  },
  colorPanel: {
    backgroundColor: '#f1f3f4',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingVertical: 8,
  },
  colorPanelContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  colorButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  activeButton: {
    backgroundColor: '#e9ecef',
    borderColor: '#007bff',
  },
  listText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: 'bold',
    lineHeight: 12,
    textAlign: 'center',
  },
}); 