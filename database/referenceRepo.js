// database/referenceRepo.js
import { dbHelpers } from './db';

// Проверяем и добавляем недостающие колонки
export const checkAndFixTable = async () => {
  try {
    console.log('Проверка структуры таблицы alpha_beta_references...');
    
    // Проверяем существование таблицы
    const tableExists = await dbHelpers.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='alpha_beta_references'"
    );
    
    if (tableExists.length === 0) {
      console.log('Таблица не существует, создаём...');
      await dbHelpers.runAsync(
        `CREATE TABLE alpha_beta_references (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tissue TEXT NOT NULL,
          alphaBeta REAL NOT NULL,
          description TEXT DEFAULT '',
          references_json TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      );
      console.log('Таблица alpha_beta_references создана');
      return true;
    }
    
    // Проверяем наличие колонок
    const columns = await dbHelpers.getAllAsync('PRAGMA table_info(alpha_beta_references)');
    const columnNames = columns.map(col => col.name);
    console.log('Существующие колонки:', columnNames);
    
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
    
    console.log('Структура таблицы проверена и исправлена');
    return true;
    
  } catch (error) {
    console.error('Ошибка при проверке таблицы:', error);
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
        tissue: 'Легкие (α/β = 3)', 
        alphaBeta: 3,
        value: '3',
        description: 'Для поздних эффектов в легочной ткани',
        references: []
      },
      { 
        id: 2, 
        tissue: 'Прямая кишка (α/β = 3)', 
        alphaBeta: 3,
        value: '3',
        description: 'Для поздних проктитов',
        references: []
      },
      { 
        id: 3, 
        tissue: 'Кожа (α/β = 10)', 
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
    await dbHelpers.runAsync('DELETE FROM alpha_beta_references WHERE id = ?', [id]);
    console.log('Запись успешно удалена');
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