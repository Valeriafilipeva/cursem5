import { initDB } from '../database/db';
import calculationService from './CalculationService';
import referenceService from './ReferenceService';

class AppService {
  constructor() {
    this.isInitialized = false;
  }

  // Инициализация всех сервисов
  async initialize() {
    if (this.isInitialized) {
      return { success: true, message: 'Уже инициализировано' };
    }
    
    try {
      console.log('Инициализация приложения...');
      
      // Инициализация базы данных
      const dbInitialized = await initDB();
      if (!dbInitialized) {
        throw new Error('Не удалось инициализировать базу данных');
      }
      
      this.isInitialized = true;
      
      // Получаем начальные данные для проверки
      const [history, references] = await Promise.all([
        calculationService.getHistory(5),
        referenceService.getAllReferences()
      ]);
      
      console.log('Приложение инициализировано успешно');
      console.log(`Загружено: ${history.data.length} расчетов, ${references.data.length} записей справочника`);
      
      return {
        success: true,
        data: {
          historyCount: history.data.length,
          referenceCount: references.data.length
        }
      };
      
    } catch (error) {
      console.error('Ошибка инициализации приложения:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение состояния приложения
  async getAppStatus() {
    try {
      const [history, references, lastCalc, changeHistory] = await Promise.all([
        calculationService.getStatistics(),
        referenceService.getAllReferences(),
        calculationService.getLastCalculation(),
        referenceService.getChangeHistory(5)
      ]);
      
      return {
        success: true,
        data: {
          database: {
            initialized: this.isInitialized,
            calculations: history.success ? history.data.total || 0 : 0,
            references: references.success ? references.data.length : 0
          },
          lastCalculation: lastCalc.success ? lastCalc.data : null,
          recentChanges: changeHistory.success ? changeHistory.data : []
        }
      };
      
    } catch (error) {
      console.error('Ошибка получения состояния:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Выполнение расчета с выбором из справочника
  async calculateWithReference(params) {
    try {
      const { dose, fractions, referenceId, tissue = '', notes = '' } = params;
      
      // Получаем α/β из справочника
      const reference = await referenceService.getReferenceById(referenceId);
      if (!reference.success) {
        return {
          success: false,
          error: 'Не удалось найти запись в справочнике'
        };
      }
      
      // Выполняем расчет
      const result = await calculationService.calculateAndSave({
        dose,
        fractions,
        alphaBeta: reference.data.alphaBeta,
        tissue: reference.data.tissue,
        notes: notes || `Ткань: ${reference.data.tissue}`
      });
      
      if (result.success) {
        return {
          success: true,
          data: {
            ...result.data,
            reference: reference.data
          },
          calculations: result.calculations,
          message: `Расчет выполнен для ткани: ${reference.data.tissue}`
        };
      }
      
      return result;
      
    } catch (error) {
      console.error('Ошибка расчета со справочником:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Экспорт данных приложения
  async exportData(format = 'json') {
    try {
      const [calculations, references, history] = await Promise.all([
        calculationService.getHistory(1000), // Все расчеты
        referenceService.getAllReferences(),
        referenceService.getChangeHistory(100)
      ]);
      
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          appName: 'Radiation Dose Assistant',
          version: '1.0',
          itemCounts: {
            calculations: calculations.data.length,
            references: references.data.length,
            changeHistory: history.data.length
          }
        },
        calculations: calculations.data,
        references: references.data,
        changeHistory: history.data
      };
      
      if (format === 'json') {
        return {
          success: true,
          format: 'json',
          data: JSON.stringify(exportData, null, 2),
          filename: `radiation_dose_data_${new Date().toISOString().split('T')[0]}.json`
        };
      } else if (format === 'csv') {
        // Простой CSV экспорт для расчетов
        let csv = 'Дата,Доза,Фракций,α/β,BED,EQD2\n';
        calculations.data.forEach(calc => {
          csv += `${calc.formattedDate},${calc.dose},${calc.fractions},${calc.alphaBeta},${calc.bed},${calc.eqd2}\n`;
        });
        
        return {
          success: true,
          format: 'csv',
          data: csv,
          filename: `calculations_${new Date().toISOString().split('T')[0]}.csv`
        };
      }
      
      return {
        success: false,
        error: 'Неподдерживаемый формат'
      };
      
    } catch (error) {
      console.error('Ошибка экспорта данных:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Резервное копирование базы данных
  async backupDatabase() {
    try {
      const exportResult = await this.exportData('json');
      if (exportResult.success) {
        return {
          success: true,
          message: 'Резервная копия создана',
          timestamp: new Date().toISOString(),
          itemCounts: exportResult.data.metadata?.itemCounts
        };
      }
      return exportResult;
    } catch (error) {
      console.error('Ошибка резервного копирования:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Экспортируем синглтон
const appService = new AppService();
export default appService;