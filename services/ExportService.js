import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import appService from './AppService';

class ExportService {
  // Экспорт данных в файл и предоставление доступа через диалог шаринга
  async exportDataToFile() {
    try {
      const exportResult = await appService.exportData('json');
      
      if (!exportResult.success) {
        throw new Error(exportResult.error);
      }
      
      // Создаем временный файл
      const fileUri = FileSystem.documentDirectory + exportResult.filename;
      await FileSystem.writeAsStringAsync(fileUri, exportResult.data, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      // Проверяем, доступен ли sharing
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (!isSharingAvailable) {
        return {
          success: false,
          error: 'Sharing не доступен на этом устройстве',
          fileUri
        };
      }
      
      // Открываем диалог шаринга
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Экспорт данных Radiation Dose Assistant',
        UTI: 'public.json'
      });
      
      return {
        success: true,
        fileUri,
        message: 'Данные успешно экспортированы'
      };
      
    } catch (error) {
      console.error('Ошибка экспорта данных:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Экспорт в CSV для таблиц
  async exportToCSV(dataType = 'calculations') {
    try {
      let csvData = '';
      let filename = '';
      
      if (dataType === 'calculations') {
        const history = await calculationService.getHistory(1000);
        if (!history.success) {
          throw new Error(history.error);
        }
        
        // Заголовки CSV
        csvData = 'Дата,Доза (Гр),Фракций,α/β,BED (Гр),EQD2 (Гр),Общая доза (Гр)\n';
        
        // Данные
        history.data.forEach(item => {
          const totalDose = item.dose * item.fractions;
          csvData += `${item.formattedDate},${item.dose},${item.fractions},${item.alphaBeta},${item.bed},${item.eqd2},${totalDose}\n`;
        });
        
        filename = `calculations_${new Date().toISOString().split('T')[0]}.csv`;
        
      } else if (dataType === 'references') {
        const references = await referenceService.getAllReferences();
        if (!references.success) {
          throw new Error(references.error);
        }
        
        // Заголовки CSV
        csvData = 'Ткань,α/β,Описание,Количество ссылок\n';
        
        // Данные
        references.data.forEach(ref => {
          const refCount = ref.references ? ref.references.length : 0;
          csvData += `"${ref.tissue}",${ref.alphaBeta},"${ref.description || ''}",${refCount}\n`;
        });
        
        filename = `alpha_beta_references_${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      // Сохраняем файл
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, csvData, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      // Предлагаем поделиться
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Экспорт ${dataType === 'calculations' ? 'расчетов' : 'справочника'}`,
          UTI: 'public.comma-separated-values-text'
        });
      }
      
      return {
        success: true,
        fileUri,
        filename,
        itemCount: csvData.split('\n').length - 2 // минус заголовок и последняя пустая строка
      };
      
    } catch (error) {
      console.error('Ошибка CSV экспорта:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Создание резервной копии
  async createBackup() {
    try {
      const backupResult = await appService.backupDatabase();
      
      if (!backupResult.success) {
        throw new Error(backupResult.error);
      }
      
      // Получаем данные для резервной копии
      const exportResult = await appService.exportData('json');
      if (!exportResult.success) {
        throw new Error(exportResult.error);
      }
      
      // Сохраняем резервную копию с отметкой времени
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `backup_${timestamp}.json`;
      const backupUri = FileSystem.documentDirectory + backupFilename;
      
      await FileSystem.writeAsStringAsync(backupUri, exportResult.data, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      // Также сохраняем информацию о резервной копии
      const backupInfo = {
        timestamp: new Date().toISOString(),
        filename: backupFilename,
        itemCounts: exportResult.data.metadata?.itemCounts
      };
      
      await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + 'last_backup_info.json',
        JSON.stringify(backupInfo, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      
      return {
        success: true,
        backupInfo,
        message: 'Резервная копия создана успешно'
      };
      
    } catch (error) {
      console.error('Ошибка создания резервной копии:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Проверка существующих резервных копий
  async listBackups() {
    try {
      const backupsDir = FileSystem.documentDirectory;
      const files = await FileSystem.readDirectoryAsync(backupsDir);
      
      const backupFiles = files
        .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
        .map(file => ({
          filename: file,
          uri: backupsDir + file,
          size: 0 // Можно добавить получение размера файла
        }))
        .sort((a, b) => b.filename.localeCompare(a.filename)); // Сортировка по дате
      
      return {
        success: true,
        backups: backupFiles,
        count: backupFiles.length
      };
      
    } catch (error) {
      console.error('Ошибка получения списка резервных копий:', error);
      return {
        success: false,
        error: error.message,
        backups: []
      };
    }
  }
}

// Экспортируем синглтон
const exportService = new ExportService();
export default exportService;