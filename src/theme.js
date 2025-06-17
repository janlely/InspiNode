// 亮色主题配置
export const lightTheme = {
  // 背景颜色
  backgrounds: {
    primary: '#f8f9fa',      // 主背景色
    secondary: '#ffffff',    // 卡片/容器背景色
    tertiary: '#e9ecef',     // 分割线/边框背景
    modal: 'rgba(0, 0, 0, 0.5)', // 模态框遮罩
    toolbar: '#ffffff',      // 工具栏背景
    calendar: '#ffffff',     // 日历背景
    error: '#ffffff'         // 错误页面背景
  },

  // 文字颜色
  texts: {
    primary: '#343a40',      // 主要文字
    secondary: '#6c757d',    // 次要文字
    tertiary: '#999999',     // 占位符文字
    inverse: '#ffffff',      // 反色文字（用于深色背景）
    error: '#ffffff',        // 错误文字
    link: '#2196f3',         // 链接文字
    success: '#28a745',      // 成功状态文字
    disabled: '#aaaaaa'      // 禁用状态文字
  },

  // 边框颜色
  borders: {
    primary: '#e9ecef',      // 主要边框
    secondary: '#dee2e6',    // 次要边框
    input: '#ddd',           // 输入框边框
    separator: '#e0e0e0',    // 分隔线
    card: '#e9ecef'          // 卡片边框
  },

  // 按钮和交互元素
  buttons: {
    primary: '#2196f3',      // 主要按钮背景
    primaryText: '#ffffff',  // 主要按钮文字
    secondary: '#f8f9fa',    // 次要按钮背景
    secondaryText: '#343a40', // 次要按钮文字
    success: '#28a745',      // 成功按钮
    successText: '#ffffff',  // 成功按钮文字
    danger: '#dc3545',       // 危险按钮
    dangerText: '#ffffff',   // 危险按钮文字
    disabled: '#f8f9fa',     // 禁用按钮背景
    disabledText: '#6c757d'  // 禁用按钮文字
  },

  // 状态栏
  statusBar: {
    barStyle: 'dark-content',
    backgroundColor: '#f8f9fa'
  },

  // 特殊元素
  special: {
    shadow: '#000000',       // 阴影颜色
    highlight: '#e3f2fd',    // 高亮背景
    selected: '#2196f3',     // 选中状态
    calendar: {
      selectedBg: '#2196f3',
      selectedText: '#ffffff',
      todayText: '#2196f3',
      markedDot: '#ff5722'
    }
  }
};

// 暗色主题配置
export const darkTheme = {
  // 背景颜色
  backgrounds: {
    primary: '#121212',      // 主背景色
    secondary: '#1e1e1e',    // 卡片/容器背景色
    tertiary: '#333333',     // 分割线/边框背景
    modal: 'rgba(0, 0, 0, 0.8)', // 模态框遮罩
    toolbar: '#1e1e1e',      // 工具栏背景
    calendar: '#1e1e1e',     // 日历背景
    error: '#000000'         // 错误页面背景
  },

  // 文字颜色
  texts: {
    primary: '#e0e0e0',      // 主要文字
    secondary: '#a0a0a0',    // 次要文字
    tertiary: '#666666',     // 占位符文字
    inverse: '#121212',      // 反色文字（用于浅色背景）
    error: '#ffffff',        // 错误文字
    link: '#64b5f6',         // 链接文字（暗色版本）
    success: '#4caf50',      // 成功状态文字
    disabled: '#555555'      // 禁用状态文字
  },

  // 边框颜色
  borders: {
    primary: '#333333',      // 主要边框
    secondary: '#404040',    // 次要边框
    input: '#555555',        // 输入框边框
    separator: '#404040',    // 分隔线
    card: '#333333'          // 卡片边框
  },

  // 按钮和交互元素
  buttons: {
    primary: '#2196f3',      // 主要按钮背景
    primaryText: '#ffffff',  // 主要按钮文字
    secondary: '#333333',    // 次要按钮背景
    secondaryText: '#e0e0e0', // 次要按钮文字
    success: '#4caf50',      // 成功按钮
    successText: '#ffffff',  // 成功按钮文字
    danger: '#f44336',       // 危险按钮
    dangerText: '#ffffff',   // 危险按钮文字
    disabled: '#333333',     // 禁用按钮背景
    disabledText: '#666666'  // 禁用按钮文字
  },

  // 状态栏
  statusBar: {
    barStyle: 'light-content',
    backgroundColor: '#121212'
  },

  // 特殊元素
  special: {
    shadow: '#000000',       // 阴影颜色
    highlight: '#263238',    // 高亮背景
    selected: '#2196f3',     // 选中状态
    calendar: {
      selectedBg: '#2196f3',
      selectedText: '#ffffff',
      todayText: '#64b5f6',
      markedDot: '#ff7043'
    }
  }
};

// 主题类型定义（用于TypeScript类型检查）
export const THEME_TYPES = {
  LIGHT: 'light',
  DARK: 'dark'
}; 