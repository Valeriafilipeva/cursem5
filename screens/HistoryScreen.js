import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Searchbar,
  Divider,
} from 'react-native-paper';
import { getAllCalculations, deleteCalculation } from '../database/calculationsRepo';
import { getAllReferences, getAllReferenceHistory, deleteReference } from '../database/referenceRepo';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function HistoryScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('calculator'); // 'calculator' или 'reference'
  const [calculations, setCalculations] = useState([]);
  const [references, setReferences] = useState([]);
  const [referenceHistory, setReferenceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Загружаем историю расчетов
  const loadCalculations = async () => {
    try {
      const data = await getAllCalculations();
      
      // Получаем все ткани из справочника для подстановки названий
      const allReferences = await getAllReferences();
      
      // Обогащаем расчеты названиями тканей из справочника
      const enrichedCalculations = data.map(calc => {
        if (!calc.tissue && calc.alphaBeta) {
          // Ищем ткань с таким же значением α/β
          const matchingTissue = allReferences.find(ref => 
            Math.abs((ref.value || ref.alphaBeta) - calc.alphaBeta) < 0.01
          );
          
          if (matchingTissue) {
            return {
              ...calc,
              tissue: matchingTissue.tissue || 'Неизвестная ткань'
            };
          }
        }
        return calc;
      });
      
      // Сортируем по дате (последние расчеты первыми)
      const sorted = [...enrichedCalculations].sort((a, b) => 
        new Date(b.date || 0) - new Date(a.date || 0)
      );
      
      setCalculations(sorted);
    } catch (error) {
      console.error('Ошибка загрузки истории расчетов:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить историю расчетов');
      setCalculations([]);
    }
  };

  // Загружаем справочник тканей и историю изменений
  const loadReferences = async () => {
    try {
      const data = await getAllReferences();
      const history = await getAllReferenceHistory();
      
      // Сортируем по названию ткани
      const sorted = [...data].sort((a, b) => 
        (a.tissue || '').localeCompare(b.tissue || '')
      );
      
      // Сортируем историю по дате (последние изменения первыми)
      const sortedHistory = [...history].sort((a, b) => 
        new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
      );
      
      setReferences(sorted);
      setReferenceHistory(sortedHistory);
    } catch (error) {
      console.error('Ошибка загрузки справочника:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить справочник');
      setReferences([]);
      setReferenceHistory([]);
    }
  };

  // Загружаем все данные
  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadCalculations(), loadReferences()]);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation]);

  // Фильтрация данных по поисковому запросу
  const filterData = () => {
    if (!searchQuery.trim()) {
      if (activeTab === 'calculator') {
        return calculations;
      } else {
        return referenceHistory; // Показываем историю изменений вместо текущего справочника
      }
    }
    
    const query = searchQuery.toLowerCase();
    
    if (activeTab === 'calculator') {
      return calculations.filter(calc => {
        const tissueName = calc.tissue || 'Без названия';
        return tissueName.toLowerCase().includes(query);
      });
    } else {
      return referenceHistory.filter(history => {
        const tissueName = history.tissue || '';
        const action = history.action || '';
        const user = history.user || '';
        
        return tissueName.toLowerCase().includes(query) ||
               action.toLowerCase().includes(query) ||
               user.toLowerCase().includes(query);
      });
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString || 'Неизвестная дата';
    }
  };

  const formatRelativeDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 1) return 'только что';
      if (diffMinutes < 60) return `${diffMinutes} мин. назад`;
      if (diffHours < 24) return `${diffHours} ч. назад`;
      if (diffDays === 0) return 'сегодня';
      if (diffDays === 1) return 'вчера';
      if (diffDays < 7) return `${diffDays} дн. назад`;
      
      return date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit'
      });
    } catch (error) {
      return formatDate(dateString);
    }
  };

  // Удаление записи расчета
  const handleDeleteCalculation = (id) => {
    Alert.alert(
      'Удалить запись расчета',
      'Вы уверены, что хотите удалить эту запись?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCalculation(id);
              await loadCalculations();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить запись');
            }
          }
        }
      ]
    );
  };

  // Удаление записи справочника
  const handleDeleteReference = (id) => {
    Alert.alert(
      'Удалить ткань из справочника',
      'Вы уверены, что хотите удалить эту ткань?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReference(id);
              await loadReferences();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить ткань');
            }
          }
        }
      ]
    );
  };

  // Использовать расчет снова
  const handleUseCalculationAgain = (calc) => {
    navigation.navigate('Calculator', {
      presetDose: calc.dose?.toString(),
      presetFractions: calc.fractions?.toString(),
      presetAlphaBeta: calc.alphaBeta?.toString()
    });
  };

  // Использовать ткань в калькуляторе
  const handleUseReferenceInCalculator = (ref) => {
    navigation.navigate('Calculator', {
      presetAlphaBeta: ref.value || ref.alphaBeta?.toString()
    });
  };

  // Перейти к редактированию ткани
  const handleEditReference = (ref) => {
    navigation.navigate('Reference', { editReference: ref });
  };

  // Перейти к просмотру текущего справочника
  const handleGoToReference = () => {
    navigation.navigate('Reference');
  };

  const getActionIcon = (action) => {
    switch (action?.toLowerCase()) {
      case 'add':
      case 'added':
      case 'create':
        return 'add';
      case 'edit':
      case 'update':
      case 'modified':
        return 'edit';
      case 'delete':
      case 'remove':
      case 'deleted':
        return 'delete';
      default:
        return 'history';
    }
  };

  const getActionColor = (action) => {
    switch (action?.toLowerCase()) {
      case 'add':
      case 'added':
      case 'create':
        return '#10B981'; // green
      case 'edit':
      case 'update':
      case 'modified':
        return '#F59E0B'; // amber
      case 'delete':
      case 'remove':
      case 'deleted':
        return '#EF4444'; // red
      default:
        return '#6B7280'; // gray
    }
  };

  const getActionText = (action) => {
    switch (action?.toLowerCase()) {
      case 'add':
      case 'added':
      case 'create':
        return 'добавлена';
      case 'edit':
      case 'update':
      case 'modified':
        return 'изменена';
      case 'delete':
      case 'remove':
      case 'deleted':
        return 'удалена';
      default:
        return action || 'изменена';
    }
  };

  const filteredData = filterData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>
          Загрузка истории...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Icon name="history" size={28} color="#1e40af" />
          <Text style={styles.headerTitle}>История</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Расчетов и изменений справочника
        </Text>
      </View>

      {/* Переключение вкладок */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'calculator' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('calculator')}
          activeOpacity={0.7}
        >
          <Icon 
            name="calculate" 
            size={20} 
            color={activeTab === 'calculator' ? '#FFFFFF' : '#1e40af'} 
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === 'calculator' && styles.activeTabButtonText
          ]}>
            Расчеты ({calculations.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'reference' && styles.activeTabButton
          ]}
          onPress={() => setActiveTab('reference')}
          activeOpacity={0.7}
        >
          <Icon 
            name="science" 
            size={20} 
            color={activeTab === 'reference' ? '#FFFFFF' : '#1e40af'} 
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === 'reference' && styles.activeTabButtonText
          ]}>
            Изменения ({referenceHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Простой поиск */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={
            activeTab === 'calculator' 
              ? "Поиск по ткани" 
              : "Поиск по ткани"
          }
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          iconColor="#1e40af"
          inputStyle={styles.searchInput}
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon 
              name={activeTab === 'calculator' ? "calculate" : "history"} 
              size={64} 
              color="#CBD5E1" 
            />
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'Ничего не найдено' : 
                activeTab === 'calculator' ? 'История расчетов пуста' : 'История изменений пуста'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Попробуйте другой запрос' 
                : activeTab === 'calculator' 
                  ? 'Выполните расчеты в калькуляторе' 
                  : 'Начните редактировать справочник'}
            </Text>
            {!searchQuery && activeTab === 'reference' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleGoToReference}
                activeOpacity={0.8}
              >
                <Icon name="science" size={20} color="white" />
                <Text style={styles.actionButtonText}>
                  Перейти к справочнику
                </Text>
              </TouchableOpacity>
            )}
            {!searchQuery && activeTab === 'calculator' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Calculator')}
                activeOpacity={0.8}
              >
                <Icon name="calculate" size={20} color="white" />
                <Text style={styles.actionButtonText}>
                  Перейти к калькулятору
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.dataList}>
            {activeTab === 'calculator' ? (
              // История расчетов
              filteredData.map((calc) => (
                <View key={calc.id} style={styles.cardContainer}>
                  <Card style={styles.calculationCard}>
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <View style={styles.calcInfo}>
                          <Text style={styles.calcDate}>
                            {formatDate(calc.date)}
                          </Text>
                          <Text style={styles.calcTissue}>
                            {calc.tissue || 'Без названия'}
                          </Text>
                        </View>
                        
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleDeleteCalculation(calc.id)}
                        >
                          <Icon name="delete" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.parametersContainer}>
                        <View style={styles.parameterRow}>
                          <Text style={styles.parameterLabel}>Доза за фракцию:</Text>
                          <Text style={styles.parameterValue}>{calc.dose?.toFixed(1)} Гр</Text>
                        </View>
                        <View style={styles.parameterRow}>
                          <Text style={styles.parameterLabel}>Фракций:</Text>
                          <Text style={styles.parameterValue}>{calc.fractions}</Text>
                        </View>
                        <View style={styles.parameterRow}>
                          <Text style={styles.parameterLabel}>α/β:</Text>
                          <View style={styles.alphaBetaContainer}>
                            <Text style={styles.alphaBetaValue}>{calc.alphaBeta?.toFixed(1)}</Text>
                          </View>
                        </View>
                      </View>
                      
                      <Divider style={styles.cardDivider} />
                      
                      <View style={styles.resultsContainer}>
                        <View style={styles.resultItem}>
                          <Text style={styles.resultLabel}>BED:</Text>
                          <Text style={[styles.resultValue, styles.bedValue]}>
                            {calc.bed?.toFixed(1)} Гр
                          </Text>
                        </View>
                        <View style={styles.resultDivider} />
                        <View style={styles.resultItem}>
                          <Text style={styles.resultLabel}>EQD₂:</Text>
                          <Text style={[styles.resultValue, styles.eqd2Value]}>
                            {calc.eqd2?.toFixed(1)} Гр
                          </Text>
                        </View>
                      </View>
                      
                      <Divider style={styles.cardDivider} />
                      
                      <View style={styles.cardFooter}>
                        <TouchableOpacity
                          style={styles.useButton}
                          onPress={() => handleUseCalculationAgain(calc)}
                          activeOpacity={0.8}
                        >
                          <Icon name="replay" size={18} color="white" />
                          <Text style={styles.useButtonText}>Использовать снова</Text>
                        </TouchableOpacity>
                      </View>
                    </Card.Content>
                  </Card>
                </View>
              ))
            ) : (
              // История изменений справочника
              filteredData.map((history, index) => (
                <View key={history.id || index} style={styles.cardContainer}>
                  <Card style={styles.historyCard}>
                    <Card.Content>
                      <View style={styles.historyHeader}>
                        <View style={styles.historyIconContainer}>
                          <Icon 
                            name={getActionIcon(history.action)} 
                            size={24} 
                            color={getActionColor(history.action)} 
                          />
                        </View>
                        
                        <View style={styles.historyInfo}>
                          <Text style={styles.historyTitle}>
                            <Text style={styles.historyTissue}>{history.tissue || 'Ткань'}</Text>
                            {' '}
                            <Text style={{color: getActionColor(history.action)}}>
                              {getActionText(history.action)}
                            </Text>
                          </Text>
                          
                          <View style={styles.historyDetails}>
                            <Text style={styles.historyTime}>
                              {formatRelativeDate(history.timestamp || history.date)}
                            </Text>
                            
                            {history.user && (
                              <Text style={styles.historyUser}>
                                • {history.user}
                              </Text>
                            )}
                            
                            {history.alphaBeta && (
                              <Text style={styles.historyAlphaBeta}>
                                • α/β = {history.alphaBeta}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                      
                      {(history.oldValue || history.newValue) && (
                        <>
                          <Divider style={styles.cardDivider} />
                          
                          <View style={styles.historyChanges}>
                            {history.oldValue && (
                              <View style={styles.changeRow}>
                                <Text style={styles.changeLabel}>Было:</Text>
                                <Text style={styles.oldValue}>{history.oldValue}</Text>
                              </View>
                            )}
                            
                            {history.newValue && (
                              <View style={styles.changeRow}>
                                <Text style={styles.changeLabel}>Стало:</Text>
                                <Text style={styles.newValue}>{history.newValue}</Text>
                              </View>
                            )}
                          </View>
                        </>
                      )}
                      
                      {history.description && (
                        <Text style={styles.historyDescription}>
                          {history.description}
                        </Text>
                      )}
                    </Card.Content>
                  </Card>
                </View>
              ))
            )}
          </View>
        )}
        
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerContainer: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'white',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTabButton: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginLeft: 8,
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'white',
  },
  searchBar: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    elevation: 0,
    shadowOpacity: 0,
    height: 48,
  },
  searchInput: {
    fontSize: 15,
    color: '#374151',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  dataList: {
    marginBottom: 8,
  },
  cardContainer: {
    marginBottom: 16,
  },
  calculationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  calcInfo: {
    flex: 1,
    marginRight: 12,
  },
  calcDate: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  calcTissue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  historyTissue: {
    fontWeight: '700',
  },
  historyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  historyTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  historyUser: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
  },
  historyAlphaBeta: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  historyChanges: {
    marginBottom: 12,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  changeLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    width: 60,
  },
  oldValue: {
    fontSize: 14,
    color: '#EF4444',
    textDecorationLine: 'line-through',
    flex: 1,
  },
  newValue: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
    flex: 1,
  },
  historyDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
  },
  parametersContainer: {
    marginBottom: 16,
  },
  parameterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parameterLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  parameterValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  alphaBetaContainer: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  alphaBetaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
  },
  cardDivider: {
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  resultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultItem: {
    flex: 1,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  bedValue: {
    color: '#1e40af',
  },
  eqd2Value: {
    color: '#059669',
  },
  resultDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  useButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  spacer: {
    height: 40,
  },
});