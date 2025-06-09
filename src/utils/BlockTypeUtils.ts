import { BlockType, BlockTypeConfig, Block } from '../Types';

// Block类型配置
export const BLOCK_TYPE_CONFIGS: Record<BlockType, BlockTypeConfig> = {
  [BlockType.H1]: {
    icon: 'H1',
    name: '一级标题',
    markdownPrefix: '# ',
  },
  [BlockType.H2]: {
    icon: 'H2',
    name: '二级标题',
    markdownPrefix: '## ',
  },
  [BlockType.H3]: {
    icon: 'H3',
    name: '三级标题',
    markdownPrefix: '### ',
  },
  [BlockType.H4]: {
    icon: 'H4',
    name: '四级标题',
    markdownPrefix: '#### ',
  },
  [BlockType.H5]: {
    icon: 'H5',
    name: '五级标题',
    markdownPrefix: '##### ',
  },
  [BlockType.H6]: {
    icon: 'H6',
    name: '六级标题',
    markdownPrefix: '###### ',
  },
  [BlockType.PARAGRAPH]: {
    icon: '¶',
    name: '正文',
    markdownPrefix: '',
  },
  [BlockType.IMAGE]: {
    icon: '🖼️',
    name: '图片',
    markdownPrefix: '![]()',
  },
};

// 获取Block类型配置
export const getBlockTypeConfig = (type: BlockType): BlockTypeConfig => {
  return BLOCK_TYPE_CONFIGS[type];
};

// 获取Block类型图标
export const getBlockTypeIcon = (type: BlockType): string => {
  return BLOCK_TYPE_CONFIGS[type].icon;
};

// 获取Block类型名称
export const getBlockTypeName = (type: BlockType): string => {
  return BLOCK_TYPE_CONFIGS[type].name;
};

// 将Blocks转换为Markdown
export const blocksToMarkdown = (blocks: Block[]): string => {
  // 按order排序
  const sortedBlocks = blocks.sort((a, b) => a.order - b.order);
  
  return sortedBlocks
    .map(block => {
      const config = BLOCK_TYPE_CONFIGS[block.type];
      
      if (block.type === BlockType.IMAGE) {
        // 图片类型特殊处理
        return `![图片](${block.content})`;
      } else {
        // 其他类型
        return `${config.markdownPrefix}${block.content}`;
      }
    })
    .join('\n\n');
};

// 创建新的Block
export const createNewBlock = (type: BlockType = BlockType.PARAGRAPH, order: number = 0): Block => {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type,
    content: '',
    order,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

// 获取所有可用的Block类型
export const getAllBlockTypes = (): BlockType[] => {
  return Object.values(BlockType);
}; 