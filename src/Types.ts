import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// 导航类型
export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  BlockEditor: { ideaId?: number }; // 新增Block编辑器页面
  KeyboardTest: undefined; // 键盘焦点测试页面
  Editor: { idea: IdeaRecord}; // 编辑器页面
  ImageViewer: { imageUri: string }; // 全屏图片查看页面
};

export type NavigationProps<T extends keyof RootStackParamList> = {
  navigation: NativeStackNavigationProp<RootStackParamList, T>;
  route: RouteProp<RootStackParamList, T>;
};

// 内容分类枚举
export enum ContentType {
  TODO = 'todo',       // 待办事项
  IDEA = 'idea',       // 灵感创意
  LEARNING = 'learning', // 学习记录
  NOTE = 'note'        // 日常记录
}

// 内容分类配置接口
export interface ContentTypeConfig {
  icon: string;
  name: string;
  keywords: string[];
}

// Block类型枚举
export enum BlockType {
  MARKDOWN = 'markdown', // 富文本
  IMAGE = 'image'      // 图片
}

// Block数据接口
export interface Block {
  id: string;
  type: BlockType;
  content: string;
  isActive: boolean;
  cursorPosition?: number;
  created_at?: string;
  updated_at?: string;
  isDirty?: boolean; // 运行时标记，表示是否需要保存
}

// 数据库Block记录接口
export interface BlockRecord {
  id: number;
  idea_id: number;
  block_id: string;
  type: BlockType;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// 新建Block接口
export interface NewBlock {
  idea_id: number;
  block_id: string;
  type: BlockType;
  content: string;
  order_index: number;
}

// 更新Block接口
export interface UpdateBlock {
  type?: BlockType;
  content?: string;
  order_index?: number;
}

// Block配置接口
export interface BlockTypeConfig {
  icon: string;
  name: string;
  markdownPrefix: string;
}

export interface IdeaRecord {
  id: number;
  hint: string;
  detail: string;
  date: string;
  category?: string;
  completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewIdea {
  hint: string;
  detail?: string;
  date: string;
  category?: string;
  completed?: boolean;
}

export interface UpdateIdea {
  hint?: string;
  detail?: string;
  date?: string;
  category?: string;
  completed?: boolean;
}