import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// 导航类型
export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
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
