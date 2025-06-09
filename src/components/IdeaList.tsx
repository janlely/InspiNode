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
import { ideaDB, NewIdea, UpdateIdea } from '../utils/IdeaDatabase';
import { ContentType } from '../Types';
import { 
  CONTENT_TYPES, 
  detectContentType, 
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
}

export const IdeaList: React.FC<IdeaListProps> = ({
  ideas,
  setIdeas,
  currentDateString,
  showEmptyInput = true,
  onScreenPress,
}) => {
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
      console.log('🔄 Executing auto-save for new idea');
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
    setIdeas(prev => 
      prev.map(idea => 
        idea.id === id ? { ...idea, text } : idea
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
        const newIdea: NewIdea = {
          hint: idea.text.trim(),
          detail: '',
          date: currentDateString,
          category: getFinalContentType(idea.text, idea.manualCategory),
          completed: idea.completed || false,
        };
        
        const dbId = await ideaDB.addIdea(newIdea);
        
        setIdeas(prev => 
          prev.map(i => 
            i.id === id ? { ...i, dbId } : i
          )
        );
      }
    } catch (error) {
      console.error('❌ Failed to save idea:', error);
      Alert.alert('错误', '保存想法失败');
    }
  }, [ideas, currentDateString, setIdeas]);

  // 处理点击屏幕空白区域
  const handleScreenPress = useCallback(() => {
    if (editingIdeaId) {
      finishEditingIdea(editingIdeaId);
    }
    
    if (emptyInputValue.trim()) {
      setShouldSaveEmptyInput(true);
    }
    
    Keyboard.dismiss();
    onScreenPress?.();
  }, [editingIdeaId, finishEditingIdea, emptyInputValue, onScreenPress]);

  // 处理输入框聚焦
  const handleInputFocus = useCallback((inputId: string, index: number) => {
    setTimeout(() => {
      if (flatListRef.current && keyboardVisible && index > 2) {
        try {
          if (inputId === 'empty') {
            flatListRef.current.scrollToEnd({ animated: true });
          } else {
            flatListRef.current.scrollToIndex({
              index: index,
              animated: true,
              viewPosition: 0.25,
            });
          }
        } catch (error) {
          // 滚动失败时忽略错误
        }
      }
    }, 300);
  }, [keyboardVisible]);

  // 处理分类选择
  const handleIconPress = (ideaId: string) => {
    setSelectedIdeaForCategory(ideaId);
    setShowCategoryModal(true);
  };

  const handleEmptyInputIconPress = () => {
    setSelectedIdeaForCategory('empty');
    setShowCategoryModal(true);
  };

  // 处理TODO完成状态切换
  const handleTodoToggle = async (ideaId: string) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;
    
    const newCompletedState = !idea.completed;
    
    setIdeas(prev => 
      prev.map(i => 
        i.id === ideaId ? { ...i, completed: newCompletedState } : i
      )
    );
    
    if (idea.dbId) {
      try {
        await ideaDB.updateIdea(idea.dbId, { completed: newCompletedState });
        console.log(`✅ TODO ${ideaId} marked as ${newCompletedState ? 'completed' : 'incomplete'}`);
      } catch (error) {
        console.error('❌ Failed to update TODO status:', error);
        Alert.alert('错误', '更新待办状态失败');
        setIdeas(prev => 
          prev.map(i => 
            i.id === ideaId ? { ...i, completed: !newCompletedState } : i
          )
        );
      }
    }
  };

  const handleCategorySelect = async (category: ContentType) => {
    if (selectedIdeaForCategory === 'empty') {
      setEmptyInputCategory(category);
    } else if (selectedIdeaForCategory) {
      setIdeas(prev => 
        prev.map(idea => 
          idea.id === selectedIdeaForCategory 
            ? { ...idea, manualCategory: category }
            : idea
        )
      );
      
      const targetIdea = ideas.find(idea => idea.id === selectedIdeaForCategory);
      if (targetIdea?.dbId) {
        try {
          await ideaDB.updateIdea(targetIdea.dbId, { category });
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
      Alert.alert('错误', '创建想法失败');
    }
  };

  const handleEmptyInputChange = (text: string) => {
    setEmptyInputValue(text);
  };

  // 渲染想法项目
  const renderIdeaItem = ({ item, index }: { item: IdeaItem; index: number }) => {
    const isEditing = editingIdeaId === item.id;
    const isTodo = getFinalContentType(item.text, item.manualCategory) === ContentType.TODO;
    
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
            style={[styles.ideaInput, item.completed && isTodo && styles.completedIdeaInput]}
            value={item.text}
            onChangeText={(text) => updateIdea(item.id, text)}
            placeholder="记录你的想法..."
            placeholderTextColor="#999"
            multiline={false}
            returnKeyType="done"
            onSubmitEditing={() => finishEditingIdea(item.id)}
            onBlur={() => {
              setTimeout(() => {
                if (editingIdeaId === item.id) {
                  finishEditingIdea(item.id);
                }
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
            <Text style={[styles.ideaText, item.completed && isTodo && styles.completedIdeaText]}>
              {item.text}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* 只有TODO类型才显示复选框 */}
        {isTodo && (
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => handleTodoToggle(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
              {item.completed && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
          </TouchableOpacity>
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

  // 准备渲染的数据
  const renderData = React.useMemo(() => {
    if (showEmptyInput) {
      return [...ideas, { id: 'empty', text: emptyInputValue }];
    }
    return ideas;
  }, [ideas, emptyInputValue, showEmptyInput]);

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
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // 完成状态的文本样式
  completedIdeaText: {
    textDecorationLine: 'line-through',
    color: '#6c757d',
    opacity: 0.7,
  },
  completedIdeaInput: {
    textDecorationLine: 'line-through',
    color: '#6c757d',
    opacity: 0.7,
  },
});

export default IdeaList; 