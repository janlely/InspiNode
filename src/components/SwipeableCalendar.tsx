import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { Calendar, CalendarList, DateData, LocaleConfig } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { ideaDB } from '../utils/IdeaDatabase';

// 配置本地化，确保周日是第一天
const configureLocale = (language: string, t: any) => {
  if (language === 'zh') {
    LocaleConfig.locales['zh'] = {
      monthNames: t('calendar.months'),
      monthNamesShort: t('calendar.monthsShort'),
      dayNames: t('calendar.dayNames'),
      dayNamesShort: t('calendar.dayNamesShort'),
      today: t('common.today')
    };
    LocaleConfig.defaultLocale = 'zh';
  } else {
    LocaleConfig.locales['en'] = {
      monthNames: t('calendar.months'),
      monthNamesShort: t('calendar.monthsShort'),
      dayNames: t('calendar.dayNames'),
      dayNamesShort: t('calendar.dayNamesShort'),
      today: t('common.today')
    };
    LocaleConfig.defaultLocale = 'en';
  }
};

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
  const { t, i18n } = useTranslation();
  const [datesWithIdeas, setDatesWithIdeas] = useState<{ [key: string]: string[] }>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // 配置本地化
  useEffect(() => {
    configureLocale(i18n.language, t);
  }, [i18n.language, t]);
  
  // 计算日历宽度：屏幕宽度的95% - 容器padding
  const screenWidth = Dimensions.get('window').width;
  const calendarWidth = Math.floor(screenWidth * 0.95 - 40); // 95%宽度减去padding

  // 加载指定月份的想法日期
  const loadMonthIdeas = useCallback(async (year: number, month: number) => {
    try {
      const dates = await ideaDB.getDatesWithIdeasByMonth(year, month);
      const monthKey = `${year}-${month}`;
      setDatesWithIdeas(prev => ({
        ...prev,
        [monthKey]: dates,
      }));
    } catch (error) {
      console.error('Failed to load month ideas:', error);
    }
  }, []);

  // 检查月份是否已加载数据
  const isMonthLoaded = useCallback((year: number, month: number) => {
    const monthKey = `${year}-${month}`;
    return datesWithIdeas.hasOwnProperty(monthKey);
  }, [datesWithIdeas]);

  // 初始化时加载当前月份数据
  useEffect(() => {
    if (visible) {
      const today = new Date(currentDateString);
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      
      if (!isMonthLoaded(currentYear, currentMonth)) {
        setIsLoading(true);
        loadMonthIdeas(currentYear, currentMonth).finally(() => {
          setIsLoading(false);
        });
      }
    }
  }, [visible, currentDateString, loadMonthIdeas, isMonthLoaded]);

  // 当月份变化时加载数据
  const onMonthChange = useCallback((month: DateData) => {
    const year = month.year;
    const monthNum = month.month;
    
    if (!isMonthLoaded(year, monthNum)) {
      setIsLoading(true);
      loadMonthIdeas(year, monthNum).finally(() => {
        setIsLoading(false);
      });
    }
  }, [loadMonthIdeas, isMonthLoaded]);

  // 生成标记对象（react-native-calendars 格式）
  const markedDates = useMemo(() => {
    const marks: { [key: string]: any } = {};
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // 标记今天
    marks[currentDateString] = {
      selected: true,
      selectedColor: '#2196f3',
      selectedTextColor: '#ffffff',
    };
    
    // 标记有想法的日期
    Object.values(datesWithIdeas).flat().forEach(dateString => {
      if (dateString === currentDateString) {
        // 今天且有想法 - 组合样式
        marks[dateString] = {
          selected: true,
          selectedColor: '#2196f3',
          selectedTextColor: '#ffffff',
          marked: true,
          dotColor: '#ff5722',
        };
      } else {
        // 只有想法 - 蓝色背景
        marks[dateString] = {
          selected: true,
          selectedColor: '#e3f2fd',
          selectedTextColor: '#1976d2',
          marked: true,
          dotColor: '#ff5722',
        };
      }
    });
    
    return marks;
  }, [datesWithIdeas, currentDateString]);

  // 处理日期点击
  const onDayPress = useCallback((day: DateData) => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const selectedDate = day.dateString;
    
    // 检查是否为未来日期
    if (selectedDate > todayString) {
      return; // 不允许选择未来日期
    }
    
    onDateSelect(day.dateString);
  }, [onDateSelect]);

  if (!visible) {
    return null;
  }

  // 使用绝对定位的View替代Modal
  return (
    <View style={styles.overlay}>
      <Pressable 
        style={styles.overlayPressable} 
        onPress={onClose}
      >
        <Pressable 
          style={styles.calendarModalContent}
          onPress={(e) => e.stopPropagation()}
        >
          {isLoading && (
            <View style={styles.loadingIndicator}>
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          )}
          
          <Text style={styles.title}>{t('calendar.title')}</Text>
          
          <Calendar
            current={currentDateString}
            onDayPress={onDayPress}
            onMonthChange={onMonthChange}
            markedDates={markedDates}
            enableSwipeMonths={true}
            maxDate={new Date().toISOString().split('T')[0]}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#6c757d',
              selectedDayBackgroundColor: '#2196f3',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#2196f3',
              dayTextColor: '#343a40',
              textDisabledColor: '#d0d0d0',
              dotColor: '#ff5722',
              selectedDotColor: '#ffffff',
              arrowColor: '#2196f3',
              disabledArrowColor: '#d3d3d3',
              monthTextColor: '#343a40',
              indicatorColor: '#2196f3',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
            monthFormat={t('calendar.monthFormat')}
            firstDay={0}
            hideExtraDays={false}
            style={styles.calendar}
          />
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </View>
  );


};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#343a40',
    textAlign: 'center',
    marginBottom: 20,
  },
  calendar: {
    borderRadius: 8,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  loadingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

export default SwipeableCalendar; 