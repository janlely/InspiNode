import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import Feather from '@react-native-vector-icons/feather';
import { useTranslation } from 'react-i18next';
import { ideaDB } from '../utils/IdeaDatabase';
import IdeaList, { IdeaItem } from '../components/IdeaList';
import { ContentType, RootStackParamList } from '../Types';
import { CONTENT_TYPES, getFinalContentType } from '../utils/ContentTypeUtils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@react-native-vector-icons/fontawesome';
import { useTheme } from '../hooks/useTheme';

type SearchNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

type DateFilterType = 'all' | 'recent1month' | 'recent3months' | 'recent6months' | 'custom';

interface FilterCriteria {
  keyword: string;
  categories: ContentType[];
  dateFilterType: DateFilterType;
  customDateRange: {
    startDate: string;
    endDate: string;
  } | null;
  completedFilter: 'all' | 'completed' | 'incomplete'; // 仅对TODO有效
}

export default function Search() {
  const { t } = useTranslation();
  const { theme, getThemedStyle } = useTheme();
  const navigation = useNavigation<SearchNavigationProp>();
  const [filteredIdeas, setFilteredIdeas] = useState<IdeaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // 筛选条件
  const [filters, setFilters] = useState<FilterCriteria>({
    keyword: '',
    categories: [],
    dateFilterType: 'all',
    customDateRange: null,
    completedFilter: 'all',
  });

  // 临时筛选条件（用于模态框中的编辑）
  const [tempFilters, setTempFilters] = useState<FilterCriteria>(filters);

  useEffect(() => {
    // 页面加载时执行搜索
    handleSearch();
  }, []);

  // 执行搜索
  const handleSearch = async () => {
    await performSearch(filters);
  };

  // 执行搜索的核心逻辑
  const performSearch = async (searchFilters: FilterCriteria) => {
    try {
      let allIdeas = await ideaDB.getAllIdeas();
      
      // 转换为IdeaItem格式
      let results: IdeaItem[] = allIdeas.map((dbIdea) => ({
        id: dbIdea.id.toString(),
        text: dbIdea.hint,
        dbId: dbIdea.id,
        manualCategory: dbIdea.category || undefined,
        completed: !!dbIdea.completed,
      }));

      // 应用关键词筛选
      if (searchFilters.keyword.trim()) {
        const keyword = searchFilters.keyword.toLowerCase();
        results = results.filter(idea => 
          idea.text.toLowerCase().includes(keyword)
        );
      }

      // 应用分类筛选
      if (searchFilters.categories.length > 0) {
        results = results.filter(idea => {
          const ideaType = getFinalContentType(idea.text, idea.manualCategory);
          return searchFilters.categories.includes(ideaType);
        });
      }

      // 应用日期范围筛选
      if (searchFilters.dateFilterType !== 'all') {
        if (searchFilters.dateFilterType === 'custom') {
          if (searchFilters.customDateRange) {
            results = results.filter(idea => {
              if (!idea.dbId) return false;
              
              const dbIdea = allIdeas.find(db => db.id === idea.dbId);
              if (!dbIdea) return false;
              
              const ideaDate = dbIdea.date;
              return ideaDate >= searchFilters.customDateRange!.startDate && 
                     ideaDate <= searchFilters.customDateRange!.endDate;
            });
          }
        } else {
          const now = new Date();
          let startDate: Date;
          
          switch (searchFilters.dateFilterType) {
            case 'recent1month':
              startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
              break;
            case 'recent3months':
              startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
              break;
            case 'recent6months':
              startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
              break;
            default:
              startDate = now;
              break;
          }
          
          const startDateStr = startDate.toISOString().split('T')[0];
          results = results.filter(idea => {
            if (!idea.dbId) return false;
            
            const dbIdea = allIdeas.find(db => db.id === idea.dbId);
            if (!dbIdea) return false;
            
            return dbIdea.date >= startDateStr;
          });
        }
      }

      // 应用完成状态筛选（仅对TODO类型）
      if (searchFilters.completedFilter !== 'all') {
        results = results.filter(idea => {
          const ideaType = getFinalContentType(idea.text, idea.manualCategory);
          if (ideaType !== ContentType.TODO) return true; // 非TODO类型始终显示
          
          if (searchFilters.completedFilter === 'completed') {
            return idea.completed === true;
          } else {
            return idea.completed !== true;
          }
        });
      }

      // 按创建时间倒序排列
      const sortedResults = results.sort((a, b) => {
        const aDbIdea = allIdeas.find(db => db.id === a.dbId);
        const bDbIdea = allIdeas.find(db => db.id === b.dbId);
        if (!aDbIdea || !bDbIdea) return 0;
        return new Date(bDbIdea.created_at).getTime() - new Date(aDbIdea.created_at).getTime();
      });

      setFilteredIdeas(sortedResults);
    } catch (error) {
      console.error('❌ Failed to search ideas:', error);
      Alert.alert(t('common.error'), t('errors.cannotSearch'));
    } finally {
      setIsLoading(false);
    }
  };

  // 处理关键词输入并实时搜索
  const handleKeywordChange = (text: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, keyword: text };
      performSearch(newFilters);
      return newFilters;
    });
  };

  // 打开筛选模态框
  const openFilterModal = () => {
    setTempFilters({ ...filters });
    setShowFilterModal(true);
  };

  // 应用筛选条件
  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setShowFilterModal(false);
    // 延迟执行搜索，确保状态已更新
    setTimeout(() => {
      performSearch(tempFilters);
    }, 100);
  };

  // 重置筛选条件
  const resetFilters = () => {
    const defaultFilters: FilterCriteria = {
      keyword: '',
      categories: [],
      dateFilterType: 'all',
      customDateRange: null,
      completedFilter: 'all',
    };
    setTempFilters(defaultFilters);
  };

  // 切换分类选择
  const toggleCategory = (category: ContentType) => {
    setTempFilters(prev => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      
      // 如果取消选择TODO类型，则重置完成状态筛选
      const newCompletedFilter = (!newCategories.includes(ContentType.TODO) && category === ContentType.TODO)
        ? 'all' as const
        : prev.completedFilter;
      
      return {
        ...prev,
        categories: newCategories,
        completedFilter: newCompletedFilter
      };
    });
  };

  // 设置日期范围
  const setDateRange = (startDate: string, endDate: string) => {
    setTempFilters(prev => ({
      ...prev,
      dateFilterType: 'custom',
      customDateRange: { startDate, endDate }
    }));
  };

  // 清除日期范围
  const clearDateRange = () => {
    setTempFilters(prev => ({
      ...prev,
      dateFilterType: 'all',
      customDateRange: null
    }));
  };

  // 计算当前筛选条件的数量
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.dateFilterType !== 'all') count++;
    if (filters.completedFilter !== 'all') count++;
    return count;
  };

  // 获取日期筛选的显示文本
  const getDateFilterDisplayText = () => {
    switch (filters.dateFilterType) {
      case 'recent1month':
        return '近一个月';
      case 'recent3months':
        return '近三个月';
      case 'recent6months':
        return '近半年';
      case 'custom':
        if (filters.customDateRange) {
          return `${filters.customDateRange.startDate} 至 ${filters.customDateRange.endDate}`;
        }
        return '自定义时间';
      default:
        return '全部时间';
    }
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>高级筛选</Text>
            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* 分类筛选 */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>📝 内容类型筛选</Text>
              <View style={styles.categoryGrid}>
                {Object.entries(CONTENT_TYPES).map(([type, config]) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.categoryChip,
                      tempFilters.categories.includes(type as ContentType) && styles.categoryChipSelected
                    ]}
                    onPress={() => toggleCategory(type as ContentType)}
                  >
                    <Text style={styles.categoryChipIcon}>{config.icon}</Text>
                    <Text style={[
                      styles.categoryChipText,
                      tempFilters.categories.includes(type as ContentType) && styles.categoryChipTextSelected
                    ]}>
                      {config.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 完成状态筛选（仅当选择了TODO类型时显示） */}
            {tempFilters.categories.includes(ContentType.TODO) && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>✅ TODO完成状态筛选</Text>
                <View style={styles.completedFilterGrid}>
                  {[
                    { key: 'all', label: '全部' },
                    { key: 'completed', label: '已完成' },
                    { key: 'incomplete', label: '未完成' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.completedChip,
                        tempFilters.completedFilter === option.key && styles.completedChipSelected
                      ]}
                      onPress={() => setTempFilters(prev => ({ ...prev, completedFilter: option.key as any }))}
                    >
                      <Text style={[
                        styles.completedChipText,
                        tempFilters.completedFilter === option.key && styles.completedChipTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* 时间筛选 */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>⏰ 时间范围筛选</Text>
              <View style={styles.timeFilterGrid}>
                {[
                  { key: 'all', label: '全部时间' },
                  { key: 'recent1month', label: '近一个月' },
                  { key: 'recent3months', label: '近三个月' },
                  { key: 'recent6months', label: '近半年' },
                  { key: 'custom', label: '自定义时间' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.timeFilterChip,
                      tempFilters.dateFilterType === option.key && styles.timeFilterChipSelected
                    ]}
                    onPress={() => setTempFilters(prev => ({ 
                      ...prev, 
                      dateFilterType: option.key as DateFilterType,
                      customDateRange: option.key !== 'custom' ? null : prev.customDateRange
                    }))}
                  >
                    <Text style={[
                      styles.timeFilterChipText,
                      tempFilters.dateFilterType === option.key && styles.timeFilterChipTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* 自定义日期范围输入 */}
              {tempFilters.dateFilterType === 'custom' && (
                <View style={styles.customDateContainer}>
                  <View style={styles.customDateHeader}>
                    <Text style={styles.customDateLabel}>自定义时间范围</Text>
                    <TouchableOpacity
                      style={styles.todayButton}
                      onPress={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setDateRange(today, today);
                      }}
                    >
                      <Text style={styles.todayButtonText}>今天</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.dateInputsContainer}>
                    <View style={styles.dateInputGroup}>
                      <Text style={styles.dateInputLabel}>开始日期</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#999"
                        value={tempFilters.customDateRange?.startDate || ''}
                        onChangeText={(text) => {
                          // 简单的日期格式验证
                          const formattedText = text.replace(/[^0-9-]/g, '');
                          if (tempFilters.customDateRange) {
                            setDateRange(formattedText, tempFilters.customDateRange.endDate);
                          } else {
                            setDateRange(formattedText, '');
                          }
                        }}
                        maxLength={10}
                        keyboardType="numeric"
                      />
                    </View>
                    
                    <View style={styles.dateArrow}>
                      <Text style={styles.dateArrowText}>→</Text>
                    </View>
                    
                    <View style={styles.dateInputGroup}>
                      <Text style={styles.dateInputLabel}>结束日期</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#999"
                        value={tempFilters.customDateRange?.endDate || ''}
                        onChangeText={(text) => {
                          // 简单的日期格式验证
                          const formattedText = text.replace(/[^0-9-]/g, '');
                          if (tempFilters.customDateRange) {
                            setDateRange(tempFilters.customDateRange.startDate, formattedText);
                          } else {
                            setDateRange('', formattedText);
                          }
                        }}
                        maxLength={10}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  
                  {/* 快速日期选择 */}
                  <View style={styles.quickDateContainer}>
                    <Text style={styles.quickDateLabel}>快速选择：</Text>
                    <View style={styles.quickDateButtons}>
                      <TouchableOpacity
                        style={styles.quickDateButton}
                        onPress={() => {
                          const today = new Date().toISOString().split('T')[0];
                          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                          setDateRange(weekAgo, today);
                        }}
                      >
                        <Text style={styles.quickDateButtonText}>近7天</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickDateButton}
                        onPress={() => {
                          const today = new Date().toISOString().split('T')[0];
                          const monthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
                          setDateRange(monthAgo, today);
                        }}
                      >
                        <Text style={styles.quickDateButtonText}>近30天</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickDateButton}
                        onPress={() => {
                          const today = new Date().toISOString().split('T')[0];
                          const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
                          setDateRange(yearStart, today);
                        }}
                      >
                        <Text style={styles.quickDateButtonText}>今年</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* 清除按钮 */}
                  {tempFilters.customDateRange && (
                    <TouchableOpacity
                      style={styles.clearCustomDateButton}
                      onPress={clearDateRange}
                    >
                      <Text style={styles.clearCustomDateButtonText}>清除自定义时间</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetFilters}
            >
              <Text style={styles.resetButtonText}>重置</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>应用筛选</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
          搜索中...
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
      
      {/* 搜索头部 */}
      <View style={[
        styles.header,
        {
          backgroundColor: theme.backgrounds.primary,
          borderBottomColor: theme.borders.primary,
        }
      ]}>
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.backgrounds.secondary,
                borderColor: theme.borders.input,
                color: theme.texts.primary,
              }
            ]}
            placeholder={t('placeholders.searchIdeas')}
            placeholderTextColor={theme.texts.tertiary}
            value={filters.keyword}
            onChangeText={handleKeywordChange}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: theme.backgrounds.secondary,
                borderColor: theme.borders.input,
              }
            ]}
            onPress={openFilterModal}
          >
            <Feather name="filter" size={20} color={theme.texts.secondary} />
          </TouchableOpacity>
        </View>
        
        {/* 当前筛选条件展示 */}
        {getActiveFilterCount() > 0 && (
          <View style={styles.activeFiltersContainer}>
            <View style={styles.activeFiltersContent}>

            
            {/* 类型筛选 */}
            {filters.categories.length > 0 && (
              <View style={[
                styles.activeFilterTag,
                { backgroundColor: theme.special.highlight }
              ]}>
                <Text style={[
                  styles.activeFilterText,
                  { color: theme.buttons.primary }
                ]}>
                  类型: {filters.categories.map(cat => CONTENT_TYPES[cat].name).join(', ')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const newFilters = { ...filters, categories: [], completedFilter: 'all' as const };
                    setFilters(newFilters);
                    performSearch(newFilters);
                  }}
                  style={[
                    styles.removeFilterButton,
                    { backgroundColor: theme.buttons.primary }
                  ]}
                >
                  <Text style={[
                    styles.removeFilterText,
                    { color: theme.buttons.primaryText }
                  ]}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* 时间筛选 */}
            {filters.dateFilterType !== 'all' && (
              <View style={[
                styles.activeFilterTag,
                { backgroundColor: theme.special.highlight }
              ]}>
                <Text style={[
                  styles.activeFilterText,
                  { color: theme.buttons.primary }
                ]}>
                  时间: {getDateFilterDisplayText()}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const newFilters = { ...filters, dateFilterType: 'all' as const, customDateRange: null };
                    setFilters(newFilters);
                    performSearch(newFilters);
                  }}
                  style={[
                    styles.removeFilterButton,
                    { backgroundColor: theme.buttons.primary }
                  ]}
                >
                  <Text style={[
                    styles.removeFilterText,
                    { color: theme.buttons.primaryText }
                  ]}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* TODO完成状态筛选 */}
            {filters.completedFilter !== 'all' && filters.categories.includes(ContentType.TODO) && (
              <View style={[
                styles.activeFilterTag,
                { backgroundColor: theme.special.highlight }
              ]}>
                <Text style={[
                  styles.activeFilterText,
                  { color: theme.buttons.primary }
                ]}>
                  状态: {filters.completedFilter === 'completed' ? '已完成' : '未完成'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const newFilters = { ...filters, completedFilter: 'all' as const };
                    setFilters(newFilters);
                    performSearch(newFilters);
                  }}
                  style={[
                    styles.removeFilterButton,
                    { backgroundColor: theme.buttons.primary }
                  ]}
                >
                  <Text style={[
                    styles.removeFilterText,
                    { color: theme.buttons.primaryText }
                  ]}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* 清除所有筛选 */}
            <TouchableOpacity
              onPress={() => {
                const newFilters = {
                  keyword: filters.keyword, // 保留当前的关键词
                  categories: [],
                  dateFilterType: 'all' as const,
                  customDateRange: null,
                  completedFilter: 'all' as const,
                };
                setFilters(newFilters);
                performSearch(newFilters);
              }}
              style={[
                styles.clearAllFiltersButton,
                { backgroundColor: theme.buttons.danger }
              ]}
            >
              <Text style={[
                styles.clearAllFiltersText,
                { color: theme.buttons.dangerText }
              ]}>
                清除所有
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      </View>

      {/* 结果列表 */}
      <IdeaList
        ideas={filteredIdeas}
        setIdeas={setFilteredIdeas}
        currentDateString={new Date().toISOString().split('T')[0]}
        showEmptyInput={false}
      />

      {/* 筛选模态框 */}
      {renderFilterModal()}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginRight: 12,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
  },

  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  // 模态框样式
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
  },
  filterContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  categoryChipSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  categoryChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#343a40',
  },
  categoryChipTextSelected: {
    color: '#ffffff',
  },
  completedFilterGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  completedChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  completedChipSelected: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  completedChipText: {
    fontSize: 14,
    color: '#343a40',
  },
  completedChipTextSelected: {
    color: '#ffffff',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  dateSeparator: {
    fontSize: 14,
    color: '#6c757d',
  },
  clearDateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearDateButtonText: {
    fontSize: 14,
    color: '#dc3545',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  resetButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#6c757d',
  },
  applyButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  // 时间筛选样式
  timeFilterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  timeFilterChipSelected: {
    backgroundColor: '#17a2b8',
    borderColor: '#17a2b8',
  },
  timeFilterChipText: {
    fontSize: 14,
    color: '#343a40',
  },
  timeFilterChipTextSelected: {
    color: '#ffffff',
  },
  customDateContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  customDateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  // 自定义日期选择样式
  customDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
  },
  todayButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  dateInputsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    fontWeight: '500',
  },
  dateArrow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  dateArrowText: {
    fontSize: 16,
    color: '#6c757d',
  },
  quickDateContainer: {
    marginTop: 8,
  },
  quickDateLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 6,
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  quickDateButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  quickDateButtonText: {
    fontSize: 11,
    color: '#495057',
  },
  clearCustomDateButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  clearCustomDateButtonText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '500',
  },
  // 当前筛选条件展示样式
  activeFiltersContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  activeFiltersContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingLeft: 8,
    paddingRight: 2,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 2,
  },
  activeFilterText: {
    fontSize: 11,
    marginRight: 4,
  },
  removeFilterButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeFilterText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  clearAllFiltersButton: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 2,
  },
  clearAllFiltersText: {
    fontSize: 11,
    fontWeight: '500',
  },

}); 