import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Pressable,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardAnimation } from 'react-native-keyboard-controller';
import Lucide from '@react-native-vector-icons/lucide';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { RootStackParamList, ContentType } from '../Types';
import { ideaDB } from '../utils/IdeaDatabase';
import SwipeableCalendar from '../components/SwipeableCalendar';
import IdeaList, { IdeaItem } from '../components/IdeaList';
import { getFinalContentType } from '../utils/ContentTypeUtils';
import { NewIdea } from '../Types';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function Home() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<HomeNavigationProp>();
  const insets = useSafeAreaInsets();
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [currentDate, setCurrentDate] = useState('');
  const [currentDateString, setCurrentDateString] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 底部输入区域相关状态
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<'keyboard' | 'voice'>('keyboard');
  const [isRecording, setIsRecording] = useState(false);

  // 焦点状态管理
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [isBottomInputFocused, setIsBottomInputFocused] = useState(false);

  // 键盘动画
  const { height, progress } = useKeyboardAnimation();
  
  // IdeaList 滚动控制
  const ideaListRef = useRef<{ 
    scrollToEnd: () => void;
    scrollToIndex: (index: number) => void;
  } | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  // 监听键盘动画，根据焦点类型执行不同的滚动行为
  useEffect(() => {
    const listener = progress.addListener(({ value }) => {
      // console.log('🔍 Keyboard progress changed:', value);
      // 当键盘开始拉起时（progress > 0.1）执行相应的滚动行为
      if (value > 0.1 && ideaListRef.current) {
        setTimeout(() => {
          if (isBottomInputFocused) {
            // 底部输入框：滚动到底部
            ideaListRef.current?.scrollToEnd();
          } else if (focusedItemIndex !== null) {
            // 列表项：滚动到指定索引的顶部
            ideaListRef.current?.scrollToIndex(focusedItemIndex);
          }
        }, 100); // 延迟一下确保动画流畅
      }
    });

    return () => {
      progress.removeListener(listener);
    };
  }, [progress, isBottomInputFocused, focusedItemIndex]);



  const initializeApp = async () => {
    try {
      // 初始化数据库
      await ideaDB.initialize();
      
      // 设置当前日期
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      };
      const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';
      setCurrentDate(now.toLocaleDateString(locale, options));
      
      // 设置日期字符串（用于数据库查询）
      const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD格式
      setCurrentDateString(dateString);
      
      // 加载今天的想法
      await loadTodayIdeas(dateString);
      
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      Alert.alert(t('common.error'), t('errors.cannotInitApp'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadTodayIdeas = async (dateString: string) => {
    try {
      const dbIdeas = await ideaDB.getIdeasByDate(dateString);
      
      const formattedIdeas: IdeaItem[] = dbIdeas.map((dbIdea) => ({
        id: dbIdea.id.toString(),
        hint: dbIdea.hint,
        dbId: dbIdea.id,
        manualCategory: dbIdea.category || undefined,
        completed: !!dbIdea.completed, // 转换为boolean类型
      }));
      
      setIdeas(formattedIdeas);
    } catch (error) {
      console.error('❌ Failed to load ideas:', error);
      Alert.alert(t('common.error'), t('errors.cannotLoadIdeas'));
    }
  };

  // 跳转到指定日期
  const navigateToDate = async (dateString: string) => {
    try {
      // 关闭日历模态框
      setShowCalendarModal(false);
      
      // 更新当前日期字符串
      setCurrentDateString(dateString);
      
      // 更新显示的日期
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      };
      const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';
      setCurrentDate(date.toLocaleDateString(locale, options));
      
      // 加载该日期的想法
      await loadTodayIdeas(dateString);
      
    } catch (error) {
      console.error('❌ Failed to navigate to date:', error);
      Alert.alert(t('common.error'), t('errors.cannotNavigateDate'));
    }
  };

  // 计算分类统计
  const categoryStats = React.useMemo(() => {
    const todoItems = ideas.filter(i => getFinalContentType(i.hint, i.manualCategory) === ContentType.TODO);
    const todoCompleted = todoItems.filter(i => i.completed).length;
    const todoTotal = todoItems.length;
    const idea = ideas.filter(i => getFinalContentType(i.hint, i.manualCategory) === ContentType.IDEA).length;
    const learning = ideas.filter(i => getFinalContentType(i.hint, i.manualCategory) === ContentType.LEARNING).length;
    const note = ideas.filter(i => getFinalContentType(i.hint, i.manualCategory) === ContentType.NOTE).length;
    
    return { todo: todoTotal, todoCompleted, idea, learning, note };
  }, [ideas]);

  // 发送文本消息
  const handleSendMessage = async () => {
    if (inputText.trim()) {
      try {
        const finalCategory = getFinalContentType(inputText);
        const newIdea: NewIdea = {
          hint: inputText.trim(),
          detail: '',
          date: currentDateString,
          category: finalCategory,
          completed: false,
        };
        
        const dbId = await ideaDB.addIdea(newIdea);
        
        const newIdeaItem: IdeaItem = {
          id: Date.now().toString(),
          hint: inputText.trim(),
          dbId: dbId,
          completed: false,
        };
        
        setIdeas(prev => [...prev, newIdeaItem]);
        setInputText('');
        
        // 添加想法后滚动到底部，让用户看到新添加的内容
        setTimeout(() => {
          ideaListRef.current?.scrollToEnd();
        }, 100);
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        Alert.alert(t('common.error'), t('errors.cannotCreateIdea'));
      }
    }
  };

  // 切换输入模式
  const toggleInputMode = () => {
    setInputMode(prev => prev === 'keyboard' ? 'voice' : 'keyboard');
  };

  // 开始录音
  const startRecording = () => {
    setIsRecording(true);
    // TODO: 实现录音功能
    console.log('TODO: 开始录音');
  };

  // 结束录音
  const stopRecording = () => {
    setIsRecording(false);
    // TODO: 实现录音结束和语音识别
    console.log('TODO: 结束录音并进行语音识别');
    
    // 临时示例：模拟语音识别结果
    // const recognizedText = "这是语音识别的结果";
    // setInputText(recognizedText);
  };

  if (isLoading) {
    return (
      <View style={[
        styles.container, 
        styles.loadingContainer,
        { backgroundColor: theme.backgrounds.primary }
      ]}>
        <Text style={[
          styles.loadingText,
          { color: theme.texts.secondary }
        ]}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.backgrounds.primary,
      }
    ]}
    onLayout={(event) => {
      const { height: layoutHeight } = event.nativeEvent.layout;
      // 不再需要记录屏幕高度
    }}>
      
      {/* 主内容区域 - 动态调整高度 */}
      <View style={[
        styles.contentContainer,
      ]}>
        {/* 日期头部 */}
        <View style={[
          styles.header,
          { 
            backgroundColor: theme.backgrounds.primary,
            borderBottomColor: theme.borders.primary,
            paddingTop: insets.top + 20, // 使用动态安全区域 + 额外间距
          }
        ]}>
          <View style={styles.headerRow}>
            {/* 日历按钮 */}
            <TouchableOpacity 
              style={styles.calendarButton}
              onPress={() => setShowCalendarModal(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.calendarIcon, { color: theme.texts.secondary }]}>📅</Text>
            </TouchableOpacity>
            
            {/* 日期与统计信息的容器 */}
            <View style={styles.centerContent}>
              <Text style={[styles.dateText, { color: theme.texts.primary }]}>
                {currentDate}
              </Text>
              <View style={styles.statsContainer}>
                <Text style={[styles.statsText, { color: theme.texts.secondary }]}>
                  📝{categoryStats.todoCompleted}/{categoryStats.todo} | 💡{categoryStats.idea} | 📚{categoryStats.learning} | 📄{categoryStats.note}
                </Text>
              </View>
            </View>
            
            {/* 搜索按钮 */}
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => navigation.navigate('Search')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.searchIcon, { color: theme.texts.secondary }]}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 想法列表 */}
        <View style={[
          styles.listContainer,
          // {
          //   paddingBottom: 80, // 为输入区域留出固定空间
          // }
        ]}>
          <IdeaList
            ideas={ideas}
            setIdeas={setIdeas}
            currentDateString={currentDateString}
            navigation={navigation}
            onRef={(ref) => { ideaListRef.current = ref; }}
            onItemFocus={(index) => {
              setFocusedItemIndex(index);
              setIsBottomInputFocused(false); // 清除底部输入框焦点状态
            }}
          />
        </View>
      </View>

      {/* 底部输入区域 */}
      <Animated.View style={[
        styles.inputContainer,
        {
          backgroundColor: theme.backgrounds.secondary,
          borderTopColor: theme.borders.primary,
          paddingBottom: insets.bottom + 10,
          // marginBottom: 400
          transform: [{ translateY: height}],
        }
      ]}>
        {/* 模式切换按钮 */}
        <TouchableOpacity
          style={[
            styles.modeToggleButton,
            { backgroundColor: theme.backgrounds.tertiary }
          ]}
          onPress={toggleInputMode}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {inputMode === 'keyboard' ? (
            <Lucide 
              name="audio-lines" 
              size={20} 
              color={theme.texts.secondary} 
            />
          ) : (
            <FontAwesome 
              name="keyboard-o" 
              size={18} 
              color={theme.texts.secondary} 
            />
          )}
        </TouchableOpacity>

        {/* 输入区域 */}
        <View style={styles.inputAreaContainer}>
          {inputMode === 'keyboard' ? (
            /* 键盘模式 - 文本输入框 */
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgrounds.primary,
                  borderColor: theme.borders.input,
                  color: theme.texts.primary,
                }
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('placeholders.recordIdea')}
              placeholderTextColor={theme.texts.tertiary}
              multiline={true}
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
              onFocus={() => {
                setIsBottomInputFocused(true);
                setFocusedItemIndex(null); // 清除列表项焦点状态
              }}
              onBlur={() => setIsBottomInputFocused(false)}
            />
          ) : (
            /* 语音模式 - 录音按钮 */
            <Pressable
              style={[
                styles.voiceButton,
                {
                  backgroundColor: isRecording ? theme.buttons.danger : theme.backgrounds.primary,
                  borderColor: theme.borders.input,
                }
              ]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              delayLongPress={100}
            >
              <Text style={[
                styles.voiceButtonText,
                { color: isRecording ? theme.buttons.dangerText : theme.texts.secondary }
              ]}>
                {isRecording ? t('buttons.recording') : t('buttons.pressToRecord')}
              </Text>
            </Pressable>
          )}
        </View>

        {/* 发送按钮 (仅在键盘模式下显示) */}
        {inputMode === 'keyboard' && (
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? theme.buttons.primary : theme.buttons.disabled,
              }
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[
              styles.sendButtonText,
              {
                color: inputText.trim() ? theme.buttons.primaryText : theme.buttons.disabledText,
              }
            ]}>
              {t('buttons.add')}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
      
      {/* 日历模态框 */}
      <SwipeableCalendar
        visible={showCalendarModal}
        currentDateString={currentDateString}
        onClose={() => setShowCalendarModal(false)}
        onDateSelect={navigateToDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60, // 设置最小高度确保垂直居中
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16, // 为左右按钮留出空间
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  calendarButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarIcon: {
    fontSize: 36,
  },
  statsContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    textAlign: 'center',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 28,
  },
  // 新增样式 - 列表容器
  listContainer: {
    flex: 1,
  },
  // 新增样式 - 底部输入区域
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    // minHeight: 68, // 44 + 12*2 padding
  },
  modeToggleButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  inputAreaContainer: {
    flex: 1,
    marginRight: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 44,
  },
  voiceButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
    height: 44,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});