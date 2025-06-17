import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, THEME_TYPES } from '../theme';

/**
 * 主题Hook - 提供当前主题配置和主题相关功能
 * @returns {Object} 包含当前主题、主题类型和工具函数的对象
 */
export const useTheme = () => {
  // 获取系统色彩方案
  const systemColorScheme = useColorScheme();

  // 根据系统设置确定当前主题类型
  const themeType = systemColorScheme === 'dark' ? THEME_TYPES.DARK : THEME_TYPES.LIGHT;

  // 获取当前主题配置
  const theme = useMemo(() => {
    return themeType === THEME_TYPES.DARK ? darkTheme : lightTheme;
  }, [themeType]);

  // 判断是否为暗色主题
  const isDark = themeType === THEME_TYPES.DARK;

  // 判断是否为亮色主题
  const isLight = themeType === THEME_TYPES.LIGHT;

  // 获取主题相关的样式辅助函数
  const getThemedStyle = useMemo(() => ({
    // 获取容器样式
    container: (customStyle = {}) => ({
      backgroundColor: theme.backgrounds.primary,
      ...customStyle
    }),

    // 获取卡片样式
    card: (customStyle = {}) => ({
      backgroundColor: theme.backgrounds.secondary,
      borderColor: theme.borders.card,
      shadowColor: theme.special.shadow,
      ...customStyle
    }),

    // 获取文本样式
    text: (type = 'primary', customStyle = {}) => ({
      color: theme.texts[type] || theme.texts.primary,
      ...customStyle
    }),

    // 获取按钮样式
    button: (type = 'primary', customStyle = {}) => ({
      backgroundColor: theme.buttons[type] || theme.buttons.primary,
      ...customStyle
    }),

    // 获取边框样式
    border: (type = 'primary', customStyle = {}) => ({
      borderColor: theme.borders[type] || theme.borders.primary,
      ...customStyle
    }),

    // 获取输入框样式
    input: (customStyle = {}) => ({
      backgroundColor: theme.backgrounds.secondary,
      borderColor: theme.borders.input,
      color: theme.texts.primary,
      ...customStyle
    }),

    // 获取状态栏样式
    statusBar: () => ({
      barStyle: theme.statusBar.barStyle,
      backgroundColor: theme.statusBar.backgroundColor
    })
  }), [theme]);

  return {
    theme,           // 完整的主题配置对象
    themeType,       // 当前主题类型 ('light' | 'dark')
    isDark,          // 是否为暗色主题
    isLight,         // 是否为亮色主题
    getThemedStyle,  // 样式辅助函数
    
    // 常用的快速访问属性
    colors: {
      background: theme.backgrounds.primary,
      surface: theme.backgrounds.secondary,
      text: theme.texts.primary,
      textSecondary: theme.texts.secondary,
      border: theme.borders.primary,
      primary: theme.buttons.primary
    }
  };
}; 