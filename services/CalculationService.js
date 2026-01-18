import { dbHelpers } from '../database/db';

class CalculationService {
  // Расчет BED по формуле: BED = n*d*(1 + d/(α/β))
  calculateBED(dose, fractions, alphaBeta) {
    if (!dose || !fractions || !alphaBeta || alphaBeta <= 0) return 0;
    const totalDose = dose * fractions;
    return totalDose * (1 + dose / alphaBeta);
  }

  // Расчет EQD2: EQD2 = BED / (1 + 2/(α/β))
  calculateEQD2(dose, fractions, alphaBeta) {
    if (!dose || !fractions || !alphaBeta || alphaBeta <= 0) return 0;
    const bed = this.calculateBED(dose, fractions, alphaBeta);
    return bed / (1 + 2 / alphaBeta);
  }

  // Основной метод для расчета
  async calculateAndSave(params) {
    try {
      const { dose, fractions, alphaBeta, tissue = '', notes = '' } = params;
      
      // Валидация входных данных
      const validation = this.validateInput(dose, fractions, alphaBeta);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }
      
      // Расчеты
      const bed = this.calculateBED(dose, fractions, alphaBeta);
      const eqd2 = this.calculateEQD2(dose, fractions, alphaBeta);
      
      // Округление результатов
      const roundedBed = Math.round(bed * 10000) / 10000;
      const roundedEqd2 = Math.round(eqd2 * 10000) / 10000;
      
      // Сохранение в базу данных
      const result = await dbHelpers.runAsync(
        `INSERT INTO calculations 
         (dose, fractions, alphaBeta, bed, eqd2, date) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [dose, fractions, alphaBeta, roundedBed, roundedEqd2, new Date().toISOString()]
      );
      
      // Если указана ткань, логируем это
      if (tissue) {
        console.log(`Расчет сохранен для ткани: ${tissue}`);
      }
      
      return {
        success: true,
        data: {
          id: result.lastInsertRowId,
          dose,
          fractions,
          alphaBeta,
          bed: roundedBed,
          eqd2: roundedEqd2,
          totalDose: dose * fractions,
          date: new Date().toISOString()
        },
        calculations: {
          bed: roundedBed,
          eqd2: roundedEqd2
        }
      };
      
    } catch (error) {
      console.error('Ошибка при расчете и сохранении:', error);
      return {
        success: false,
        error: 'Ошибка базы данных: ' + error.message
      };
    }
  }

  // Валидация входных данных
  validateInput(dose, fractions, alphaBeta) {
    if (!dose || dose <= 0) {
      return { valid: false, error: 'Доза должна быть положительным числом' };
    }
    
    if (dose > 20) {
      return { valid: false, error: 'Доза слишком высока (макс. 20 Гр)' };
    }
    
    if (!fractions || fractions <= 0 || !Number.isInteger(fractions)) {
      return { valid: false, error: 'Количество фракций должно быть целым положительным числом' };
    }
    
    if (fractions > 100) {
      return { valid: false, error: 'Слишком много фракций (макс. 100)' };
    }
    
    if (!alphaBeta || alphaBeta <= 0) {
      return { valid: false, error: 'α/β соотношение должно быть положительным числом' };
    }
    
    if (alphaBeta > 100) {
      return { valid: false, error: 'α/β соотношение слишком велико' };
    }
    
    return { valid: true };
  }

  // Получение истории расчетов
  async getHistory(limit = 50) {
    try {
      const history = await dbHelpers.getAllAsync(
        `SELECT * FROM calculations 
         ORDER BY date DESC 
         LIMIT ?`,
        [limit]
      );
      
      // Форматируем даты для отображения
      const formattedHistory = history.map(item => ({
        ...item,
        formattedDate: new Date(item.date).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        bedFormatted: parseFloat(item.bed).toFixed(4),
        eqd2Formatted: parseFloat(item.eqd2).toFixed(4)
      }));
      
      return {
        success: true,
        data: formattedHistory,
        count: formattedHistory.length
      };
      
    } catch (error) {
      console.error('Ошибка получения истории:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  // Получение последнего расчета
  async getLastCalculation() {
    try {
      const last = await dbHelpers.getFirstAsync(
        `SELECT * FROM calculations 
         ORDER BY date DESC 
         LIMIT 1`
      );
      
      if (last) {
        return {
          success: true,
          data: {
            ...last,
            formattedDate: new Date(last.date).toLocaleDateString('ru-RU')
          }
        };
      }
      
      return {
        success: true,
        data: null
      };
      
    } catch (error) {
      console.error('Ошибка получения последнего расчета:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Удаление расчета по ID
  async deleteCalculation(id) {
    try {
      const result = await dbHelpers.runAsync(
        'DELETE FROM calculations WHERE id = ?',
        [id]
      );
      
      return {
        success: true,
        deleted: result.changes > 0,
        message: result.changes > 0 ? 'Расчет удален' : 'Расчет не найден'
      };
      
    } catch (error) {
      console.error('Ошибка удаления расчета:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Очистка всей истории
  async clearHistory() {
    try {
      await dbHelpers.runAsync('DELETE FROM calculations');
      return {
        success: true,
        message: 'История расчетов очищена'
      };
    } catch (error) {
      console.error('Ошибка очистки истории:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Статистика по расчетам
  async getStatistics() {
    try {
      const stats = await dbHelpers.getFirstAsync(`
        SELECT 
          COUNT(*) as total,
          MIN(date) as firstDate,
          MAX(date) as lastDate,
          AVG(dose) as avgDose,
          AVG(fractions) as avgFractions,
          AVG(alphaBeta) as avgAlphaBeta
        FROM calculations
      `);
      
      return {
        success: true,
        data: {
          ...stats,
          firstDate: stats.firstDate ? new Date(stats.firstDate).toLocaleDateString('ru-RU') : null,
          lastDate: stats.lastDate ? new Date(stats.lastDate).toLocaleDateString('ru-RU') : null
        }
      };
      
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Экспортируем синглтон
const calculationService = new CalculationService();
export default calculationService;