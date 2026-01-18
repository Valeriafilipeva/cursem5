// database/referenceRepo.js
import { dbHelpers } from './db';

// Проверяем и добавляем недостающие колонки
export const checkAndFixTable = async () => {
  try {
    console.log('Проверка структуры таблиц...');
    
    // Проверяем существование таблицы справочника
    const refTableExists = await dbHelpers.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='alpha_beta_references'"
    );
    
    if (refTableExists.length === 0) {
      console.log('Таблица alpha_beta_references не существует, создаём...');
      await dbHelpers.runAsync(
        `CREATE TABLE alpha_beta_references (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tissue TEXT NOT NULL UNIQUE,
          alphaBeta REAL NOT NULL,
          description TEXT DEFAULT '',
          references_json TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      );
      console.log('Таблица alpha_beta_references создана');
    }
    
    // Проверяем существование таблицы истории (ПОСТОЯННОЕ ХРАНЕНИЕ)
    const historyTableExists = await dbHelpers.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='reference_history'"
    );
    
    if (historyTableExists.length === 0) {
      console.log('Таблица reference_history не существует, создаём...');
      await dbHelpers.runAsync(
        `CREATE TABLE reference_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          tissue TEXT NOT NULL,
          alphaBeta REAL NOT NULL,
          description TEXT,
          previous_tissue TEXT,
          previous_alphaBeta REAL,
          previous_description TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          -- Индекс для быстрого поиска по дате
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      );
      
      // Создаем индекс для быстрого поиска по дате
      await dbHelpers.runAsync(
        'CREATE INDEX IF NOT EXISTS idx_reference_history_timestamp ON reference_history(timestamp DESC)'
      );
      
      console.log('Таблица reference_history создана с индексами');
    }
    
    // Проверяем наличие колонок в таблице справочника
    const columns = await dbHelpers.getAllAsync('PRAGMA table_info(alpha_beta_references)');
    const columnNames = columns.map(col => col.name);
    console.log('Существующие колонки alpha_beta_references:', columnNames);
    
    // Добавляем колонку description если её нет
    if (!columnNames.includes('description')) {
      console.log('Добавляем колонку description...');
      await dbHelpers.runAsync(
        'ALTER TABLE alpha_beta_references ADD COLUMN description TEXT DEFAULT ""'
      );
      console.log('Колонка description добавлена');
    }
    
    // Добавляем колонку references_json если её нет
    if (!columnNames.includes('references_json')) {
      console.log('Добавляем колонку references_json...');
      await dbHelpers.runAsync(
        'ALTER TABLE alpha_beta_references ADD COLUMN references_json TEXT DEFAULT "[]"'
      );
      console.log('Колонка references_json добавлена');
    }
    
    console.log('Структура таблиц проверена и исправлена');
    return true;
    
  } catch (error) {
    console.error('Ошибка при проверке таблиц:', error);
    return false;
  }
};

// Функция для записи истории изменений (ПОСТОЯННОЕ ХРАНЕНИЕ)
export const logReferenceHistory = async (action, referenceData, previousData = null) => {
  try {
    console.log(`📝 Логирование истории: ${action} для ткани: ${referenceData.tissue}`);
    
    const timestamp = new Date().toISOString();
    
    await dbHelpers.runAsync(
      `INSERT INTO reference_history 
       (action, tissue, alphaBeta, description, previous_tissue, previous_alphaBeta, previous_description, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        action,
        referenceData.tissue,
        referenceData.alphaBeta,
        referenceData.description || '',
        previousData?.tissue || null,
        previousData?.alphaBeta || null,
        previousData?.description || null,
        timestamp
      ]
    );
    
    console.log(`✅ История записана успешно: ${action} - ${referenceData.tissue}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка записи истории:', error);
    return false;
  }
};

// Получение всей истории с пагинацией (всегда, даже старые записи)
export const getReferenceHistory = async (limit = 100, offset = 0) => {
  try {
    console.log(`Получение истории изменений (limit: ${limit}, offset: ${offset})...`);
    
    // Проверяем и исправляем таблицу
    await checkAndFixTable();
    
    const results = await dbHelpers.getAllAsync(
      `SELECT * FROM reference_history 
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    console.log(`📊 Загружено ${results.length} записей истории`);
    
    return results.map(item => ({
      id: item.id,
      action: item.action,
      tissue: item.tissue,
      alphaBeta: item.alphaBeta,
      description: item.description || '',
      previousTissue: item.previous_tissue,
      previousAlphaBeta: item.previous_alphaBeta,
      previousDescription: item.previous_description || '',
      timestamp: item.timestamp,
      formattedDate: formatHistoryDate(item.timestamp),
      isRecent: isRecentHistory(item.timestamp)
    }));
  } catch (error) {
    console.error('❌ Ошибка получения истории:', error);
    return [];
  }
};

// Получение всей истории без ограничений (для экспорта)
export const getAllReferenceHistory = async () => {
  try {
    console.log('Получение всей истории изменений...');
    
    await checkAndFixTable();
    
    const results = await dbHelpers.getAllAsync(
      'SELECT * FROM reference_history ORDER BY timestamp DESC'
    );
    
    console.log(`📊 Всего записей в истории: ${results.length}`);
    
    return results.map(item => ({
      id: item.id,
      action: item.action,
      tissue: item.tissue,
      alphaBeta: item.alphaBeta,
      description: item.description || '',
      previousTissue: item.previous_tissue,
      previousAlphaBeta: item.previous_alphaBeta,
      previousDescription: item.previous_description || '',
      timestamp: item.timestamp,
      formattedDate: formatHistoryDate(item.timestamp)
    }));
  } catch (error) {
    console.error('❌ Ошибка получения всей истории:', error);
    return [];
  }
};

// Получение истории за определенный период
export const getReferenceHistoryByPeriod = async (startDate, endDate) => {
  try {
    console.log(`Получение истории за период: ${startDate} - ${endDate}`);
    
    await checkAndFixTable();
    
    const results = await dbHelpers.getAllAsync(
      `SELECT * FROM reference_history 
       WHERE timestamp BETWEEN ? AND ?
       ORDER BY timestamp DESC`,
      [startDate, endDate]
    );
    
    console.log(`📊 Найдено ${results.length} записей за указанный период`);
    
    return results.map(item => ({
      id: item.id,
      action: item.action,
      tissue: item.tissue,
      alphaBeta: item.alphaBeta,
      description: item.description || '',
      previousTissue: item.previous_tissue,
      previousAlphaBeta: item.previous_alphaBeta,
      previousDescription: item.previous_description || '',
      timestamp: item.timestamp,
      formattedDate: formatHistoryDate(item.timestamp)
    }));
  } catch (error) {
    console.error('❌ Ошибка получения истории по периоду:', error);
    return [];
  }
};

// Получение истории за сегодня
export const getTodayHistory = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    return await getReferenceHistoryByPeriod(`${today}T00:00:00.000Z`, `${tomorrow}T00:00:00.000Z`);
  } catch (error) {
    console.error('❌ Ошибка получения истории за сегодня:', error);
    return [];
  }
};

// Получение истории за вчера
export const getYesterdayHistory = async () => {
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    return await getReferenceHistoryByPeriod(`${yesterday}T00:00:00.000Z`, `${today}T00:00:00.000Z`);
  } catch (error) {
    console.error('❌ Ошибка получения истории за вчера:', error);
    return [];
  }
};

// Получение истории за последние 7 дней
export const getLastWeekHistory = async () => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const now = new Date().toISOString();
    
    return await getReferenceHistoryByPeriod(weekAgo, now);
  } catch (error) {
    console.error('❌ Ошибка получения истории за последнюю неделю:', error);
    return [];
  }
};

// Получение количества записей в истории
export const getHistoryCount = async () => {
  try {
    await checkAndFixTable();
    
    const result = await dbHelpers.getFirstAsync(
      'SELECT COUNT(*) as count FROM reference_history'
    );
    
    const count = result ? result.count : 0;
    console.log(`📊 Всего записей в истории: ${count}`);
    
    return count;
  } catch (error) {
    console.error('❌ Ошибка получения количества записей истории:', error);
    return 0;
  }
};

// Очистка старой истории (например, старше 90 дней)
export const cleanOldHistory = async (daysToKeep = 90) => {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 86400000).toISOString();
    
    const result = await dbHelpers.runAsync(
      'DELETE FROM reference_history WHERE timestamp < ?',
      [cutoffDate]
    );
    
    console.log(`🧹 Очищено ${result.changes} записей истории старше ${daysToKeep} дней`);
    return result.changes;
  } catch (error) {
    console.error('❌ Ошибка очистки старой истории:', error);
    return 0;
  }
};

// Вспомогательные функции для форматирования даты
const formatHistoryDate = (timestamp) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Сегодня ' + date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return 'Вчера ' + date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays < 7) {
      const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      return days[date.getDay()] + ' ' + date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (error) {
    return timestamp || 'Неизвестная дата';
  }
};

const isRecentHistory = (timestamp) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours < 24; // Считаем "недавним" если меньше 24 часов
  } catch (error) {
    return false;
  }
};
// Получение всех записей
export const getAllReferences = async () => {
  try {
    console.log('Загрузка всех записей из справочника...');
    
    // Сначала проверяем и исправляем таблицу
    await checkAndFixTable();
    
    const results = await dbHelpers.getAllAsync(
      'SELECT * FROM alpha_beta_references ORDER BY tissue COLLATE NOCASE'
    );
    
    console.log(`Загружено ${results.length} записей из базы данных`);
    
    const references = results.map(item => {
      // Парсим references_json или используем пустой массив
      let referencesArray = [];
      try {
        if (item.references_json && item.references_json !== '[]') {
          referencesArray = JSON.parse(item.references_json);
        }
      } catch (e) {
        console.warn('Ошибка парсинга references_json для записи', item.id, e);
      }
      
      return {
        id: item.id,
        tissue: item.tissue || '',
        alphaBeta: item.alphaBeta || 0,
        value: (item.alphaBeta || 0).toString(), // ГАРАНТИРОВАННОЕ поле value
        description: item.description || '',
        references: referencesArray,
      };
    });
    
    console.log('Первые 2 записи:', references.slice(0, 2));
    return references;
    
  } catch (error) {
    console.error('Ошибка получения записей:', error);
    // Возвращаем тестовые данные при ошибке
    const fallbackData = [
      { 
        id: 1, 
        tissue: 'Легкие', 
        alphaBeta: 3,
        value: '3',
        description: 'Для поздних эффектов в легочной ткани',
        references: []
      },
      { 
        id: 2, 
        tissue: 'Прямая кишка', 
        alphaBeta: 3,
        value: '3',
        description: 'Для поздних проктитов',
        references: []
      },
      { 
        id: 3, 
        tissue: 'Кожа', 
        alphaBeta: 10,
        value: '10',
        description: 'Для ранних реакций кожи',
        references: []
      },
    ];
    console.log('Используем fallback данные:', fallbackData);
    return fallbackData;
  }
};

// Добавление новой записи
export const addReference = async ({ 
  tissue, 
  alphaBeta, 
  description = '', 
  references = [] 
}) => {
  console.log('Добавление новой записи:', { tissue, alphaBeta, description });
  
  try {
    // Сначала проверяем и исправляем таблицу
    await checkAndFixTable();
    
    // Проверка на дубликаты
    const existing = await dbHelpers.getAllAsync(
      'SELECT * FROM alpha_beta_references WHERE LOWER(tissue) = LOWER(?)',
      [tissue.trim()]
    );
    
    if (existing.length > 0) {
      throw new Error('Такая ткань уже существует');
    }
    
    const referencesJson = JSON.stringify(references);
    
    const result = await dbHelpers.runAsync(
      `INSERT INTO alpha_beta_references 
       (tissue, alphaBeta, description, references_json) 
       VALUES (?, ?, ?, ?)`,
      [tissue.trim(), alphaBeta, description.trim(), referencesJson]
    );
    
    console.log('Запись добавлена с ID:', result.lastInsertRowId);
    
    // Логируем в историю
    await logReferenceHistory('ADD', {
      tissue: tissue.trim(),
      alphaBeta,
      description: description.trim()
    });
    
    return { 
      id: result.lastInsertRowId, 
      tissue: tissue.trim(), 
      alphaBeta,
      value: alphaBeta.toString(),
      description: description.trim(),
      references 
    };
    
  } catch (error) {
    console.error('Ошибка добавления записи:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error('Такая ткань уже существует в базе данных');
    }
    throw error;
  }
};

// Обновление записи
export const updateReference = async (id, { 
  tissue, 
  alphaBeta, 
  description = '', 
  references = [] 
}) => {
  console.log('Обновление записи:', id, { tissue, alphaBeta, description });
  
  try {
    // Сначала проверяем и исправляем таблицу
    await checkAndFixTable();
    
    // Получаем старые значения для истории
    const oldRecord = await dbHelpers.getFirstAsync(
      'SELECT tissue, alphaBeta, description FROM alpha_beta_references WHERE id = ?',
      [id]
    );
    
    if (!oldRecord) {
      throw new Error('Запись не найдена');
    }
    
    // Проверка на дубликаты (исключая текущую запись)
    const existing = await dbHelpers.getAllAsync(
      'SELECT * FROM alpha_beta_references WHERE LOWER(tissue) = LOWER(?) AND id != ?',
      [tissue.trim(), id]
    );
    
    if (existing.length > 0) {
      throw new Error('Такая ткань уже существует');
    }
    
    const referencesJson = JSON.stringify(references);
    
    await dbHelpers.runAsync(
      `UPDATE alpha_beta_references 
       SET tissue = ?, alphaBeta = ?, description = ?, references_json = ? 
       WHERE id = ?`,
      [tissue.trim(), alphaBeta, description.trim(), referencesJson, id]
    );
    
    console.log('Запись обновлена:', id);
    
    // Логируем в историю
    await logReferenceHistory('UPDATE', {
      tissue: tissue.trim(),
      alphaBeta,
      description: description.trim()
    }, {
      tissue: oldRecord.tissue,
      alphaBeta: oldRecord.alphaBeta,
      description: oldRecord.description || ''
    });
    
    return { 
      id, 
      tissue: tissue.trim(), 
      alphaBeta,
      value: alphaBeta.toString(),
      description: description.trim(),
      references 
    };
    
  } catch (error) {
    console.error('Ошибка обновления записи:', error);
    throw error;
  }
};

// Удаление записи
export const deleteReference = async (id) => {
  console.log('Удаление записи:', id);
  
  try {
    // Получаем данные перед удалением для истории
    const oldRecord = await dbHelpers.getFirstAsync(
      'SELECT tissue, alphaBeta, description FROM alpha_beta_references WHERE id = ?',
      [id]
    );
    
    if (!oldRecord) {
      throw new Error('Запись не найдена');
    }
    
    await dbHelpers.runAsync('DELETE FROM alpha_beta_references WHERE id = ?', [id]);
    console.log('Запись успешно удалена');
    
    // Логируем в историю
    await logReferenceHistory('DELETE', {
      tissue: oldRecord.tissue,
      alphaBeta: oldRecord.alphaBeta,
      description: oldRecord.description || ''
    });
    
    return true;
    
  } catch (error) {
    console.error('Ошибка удаления записи:', error);
    throw error;
  }
};

// Поиск записей
export const searchReferences = async (searchText) => {
  try {
    // Сначала проверяем и исправляем таблицу
    await checkAndFixTable();
    
    const results = await dbHelpers.getAllAsync(
      `SELECT * FROM alpha_beta_references 
       WHERE tissue LIKE ? OR description LIKE ?
       ORDER BY tissue`,
      [`%${searchText}%`, `%${searchText}%`]
    );
    
    return results.map(item => {
      let referencesArray = [];
      try {
        if (item.references_json && item.references_json !== '[]') {
          referencesArray = JSON.parse(item.references_json);
        }
      } catch (e) {
        console.warn('Ошибка парсинга references_json для записи', item.id, e);
      }
      
      return {
        id: item.id,
        tissue: item.tissue || '',
        alphaBeta: item.alphaBeta || 0,
        value: (item.alphaBeta || 0).toString(),
        description: item.description || '',
        references: referencesArray,
      };
    });
  } catch (error) {
    console.error('Ошибка поиска записей:', error);
    return [];
  }
};

// Получение записи по ID
export const getReferenceById = async (id) => {
  try {
    // Сначала проверяем и исправляем таблицу
    await checkAndFixTable();
    
    const result = await dbHelpers.getFirstAsync(
      'SELECT * FROM alpha_beta_references WHERE id = ?',
      [id]
    );
    
    if (!result) {
      console.log('Запись не найдена для ID:', id);
      return null;
    }
    
    let referencesArray = [];
    try {
      if (result.references_json && result.references_json !== '[]') {
        referencesArray = JSON.parse(result.references_json);
      }
    } catch (e) {
      console.warn('Ошибка парсинга references_json для записи', result.id, e);
    }
    
    return {
      id: result.id,
      tissue: result.tissue || '',
      alphaBeta: result.alphaBeta || 0,
      value: (result.alphaBeta || 0).toString(),
      description: result.description || '',
      references: referencesArray,
    };
  } catch (error) {
    console.error('Ошибка получения записи по ID:', error);
    return null;
  }
};

// Проверка существования таблицы
export const checkReferencesTable = async () => {
  try {
    const result = await dbHelpers.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='alpha_beta_references'"
    );
    return result.length > 0;
  } catch (error) {
    console.error('Ошибка проверки таблицы:', error);
    return false;
  }
};

// Получение количества записей
export const getReferencesCount = async () => {
  try {
    const result = await dbHelpers.getFirstAsync(
      'SELECT COUNT(*) as count FROM alpha_beta_references'
    );
    return result ? result.count : 0;
  } catch (error) {
    console.error('Ошибка получения количества записей:', error);
    return 0;
  }
};

// Экспорт всех данных в JSON
export const exportAllReferences = async () => {
  try {
    const references = await getAllReferences();
    return {
      timestamp: new Date().toISOString(),
      count: references.length,
      data: references
    };
  } catch (error) {
    console.error('Ошибка экспорта данных:', error);
    return null;
  }
};