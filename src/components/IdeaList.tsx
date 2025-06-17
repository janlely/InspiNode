import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  TouchableOpacity,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import { useTheme } from '../hooks/useTheme.js';
import { ideaDB } from '../utils/IdeaDatabase';
import { NewIdea, UpdateIdea } from '../Types'
import { ContentType } from '../Types';
import { 
  CONTENT_TYPES, 
  getFinalContentType, 
  getContentIcon 
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
  showEmptyInput?: boolean; // 是否显示空输入框
  onScreenPress?: () => void; // 点击屏幕空白区域的回调
  navigation?: any; // 导航对象，用于跳转到BlockEditor
}

export const IdeaList: React.FC<IdeaListProps> = ({
  ideas,
  setIdeas,
  currentDateString,
  showEmptyInput = true,
  onScreenPress,
  navigation,
}) => {
  const { t } = useTranslation();
  // @ts-ignore
  const { theme } = useTheme();
  const [emptyInputValue, setEmptyInputValue] = useState('');
  const [emptyInputCategory, setEmptyInputCategory] = useState<string | undefined>(undefined);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedIdeaForCategory, setSelectedIdeaForCategory] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [shouldSaveEmptyInput, setShouldSaveEmptyInput] = useState(false);
  
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const emptyInputRef = useRef<TextInput | null>(null);
  const flatListRef = useRef<FlatList | null>(null);
  const editingIdeaIdRef = useRef<string | null>(null);
  const emptyInputValueRef = useRef<string>('');

  // 保持 ref 与 state 同步
  useEffect(() => {
    editingIdeaIdRef.current = editingIdeaId;
  }, [editingIdeaId]);

  useEffect(() => {
    emptyInputValueRef.current = emptyInputValue;
  }, [emptyInputValue]);

  // 监听shouldSaveEmptyInput标记，执行保存
  useEffect(() => {
    if (shouldSaveEmptyInput && emptyInputValue.trim()) {
      const saveNewIdea = async () => {
        try {
          const finalCategory = getFinalContentType(emptyInputValue, emptyInputCategory);
          const newIdea: NewIdea = {
            hint: emptyInputValue.trim(),
            detail: '',
            date: currentDateString,
            category: finalCategory,
            completed: false,
          };
          
          const dbId = await ideaDB.addIdea(newIdea);
          
          const newIdeaItem: IdeaItem = {
            id: Date.now().toString(),
            text: emptyInputValue.trim(),
            dbId: dbId,
            manualCategory: emptyInputCategory,
            completed: false,
          };
          
          setIdeas(prev => [...prev, newIdeaItem]);
          setEmptyInputValue('');
          setEmptyInputCategory(undefined);
        } catch (error) {
          console.error('❌ Failed to auto-save new idea:', error);
        }
      };
      
      saveNewIdea();
      setShouldSaveEmptyInput(false);
    }
  }, [shouldSaveEmptyInput, emptyInputValue, emptyInputCategory, currentDateString, setIdeas]);

  useEffect(() => {
    // 键盘事件监听
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        const currentEditingId = editingIdeaIdRef.current;
        setKeyboardVisible(false);
        
        setTimeout(() => {
          const hasActiveInput = Object.values(inputRefs.current).some(ref => ref?.isFocused()) || 
                                emptyInputRef.current?.isFocused();
          
          if (!hasActiveInput) {
            if (currentEditingId) {
              setEditingIdeaId(null);
            }
            
            const currentEmptyValue = emptyInputValueRef.current;
            if (currentEmptyValue.trim()) {
              setShouldSaveEmptyInput(true);
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
          category: getFinalContentType(idea.text, idea.manualCategory),
          completed: idea.completed,
        };
        
        await ideaDB.updateIdea(idea.dbId, updatedRecord);
      } else {
        // 新建想法
        const finalCategory = getFinalContentType(idea.text, idea.manualCategory);
        const newIdea: NewIdea = {
          hint: idea.text.trim(),
          detail: '',
          date: currentDateString,
          category: finalCategory,
          completed: false,
        };
        
        const dbId = await ideaDB.addIdea(newIdea);
        
        setIdeas(prev => 
          prev.map(i => 
            i.id === id ? { ...i, dbId: dbId } : i
          )
        );
      }
    } catch (error) {
      console.error('❌ Failed to save idea:', error);
      Alert.alert(t('common.error'), t('errors.cannotSaveIdea'));
    }
  }, [ideas, currentDateString, setIdeas]);

  // 处理输入提交
  const handleInputSubmit = useCallback((id: string) => {
    finishEditingIdea(id);
  }, [finishEditingIdea]);

  // 处理输入框失焦
  const handleInputBlur = useCallback((id: string) => {
    setTimeout(() => {
      const hasActiveInput = Object.values(inputRefs.current).some(ref => ref?.isFocused()) || 
                            emptyInputRef.current?.isFocused();
      
      if (!hasActiveInput) {
        finishEditingIdea(id);
      }
    }, 200);
  }, [finishEditingIdea]);

  // 处理输入焦点
  const handleInputFocus = (ideaId: string, index: number) => {
    setEditingIdeaId(ideaId);
    
    // 延迟滚动以确保键盘完全显示
    setTimeout(() => {
      if (flatListRef.current && index >= 0) {
        try {
          flatListRef.current.scrollToIndex({ 
            index, 
            animated: true,
            viewPosition: 0.5,
          });
        } catch (error) {
          // 滚动失败时使用备选方案
        }
      }
    }, 300);
  };

  // 处理图标按钮点击（分类选择）
  const handleIconPress = (ideaId: string) => {
    setSelectedIdeaForCategory(ideaId);
    setShowCategoryModal(true);
  };

  const handleEmptyInputIconPress = () => {
    setSelectedIdeaForCategory('empty');
    setShowCategoryModal(true);
  };

  // 处理待办事项勾选
  const handleTodoToggle = async (ideaId: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;

    const newCompleted = !idea.completed;
    
    // 立即更新UI
    setIdeas(prev => 
      prev.map(i => 
        i.id === ideaId ? { ...i, completed: newCompleted } : i
      )
    );

    // 更新数据库
    if (idea.dbId) {
      try {
        await ideaDB.updateIdea(idea.dbId, { completed: newCompleted });
      } catch (error) {
        console.error('❌ Failed to update TODO status:', error);
        Alert.alert(t('common.error'), t('errors.cannotUpdateTodo'));
        setIdeas(prev => 
          prev.map(i => 
            i.id === ideaId ? { ...i, completed: !newCompleted } : i
          )
        );
      }
    }
  };

  // 处理分类选择
  const handleCategorySelect = async (category: ContentType) => {
    setShowCategoryModal(false);
    
    if (selectedIdeaForCategory === 'empty') {
      setEmptyInputCategory(category);
    } else if (selectedIdeaForCategory) {
      // 更新现有想法的分类
      const idea = ideas.find(i => i.id === selectedIdeaForCategory);
      if (idea && idea.dbId) {
        try {
          await ideaDB.updateIdea(idea.dbId, { category });
          setIdeas(prev => 
            prev.map(i => 
              i.id === selectedIdeaForCategory ? { ...i, manualCategory: category } : i
            )
          );
        } catch (error) {
          console.error('❌ Failed to update category:', error);
          Alert.alert(t('common.error'), t('errors.cannotUpdateCategory'));
        }
      }
    }
    
    setSelectedIdeaForCategory(null);
  };

  // 处理空输入框提交
  const handleEmptyInputSubmit = async () => {
    if (emptyInputValue.trim()) {
      try {
        const finalCategory = getFinalContentType(emptyInputValue, emptyInputCategory);
        const newIdea: NewIdea = {
          hint: emptyInputValue.trim(),
          detail: '',
          date: currentDateString,
          category: finalCategory,
          completed: false,
        };
        
        const dbId = await ideaDB.addIdea(newIdea);
        
        const newIdeaItem: IdeaItem = {
          id: Date.now().toString(),
          text: emptyInputValue.trim(),
          dbId: dbId,
          manualCategory: emptyInputCategory,
          completed: false,
        };
        
        setIdeas(prev => [...prev, newIdeaItem]);
        setEmptyInputValue('');
        setEmptyInputCategory(undefined);
      } catch (error) {
        console.error('❌ Failed to create idea:', error);
        Alert.alert(t('common.error'), t('errors.cannotCreateIdea'));
      }
    }
  };

  const handleEmptyInputChange = (text: string) => {
    const filteredText = text.replace(/\n/g, '');
    setEmptyInputValue(filteredText);
  };

  const renderIdeaItem = ({ item, index }: { item: IdeaItem; index: number }) => {
    const isEditing = editingIdeaId === item.id;
    const contentType = getFinalContentType(item.text, item.manualCategory);
    const contentIcon = getContentIcon(item.text, item.manualCategory);
    const isTodo = contentType === ContentType.TODO;
    const isCompleted = item.completed;

    return (
      <View style={[
        styles.ideaContainer,
        {
          backgroundColor: theme.backgrounds.secondary,
          shadowColor: theme.special.shadow,
          borderColor: theme.borders.card,
        }
      ]}>
        {/* 图标容器 */}
        <TouchableOpacity 
          style={styles.iconContainer}
          onPress={() => handleIconPress(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[
            styles.contentIcon,
            { color: theme.texts.secondary }
          ]}>
            {contentIcon}
          </Text>
        </TouchableOpacity>

        {/* 文本输入或显示 */}
        {isEditing ? (
          <TextInput
            ref={(ref) => { inputRefs.current[item.id] = ref; }}
            style={[
              styles.ideaInput,
              {
                color: theme.texts.primary,
                backgroundColor: theme.backgrounds.secondary,
              },
              isCompleted && {
                textDecorationLine: 'line-through',
                color: theme.texts.secondary,
                opacity: 0.7,
              }
            ]}
            value={item.text}
            onChangeText={(text) => updateIdea(item.id, text)}
            placeholder={t('placeholders.recordIdea')}
            placeholderTextColor={theme.texts.tertiary}
            multiline={false}
            returnKeyType="done"
            onSubmitEditing={() => handleInputSubmit(item.id)}
            onBlur={() => handleInputBlur(item.id)}
            onFocus={() => handleInputFocus(item.id, index)}
            blurOnSubmit={true}
            autoCapitalize="sentences"
            autoCorrect={true}
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
              },
              isCompleted && {
                textDecorationLine: 'line-through',
                color: theme.texts.secondary,
                opacity: 0.7,
              }
            ]}>
              {item.text}
            </Text>
          </TouchableOpacity>
        )}

        {/* BlockEditor 按钮 */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('Editor', { idea: {
            id: item.dbId || -1,
            hint: item.text,
            detail: '',
            date: currentDateString,
            category: getFinalContentType(item.text, item.manualCategory),
            completed: item.completed || false,
          }})}
        >
          <Icon name="expand" size={20} color={theme.texts.secondary} />
        </TouchableOpacity>

        {/* 待办事项复选框 */}
        {isTodo && (
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => handleTodoToggle(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[
              styles.checkbox,
              {
                borderColor: theme.borders.secondary,
                backgroundColor: theme.backgrounds.secondary,
              },
              isCompleted && {
                backgroundColor: theme.buttons.success,
                borderColor: theme.buttons.success,
              }
            ]}>
              {isCompleted && (
                <Text style={[
                  styles.checkmark,
                  { color: theme.buttons.successText }
                ]}>
                  ✓
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyTextBox = () => (
    <View style={[
      styles.ideaContainer,
      {
        backgroundColor: theme.backgrounds.secondary,
        shadowColor: theme.special.shadow,
        borderColor: theme.borders.card,
      }
    ]}>
      {/* 图标容器 */}
      <TouchableOpacity 
        style={styles.iconContainer}
        onPress={handleEmptyInputIconPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[
          styles.contentIcon,
          { color: theme.texts.secondary }
        ]}>
          {getContentIcon(emptyInputValue, emptyInputCategory)}
        </Text>
      </TouchableOpacity>

      {/* 文本输入 */}
      <TextInput
        ref={emptyInputRef}
        style={[
          styles.ideaInput,
          {
            color: theme.texts.primary,
            backgroundColor: theme.backgrounds.secondary,
          }
        ]}
        value={emptyInputValue}
        placeholder={t('placeholders.recordIdea')}
        placeholderTextColor={theme.texts.tertiary}
        multiline={false}
        returnKeyType="done"
        onChangeText={handleEmptyInputChange}
        onSubmitEditing={handleEmptyInputSubmit}
        onFocus={() => handleInputFocus('empty', ideas.length)}
        autoCapitalize="sentences"
        autoCorrect={true}
        blurOnSubmit={true}
      />
    </View>
  );

  const renderCategoryModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showCategoryModal}
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <Pressable 
        style={[
          styles.modalOverlay,
          { backgroundColor: theme.backgrounds.modal }
        ]}
        onPress={() => setShowCategoryModal(false)}
      >
        <Pressable 
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.backgrounds.secondary,
              shadowColor: theme.special.shadow,
            }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[
            styles.modalTitle,
            { color: theme.texts.primary }
          ]}>
            选择分类
          </Text>
          
          {Object.entries(CONTENT_TYPES).map(([type, config]) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.categoryOption,
                { backgroundColor: theme.buttons.secondary }
              ]}
              onPress={() => handleCategorySelect(type as ContentType)}
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

  // 处理屏幕空白区域点击
  const handleScreenPress = () => {
    if (editingIdeaId) {
      finishEditingIdea(editingIdeaId);
    }
    
    if (onScreenPress) {
      onScreenPress();
    }
  };

  // 准备渲染数据
  const renderData = React.useMemo(() => {
    if (showEmptyInput) {
      return [...ideas, { id: 'empty', text: emptyInputValue }];
    }
    return ideas;
  }, [ideas, showEmptyInput, emptyInputValue]);

  return (
    <TouchableWithoutFeedback onPress={handleScreenPress}>
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
            { paddingBottom: 20 }
          ]}
          onScrollToIndexFailed={() => {
            // 滚动失败时忽略
          }}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          ListFooterComponent={
            <Pressable
              style={{ height: 100, width: '100%' }}
              onPress={handleScreenPress}
            />
          }
        />

        {/* 分类选择模态框 */}
        {renderCategoryModal()}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
    marginBottom: 16,
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