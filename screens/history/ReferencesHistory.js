// screens/history/ReferencesHistory.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Divider, ActivityIndicator } from 'react-native-paper';
import { getReferenceHistory } from '../../database/referenceRepo';

export default function ReferencesHistory({ onRefresh }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getReferenceHistory();
      setHistory(data);
      console.log('Loaded reference history:', data.length);
    } catch (error) {
      console.error('Error loading reference history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [onRefresh]);

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

  const renderHistoryItem = ({ item }) => {
    const date = new Date(item.timestamp).toLocaleString('ru-RU');
    
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.itemHeader}>
            <Text style={styles.actionIcon}>{getActionIcon(item.action)}</Text>
            <Text style={styles.actionText}>{getActionLabel(item.action)}</Text>
            <Text style={styles.dateText}>{date}</Text>
          </View>
          
          <Text style={styles.tissueText}>{item.tissue}</Text>
          <Text style={styles.alphaBetaText}>α/β = {item.alphaBeta}</Text>
          
          {item.description ? (
            <Text style={styles.descriptionText}>{item.description}</Text>
          ) : null}
          
          {item.previousTissue && (
            <View style={styles.previousSection}>
              <Text style={styles.previousLabel}>Было:</Text>
              <Text style={styles.previousText}>
                {item.previousTissue} (α/β = {item.previousAlphaBeta})
              </Text>
              {item.previousDescription ? (
                <Text style={styles.previousDescription}>{item.previousDescription}</Text>
              ) : null}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>История изменений пуста</Text>
      <Text style={styles.emptySubtext}>
        Изменения в справочнике будут отображаться здесь
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Загрузка истории...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => `history-${item.id}`}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <Divider style={styles.divider} />}
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
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
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 4,
  },
});