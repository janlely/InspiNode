import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  ScrollView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Block, BlockType, NavigationProps } from '../Types';
import { BlockEditor } from '../components/BlockEditor';
import { KeyboardToolbar } from '../components/KeyboardToolbar';
import { createNewBlock, blocksToMarkdown } from '../utils/BlockTypeUtils';

// type BlockEditorNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BlockEditor'>;
// type BlockEditorRouteProp = RouteProp<RootStackParamList, 'BlockEditor'>;

type BlockEditorProps = NavigationProps<'BlockEditor'>

export default function BlockEditorPage({ navigation, route }: BlockEditorProps) {
  const { ideaId } = route.params || {};

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    initializeBlocks();
    
    // 监听键盘显示/隐藏
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      console.log('🎹 Keyboard did show');
      setKeyboardVisible(true);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      console.log('🎹 Keyboard did hide');
      setKeyboardVisible(false);
    });
    
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // 调试状态变化
  useEffect(() => {
    console.log('📊 State update:', {
      keyboardVisible,
      isPreviewMode,
      activeBlockId,
      shouldShowToolbar: keyboardVisible && !isPreviewMode
    });
  }, [keyboardVisible, isPreviewMode, activeBlockId]);

  // 初始化blocks
  const initializeBlocks = () => {
    // 创建一个初始的空block
    const initialBlock = createNewBlock(BlockType.PARAGRAPH, 0);
    setBlocks([initialBlock]);
    setActiveBlockId(initialBlock.id);
  };

  // 保存blocks（临时简化版本，显示JSON）
  const saveBlocks = () => {
    try {
      // 过滤掉空内容的blocks
      const validBlocks = blocks.filter(block => block.content.trim() !== '');
      
      if (validBlocks.length === 0) {
        Alert.alert('提示', '没有可保存的内容');
        return;
      }

      // 重新排序
      const sortedBlocks = validBlocks.map((block, index) => ({
        ...block,
        order: index,
        updated_at: new Date().toISOString(),
      }));

      // 显示JSON格式的数据
      Alert.alert(
        '保存的内容', 
        JSON.stringify(sortedBlocks, null, 2),
        [{ text: '确定' }]
      );
    } catch (error) {
      console.error('Failed to save blocks:', error);
      Alert.alert('错误', '保存失败');
    }
  };

  // 处理block内容变化
  const handleBlockContentChange = useCallback((blockId: string, content: string) => {
    setBlocks(prev => 
      prev.map(block => 
        block.id === blockId 
          ? { ...block, content, updated_at: new Date().toISOString() }
          : block
      )
    );
  }, []);

  // 处理block类型变化
  const handleBlockTypeChange = useCallback((blockId: string, type: BlockType) => {
    setBlocks(prev => 
      prev.map(block => 
        block.id === blockId 
          ? { ...block, type, updated_at: new Date().toISOString() }
          : block
      )
    );
  }, []);

  // 处理添加新block
  const handleAddBlock = useCallback((blockId: string) => {
    const currentBlockIndex = blocks.findIndex(b => b.id === blockId);
    const newOrder = currentBlockIndex + 1;
    
    // 创建新block
    const newBlock = createNewBlock(BlockType.PARAGRAPH, newOrder);
    
    // 更新后续blocks的order
    const updatedBlocks = blocks.map(block => 
      block.order >= newOrder 
        ? { ...block, order: block.order + 1 }
        : block
    );
    
    setBlocks([...updatedBlocks, newBlock]);
    setActiveBlockId(newBlock.id);
  }, [blocks]);

  // 处理block聚焦
  const handleBlockFocus = useCallback((blockId: string) => {
    setActiveBlockId(blockId);
  }, []);

  // 处理block失焦
  const handleBlockBlur = useCallback((blockId: string) => {
    // 延迟处理，避免在切换focus时立即失焦
    setTimeout(() => {
      setActiveBlockId(null);
    }, 100);
  }, []);

  // 处理屏幕点击
  const handleScreenPress = useCallback(() => {
    Keyboard.dismiss();
    setActiveBlockId(null);
  }, []);

  // 切换预览模式
  const togglePreviewMode = () => {
    if (!isPreviewMode) {
      // 进入预览模式，生成markdown
      const markdown = blocksToMarkdown(blocks);
      setMarkdownContent(markdown);
    }
    setIsPreviewMode(!isPreviewMode);
  };

  // 获取当前活跃block的类型
  const getCurrentBlockType = (): BlockType => {
    const activeBlock = blocks.find(b => b.id === activeBlockId);
    return activeBlock?.type || BlockType.PARAGRAPH;
  };

  // 处理工具栏中的block类型更改
  const handleToolbarBlockTypeChange = (type: BlockType) => {
    if (activeBlockId) {
      handleBlockTypeChange(activeBlockId, type);
    }
  };

  // 处理文本格式化
  const handleFormatText = (format: string) => {
    // 这里可以实现文本格式化逻辑，比如在选中文本前后添加markdown符号
    console.log('Format text:', format);
  };

  // 处理插入文本
  const handleInsertText = (text: string) => {
    if (activeBlockId) {
      const activeBlock = blocks.find(b => b.id === activeBlockId);
      if (activeBlock) {
        const newContent = activeBlock.content + text;
        handleBlockContentChange(activeBlockId, newContent);
      }
    }
  };

  // 简单的markdown渲染函数
  const renderMarkdownText = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return (
          <Text key={index} style={markdownStyles.h1}>
            {line.replace('# ', '')}
          </Text>
        );
      } else if (line.startsWith('## ')) {
        return (
          <Text key={index} style={markdownStyles.h2}>
            {line.replace('## ', '')}
          </Text>
        );
      } else if (line.startsWith('### ')) {
        return (
          <Text key={index} style={markdownStyles.h3}>
            {line.replace('### ', '')}
          </Text>
        );
      } else if (line.startsWith('#### ')) {
        return (
          <Text key={index} style={markdownStyles.h4}>
            {line.replace('#### ', '')}
          </Text>
        );
      } else if (line.startsWith('##### ')) {
        return (
          <Text key={index} style={markdownStyles.h5}>
            {line.replace('##### ', '')}
          </Text>
        );
      } else if (line.startsWith('###### ')) {
        return (
          <Text key={index} style={markdownStyles.h6}>
            {line.replace('###### ', '')}
          </Text>
        );
      } else if (line.startsWith('![')) {
        return (
          <Text key={index} style={markdownStyles.image}>
            [图片: {line.match(/\[([^\]]+)\]/)?.[1] || ''}]
          </Text>
        );
      } else if (line.trim() !== '') {
        return (
          <Text key={index} style={markdownStyles.paragraph}>
            {line}
          </Text>
        );
      } else {
        return <View key={index} style={{ height: 16 }} />;
      }
    });
  };

  // 渲染编辑模式
  const renderEditMode = () => (
    <ScrollView 
      style={styles.scrollView} 
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
    >
      <TouchableWithoutFeedback onPress={handleScreenPress}>
        <View style={styles.content}>
          {blocks
            .sort((a, b) => a.order - b.order)
            .map((block) => (
              <BlockEditor
                key={block.id}
                block={block}
                onContentChange={handleBlockContentChange}
                onAddBlock={handleAddBlock}
                onFocus={handleBlockFocus}
                onBlur={handleBlockBlur}
                isActive={activeBlockId === block.id}
              />
            ))}
        </View>
      </TouchableWithoutFeedback>
    </ScrollView>
  );

  // 渲染预览模式
  const renderPreviewMode = () => (
    <ScrollView style={styles.scrollView}>
      <View style={styles.previewContent}>
        {markdownContent ? (
          <View>
            {renderMarkdownText(markdownContent)}
          </View>
        ) : (
          <Text style={styles.emptyPreview}>暂无内容</Text>
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>
          {isPreviewMode ? '预览模式' : '编辑模式'}
        </Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={togglePreviewMode}
          >
            <Text style={styles.headerButtonText}>
              {isPreviewMode ? '✏️' : '👁️'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={saveBlocks}
          >
            <Text style={styles.headerButtonText}>💾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 键盘避让视图 */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* 内容区域 */}
        {isPreviewMode ? renderPreviewMode() : renderEditMode()}

        {/* 键盘工具栏 */}
        {keyboardVisible && !isPreviewMode && (
          <KeyboardToolbar
            currentBlockType={getCurrentBlockType()}
            onBlockTypeChange={handleToolbarBlockTypeChange}
            onFormatText={handleFormatText}
            onInsertText={handleInsertText}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerButtonText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    minHeight: '100%',
  },
  previewContent: {
    padding: 20,
  },
  emptyPreview: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 50,
  },
});

// Markdown样式
const markdownStyles = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 24,
    color: '#333',
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 20,
    color: '#333',
  },
  h3: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
    color: '#333',
  },
  h4: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
    color: '#333',
  },
  h5: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
    color: '#333',
  },
  h6: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
    color: '#333',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    color: '#333',
  },
  image: {
    fontSize: 16,
    marginVertical: 16,
    color: '#666',
    fontStyle: 'italic',
  },
}); 