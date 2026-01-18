import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import exportService from '../services/ExportService';
import { useApp } from '../services/AppContext';

const ExportScreen = () => {
  const { appStatus } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState('');

  const handleExport = async (type) => {
    try {
      setIsExporting(true);
      setExportType(type);
      
      let result;
      
      switch (type) {
        case 'json':
          result = await exportService.exportDataToFile();
          break;
          
        case 'calculations_csv':
          result = await exportService.exportToCSV('calculations');
          break;
          
        case 'references_csv':
          result = await exportService.exportToCSV('references');
          break;
          
        case 'backup':
          result = await exportService.createBackup();
          break;
          
        default:
          throw new Error('Неизвестный тип экспорта');
      }
      
      if (result.success) {
        Alert.alert(
          'Успешно',
          result.message || 'Экспорт выполнен успешно',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Ошибка', result.error || 'Ошибка при экспорте');
      }
      
    } catch (error) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setIsExporting(false);
      setExportType('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Статистика данных</Text>
        {appStatus && (
          <View style={styles.statsContainer}>
            <Text style={styles.statText}>
              Расчетов: {appStatus.database.calculations}
            </Text>
            <Text style={styles.statText}>
              Записей справочника: {appStatus.database.references}
            </Text>
            {appStatus.lastCalculation && (
              <Text style={styles.statText}>
                Последний расчет: {appStatus.lastCalculation.formattedDate}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Экспорт данных</Text>
        
        <ExportButton
          title="Экспорт всех данных (JSON)"
          subtitle="Включая расчеты, справочник и историю изменений"
          onPress={() => handleExport('json')}
          isLoading={isExporting && exportType === 'json'}
        />
        
        <ExportButton
          title="Экспорт расчетов (CSV)"
          subtitle="Формат для таблиц (Excel, Google Sheets)"
          onPress={() => handleExport('calculations_csv')}
          isLoading={isExporting && exportType === 'calculations_csv'}
        />
        
        <ExportButton
          title="Экспорт справочника (CSV)"
          subtitle="Список тканей и α/β соотношений"
          onPress={() => handleExport('references_csv')}
          isLoading={isExporting && exportType === 'references_csv'}
        />
        
        <ExportButton
          title="Создать резервную копию"
          subtitle="Сохранить все данные приложения"
          onPress={() => handleExport('backup')}
          isLoading={isExporting && exportType === 'backup'}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Информация</Text>
        <Text style={styles.infoText}>
          • Экспортированные файлы сохраняются в память устройства
        </Text>
        <Text style={styles.infoText}>
          • Для передачи файлов используйте опцию "Поделиться"
        </Text>
        <Text style={styles.infoText}>
          • Резервные копии помогают восстановить данные
        </Text>
      </View>
    </ScrollView>
  );
};

const ExportButton = ({ title, subtitle, onPress, isLoading }) => (
  <TouchableOpacity
    style={styles.exportButton}
    onPress={onPress}
    disabled={isLoading}
  >
    <View style={styles.buttonContent}>
      <Text style={styles.buttonTitle}>{title}</Text>
      <Text style={styles.buttonSubtitle}>{subtitle}</Text>
    </View>
    {isLoading ? (
      <ActivityIndicator size="small" color="#007AFF" />
    ) : (
      <Text style={styles.buttonArrow}>→</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 12,
  },
  statsContainer: {
    backgroundColor: '#f2f2f7',
    borderRadius: 8,
    padding: 12,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f2f2f7',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 12,
    color: '#8e8e93',
  },
  buttonArrow: {
    fontSize: 20,
    color: '#c7c7cc',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
});

export default ExportScreen;