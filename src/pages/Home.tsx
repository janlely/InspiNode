import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  Modal,
  TouchableOpacity,
  Pressable,
  Keyboard,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { ideaDB, IdeaRecord, NewIdea, UpdateIdea } from '../utils/IdeaDatabase';

interface IdeaItem {
  id: string;
  text: string;
  dbId?: number; // 数据库中的真实ID
  manualCategory?: string; // 手动选择的分类
  isEditing?: boolean; // 是否处于编辑状态
}

// 内容分类枚举
enum ContentType {
  TODO = 'todo',       // 待办事项
  IDEA = 'idea',       // 灵感创意
  LEARNING = 'learning', // 学习记录
  NOTE = 'note'        // 日常记录
}

// 内容分类配置
const CONTENT_TYPES = {
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

export default function Home() {
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [currentDate, setCurrentDate] = useState('');
  const [currentDateString, setCurrentDateString] = useState('');
  const [emptyInputValue, setEmptyInputValue] = useState('');
  const [emptyInputCategory, setEmptyInputCategory] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedIdeaForCategory, setSelectedIdeaForCategory] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const emptyInputRef = useRef<TextInput | null>(null);
  const flatListRef = useRef<FlatList | null>(null);
  const screenData = Dimensions.get('window');
  
  useEffect(() => {
    initializeApp();
    
    // 键盘事件监听
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setKeyboardVisible(true);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setKeyboardVisible(false);
        // 延迟清除编辑状态，给切换编辑目标留时间
        setTimeout(() => {
          // 检查是否有输入框仍然聚焦，如果没有才清除编辑状态
          const hasActiveInput = Object.values(inputRefs.current).some(ref => ref?.isFocused());
          if (!hasActiveInput) {
            setEditingIdeaId(null);
          }
        }, 200);
      }
    );
    
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // 智能识别内容类型（仅当没有手动分类时使用）
  const detectContentType = (text: string): ContentType => {
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

  // 获取内容类型对应的图标（优先使用手动分类）
  const getContentIcon = (text: string, manualCategory?: string): string => {
    if (manualCategory && CONTENT_TYPES[manualCategory as ContentType]) {
      return CONTENT_TYPES[manualCategory as ContentType].icon;
    }
    const type = detectContentType(text);
    return CONTENT_TYPES[type].icon;
  };

  // 获取内容类型名称（用于调试）
  const getContentTypeName = (text: string, manualCategory?: string): string => {
    if (manualCategory && CONTENT_TYPES[manualCategory as ContentType]) {
      return CONTENT_TYPES[manualCategory as ContentType].name;
    }
    const type = detectContentType(text);
    return CONTENT_TYPES[type].name;
  };

  // 获取最终的分类类型
  const getFinalContentType = (text: string, manualCategory?: string): ContentType => {
    if (manualCategory && CONTENT_TYPES[manualCategory as ContentType]) {
      return manualCategory as ContentType;
    }
    return detectContentType(text);
  };

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      
      // 初始化数据库
      await ideaDB.initialize();
      console.log('✅ Database initialized');
      
      // 设置当前日期
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      };
      setCurrentDate(now.toLocaleDateString('zh-CN', options));
      
      // 设置日期字符串（用于数据库查询）
      const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD格式
      setCurrentDateString(dateString);
      
      // 加载今天的想法
      await loadTodayIdeas(dateString);
      
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      Alert.alert('错误', '应用初始化失败，请重启应用');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTodayIdeas = async (dateString: string) => {
    try {
      console.log('📅 Loading ideas for date:', dateString);
      const dbIdeas = await ideaDB.getIdeasByDate(dateString);
      
      const formattedIdeas: IdeaItem[] = dbIdeas.map((dbIdea) => ({
        id: dbIdea.id.toString(),
        text: dbIdea.hint,
        dbId: dbIdea.id,
        manualCategory: dbIdea.category || undefined,
        isEditing: false,
      }));
      
      setIdeas(formattedIdeas);
      console.log(`✅ Loaded ${formattedIdeas.length} ideas from database`);
    } catch (error) {
      console.error('❌ Failed to load ideas:', error);
      Alert.alert('错误', '加载想法失败');
    }
  };

  // 点击想法文本，进入编辑模式
  const handleIdeaPress = (ideaId: string) => {
    // 如果已经有元素在编辑中，先完成当前编辑
    if (editingIdeaId && editingIdeaId !== ideaId) {
      finishEditingIdea(editingIdeaId);
    }
    
    setEditingIdeaId(ideaId);
    // 延迟聚焦，确保输入框已渲染
    setTimeout(() => {
      inputRefs.current[ideaId]?.focus();
    }, 100);
  };

  // 处理输入框聚焦，执行自动滚动
  const handleInputFocus = (inputId: string, index: number) => {
    console.log(`👁️ Input focused: ${inputId}, index: ${index}`);
    
    // 延迟执行滚动，等待键盘完全弹出
    setTimeout(() => {
      if (flatListRef.current && keyboardVisible) {
        // 简单的滚动逻辑：如果是后面的输入框，滚动到可见位置
        if (index > 2) {
          try {
            if (inputId === 'empty') {
              // 最后一个输入框，滚动到底部
              flatListRef.current.scrollToEnd({ animated: true });
            } else {
              // 其他输入框，滚动到指定位置
              flatListRef.current.scrollToIndex({
                index: index,
                animated: true,
                viewPosition: 0.25,
              });
            }
          } catch (error) {
            console.log('滚动失败，忽略:', error);
          }
        }
      }
    }, 300); // 增加延迟时间，确保键盘稳定
  };

  // 更新想法文本
  const updateIdea = async (id: string, text: string) => {
    setIdeas(prev => 
      prev.map(idea => 
        idea.id === id ? { ...idea, text } : idea
      )
    );
  };

  // 完成编辑（保存想法）
  const finishEditingIdea = async (id: string) => {
    const idea = ideas.find(i => i.id === id);
    if (!idea) return;
    
    setEditingIdeaId(null);
    
    if (idea.text.trim() === '') {
      // 如果文本为空，删除这个想法
      setIdeas(prev => prev.filter(i => i.id !== id));
      
      if (idea.dbId) {
        try {
          await ideaDB.deleteIdea(idea.dbId);
          console.log(`🗑️ Deleted empty idea with DB ID: ${idea.dbId}`);
        } catch (error) {
          console.error(`❌ Failed to delete idea ${idea.dbId}:`, error);
        }
      }
      return;
    }
    
    // 保存或更新到数据库
    try {
      if (idea.dbId) {
        // 更新现有记录
        const updatedRecord: UpdateIdea = {
          hint: idea.text.trim(),
          category: getFinalContentType(idea.text, idea.manualCategory),
        };
        
        await ideaDB.updateIdea(idea.dbId, updatedRecord);
        console.log(`💾 Updated idea with DB ID: ${idea.dbId}`);
      } else {
        // 创建新记录
        const newIdea: NewIdea = {
          hint: idea.text.trim(),
          detail: '',
          date: currentDateString,
          category: getFinalContentType(idea.text, idea.manualCategory),
        };
        
        const dbId = await ideaDB.addIdea(newIdea);
        
        // 更新本地状态以包含数据库ID
        setIdeas(prev => 
          prev.map(i => 
            i.id === id ? { ...i, dbId } : i
          )
        );
        
        console.log(`💾 Saved idea to database with ID: ${dbId}`);
      }
    } catch (error) {
      console.error('❌ Failed to save idea:', error);
      Alert.alert('错误', '保存想法失败');
    }
  };

  // 处理分类选择
  const handleIconPress = (ideaId: string) => {
    setSelectedIdeaForCategory(ideaId);
    setShowCategoryModal(true);
  };

  const handleEmptyInputIconPress = () => {
    setSelectedIdeaForCategory('empty');
    setShowCategoryModal(true);
  };

  const handleCategorySelect = async (category: ContentType) => {
    if (selectedIdeaForCategory === 'empty') {
      setEmptyInputCategory(category);
    } else if (selectedIdeaForCategory) {
      // 更新对应idea的分类
      setIdeas(prev => 
        prev.map(idea => 
          idea.id === selectedIdeaForCategory 
            ? { ...idea, manualCategory: category }
            : idea
        )
      );
      
      // 如果这个idea已经保存到数据库，更新数据库中的分类
      const targetIdea = ideas.find(idea => idea.id === selectedIdeaForCategory);
      if (targetIdea?.dbId) {
        try {
          await ideaDB.updateIdea(targetIdea.dbId, { category });
          console.log(`✅ Updated category for idea ${targetIdea.dbId} to ${category}`);
        } catch (error) {
          console.error('❌ Failed to update category:', error);
          Alert.alert('错误', '更新分类失败');
        }
      }
    }
    
    setShowCategoryModal(false);
    setSelectedIdeaForCategory(null);
  };

  // 处理新增想法
  const handleEmptyInputSubmit = async () => {
    if (!emptyInputValue.trim()) return;
    
    try {
      // 确定最终的分类类型
      const finalCategory = getFinalContentType(emptyInputValue, emptyInputCategory);
      
      // 保存到数据库
      const newIdea: NewIdea = {
        hint: emptyInputValue.trim(),
        detail: '',
        date: currentDateString,
        category: finalCategory,
      };
      
      const dbId = await ideaDB.addIdea(newIdea);
      
      // 创建新的想法项目
      const newIdeaItem: IdeaItem = {
        id: Date.now().toString(),
        text: emptyInputValue.trim(),
        dbId: dbId,
        manualCategory: emptyInputCategory,
        isEditing: false,
      };
      
      // 添加到列表
      setIdeas(prev => [...prev, newIdeaItem]);
      
      // 清空输入框
      setEmptyInputValue('');
      setEmptyInputCategory(undefined);
      
      console.log(`💾 Created new idea with DB ID: ${dbId}`);
      
    } catch (error) {
      console.error('❌ Failed to create idea:', error);
      Alert.alert('错误', '创建想法失败');
    }
  };

  const handleEmptyInputChange = (text: string) => {
    setEmptyInputValue(text);
  };

  // 渲染想法项目
  const renderIdeaItem = ({ item, index }: { item: IdeaItem; index: number }) => {
    const isEditing = editingIdeaId === item.id;
    
    return (
      <View style={styles.ideaContainer}>
        <TouchableOpacity 
          style={styles.iconContainer}
          onPress={() => handleIconPress(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.contentIcon}>
            {getContentIcon(item.text, item.manualCategory)}
          </Text>
        </TouchableOpacity>
        
        {isEditing ? (
          <TextInput
            ref={(ref) => {
              inputRefs.current[item.id] = ref;
            }}
            style={styles.ideaInput}
            value={item.text}
            onChangeText={(text) => updateIdea(item.id, text)}
            placeholder="记录你的想法..."
            placeholderTextColor="#999"
            multiline={false}
            returnKeyType="done"
            onSubmitEditing={() => finishEditingIdea(item.id)}
            onBlur={() => {
              // 延迟执行，给其他输入框获得焦点的时间
              setTimeout(() => {
                finishEditingIdea(item.id);
              }, 150);
            }}
            onFocus={() => handleInputFocus(item.id, index)}
            blurOnSubmit={false}
            autoFocus
          />
        ) : (
          <TouchableOpacity
            style={styles.ideaTextContainer}
            onPress={() => handleIdeaPress(item.id)}
            activeOpacity={0.6}
          >
            <Text style={styles.ideaText}>{item.text}</Text>
          </TouchableOpacity>
        )}
        
        {__DEV__ && item.text.trim() && (
          <Text style={styles.typeIndicator}>
            {getContentTypeName(item.text, item.manualCategory)}
          </Text>
        )}
      </View>
    );
  };

  // 渲染空输入框项目
  const renderEmptyTextBox = () => (
    <View style={styles.ideaContainer}>
      <TouchableOpacity 
        style={styles.iconContainer}
        onPress={handleEmptyInputIconPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.contentIcon}>
          {getContentIcon(emptyInputValue, emptyInputCategory)}
        </Text>
      </TouchableOpacity>
      <TextInput
        ref={emptyInputRef}
        style={styles.ideaInput}
        value={emptyInputValue}
        placeholder="记录你的想法..."
        placeholderTextColor="#999"
        multiline={false}
        returnKeyType="done"
        onChangeText={handleEmptyInputChange}
        onSubmitEditing={handleEmptyInputSubmit}
        onFocus={() => handleInputFocus('empty', ideas.length)}
      />
      {__DEV__ && emptyInputValue.trim() && (
        <Text style={styles.typeIndicator}>
          {getContentTypeName(emptyInputValue, emptyInputCategory)}
        </Text>
      )}
    </View>
  );

  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>选择分类</Text>
          
          {Object.entries(CONTENT_TYPES).map(([type, config]) => (
            <TouchableOpacity
              key={type}
              style={styles.categoryOption}
              onPress={() => handleCategorySelect(type as ContentType)}
            >
              <Text style={styles.categoryIcon}>{config.icon}</Text>
              <Text style={styles.categoryName}>{config.name}</Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCategoryModal(false)}
          >
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  // 准备渲染的数据：现有ideas + 一个空的输入框
  const renderData = React.useMemo(() => {
    return [...ideas, { id: 'empty', text: emptyInputValue }];
  }, [ideas, emptyInputValue]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* 日期头部 */}
      <View style={styles.header}>
        <Text style={styles.dateText}>{currentDate}</Text>
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              数据库想法: {ideas.filter(i => i.dbId).length} | 本地想法: {ideas.length}
            </Text>
            <Text style={styles.debugText}>
              📝{ideas.filter(i => getFinalContentType(i.text, i.manualCategory) === ContentType.TODO).length} | 
              💡{ideas.filter(i => getFinalContentType(i.text, i.manualCategory) === ContentType.IDEA).length} | 
              📚{ideas.filter(i => getFinalContentType(i.text, i.manualCategory) === ContentType.LEARNING).length} | 
              📄{ideas.filter(i => getFinalContentType(i.text, i.manualCategory) === ContentType.NOTE).length}
            </Text>
            <Text style={styles.debugText}>
              编辑中: {editingIdeaId || '无'} | 键盘: {keyboardVisible ? `显示(${keyboardHeight}px)` : '隐藏'}
            </Text>
          </View>
        )}
      </View>

      {/* 想法列表 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={renderData}
          renderItem={({ item, index }) => {
            if (item.id === 'empty') {
              return renderEmptyTextBox();
            }
            return renderIdeaItem({ item: item as IdeaItem, index });
          }}
          keyExtractor={(item) => item.id}
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(20, keyboardHeight > 0 ? 20 : 20) }
          ]}
          onScrollToIndexFailed={(info) => {
            // 处理滚动失败的情况
            console.log('滚动到索引失败:', info);
          }}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
        />
      </KeyboardAvoidingView>

      {/* 分类选择模态框 */}
      {renderCategoryModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    textAlign: 'center',
  },
  debugContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  ideaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentIcon: {
    fontSize: 16,
  },
  ideaInput: {
    flex: 1,
    fontSize: 16,
    color: '#343a40',
    paddingVertical: 4,
    minHeight: 24,
  },
  typeIndicator: {
    fontSize: 10,
    color: '#adb5bd',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    textAlign: 'center',
    marginBottom: 20,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#343a40',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6c757d',
  },
  ideaTextContainer: {
    flex: 1,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  ideaText: {
    fontSize: 16,
    color: '#343a40',
    lineHeight: 20,
  },
});