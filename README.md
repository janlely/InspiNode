# InspiNote App 📚💡

一个基于React Native开发的智能灵感记录应用，帮助用户随时记录想法、待办事项、学习笔记和日常记录。

## ✨ 功能特性

### 📝 智能分类
- **自动内容识别**：应用会根据输入内容自动识别类型
  - 📝 **待办事项**：识别任务和计划类内容
  - 💡 **灵感创意**：识别创意想法和点子
  - 📚 **学习记录**：识别学习相关内容
  - 📄 **日常记录**：其他日常记录内容
- **手动分类调整**：点击图标可手动调整分类

### 📅 日历功能
- **滑动日历**：支持左右滑动切换月份
- **日期导航**：快速跳转到指定日期
- **记录标记**：有记录的日期会显示特殊标记
- **未来日期限制**：不允许在未来日期添加记录

### 💾 数据管理
- **本地存储**：使用SQLite数据库本地存储，保护隐私
- **实时保存**：输入内容自动保存，避免数据丢失
- **数据迁移**：支持数据库版本升级和数据迁移
- **快速检索**：支持按日期、月份查询记录

### 🌍 国际化支持
- **多语言**：支持中文/英文切换
- **自动检测**：根据系统语言自动设置
- **本地化日历**：日历组件支持中文显示

## 🛠️ 技术栈

- **框架**: React Native 0.79.2
- **语言**: TypeScript
- **导航**: React Navigation 7.x
- **数据库**: SQLite (react-native-sqlite-storage)
- **日历**: react-native-calendars
- **国际化**: react-i18next
- **状态管理**: React Hooks
- **UI组件**: React Native原生组件
- **手势处理**: react-native-gesture-handler

## 📋 环境要求

- **Node.js**: >= 18
- **React Native CLI**: 最新版本
- **开发环境**: 
  - iOS: Xcode 12+ (macOS)
  - Android: Android Studio + JDK 11+

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/InspiNoteApp.git
cd InspiNoteApp
```

### 2. 安装依赖

```bash
# 使用 npm
npm install

# 或使用 Yarn
yarn install
```

### 3. iOS 额外设置

```bash
# 安装 CocoaPods 依赖
cd ios
bundle install
bundle exec pod install
cd ..
```

### 4. 启动 Metro

```bash
# 使用 npm
npm start

# 或使用 Yarn
yarn start
```

### 5. 运行应用

#### Android
```bash
# 使用 npm
npm run android

# 或使用 Yarn
yarn android
```

#### iOS
```bash
# 使用 npm
npm run ios

# 或使用 Yarn
yarn ios
```

## 📱 使用指南

### 基本操作

1. **添加记录**
   - 在底部输入框输入内容
   - 应用会自动识别内容类型并显示对应图标
   - 按回车或点击其他区域自动保存

2. **编辑记录**
   - 点击任意记录进入编辑模式
   - 修改完成后点击其他区域自动保存
   - 支持实时编辑和保存

3. **分类管理**
   - 点击记录前的图标可手动调整分类
   - 选择合适的分类类型
   - 手动分类优先级高于自动识别

4. **日期导航**
   - 点击顶部日期打开日历
   - 滑动切换月份查看历史记录
   - 点击日期快速跳转

### 智能分类规则

应用会根据关键词自动识别内容类型：

- **待办事项** 🏷️ 关键词：做、完成、任务、计划、安排、提醒等
- **灵感创意** 🏷️ 关键词：想法、点子、创意、灵感、构思等  
- **学习记录** 🏷️ 关键词：学习、学会、理解、掌握、笔记等
- **日常记录** 🏷️ 默认分类，无特定关键词

## 📁 项目结构

```
src/
├── components/          # 可复用组件
│   └── SwipeableCalendar.tsx  # 滑动日历组件
├── pages/              # 页面组件  
│   └── Home.tsx        # 主页面
├── utils/              # 工具类
│   └── IdeaDatabase.ts # 数据库操作类
├── Types.ts            # TypeScript 类型定义
├── i18n.js            # 国际化配置
└── App.tsx            # 应用入口
```

## 🗄️ 数据库设计

### ideas 表结构
```sql
CREATE TABLE ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hint TEXT NOT NULL,              -- 记录内容
  detail TEXT DEFAULT '',          -- 详细信息（预留）
  date TEXT NOT NULL,              -- 日期 (YYYY-MM-DD)
  category TEXT DEFAULT NULL,      -- 分类类型
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 更新时间
);
```

### 索引
- `idx_ideas_date`: 按日期索引，提高日期查询性能
- `idx_ideas_created_at`: 按创建时间索引

## 🔧 开发指南

### 数据库操作

```typescript
import { ideaDB } from '../utils/IdeaDatabase';

// 添加记录
const newIdea = {
  hint: '学习 React Native',
  detail: '',
  date: '2024-01-01',
  category: 'learning'
};
const id = await ideaDB.addIdea(newIdea);

// 查询记录
const ideas = await ideaDB.getIdeasByDate('2024-01-01');

// 更新记录
await ideaDB.updateIdea(id, { hint: '更新的内容' });

// 删除记录
await ideaDB.deleteIdea(id);
```

### 自定义分类

要添加新的分类类型，修改 `Home.tsx` 中的 `CONTENT_TYPES` 配置：

```typescript
const CONTENT_TYPES = {
  [ContentType.CUSTOM]: {
    icon: '🎯',
    name: '自定义分类',
    keywords: ['关键词1', '关键词2']
  }
};
```

## 🧪 测试

```bash
# 运行测试
npm test

# 或使用 Yarn
yarn test
```

## 📦 构建发布

### Android
```bash
cd android
./gradlew assembleRelease
```

### iOS
1. 在 Xcode 中打开 `ios/InspiNoteApp.xcworkspace`
2. 选择 Release 配置
3. Archive 构建

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## ⚠️ 故障排除

### 常见问题

1. **Android 构建失败**
   - 确保 Android SDK 和 Java 版本正确
   - 清理并重新构建：`cd android && ./gradlew clean && cd .. && yarn android`

2. **iOS 构建失败**
   - 重新安装 Pod：`cd ios && bundle exec pod install && cd ..`
   - 清理 Xcode 缓存：Product → Clean Build Folder

3. **数据库问题**
   - 卸载应用重新安装以重置数据库
   - 检查控制台日志获取详细错误信息

4. **日历显示问题**
   - 确保设备语言设置正确
   - 重启应用刷新国际化设置

### 获取帮助

- 🐛 **Bug 报告**: [Issues](https://github.com/your-username/InspiNoteApp/issues)
- 💬 **功能建议**: [Discussions](https://github.com/your-username/InspiNoteApp/discussions)
- 📧 **联系方式**: your-email@example.com

---

**Happy Coding! 🎉**
