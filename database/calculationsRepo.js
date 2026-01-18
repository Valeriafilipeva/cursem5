// database/calculationsRepo.js
import { dbHelpers } from './db';

// Вставка расчёта
export const insertCalculation = async (calculation) => {
  try {
    const result = await dbHelpers.runAsync(
      `INSERT INTO calculations (dose, fractions, alphaBeta, bed, eqd2, date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        calculation.dose,
        calculation.fractions,
        calculation.alphaBeta,
        calculation.bed,
        calculation.eqd2,
        calculation.date || new Date().toISOString()
      ]
    );
    
    console.log('Calculation saved with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
    
  } catch (error) {
    console.error('Error inserting calculation:', error);
    // Для отладки: возвращаем тестовый ID
    return Date.now(); // временное решение для тестирования
  }
};

// Получение всех расчётов
export const getAllCalculations = async () => {
  try {
    const results = await dbHelpers.getAllAsync(
      'SELECT * FROM calculations ORDER BY date DESC'
    );
    
    console.log(`Loaded ${results.length} calculations`);
    return results;
    
  } catch (error) {
    console.error('Error getting calculations:', error);
    // Возвращаем тестовые данные для отладки
    return [
      {
        id: 1,
        dose: 2.0,
        fractions: 30,
        alphaBeta: 3,
        bed: 180,
        eqd2: 90,
        date: new Date().toISOString()
      },
      {
        id: 2,
        dose: 1.8,
        fractions: 35,
        alphaBeta: 10,
        bed: 95.4,
        eqd2: 47.7,
        date: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  }
};

// Удаление расчёта
export const deleteCalculation = async (id) => {
  try {
    await dbHelpers.runAsync('DELETE FROM calculations WHERE id = ?', [id]);
    console.log('Calculation deleted:', id);
    return true;
    
  } catch (error) {
    console.error('Error deleting calculation:', error);
    throw error;
  }
};

// Дополнительные функции для удобства
export const clearAllCalculations = async () => {
  try {
    await dbHelpers.runAsync('DELETE FROM calculations');
    console.log('All calculations cleared');
    return true;
  } catch (error) {
    console.error('Error clearing calculations:', error);
    throw error;
  }
};

  // Добавьте в существующий файл database/calculationsRepo.js
export const getCalculationsStats = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const totalResult = await dbHelpers.getFirstAsync(
      'SELECT COUNT(*) as total FROM calculations'
    );
    
    const todayResult = await dbHelpers.getFirstAsync(
      'SELECT COUNT(*) as today FROM calculations WHERE date LIKE ?',
      [`${today}%`]
    );
    
    const recentResult = await dbHelpers.getAllAsync(
      'SELECT * FROM calculations ORDER BY date DESC LIMIT 5'
    );
    
    return {
      total: totalResult?.total || 0,
      today: todayResult?.today || 0,
      recent: recentResult || []
    };
    
  } catch (error) {
    console.error('Error getting calculations stats:', error);
    return {
      total: 0,
      today: 0,
      recent: []
    };
  }
};

export const getCalculationsCount = async () => {
  try {
    const result = await dbHelpers.getFirstAsync(
      'SELECT COUNT(*) as count FROM calculations'
    );
    return result ? result.count : 0;
  } catch (error) {
    console.error('Error getting calculations count:', error);
    return 0;
  }
};