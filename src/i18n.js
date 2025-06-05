import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// 如果你使用的是后端加载翻译文件，则还需要导入 i18next-http-backend
// import Backend from 'i18next-http-backend';

const resources = {
  en: {
    translation: {
      //Shared
      online: 'Online',
      offline: 'Offline',
      searchMembers: 'Search members...',
    }
  },
  zh: {
    translation: {
      //Shared
      online: '在线',
      offline: '离线',
      searchMembers: '搜索成员...',
    }
  }
};

i18n
  // 使用插件以支持 React
  .use(initReactI18next)
  // 如果使用后端加载翻译文件，取消下面一行注释并配置你的后端
  // .use(Backend)
  .init({
    resources,
    lng: "en", // 默认语言
    fallbackLng: 'en', // 如果找不到用户语言，则使用该语言
    interpolation: {
      escapeValue: false, // 不要转义 HTML (React 自己会处理这个)
    },
  });


export default i18n;
