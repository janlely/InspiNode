import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme.js';
import { RootStackParamList, ContentType } from '../Types';
import { ideaDB } from '../utils/IdeaDatabase';
import SwipeableCalendar from '../components/SwipeableCalendar';
import IdeaList, { IdeaItem } from '../components/IdeaList';
import { getFinalContentType } from '../utils/ContentTypeUtils';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function Home() {
  const { t, i18n } = useTranslation();
  // @ts-ignore
  const { theme, getThemedStyle } = useTheme();
  const navigation = useNavigation<HomeNavigationProp>();
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [currentDate, setCurrentDate] = useState('');
  const [currentDateString, setCurrentDateString] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

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
        text: dbIdea.hint,
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
    const todoItems = ideas.filter(i => getFinalContentType(i.text, i.manualCategory) === ContentType.TODO);
    const todoCompleted = todoItems.filter(i => i.completed).length;
    const todoTotal = todoItems.length;
    const idea = ideas.filter(i => getFinalContentType(i.text, i.manualCategory) === ContentType.IDEA).length;
    const learning = ideas.filter(i => getFinalContentType(i.text, i.manualCategory) === ContentType.LEARNING).length;
    const note = ideas.filter(i => getFinalContentType(i.text, i.manualCategory) === ContentType.NOTE).length;
    
    return { todo: todoTotal, todoCompleted, idea, learning, note };
  }, [ideas]);

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

  const statusBarStyle = getThemedStyle.statusBar();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgrounds.primary }]}>
        <StatusBar 
          barStyle={statusBarStyle.barStyle}
          backgroundColor={statusBarStyle.backgroundColor}
        />
        
        {/* 日期头部 */}
        <View style={[
          styles.header,
          { 
            backgroundColor: theme.backgrounds.primary,
            borderBottomColor: theme.borders.primary
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
        <IdeaList
          ideas={ideas}
          setIdeas={setIdeas}
          currentDateString={currentDateString}
          showEmptyInput={true}
          navigation={navigation}
        />
        
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
});