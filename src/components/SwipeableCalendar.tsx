import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { ideaDB } from '../utils/IdeaDatabase';

interface CalendarDay {
  day: number;
  dateString: string;
  hasIdeas: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
}

interface MonthData {
  year: number;
  month: number;
  days: CalendarDay[];
}

interface SwipeableCalendarProps {
  visible: boolean;
  currentDateString: string;
  onClose: () => void;
  onDateSelect: (dateString: string) => void;
}

const SwipeableCalendar: React.FC<SwipeableCalendarProps> = ({
  visible,
  currentDateString,
  onClose,
  onDateSelect,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date(currentDateString);
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  });
  const [datesWithIdeas, setDatesWithIdeas] = useState<{ [key: string]: string[] }>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // 月份数据缓存
  const monthsCache = useRef<Map<string, MonthData>>(new Map());
  const isInitializedRef = useRef(false);

  // 获取或生成指定月份的数据（带缓存）
  const getOrGenerateMonthData = useCallback((year: number, month: number): MonthData => {
    const monthKey = `${year}-${month}`;
    
    // 检查缓存
    if (monthsCache.current.has(monthKey)) {
      return monthsCache.current.get(monthKey)!;
    }
    
    // 生成新的月份数据
    console.log(`📅 Generating data for ${year}-${month}`);
    const monthData: MonthData = {
      year,
      month,
      days: generateBasicDaysForMonth(year, month, currentDateString),
    };
    
    // 存入缓存
    monthsCache.current.set(monthKey, monthData);
    return monthData;
  }, [currentDateString]);

  // 加载指定月份的想法日期
  const loadMonthIdeas = async (year: number, month: number) => {
    try {
      console.log(`📅 Starting DB query for ${year}-${month}`);
      const dates = await ideaDB.getDatesWithIdeasByMonth(year, month);
      console.log(`📅 DB query result for ${year}-${month}:`, dates.length, 'dates');
      const monthKey = `${year}-${month}`;
      setDatesWithIdeas(prev => ({
        ...prev,
        [monthKey]: dates,
      }));
    } catch (error) {
      console.error('Failed to load month ideas:', error);
    }
  };

  // 检查月份是否已加载数据
  const isMonthLoaded = useCallback((year: number, month: number) => {
    const monthKey = `${year}-${month}`;
    return datesWithIdeas.hasOwnProperty(monthKey);
  }, [datesWithIdeas]);

  // 加载指定月份数据（只加载当前月份）
  const smartLoadMonthIdeas = useCallback(async (targetYear: number, targetMonth: number) => {
    // 只加载当前月份
    if (!isMonthLoaded(targetYear, targetMonth)) {
      console.log(`📅 Loading month: ${targetYear}-${targetMonth}`);
      
      try {
        await loadMonthIdeas(targetYear, targetMonth);
        console.log(`📅 Successfully loaded ${targetYear}-${targetMonth}`);
      } catch (error) {
        console.error('Failed to load month:', error);
      }
    } else {
      console.log(`📅 Month ${targetYear}-${targetMonth} already loaded`);
    }
  }, [isMonthLoaded]);

  // 加载当前月份的想法数据（包含相邻月份预加载）
  const loadCurrentMonthIdeas = async () => {
    const today = new Date(currentDateString);
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    setIsLoading(true);
    
    try {
      // 使用智能加载，会自动加载当前月份和相邻月份
      await smartLoadMonthIdeas(currentYear, currentMonth);
      console.log(`📅 Initial load complete: ${currentYear}-${currentMonth}`);
    } catch (error) {
      console.error('Failed to load current month ideas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 生成基础天数结构（不包含想法数据）
  const generateBasicDaysForMonth = useCallback((year: number, month: number, selectedDate: string): CalendarDay[] => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: CalendarDay[] = [];
    
    // 添加上个月的尾部天数
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const dateString = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateString,
        hasIdeas: false, // 默认为false，后续异步更新
        isToday: dateString === selectedDate,
        isCurrentMonth: false,
      });
    }
    
    // 添加当月的天数
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateString,
        hasIdeas: false, // 默认为false，后续异步更新
        isToday: dateString === selectedDate,
        isCurrentMonth: true,
      });
    }
    
    // 添加下个月的开头天数，补齐6行
    const remainingCells = 42 - days.length; // 6行 * 7天 = 42
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    for (let day = 1; day <= remainingCells; day++) {
      const dateString = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateString,
        hasIdeas: false, // 默认为false，后续异步更新
        isToday: dateString === selectedDate,
        isCurrentMonth: false,
      });
    }
    
    return days;
  }, []);

  // 生成指定月份的天数数据（包含想法数据）
  const generateDaysForMonth = (year: number, month: number, selectedDate: string): CalendarDay[] => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: CalendarDay[] = [];
    const monthKey = `${year}-${month}`;
    const monthDatesWithIdeas = datesWithIdeas[monthKey] || [];
    
    // 添加上个月的尾部天数
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const dateString = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateString,
        hasIdeas: false,
        isToday: dateString === selectedDate,
        isCurrentMonth: false,
      });
    }
    
    // 添加当月的天数
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateString,
        hasIdeas: monthDatesWithIdeas.includes(dateString),
        isToday: dateString === selectedDate,
        isCurrentMonth: true,
      });
    }
    
    // 添加下个月的开头天数，补齐6行
    const remainingCells = 42 - days.length; // 6行 * 7天 = 42
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    for (let day = 1; day <= remainingCells; day++) {
      const dateString = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateString,
        hasIdeas: false,
        isToday: dateString === selectedDate,
        isCurrentMonth: false,
      });
    }
    
    return days;
  };



  // 初始化
  useEffect(() => {
    console.log('📅 useEffect triggered:', { visible, isInitialized: isInitializedRef.current });
    
    if (visible && !isInitializedRef.current) {
      console.log('📅 Initializing calendar...');
      
      // 清空之前的数据，确保重新查询
      setDatesWithIdeas({});
      monthsCache.current.clear();
      console.log('📅 Cleared previous data');
      
      // 生成当前月份数据
      getOrGenerateMonthData(currentMonth.year, currentMonth.month);
      
      // 只加载当前月份的数据
      loadCurrentMonthIdeas();
      
      isInitializedRef.current = true;
      console.log('📅 Calendar initialization complete');
    } else if (!visible) {
      // 模态框关闭时重置初始化状态
      isInitializedRef.current = false;
      console.log('📅 Calendar closed, reset initialization');
    }
  }, [visible, getOrGenerateMonthData, currentMonth]);

  // 获取当前月份的实时数据（用于渲染）
  const getCurrentMonthData = useMemo((): MonthData => {
    return {
      year: currentMonth.year,
      month: currentMonth.month,
      days: generateDaysForMonth(currentMonth.year, currentMonth.month, currentDateString),
    };
  }, [currentMonth.year, currentMonth.month, currentDateString, datesWithIdeas]);

  // 渲染单个月份
  const renderMonth = ({ item }: { item: MonthData }) => (
    <View style={styles.monthContainer}>
      <Text style={styles.monthTitle}>
        {item.year}年{item.month}月
      </Text>
      
      {/* 星期标题 */}
      <View style={styles.weekRow}>
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <View key={day} style={styles.weekDayHeader}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>
      
      {/* 日历网格 */}
      <View style={styles.calendarGrid}>
        {Array.from({ length: 6 }, (_, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {item.days.slice(weekIndex * 7, weekIndex * 7 + 7).map((dayData, dayIndex) => (
              <TouchableOpacity
                key={dayIndex}
                style={[
                  styles.dayCell,
                  !dayData.isCurrentMonth && styles.otherMonthDay,
                  dayData.hasIdeas && dayData.isCurrentMonth && styles.dayWithIdeas,
                  dayData.isToday && styles.todayCell
                ]}
                onPress={() => dayData.isCurrentMonth && onDateSelect(dayData.dateString)}
                disabled={!dayData.isCurrentMonth}
              >
                <Text style={[
                  styles.dayText,
                  !dayData.isCurrentMonth && styles.otherMonthText,
                  dayData.hasIdeas && dayData.isCurrentMonth && styles.dayWithIdeasText,
                  dayData.isToday && styles.todayText
                ]}>
                  {dayData.day}
                </Text>
                {dayData.hasIdeas && dayData.isCurrentMonth && (
                  <View style={styles.ideaDot} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );

  // 切换到上个月
  const goToPrevMonth = useCallback(() => {
    const prevMonth = currentMonth.month === 1 ? 12 : currentMonth.month - 1;
    const prevYear = currentMonth.month === 1 ? currentMonth.year - 1 : currentMonth.year;
    
    setCurrentMonth({ year: prevYear, month: prevMonth });
    
    // 生成月份数据（如果还没有的话）
    getOrGenerateMonthData(prevYear, prevMonth);
    
    // 智能加载数据
    smartLoadMonthIdeas(prevYear, prevMonth);
  }, [currentMonth, getOrGenerateMonthData, smartLoadMonthIdeas]);

  // 切换到下个月
  const goToNextMonth = useCallback(() => {
    const nextMonth = currentMonth.month === 12 ? 1 : currentMonth.month + 1;
    const nextYear = currentMonth.month === 12 ? currentMonth.year + 1 : currentMonth.year;
    
    setCurrentMonth({ year: nextYear, month: nextMonth });
    
    // 生成月份数据（如果还没有的话）
    getOrGenerateMonthData(nextYear, nextMonth);
    
    // 智能加载数据
    smartLoadMonthIdeas(nextYear, nextMonth);
  }, [currentMonth, getOrGenerateMonthData, smartLoadMonthIdeas]);

  // 处理滑动手势
  const onGestureEvent = useCallback((event: any) => {
    // 不需要在这里处理，主要逻辑在 onHandlerStateChange
  }, []);

  const onHandlerStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // 判断滑动方向和距离
      const threshold = 50; // 最小滑动距离
      const velocityThreshold = 300; // 最小滑动速度
      
      if (Math.abs(translationX) > threshold || Math.abs(velocityX) > velocityThreshold) {
        if (translationX > 0 || velocityX > 0) {
          // 向右滑动 - 上个月
          goToPrevMonth();
        } else {
          // 向左滑动 - 下个月
          goToNextMonth();
        }
      }
    }
  }, [goToPrevMonth, goToNextMonth]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.calendarModalContent}>
          {isLoading && (
            <View style={styles.loadingIndicator}>
              <Text style={styles.loadingText}>加载中...</Text>
            </View>
          )}
          
          {/* 月份导航 */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            
            <Text style={styles.currentMonthTitle}>
              {currentMonth.year}年{currentMonth.month}月
            </Text>
            
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>
          
          {/* 当前月份日历 - 支持滑动 */}
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetX={[-10, 10]}
            failOffsetY={[-15, 15]}
          >
            <View>
              {renderMonth({ item: getCurrentMonthData })}
            </View>
          </PanGestureHandler>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>关闭</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '95%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  monthContainer: {
    paddingHorizontal: 10,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  currentMonthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#343a40',
    textAlign: 'center',
    marginBottom: 20,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  calendarGrid: {
    marginBottom: 20,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    borderRadius: 8,
    position: 'relative',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  dayWithIdeas: {
    backgroundColor: '#e3f2fd',
  },
  todayCell: {
    backgroundColor: '#2196f3',
  },
  dayText: {
    fontSize: 16,
    color: '#343a40',
  },
  otherMonthText: {
    color: '#adb5bd',
  },
  dayWithIdeasText: {
    color: '#1976d2',
    fontWeight: '600',
  },
  todayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  ideaDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ff5722',
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6c757d',
  },
  loadingIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  loadingText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  emptyContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
  },
});

export default SwipeableCalendar; 