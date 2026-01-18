// database/referenceHistoryRepo.js
import { dbHelpers } from './db';

// Добавление записи в историю
export const addToHistory = async ({ 
  action, 
  tissue, 
  alphaBeta, 
  description = '',
  previousTissue = null, 
  previousAlphaBeta = null,
  previousDescription = null
}) => {
  try {
    const result = await dbHelpers.runAsync(
      `INSERT INTO reference_history 
       (action, tissue, alphaBeta, description, previous_tissue, previous_alphaBeta, previous_description, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        action,
        tissue,
        alphaBeta,
        description,
        previousTissue,
        previousAlphaBeta,
        previousDescription,
        new Date().toISOString()
      ]
    );
    
    console.log(`Запись истории добавлена с ID: ${result.lastInsertRowId}`);
    return result.lastInsertRowId;
    
  } catch (error) {
    console.error('Ошибка добавления в историю:', error);
    throw error;
  }
};

// Получение истории изменений справочника
export const getReferenceHistory = async () => {
  try {
    const results = await dbHelpers.getAllAsync(
      `SELECT * FROM reference_history 
       ORDER BY timestamp DESC`
    );
    
    console.log(`Загружено ${results.length} записей истории`);
    
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
    }));
    
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    return [];
  }
};

// Удаление записи из истории
export const deleteHistoryRecord = async (id) => {
  try {
    await dbHelpers.runAsync('DELETE FROM reference_history WHERE id = ?', [id]);
    console.log(`Запись истории удалена: ${id}`);
    return true;
  } catch (error) {
    console.error('Ошибка удаления записи истории:', error);
    throw error;
  }
};

// Очистка всей истории
export const clearAllHistory = async () => {
  try {
    await dbHelpers.runAsync('DELETE FROM reference_history');
    console.log('Вся история очищена');
    return true;
  } catch (error) {
    console.error('Ошибка очистки истории:', error);
    throw error;
  }
};

// Получение количества записей
export const getHistoryCount = async () => {
  try {
    const result = await dbHelpers.getFirstAsync(
      'SELECT COUNT(*) as count FROM reference_history'
    );
    return result ? result.count : 0;
  } catch (error) {
    console.error('Ошибка получения количества записей:', error);
    return 0;
  }
};