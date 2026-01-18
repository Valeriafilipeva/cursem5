// screens/history/ReferencesHistory.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Divider, ActivityIndicator, Button } from 'react-native-paper';
import { getReferenceHistory, getHistoryCount, getTodayHistory, getYesterdayHistory, getLastWeekHistory } from '../../database/referenceRepo';

export default function ReferencesHistory({ onRefresh }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, today, yesterday, week

  const loadHistory = async () => {
    try {
      setLoading(true);
      
      // Получаем количество записей
      const count = await getHistoryCount();
      setHistoryCount(count);
      
      // Загружаем историю в зависимости от фильтра
      let data = [];
      switch (filter) {
        case 'today':
          data = await getTodayHistory();
          break;
        case 'yesterday':
          data = await getYesterdayHistory();
          break;
        case 'week':
          data = await getLastWeekHistory();
          break;
        default:
          data = await getReferenceHistory(100, 0); // Первые 100 записей
          break;
      }
      
      setHistory(data);
      console.log(`Загружено истории: ${data.length} записей (фильтр: ${filter})`);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filter, onRefresh]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'ADD': return 'Добавлено';
      case 'UPDATE': return 'Изменено';
      case 'DELETE': return 'Удалено';
      default: return action;
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'ADD': return '➕';
      case 'UPDATE': return '✏️';
      case 'DELETE': return '🗑️';
      default: return '📝';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'ADD': return '#4caf50';
      case 'UPDATE': return '#ff9800';
      case 'DELETE': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const renderHistoryItem = ({ item }) => {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.itemHeader}>
            <View style={styles.actionContainer}>
              <Text style={[styles.actionIcon, { color: getActionColor(item.action) }]}>
                {getActionIcon(item.action)}
              </Text>
              <Text style={[styles.actionText, { color: getActionColor(item.action) }]}>
                {getActionLabel(item.action)}
              </Text>
            </View>
            <Text style={styles.dateText}>{item.formattedDate || formatDate(item.timestamp)}</Text>
          </View>
          
          <View style={styles.contentSection}>
            <Text style={styles.tissueText}>{item.tissue}</Text>
            <Text style={styles.alphaBetaText}>α/β = {item.alphaBeta}</Text>
            
            {item.description ? (
              <Text style={styles.descriptionText} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            
            {item.previousTissue && (
              <View style={styles.previousSection}>
                <Text style={styles.previousLabel}>Было:</Text>
                <Text style={styles.previousText}>
                  {item.previousTissue} (α/β = {item.previousAlphaBeta})
                </Text>
                {item.previousDescription ? (
                  <Text style={styles.previousDescription} numberOfLines={1}>
                    {item.previousDescription}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return timestamp || '';
    }
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📜</Text>
      <Text style={styles.emptyText}>История изменений пуста</Text>
      <Text style={styles.emptySubtext}>
        Изменения в справочнике будут отображаться здесь
      </Text>
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <Button
        mode={filter === 'all' ? 'contained' : 'outlined'}
        onPress={() => setFilter('all')}
        style={styles.filterButton}
        compact
      >
        Все
      </Button>
      <Button
        mode={filter === 'today' ? 'contained' : 'outlined'}
        onPress={() => setFilter('today')}
        style={styles.filterButton}
        compact
      >
        Сегодня
      </Button>
      <Button
        mode={filter === 'yesterday' ? 'contained' : 'outlined'}
        onPress={() => setFilter('yesterday')}
        style={styles.filterButton}
        compact
      >
        Вчера
      </Button>
      <Button
        mode={filter === 'week' ? 'contained' : 'outlined'}
        onPress={() => setFilter('week')}
        style={styles.filterButton}
        compact
      >
        Неделя
      </Button>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Загрузка истории...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFilterButtons()}
      
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          Всего записей: {historyCount} | Показано: {history.length}
        </Text>
      </View>
      
      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => `history-${item.id}-${item.timestamp}`}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <Divider style={styles.divider} />}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1976d2']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    marginRight: 8,
    flex: 1,
  },
  infoBar: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#1976d2',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 1,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  contentSection: {
    paddingVertical: 4,
  },
  tissueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  alphaBetaText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 8,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  previousSection: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
    marginTop: 8,
  },
  previousLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff9800',
    marginBottom: 4,
  },
  previousText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  previousDescription: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: '#9e9e9e',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 250,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  divider: {
    marginVertical: 4,
  },
});