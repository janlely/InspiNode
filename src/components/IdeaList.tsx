import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Keyboard,
} from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { ideaDB } from '../utils/IdeaDatabase';
import { UpdateIdea } from '../Types'
import { ContentType } from '../Types';
import { 
  CONTENT_TYPES, 
  getFinalContentType, 
} from '../utils/ContentTypeUtils';

export interface IdeaItem {
  id: string;
  text: string;
  dbId?: number; // 数据库中的真实ID
  manualCategory?: string; // 手动选择的分类
  completed?: boolean; // 完成状态
}

interface IdeaListProps {
  ideas: IdeaItem[];
  setIdeas: React.Dispatch<React.SetStateAction<IdeaItem[]>>;
  currentDateString: string;
  navigation?: any; // 导航对象，用于跳转到BlockEditor
  onRef?: (ref: { scrollToEnd: () => void } | null) => void; // 暴露滚动方法
}

export const IdeaList: React.FC<IdeaListProps> = ({
  ideas,
  setIdeas,
  navigation,
  onRef,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedIdeaForCategory, setSelectedIdeaForCategory] = useState<string | null>(null);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const flatListRef = useRef<FlatList | null>(null);
  const editingIdeaIdRef = useRef<string | null>(null);

  // 保持 ref 与 state 同步
  useEffect(() => {
    editingIdeaIdRef.current = editingIdeaId;
  }, [editingIdeaId]);

  useEffect(() => {
    // 键盘事件监听
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        const currentEditingId = editingIdeaIdRef.current;
        
        setTimeout(() => {
          const hasActiveInput = Object.values(inputRefs.current).some(ref => ref?.isFocused());
          
          if (!hasActiveInput) {
            if (currentEditingId) {
              setEditingIdeaId(null);
            }
          }
        }, 200);
      }
    );
    
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // 暴露滚动方法给父组件
  useEffect(() => {
    if (onRef) {
      onRef({
        scrollToEnd: () => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      });
    }
    return () => {
      if (onRef) {
        onRef(null);
      }
    };
  }, [onRef]);

  // 点击想法文本，进入编辑模式
  const handleIdeaPress = (ideaId: string) => {
    if (editingIdeaId && editingIdeaId !== ideaId) {
      finishEditingIdea(editingIdeaId);
    }
    
    setEditingIdeaId(ideaId);
    setTimeout(() => {
      inputRefs.current[ideaId]?.focus();
    }, 100);
  };

  // 更新想法文本
  const updateIdea = async (id: string, text: string) => {
    const filteredText = text.replace(/\n/g, '');
    setIdeas(prev => 
      prev.map(idea => 
        idea.id === id ? { ...idea, text: filteredText } : idea
      )
    );
  };

  // 完成编辑（保存想法）
  const finishEditingIdea = useCallback(async (id: string) => {
    const idea = ideas.find(i => i.id === id);
    if (!idea) return;
    
    setEditingIdeaId(null);
    
    if (idea.text.trim() === '') {
      setIdeas(prev => prev.filter(i => i.id !== id));
      
      if (idea.dbId) {
        try {
          await ideaDB.deleteIdea(idea.dbId);
        } catch (error) {
          console.error(`❌ Failed to delete idea ${idea.dbId}:`, error);
        }
      }
      return;
    }
    
    try {
      if (idea.dbId) {
        const updatedRecord: UpdateIdea = {
          hint: idea.text.trim(),
        };
        await ideaDB.updateIdea(idea.dbId, updatedRecord);
      }
    } catch (error) {
      console.error(`❌ Failed to update idea ${idea.dbId}:`, error);
    }
  }, [ideas, setIdeas]);

  // 处理输入框焦点事件
  const handleInputFocus = (ideaId: string, index: number) => {
    if (flatListRef.current && index >= 0) {
      try {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (error) {
        // 如果scrollToIndex失败，使用fallback
      }
    }
  };

  // 点击图标打开分类选择
  const handleIconPress = (ideaId: string) => {
    setSelectedIdeaForCategory(ideaId);
    setShowCategoryModal(true);
  };

  // 处理待办事项状态切换
  const handleTodoToggle = async (ideaId: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea || !idea.dbId) return;
    
    const newCompleted = !idea.completed;
    
    try {
      // 更新本地状态
      setIdeas(prev => 
        prev.map(i => 
          i.id === ideaId ? { ...i, completed: newCompleted } : i
        )
      );
      
      // 更新数据库
      await ideaDB.updateIdea(idea.dbId, { completed: newCompleted });
    } catch (error) {
      console.error('❌ Failed to toggle todo status:', error);
      // 回滚本地状态
      setIdeas(prev => 
        prev.map(i => 
          i.id === ideaId ? { ...i, completed: !newCompleted } : i
        )
      );
    }
  };

  // 处理分类选择
  const handleCategorySelect = async (category: ContentType) => {
    if (!selectedIdeaForCategory) return;
    
    const idea = ideas.find(i => i.id === selectedIdeaForCategory);
    if (!idea || !idea.dbId) return;
    
    try {
      // 更新本地状态
      setIdeas(prev => 
        prev.map(i => 
          i.id === selectedIdeaForCategory 
            ? { ...i, manualCategory: category }
            : i
        )
      );
      
      // 更新数据库
      await ideaDB.updateIdea(idea.dbId, { category });
    } catch (error) {
      console.error('❌ Failed to update category:', error);
    }
    
    setShowCategoryModal(false);
    setSelectedIdeaForCategory(null);
  };

  const renderIdeaItem = ({ item, index }: { item: IdeaItem; index: number }) => {
    const isEditing = editingIdeaId === item.id;
    const finalCategory = getFinalContentType(item.text, item.manualCategory);
    const contentConfig = CONTENT_TYPES[finalCategory];
    const showCheckbox = finalCategory === ContentType.TODO;

    return (
      <View
        style={[
          styles.ideaContainer,
          {
            backgroundColor: theme.backgrounds.secondary,
            borderColor: theme.borders.secondary,
          }
        ]}
      >
        {/* 分类图标 */}
        <TouchableOpacity
          style={styles.iconContainer}
          onPress={() => handleIconPress(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[
            styles.contentIcon,
            { color: theme.texts.secondary }
          ]}>
            {contentConfig.icon}
          </Text>
        </TouchableOpacity>

        {/* 想法内容 */}
        {isEditing ? (
          <TextInput
            ref={(ref) => { inputRefs.current[item.id] = ref; }}
            style={[
              styles.ideaInput,
              {
                backgroundColor: 'transparent',
                color: theme.texts.primary,
              }
            ]}
            value={item.text}
            onChangeText={(text) => updateIdea(item.id, text)}
            onBlur={() => finishEditingIdea(item.id)}
            onSubmitEditing={() => finishEditingIdea(item.id)}
            onFocus={() => handleInputFocus(item.id, index)}
            multiline={true}
            returnKeyType="done"
            blurOnSubmit={true}
            placeholder={`${t('placeholders.recordIdea')}`}
            placeholderTextColor={theme.texts.tertiary}
          />
        ) : (
          <TouchableOpacity
            style={styles.ideaTextContainer}
            onPress={() => handleIdeaPress(item.id)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.ideaText,
              {
                color: theme.texts.primary,
                textDecorationLine: item.completed ? 'line-through' : 'none',
                opacity: item.completed ? 0.6 : 1,
              }
            ]}>
              {item.text}
            </Text>
          </TouchableOpacity>
        )}

        {/* 待办事项复选框 */}
        {showCheckbox && (
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => handleTodoToggle(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[
              styles.checkbox,
              {
                backgroundColor: item.completed ? theme.buttons.primary : 'transparent',
                borderColor: item.completed ? theme.buttons.primary : theme.borders.input,
              }
            ]}>
              {item.completed && (
                <Text style={[
                  styles.checkmark,
                  { color: theme.buttons.primaryText }
                ]}>
                  ✓
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* 编辑按钮（跳转到BlockEditor）*/}
        {navigation && item.dbId && (
          <TouchableOpacity
            style={[
              styles.editButton,
              { backgroundColor: theme.backgrounds.tertiary }
            ]}
            onPress={() => {
              navigation.navigate('Editor', { idea: { ...item, id: item.dbId } });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              name="edit"
              size={14}
              color={theme.texts.secondary}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <Pressable
        style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        onPress={() => setShowCategoryModal(false)}
      >
        <Pressable
          style={[
            styles.modalContent,
            { backgroundColor: theme.backgrounds.primary }
          ]}
          onPress={() => {}} // 阻止事件冒泡
        >
          <Text style={[
            styles.modalTitle,
            { color: theme.texts.primary }
          ]}>
            选择分类
          </Text>
          
          {Object.entries(CONTENT_TYPES).map(([key, config]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryOption,
                { backgroundColor: theme.backgrounds.secondary }
              ]}
              onPress={() => handleCategorySelect(key as ContentType)}
            >
              <Text style={[
                styles.categoryIcon,
                { color: theme.texts.secondary }
              ]}>
                {config.icon}
              </Text>
              <Text style={[
                styles.categoryName,
                { color: theme.texts.primary }
              ]}>
                {config.name}
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCategoryModal(false)}
          >
            <Text style={[
              styles.cancelButtonText,
              { color: theme.texts.secondary }
            ]}>
              取消
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={flatListRef}
        data={ideas}
        renderItem={renderIdeaItem}
        keyExtractor={(item) => item.id}
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        ItemSeparatorComponent={() => (
          <View style={{ height: 16 }} />
        )}
        contentContainerStyle={[
          styles.listContent,
          { 
            paddingBottom: 20,
            flexGrow: 1, // 确保内容填满容器，改善滚动触摸区域
          }
        ]}
        onScrollToIndexFailed={() => {
          // 滚动失败时忽略
        }}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        ListFooterComponent={
          <View style={{ height: 450, width: '100%' }} />
        }
      />

      {/* 分类选择模态框 */}
      {renderCategoryModal()}
    </View>
  );
};

const styles = StyleSheet.create({
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
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
    paddingVertical: 4,
    height: 30,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
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
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
  ideaTextContainer: {
    flex: 1,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  ideaText: {
    fontSize: 16,
    lineHeight: 20,
  },
  // 复选框相关样式
  checkboxContainer: {
    marginLeft: 12,
    padding: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  // BlockEditor按钮样式
  editButton: {
    marginLeft: 8,
    width: 32,
    height: 32,
    backgroundColor: 'transparent',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
});

export default IdeaList; 