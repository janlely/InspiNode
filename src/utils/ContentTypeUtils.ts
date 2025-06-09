import { ContentType, ContentTypeConfig } from '../Types';

// 内容分类配置
export const CONTENT_TYPES: Record<ContentType, ContentTypeConfig> = {
  [ContentType.TODO]: {
    icon: '📝',
    name: '待办事项',
    keywords: ['做', '完成', '任务', '计划', '安排', '办', '准备', '处理', '解决', '执行', '实现', '开始', '结束', '提醒', 'deadline', 'todo', '需要', '必须', '应该', '记得', '别忘']
  },
  [ContentType.IDEA]: {
    icon: '💡',
    name: '灵感创意',
    keywords: ['想法', '点子', '创意', '灵感', 'idea', '思路', '方案', '概念', '发明', '设计', '构思', '想到', '突然', '脑洞', '创新', '想象', '联想']
  },
  [ContentType.LEARNING]: {
    icon: '📚',
    name: '学习记录',
    keywords: ['学习', '学会', '理解', '掌握', '记住', '背诵', '复习', '预习', '笔记', '知识', '技能', '方法', '原理', '概念', '定义', '公式', '总结', '心得', '体会', '感悟']
  },
  [ContentType.NOTE]: {
    icon: '📄',
    name: '日常记录',
    keywords: [] // 默认分类，无特定关键词
  }
};

/**
 * 智能识别内容类型（基于关键词匹配）
 * @param text 文本内容
 * @returns 识别出的内容类型
 */
export const detectContentType = (text: string): ContentType => {
  if (!text || !text.trim()) return ContentType.NOTE;
  
  const lowercaseText = text.toLowerCase();
  
  // 按优先级检查关键词
  const typeEntries = Object.entries(CONTENT_TYPES);
  
  for (const [type, config] of typeEntries) {
    if (type === ContentType.NOTE) continue; // 跳过默认类型
    
    const hasKeyword = config.keywords.some(keyword => 
      lowercaseText.includes(keyword.toLowerCase())
    );
    
    if (hasKeyword) {
      return type as ContentType;
    }
  }
  
  return ContentType.NOTE; // 默认分类
};

/**
 * 获取最终的分类类型（优先使用手动分类）
 * @param text 文本内容
 * @param manualCategory 手动选择的分类
 * @returns 最终的内容类型
 */
export const getFinalContentType = (text: string, manualCategory?: string): ContentType => {
  if (manualCategory && CONTENT_TYPES[manualCategory as ContentType]) {
    return manualCategory as ContentType;
  }
  return detectContentType(text);
};

/**
 * 获取内容类型对应的图标
 * @param text 文本内容
 * @param manualCategory 手动选择的分类
 * @returns 对应的图标
 */
export const getContentIcon = (text: string, manualCategory?: string): string => {
  const type = getFinalContentType(text, manualCategory);
  return CONTENT_TYPES[type].icon;
};

/**
 * 获取内容类型名称
 * @param text 文本内容
 * @param manualCategory 手动选择的分类
 * @returns 对应的类型名称
 */
export const getContentTypeName = (text: string, manualCategory?: string): string => {
  const type = getFinalContentType(text, manualCategory);
  return CONTENT_TYPES[type].name;
}; 