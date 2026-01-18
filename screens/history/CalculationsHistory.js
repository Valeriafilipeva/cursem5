// screens/history/CalculationsHistory.js
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { getAllCalculations, deleteCalculation } from '../../database/calculationsRepo';
import CalculationResult from '../../components/CalculationResult';

export default function CalculationsHistory({ onRefresh, navigation }) {
  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCalculations = async () => {
    try {
      console.log('Loading calculations history...');
      const data = await getAllCalculations();
      
      // Сортируем по дате (новые сверху)
      const sortedData = data.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      console.log(`Loaded ${sortedData.length} calculations`);
      setCalculations(sortedData);
    } catch (error) {
      console.error('Error loading calculations:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить историю расчетов');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('CalculationsHistory mounted, loading data...');
    loadCalculations();
  }, []);

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    setRefreshing(true);
    loadCalculations();
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (id, tissue) => {
    Alert.alert(
      'Удаление',
      `Удалить расчет для α/β=${tissue}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCalculation(id);
              loadCalculations(); // Перезагружаем список
              Alert.alert('Успех', 'Расчет удален');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Ошибка', 'Не удалось удалить расчет');
            }
          },
        },
      ]
    );
  };

  const handleUseCalculation = (calc) => {
    Alert.alert(
      'Использовать параметры',
      'Хотите использовать эти параметры для нового расчета?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Использовать',
          onPress: () => {
            // Переходим на калькулятор с заполненными данными
            if (navigation) {
              navigation.navigate('Calculator', {
                presetDose: calc.dose?.toString() || '',
                presetFractions: calc.fractions?.toString() || '',
                presetAlphaBeta: calc.alphaBeta?.toString() || '',
              });
            } else {
              Alert.alert('Ошибка', 'Навигация недоступна');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    return (
      <CalculationResult 
        calculation={item}
        onPress={() => handleUseCalculation(item)}
        showDelete={true}
        onDelete={(id) => handleDelete(id, item.alphaBeta)}
      />
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <IconButton icon="calculator" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Нет расчетов</Text>
      <Text style={styles.emptySubtitle}>
        Выполненные расчеты появятся здесь
      </Text>
      <Button
        mode="contained"
        onPress={() => {
          if (navigation) {
            navigation.navigate('Calculator');
          }
        }}
        style={styles.emptyButton}
        icon="calculator"
      >
        Перейти к калькулятору
      </Button>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Загрузка истории...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={calculations}
      renderItem={renderItem}
      keyExtractor={(item) => `calc-${item.id}`}
      ListEmptyComponent={renderEmptyList}
      contentContainerStyle={
        calculations.length === 0 ? styles.emptyList : styles.list
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#1976d2']}
        />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      showsVerticalScrollIndicator={true}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyList: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
  },
  separator: {
    height: 12,
  },
});