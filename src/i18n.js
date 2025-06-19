import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Common
      common: {
        loading: 'Loading...',
        close: 'Close',
        error: 'Error',
        today: 'Today'
      },

      // Placeholders
      placeholders: {
        searchIdeas: 'Search ideas...',
        recordIdea: 'Record your thoughts...'
      },

      // Buttons
      buttons: {
        add: 'Add',
        recording: 'Recording...',
        pressToRecord: 'Press to Record'
      },

      // Colors
      colors: {
        default: 'Default',
        red: 'Red',
        orange: 'Orange',
        yellow: 'Yellow',
        green: 'Green',
        blue: 'Blue',
        purple: 'Purple',
        pink: 'Pink',
        cyan: 'Cyan',
        darkRed: 'Dark Red',
        darkGreen: 'Dark Green',
        darkBlue: 'Dark Blue',
        gray: 'Gray',
        darkGray: 'Dark Gray',
        lightGray: 'Light Gray'
      },

      // Calendar
      calendar: {
        title: '📅 Calendar',
        months: [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ],
        monthsShort: [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ],
        dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        monthFormat: 'MMMM yyyy'
      },

      // Error Messages
      errors: {
        loadFailed: 'Load Failed',
        saveFailed: 'Save Failed',
        insufficientPermissions: 'Insufficient Permissions',
        imageSelectionFailed: 'Image Selection Failed',
        imageProcessingFailed: 'Image Processing Failed',
        imageLoadFailed: 'Image Load Failed',
        cannotLoadEditor: 'Cannot load editor content, please try again',
        cannotSaveEditor: 'Cannot save editor content, please check network connection',
        cannotSearch: 'Search failed',
        cannotInitApp: 'App initialization failed, please restart app',
        cannotLoadIdeas: 'Load ideas failed',
        cannotNavigateDate: 'Navigate date failed',
        cannotSaveIdea: 'Save idea failed',
        cannotUpdateTodo: 'Update TODO status failed',
        cannotUpdateCategory: 'Update category failed',
        cannotCreateIdea: 'Create idea failed',
        needCameraPermission: 'Camera roll access permission is required to select images',
        imageSelectionFailedRetry: 'Image selection failed, please try again',
        imageProcessingFailedRetry: 'Image processing failed, please try again',
        cannotStartImagePicker: 'Cannot start image picker',
        clickToReturn: 'Click to return'
      }
    }
  },
  zh: {
    translation: {
      // Common
      common: {
        loading: '加载中...',
        close: '关闭',
        error: '错误',
        today: '今天'
      },

      // Placeholders
      placeholders: {
        searchIdeas: '搜索想法...',
        recordIdea: '记录你的想法...'
      },

      // Buttons
      buttons: {
        add: '添加',
        recording: '录音中...',
        pressToRecord: '按住说话'
      },

      // Colors
      colors: {
        default: '默认',
        red: '红色',
        orange: '橙色',
        yellow: '黄色',
        green: '绿色',
        blue: '蓝色',
        purple: '紫色',
        pink: '粉色',
        cyan: '青色',
        darkRed: '深红',
        darkGreen: '深绿',
        darkBlue: '深蓝',
        gray: '灰色',
        darkGray: '深灰',
        lightGray: '浅灰'
      },

      // Calendar
      calendar: {
        title: '📅 日历',
        months: [
          '一月', '二月', '三月', '四月', '五月', '六月',
          '七月', '八月', '九月', '十月', '十一月', '十二月'
        ],
        monthsShort: [
          '1月', '2月', '3月', '4月', '5月', '6月',
          '7月', '8月', '9月', '10月', '11月', '12月'
        ],
        dayNames: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
        dayNamesShort: ['日', '一', '二', '三', '四', '五', '六'],
        monthFormat: 'yyyy年MM月'
      },

      // Error Messages
      errors: {
        loadFailed: '加载失败',
        saveFailed: '保存失败',
        insufficientPermissions: '权限不足',
        imageSelectionFailed: '选择失败',
        imageProcessingFailed: '处理失败',
        imageLoadFailed: '图片加载失败',
        cannotLoadEditor: '无法加载编辑器内容，请重试',
        cannotSaveEditor: '无法保存编辑器内容，请检查网络连接',
        cannotSearch: '搜索失败',
        cannotInitApp: '应用初始化失败，请重启应用',
        cannotLoadIdeas: '加载想法失败',
        cannotNavigateDate: '跳转日期失败',
        cannotSaveIdea: '保存想法失败',
        cannotUpdateTodo: '更新待办状态失败',
        cannotUpdateCategory: '更新分类失败',
        cannotCreateIdea: '创建想法失败',
        needCameraPermission: '需要相册访问权限才能选择图片',
        imageSelectionFailedRetry: '图片选择失败，请重试',
        imageProcessingFailedRetry: '图片处理失败，请重试',
        cannotStartImagePicker: '无法启动图片选择器',
        clickToReturn: '点击返回'
      }
    }
  }
};

i18n
  // 使用插件以支持 React
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // 默认语言
    fallbackLng: 'en', // 如果找不到用户语言，则使用该语言
    interpolation: {
      escapeValue: false, // 不要转义 HTML (React 自己会处理这个)
    },
  });

export default i18n;
