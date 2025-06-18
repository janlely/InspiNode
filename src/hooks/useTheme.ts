import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, THEME_TYPES } from '../theme';

// 主题类型定义
export interface Theme {
  backgrounds: {
    primary: string;
    secondary: string;
    tertiary: string;
    modal: string;
    toolbar: string;
    calendar: string;
    error: string;
  };
  texts: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    error: string;
    link: string;
    success: string;
    disabled: string;
  };
  borders: {
    primary: string;
    secondary: string;
    input: string;
    separator: string;
    card: string;
  };
  buttons: {
    primary: string;
    primaryText: string;
    secondary: string;
    secondaryText: string;
    success: string;
    successText: string;
    danger: string;
    dangerText: string;
    disabled: string;
    disabledText: string;
  };
  statusBar: {
    barStyle: 'dark-content' | 'light-content';
    backgroundColor: string;
  };
  special: {
    shadow: string;
    highlight: string;
    selected: string;
    calendar: {
      selectedBg: string;
      selectedText: string;
      todayText: string;
      markedDot: string;
    };
  };
}

export interface UseThemeReturn {
  theme: Theme;
  themeType: string;
  isDark: boolean;
  isLight: boolean;
  getThemedStyle: {
    container: (customStyle?: object) => object;
    card: (customStyle?: object) => object;
    text: (type?: string, customStyle?: object) => object;
    button: (type?: string, customStyle?: object) => object;
    border: (type?: string, customStyle?: object) => object;
    input: (customStyle?: object) => object;
    statusBar: () => {
      barStyle: 'dark-content' | 'light-content';
      backgroundColor: string;
    };
  };
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
  };
}

/**
 * 主题Hook - 提供当前主题配置和主题相关功能
 * @returns {UseThemeReturn} 包含当前主题、主题类型和工具函数的对象
 */
export const useTheme = (): UseThemeReturn => {
  // 获取系统色彩方案
  const systemColorScheme = useColorScheme();

  // 根据系统设置确定当前主题类型
  const themeType = systemColorScheme === 'dark' ? THEME_TYPES.DARK : THEME_TYPES.LIGHT;

  // 获取当前主题配置
  const theme = useMemo(() => {
    return themeType === THEME_TYPES.DARK ? darkTheme as Theme : lightTheme as Theme;
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
      color: theme.texts[type as keyof typeof theme.texts] || theme.texts.primary,
      ...customStyle
    }),

    // 获取按钮样式
    button: (type = 'primary', customStyle = {}) => ({
      backgroundColor: theme.buttons[type as keyof typeof theme.buttons] || theme.buttons.primary,
      ...customStyle
    }),

    // 获取边框样式
    border: (type = 'primary', customStyle = {}) => ({
      borderColor: theme.borders[type as keyof typeof theme.borders] || theme.borders.primary,
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