import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// 导航类型
export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  BlockEditor: { ideaId?: number }; // 新增Block编辑器页面
  KeyboardTest: undefined; // 键盘焦点测试页面
  Editor: { idea: IdeaRecord}; // 编辑器页面
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
  H1 = 'h1',           // 一级标题
  H2 = 'h2',           // 二级标题
  H3 = 'h3',           // 三级标题
  H4 = 'h4',           // 四级标题
  H5 = 'h5',           // 五级标题
  H6 = 'h6',           // 六级标题
  PARAGRAPH = 'paragraph', // 正文
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