import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ContentType } from '../Types';
import { ideaDB } from '../utils/IdeaDatabase';
import SwipeableCalendar from '../components/SwipeableCalendar';
import IdeaList, { IdeaItem } from '../components/IdeaList';
import { getFinalContentType } from '../utils/ContentTypeUtils';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function Home() {
  const navigation = useNavigation<HomeNavigationProp>();
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [currentDate, setCurrentDate] = useState('');
  const [currentDateString, setCurrentDateString] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      
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
      Alert.alert('错误', '加载想法失败');
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
      setCurrentDate(date.toLocaleDateString('zh-CN', options));
      
      // 加载该日期的想法
      await loadTodayIdeas(dateString);
      
    } catch (error) {
      console.error('❌ Failed to navigate to date:', error);
      Alert.alert('错误', '跳转日期失败');
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
          <View style={styles.headerRow}>
            {/* 日历按钮 */}
            <TouchableOpacity 
              style={styles.calendarButton}
              onPress={() => setShowCalendarModal(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.calendarIcon}>📅</Text>
            </TouchableOpacity>
            
            {/* 日期与统计信息的容器 */}
            <View style={styles.centerContent}>
              <Text style={styles.dateText}>{currentDate}</Text>
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
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
              <Text style={styles.searchIcon}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 想法列表 */}
        <IdeaList
          ideas={ideas}
          setIdeas={setIdeas}
          currentDateString={currentDateString}
          showEmptyInput={true}
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
    color: '#343a40',
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
    color: '#6c757d',
  },
  statsContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#6c757d',
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
    color: '#6c757d',
  },
});