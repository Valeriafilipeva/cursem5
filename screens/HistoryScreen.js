// screens/HistoryScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert, Share } from 'react-native';
import { Text, FAB, Menu, Divider, Portal, Snackbar } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import HistoryTabs from '../components/HistoryTabs';
import CalculationsHistory from './history/CalculationsHistory';
import ReferencesHistory from './history/ReferencesHistory';
import { getAllCalculations } from '../database/calculationsRepo';
import { getReferenceHistory } from '../database/referenceHistoryRepo';

export default function HistoryScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('calculations');
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [calculationsCount, setCalculationsCount] = useState(0);

  // Загрузка количества расчетов для отображения
  const loadCalculationsCount = async () => {
    try {
      const calculations = await getAllCalculations();
      setCalculationsCount(calculations.length);
      console.log('Calculations count:', calculations.length);
    } catch (error) {
      console.error('Error loading calculations count:', error);
    }
  };

  useEffect(() => {
    loadCalculationsCount();
  }, [refreshKey]);

  const handleRefresh = useCallback(() => {
    console.log('Refreshing history...');
    setRefreshKey(prev => prev + 1);
    showSnackbar('История обновлена');
  }, []);

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // 1. Экспорт всех данных в текстовый формат
  const handleExportData = async () => {
    try {
      let exportText = '📊 МЕДИЦИНСКИЙ ОТЧЕТ\n';
      exportText += 'Дата создания: ' + new Date().toLocaleString('ru-RU') + '\n\n';
      
      if (activeTab === 'calculations') {
        const calculations = await getAllCalculations();
        if (calculations.length === 0) {
          Alert.alert('Нет данных', 'Нет расчетов для экспорта');
          return;
        }
        
        exportText += '=== ИСТОРИЯ РАСЧЕТОВ БЭД/ЭКВД ===\n\n';
        
        calculations.forEach((calc, index) => {
          const date = new Date(calc.date).toLocaleString('ru-RU');
          exportText += `${index + 1}. ${date}\n`;
          exportText += `   Доза: ${calc.dose} Гр × ${calc.fractions} фракций\n`;
          exportText += `   α/β: ${calc.alphaBeta}\n`;
          exportText += `   БЭД: ${parseFloat(calc.bed).toFixed(2)} Гр\n`;
          exportText += `   ЭКВД₂: ${parseFloat(calc.eqd2).toFixed(2)} Гр\n\n`;
        });
      } else {
        const refHistory = await getReferenceHistory();
        if (refHistory.length === 0) {
          Alert.alert('Нет данных', 'Нет истории изменений справочника');
          return;
        }
        
        exportText += '=== ИСТОРИЯ ИЗМЕНЕНИЙ СПРАВОЧНИКА ===\n\n';
        
        refHistory.forEach((item, index) => {
          const date = new Date(item.timestamp).toLocaleString('ru-RU');
          exportText += `${index + 1}. ${date}\n`;
          exportText += `   Действие: ${getActionLabel(item.action)}\n`;
          exportText += `   Ткань: ${item.tissue}\n`;
          exportText += `   α/β: ${item.alphaBeta}\n`;
          
          if (item.previousTissue || item.previousAlphaBeta) {
            exportText += `   Было: ${item.previousTissue || item.tissue} (α/β = ${item.previousAlphaBeta || item.alphaBeta})\n`;
          }
          exportText += '\n';
        });
      }
      
      // Копируем в буфер обмена
      await Clipboard.setStringAsync(exportText);
      
      // Предлагаем поделиться
      Share.share({
        title: 'Медицинский отчет',
        message: exportText,
      });
      
      showSnackbar('Данные экспортированы в буфер обмена');
      setMenuVisible(false);
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Ошибка', 'Не удалось экспортировать данные');
    }
  };

  // 2. Статистика
  const handleShowStatistics = async () => {
    try {
      let statsText = '📈 СТАТИСТИКА ИСПОЛЬЗОВАНИЯ\n\n';
      
      if (activeTab === 'calculations') {
        const calculations = await getAllCalculations();
        
        if (calculations.length === 0) {
          Alert.alert('Нет данных', 'Нет расчетов для статистики');
          return;
        }
        
        const tissueCounts = {};
        calculations.forEach(calc => {
          const tissue = calc.alphaBeta;
          tissueCounts[tissue] = (tissueCounts[tissue] || 0) + 1;
        });
        
        statsText += `Всего расчетов: ${calculations.length}\n`;
        
        const lastWeekCalculations = calculations.filter(c => {
          const calcDate = new Date(c.date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return calcDate > weekAgo;
        });
        
        statsText += `За последние 7 дней: ${lastWeekCalculations.length}\n\n`;
        
        statsText += 'Частота использования α/β значений:\n';
        Object.entries(tissueCounts)
          .sort((a, b) => b[1] - a[1])
          .forEach(([tissue, count], index) => {
            const percentage = ((count / calculations.length) * 100).toFixed(1);
            statsText += `${index + 1}. α/β = ${tissue}: ${count} раз (${percentage}%)\n`;
          });
          
      } else {
        const refHistory = await getReferenceHistory();
        
        if (refHistory.length === 0) {
          Alert.alert('Нет данных', 'Нет истории изменений');
          return;
        }
        
        const actionCounts = {};
        
        refHistory.forEach(item => {
          actionCounts[item.action] = (actionCounts[item.action] || 0) + 1;
        });
        
        statsText += `Всего изменений: ${refHistory.length}\n`;
        statsText += `Изменения по типам:\n`;
        statsText += `• Добавлений: ${actionCounts.ADD || 0}\n`;
        statsText += `• Изменений: ${actionCounts.UPDATE || 0}\n`;
        statsText += `• Удалений: ${actionCounts.DELETE || 0}\n`;
      }
      
      Alert.alert('Статистика', statsText);
      setMenuVisible(false);
      
    } catch (error) {
      console.error('Statistics error:', error);
      Alert.alert('Ошибка', 'Не удалось получить статистику');
    }
  };

  // 3. Очистка истории
  const handleCleanOldRecords = () => {
    Alert.alert(
      'Очистка истории',
      'Удалить все записи? Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить всё',
          style: 'destructive',
          onPress: async () => {
            try {
              // Здесь будет реальная очистка
              showSnackbar('История очищена');
              handleRefresh();
            } catch (error) {
              console.error('Clean error:', error);
              Alert.alert('Ошибка', 'Не удалось очистить историю');
            }
          },
        },
      ]
    );
    setMenuVisible(false);
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'ADD': return 'Добавлено';
      case 'UPDATE': return 'Изменено';
      case 'DELETE': return 'Удалено';
      default: return action;
    }
  };

  return (
    <View style={styles.container}>
      {/* ИСПРАВЛЕНО: Убрали встроенный заголовок, он будет в навигации */}
      {/* Если дублирование остается, проверьте App.js - там не должно быть title для HistoryScreen */}
      
      <HistoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <View style={styles.content}>
        {activeTab === 'calculations' ? (
          <CalculationsHistory 
            key={`calculations-${refreshKey}`}
            onRefresh={handleRefresh}
            navigation={navigation}
          />
        ) : (
          <ReferencesHistory 
            key={`references-${refreshKey}`}
            onRefresh={handleRefresh}
          />
        )}
      </View>

      {/* Меню полезных функций */}
      <Portal>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <FAB
              icon="dots-vertical"
              style={styles.menuFab}
              onPress={() => setMenuVisible(true)}
              color="#fff"
              size="small"
            />
          }
          contentStyle={styles.menuContent}
        >
          <Menu.Item 
            onPress={() => { navigation.navigate('Calculator'); setMenuVisible(false); }}
            title="🧮 Новый расчет"
            leadingIcon="calculator"
          />
          <Menu.Item 
            onPress={handleRefresh}
            title="🔄 Обновить историю"
            leadingIcon="refresh"
          />
          <Divider />
          <Menu.Item 
            onPress={handleExportData}
            title="📤 Экспорт отчета"
            leadingIcon="file-export"
            description="Для истории болезни"
          />
          <Menu.Item 
            onPress={handleShowStatistics}
            title="📈 Показать статистику"
            leadingIcon="chart-bar"
          />
          <Divider />
          <Menu.Item 
            onPress={handleCleanOldRecords}
            title="🗑️ Очистить историю"
            leadingIcon="delete-sweep"
            titleStyle={{ color: '#f44336' }}
          />
        </Menu>
      </Portal>

      {/* Snackbar для уведомлений */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  menuFab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976d2',
  },
  menuContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 250,
  },
});