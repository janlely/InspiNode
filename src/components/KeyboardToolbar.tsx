import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Platform, PermissionsAndroid } from 'react-native';
import FontAwesome5 from '@react-native-vector-icons/fontawesome5';
import Feather from '@react-native-vector-icons/feather';
import { useTranslation } from 'react-i18next';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { useTheme } from '../hooks/useTheme';

export interface KeyboardToolbarProps {
  textInputRef: TextInput | null; // TextInput 引用
  currentText?: string; // 当前文本内容
  onTextChange?: (text: string, newCursorPosition?: number) => void; // 文本变化回调，包含新光标位置
  cursorPosition?: number; // 当前光标位置
  onAddNewBlock?: () => void; // 添加新block的回调
  onImageSelect?: (imageUri: string) => void; // 图片选择回调
  onBlockColorChange?: (color: string) => void; // 添加block颜色变化回调
  currentBlockColor?: string; // 当前block的颜色
}

const getColors = (t: any) => [
  { name: t('colors.default'), color: '#333333' },
  { name: t('colors.red'), color: '#ff4444' },
  { name: t('colors.orange'), color: '#ff8800' },
  { name: t('colors.yellow'), color: '#ffcc00' },
  { name: t('colors.green'), color: '#44aa44' },
  { name: t('colors.blue'), color: '#4488ff' },
  { name: t('colors.purple'), color: '#8844ff' },
  { name: t('colors.pink'), color: '#ff44aa' },
];

export const KeyboardToolbar: React.FC<KeyboardToolbarProps> = ({
  textInputRef,
  currentText = '',
  onTextChange,
  cursorPosition = 0,
  onAddNewBlock,
  onImageSelect,
  onBlockColorChange,
  currentBlockColor,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [showColorPanel, setShowColorPanel] = useState(false);
  
  const COLORS = getColors(t);
  
  const getSelectedColor = () => {
    return COLORS.find(color => color.color === currentBlockColor) || COLORS[0];
  };
  
  const selectedColor = getSelectedColor();

  const handleHeaderPress = (level: number) => {
    if (!textInputRef || !onTextChange) return;
    
    const currentPosition = cursorPosition;
    const textBefore = currentText.substring(0, currentPosition);
    const textAfter = currentText.substring(currentPosition);

    // 检查是否在行首
    const isAtLineStart = currentPosition === 0 || currentText[currentPosition - 1] === '\n';
    
    let prefix = '';
    if (isAtLineStart) {
      prefix = '#'.repeat(level) + ' ';
    } else {
      // 如果不在行首，先换行
      prefix = '\n' + '#'.repeat(level) + ' ';
    }
    
    const newText = textBefore + prefix + textAfter;
    const newPosition = currentPosition + prefix.length;
    
    if (onTextChange) {
      onTextChange(newText, newPosition);
    }
    
    // 手动设置光标位置
    setTimeout(() => {
      if (textInputRef && textInputRef.setNativeProps) {
        textInputRef.setNativeProps({
          selection: { start: newPosition, end: newPosition }
        });
      }
    }, 0);
  };

  const handleBoldPress = () => {
    if (!textInputRef || !onTextChange) return;
    
    const currentPosition = cursorPosition;
    const textBefore = currentText.substring(0, currentPosition);
    const textAfter = currentText.substring(currentPosition);
    
    const boldMarker = '**';
    const newText = textBefore + boldMarker + boldMarker + textAfter;
    const newPosition = currentPosition + boldMarker.length;
    
    onTextChange(newText, newPosition);
  };

  const handleItalicPress = () => {
    if (!textInputRef || !onTextChange) return;
    
    const currentPosition = cursorPosition;
    const textBefore = currentText.substring(0, currentPosition);
    const textAfter = currentText.substring(currentPosition);
    
    const italicMarker = '*';
    const newText = textBefore + italicMarker + italicMarker + textAfter;
    const newPosition = currentPosition + italicMarker.length;
    
    onTextChange(newText, newPosition);
  };

  const handleParagraphPress = () => {
    if (!textInputRef || !onTextChange) return;
    
    const currentPosition = cursorPosition;
    const textBefore = currentText.substring(0, currentPosition);
    const textAfter = currentText.substring(currentPosition);

    // 检查是否在行首
    const isAtLineStart = currentPosition === 0 || currentText[currentPosition - 1] === '\n';
    
    let newLineText = '';
    if (isAtLineStart) {
      newLineText = '\n';
    } else {
      newLineText = '\n\n';
    }
    
    const newText = textBefore + newLineText + textAfter;
    const newPosition = currentPosition + newLineText.length;
    
    if (onTextChange) {
      onTextChange(newText, newPosition);
    }
    
    // 手动设置光标位置
    setTimeout(() => {
      if (textInputRef && textInputRef.setNativeProps) {
        textInputRef.setNativeProps({
          selection: { start: newPosition, end: newPosition }
        });
      }
    }, 0);
  };

  const handleListPress = () => {
    if (!textInputRef || !onTextChange) return;
    
    const currentPosition = cursorPosition;
    const textBefore = currentText.substring(0, currentPosition);
    const textAfter = currentText.substring(currentPosition);

    // 检查是否在行首
    const isAtLineStart = currentPosition === 0 || currentText[currentPosition - 1] === '\n';
    
    let prefix = '';
    if (isAtLineStart) {
      prefix = '• ';
    } else {
      // 如果不在行首，先换行
      prefix = '\n• ';
    }
    
    const newText = textBefore + prefix + textAfter;
    const newPosition = currentPosition + prefix.length;
    
    if (onTextChange) {
      onTextChange(newText, newPosition);
    }
    
    // 手动设置光标位置
    setTimeout(() => {
      if (textInputRef && textInputRef.setNativeProps) {
        textInputRef.setNativeProps({
          selection: { start: newPosition, end: newPosition }
        });
      }
    }, 0);
  };

  const handleColorButtonPress = () => {
    setShowColorPanel(!showColorPanel);
  };

  const handleColorSelect = (color: typeof COLORS[0]) => {
    if (onBlockColorChange) {
      onBlockColorChange(color.color);
    }
    setShowColorPanel(false);
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      return true; // iOS不需要特殊权限
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: '存储权限',
          message: '应用需要访问您的存储来选择图片',
          buttonNeutral: '稍后询问',
          buttonNegative: '取消',
          buttonPositive: '确定',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const copyImageToLocalStorage = async (sourceUri: string): Promise<string> => {
    try {
      // 创建目标文件夹
      const destDir = `${RNFS.DocumentDirectoryPath}/images`;
      await RNFS.mkdir(destDir);

      // 生成文件名
      const timestamp = Date.now();
      const destPath = `${destDir}/image_${timestamp}.jpg`;

      // 复制文件
      await RNFS.copyFile(sourceUri, destPath);
      

      return `file://${destPath}`;
    } catch (error) {
      console.error('复制图片失败:', error);
      throw new Error('保存图片失败');
    }
  };

  // 处理图片选择
  const handleImageSelect = async () => {
    try {
      // 检查权限
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(t('errors.insufficientPermissions'), t('errors.needCameraPermission'));
        return;
      }

      // 配置图片选择器选项
      const options = {
        mediaType: 'photo' as MediaType,
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
        quality: 0.8 as const,
      };

      // 启动图片选择器
      launchImageLibrary(options, async (response: ImagePickerResponse) => {
        if (response.didCancel) {
          return;
        }

        if (response.errorMessage) {
          console.error('图片选择错误:', response.errorMessage);
          Alert.alert(t('errors.imageSelectionFailed'), t('errors.imageSelectionFailedRetry'));
          return;
        }

        if (response.assets && response.assets.length > 0) {
          const selectedImage = response.assets[0];
          if (selectedImage.uri) {
            try {
              // 复制图片到本地存储
              const localImageUri = await copyImageToLocalStorage(selectedImage.uri);
              
              // 调用回调函数，通知父组件
              if (onImageSelect) {
                onImageSelect(localImageUri);
              }
              

            } catch (error) {
              console.error('处理图片失败:', error);
              Alert.alert(t('errors.imageProcessingFailed'), t('errors.imageProcessingFailedRetry'));
            }
          }
        }
      });
    } catch (error) {
      console.error('启动图片选择器失败:', error);
      Alert.alert(t('errors.imageSelectionFailed'), t('errors.cannotStartImagePicker'));
    }
  };

  // 动态颜色定义
  const dynamicColors = {
    primary: theme.buttons.primary,
    secondary: theme.texts.secondary,
    success: theme.buttons.success,
    danger: theme.buttons.danger,
    warning: '#fd7e14',
    info: '#17a2b8',
    purple: '#6f42c1',
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.backgrounds.toolbar,
        borderTopColor: theme.borders.primary,
      }
    ]}>
      {/* 颜色面板 */}
      {showColorPanel && (
        <View style={[
          styles.colorPanel,
          {
            backgroundColor: theme.backgrounds.tertiary,
            borderTopColor: theme.borders.secondary,
            borderBottomColor: theme.borders.secondary,
          }
        ]}>
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
                style={[
                  styles.colorButton, 
                  { 
                    backgroundColor: color.color,
                    borderColor: theme.backgrounds.secondary
                  }
                ]}
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
        {/* Plus按钮 - 添加新block */}
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.plusButton,
            {
              backgroundColor: theme.special.highlight,
              borderColor: dynamicColors.primary,
            }
          ]} 
          onPress={onAddNewBlock}
        >
          <FontAwesome5 name="plus" size={16} color={dynamicColors.primary} iconStyle="solid" />
        </TouchableOpacity>

        {/* 分隔线 */}
        <View style={[styles.separator, { backgroundColor: theme.borders.secondary }]} />

        {/* 标题按钮 */}
        <TouchableOpacity 
          style={[
            styles.button,
            {
              backgroundColor: theme.backgrounds.secondary,
              borderColor: theme.borders.secondary,
            }
          ]} 
          onPress={() => handleHeaderPress(1)}
        >
          <FontAwesome5 name="heading" size={18} color={dynamicColors.purple} iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.button,
            {
              backgroundColor: theme.backgrounds.secondary,
              borderColor: theme.borders.secondary,
            }
          ]} 
          onPress={() => handleHeaderPress(2)}
        >
          <FontAwesome5 name="heading" size={16} color={dynamicColors.purple} iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.button,
            {
              backgroundColor: theme.backgrounds.secondary,
              borderColor: theme.borders.secondary,
            }
          ]} 
          onPress={() => handleHeaderPress(3)}
        >
          <FontAwesome5 name="heading" size={14} color={dynamicColors.purple} iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.button,
            {
              backgroundColor: theme.backgrounds.secondary,
              borderColor: theme.borders.secondary,
            }
          ]} 
          onPress={() => handleHeaderPress(4)}
        >
          <FontAwesome5 name="heading" size={12} color={dynamicColors.purple} iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.button,
            {
              backgroundColor: theme.backgrounds.secondary,
              borderColor: theme.borders.secondary,
            }
          ]} 
          onPress={() => handleHeaderPress(5)}
        >
          <FontAwesome5 name="heading" size={10} color={dynamicColors.purple} iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.button,
            {
              backgroundColor: theme.backgrounds.secondary,
              borderColor: theme.borders.secondary,
            }
          ]} 
          onPress={handleParagraphPress}
        >
          <FontAwesome5 name="align-left" size={14} color={dynamicColors.secondary} iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.button,
            {
              backgroundColor: theme.backgrounds.secondary,
              borderColor: theme.borders.secondary,
            }
          ]} 
          onPress={handleListPress}
        >
          <Feather name="list" size={16} color={dynamicColors.success} />
        </TouchableOpacity>

        {/* 分隔线 */}
        <View style={[styles.separator, { backgroundColor: theme.borders.secondary }]} />

        {/* 格式化按钮 */}
        <TouchableOpacity 
          style={[
            styles.button,
            {
              backgroundColor: theme.backgrounds.secondary,
              borderColor: theme.borders.secondary,
            }
          ]} 
          onPress={handleBoldPress}
        >
          <FontAwesome5 name="bold" size={14} color={dynamicColors.danger} iconStyle="solid" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.button,
            {
              backgroundColor: theme.backgrounds.secondary,
              borderColor: theme.borders.secondary,
            }
          ]} 
          onPress={handleItalicPress}
        >
          <FontAwesome5 name="italic" size={14} color={dynamicColors.warning} iconStyle="solid" />
        </TouchableOpacity>

        {/* 颜色按钮 */}
        <TouchableOpacity 
          style={[
            styles.button,
            {
              backgroundColor: theme.backgrounds.secondary,
              borderColor: theme.borders.secondary,
            },
            showColorPanel && {
              backgroundColor: theme.backgrounds.tertiary,
              borderColor: dynamicColors.primary,
            }
          ]} 
          onPress={handleColorButtonPress}
        >
          <View style={[
            styles.colorIndicator, 
            { 
              backgroundColor: selectedColor.color,
              borderColor: theme.borders.secondary
            }
          ]} />
        </TouchableOpacity>

        {/* 分隔线 */}
        <View style={[styles.separator, { backgroundColor: theme.borders.secondary }]} />

        {/* 图片选择按钮 */}
        <TouchableOpacity 
          style={[
            styles.button,
            {
              backgroundColor: theme.backgrounds.secondary,
              borderColor: theme.borders.secondary,
            }
          ]} 
          onPress={handleImageSelect}
        >
          <FontAwesome5 name="image" size={16} color={dynamicColors.info} iconStyle="solid" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
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
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    width: 1,
    height: 20,
    marginHorizontal: 8,
  },
  colorPanel: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  plusButton: {
    // 特殊样式将通过动态样式应用
  },
}); 