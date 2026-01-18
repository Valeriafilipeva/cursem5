import { dbHelpers } from '../database/db';

class ReferenceService {
  // Получение всего справочника
  async getAllReferences() {
    try {
      const references = await dbHelpers.getAllAsync(
        'SELECT * FROM alpha_beta_references ORDER BY tissue'
      );
      
      // Парсим JSON ссылок
      const parsedReferences = references.map(ref => ({
        ...ref,
        references: ref.references_json ? JSON.parse(ref.references_json) : []
      }));
      
      return {
        success: true,
        data: parsedReferences,
        count: parsedReferences.length
      };
      
    } catch (error) {
      console.error('Ошибка получения справочника:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  // Поиск в справочнике
  async searchReferences(searchTerm) {
    try {
      const references = await dbHelpers.getAllAsync(
        `SELECT * FROM alpha_beta_references 
         WHERE tissue LIKE ? OR description LIKE ?
         ORDER BY 
           CASE WHEN tissue LIKE ? THEN 1 ELSE 2 END,
           tissue`,
        [`%${searchTerm}%`, `%${searchTerm}%`, `${searchTerm}%`]
      );
      
      // Парсим JSON ссылок
      const parsedReferences = references.map(ref => ({
        ...ref,
        references: ref.references_json ? JSON.parse(ref.references_json) : []
      }));
      
      return {
        success: true,
        data: parsedReferences,
        count: parsedReferences.length
      };
      
    } catch (error) {
      console.error('Ошибка поиска в справочнике:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  // Получение записи по ID
  async getReferenceById(id) {
    try {
      const reference = await dbHelpers.getFirstAsync(
        'SELECT * FROM alpha_beta_references WHERE id = ?',
        [id]
      );
      
      if (reference) {
        return {
          success: true,
          data: {
            ...reference,
            references: reference.references_json ? JSON.parse(reference.references_json) : []
          }
        };
      }
      
      return {
        success: false,
        error: 'Запись не найдена'
      };
      
    } catch (error) {
      console.error('Ошибка получения записи:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Добавление новой записи
  async addReference(tissue, alphaBeta, description = '', references = []) {
    try {
      // Валидация
      if (!tissue || tissue.trim().length < 2) {
        return {
          success: false,
          error: 'Название ткани должно содержать не менее 2 символов'
        };
      }
      
      if (!alphaBeta || alphaBeta <= 0) {
        return {
          success: false,
          error: 'α/β соотношение должно быть положительным числом'
        };
      }
      
      // Проверка на дубликат
      const existing = await dbHelpers.getFirstAsync(
        'SELECT id FROM alpha_beta_references WHERE LOWER(tissue) = LOWER(?)',
        [tissue.trim()]
      );
      
      if (existing) {
        return {
          success: false,
          error: `Ткань "${tissue}" уже существует в справочнике`
        };
      }
      
      // Сохранение
      const result = await dbHelpers.runAsync(
        `INSERT INTO alpha_beta_references 
         (tissue, alphaBeta, description, references_json) 
         VALUES (?, ?, ?, ?)`,
        [
          tissue.trim(),
          alphaBeta,
          description.trim(),
          JSON.stringify(references)
        ]
      );
      
      // Запись в историю изменений
      await dbHelpers.runAsync(
        `INSERT INTO reference_history 
         (action, tissue, alphaBeta, description, timestamp) 
         VALUES (?, ?, ?, ?, ?)`,
        ['ADD', tissue.trim(), alphaBeta, description.trim(), new Date().toISOString()]
      );
      
      return {
        success: true,
        data: {
          id: result.lastInsertRowId,
          tissue: tissue.trim(),
          alphaBeta,
          description: description.trim(),
          references
        },
        message: 'Запись успешно добавлена'
      };
      
    } catch (error) {
      console.error('Ошибка добавления записи:', error);
      return {
        success: false,
        error: 'Ошибка базы данных: ' + error.message
      };
    }
  }

  // Обновление записи
  async updateReference(id, updates) {
    try {
      // Получаем старую запись для истории
      const oldReference = await this.getReferenceById(id);
      if (!oldReference.success) {
        return oldReference;
      }
      
      const { tissue, alphaBeta, description = '' } = updates;
      
      // Валидация
      if (tissue && tissue.trim().length < 2) {
        return {
          success: false,
          error: 'Название ткани должно содержать не менее 2 символов'
        };
      }
      
      if (alphaBeta && alphaBeta <= 0) {
        return {
          success: false,
          error: 'α/β соотношение должно быть положительным числом'
        };
      }
      
      // Обновление
      const result = await dbHelpers.runAsync(
        `UPDATE alpha_beta_references 
         SET tissue = COALESCE(?, tissue),
             alphaBeta = COALESCE(?, alphaBeta),
             description = COALESCE(?, description)
         WHERE id = ?`,
        [
          tissue ? tissue.trim() : null,
          alphaBeta,
          description ? description.trim() : null,
          id
        ]
      );
      
      if (result.changes === 0) {
        return {
          success: false,
          error: 'Запись не найдена'
        };
      }
      
      // Запись в историю изменений
      await dbHelpers.runAsync(
        `INSERT INTO reference_history 
         (action, tissue, alphaBeta, description, 
          previous_tissue, previous_alphaBeta, previous_description, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'UPDATE',
          tissue ? tissue.trim() : oldReference.data.tissue,
          alphaBeta || oldReference.data.alphaBeta,
          description ? description.trim() : oldReference.data.description,
          oldReference.data.tissue,
          oldReference.data.alphaBeta,
          oldReference.data.description,
          new Date().toISOString()
        ]
      );
      
      return {
        success: true,
        message: 'Запись успешно обновлена'
      };
      
    } catch (error) {
      console.error('Ошибка обновления записи:', error);
      return {
        success: false,
        error: 'Ошибка базы данных: ' + error.message
      };
    }
  }

  // Удаление записи
  async deleteReference(id) {
    try {
      // Получаем запись для истории
      const reference = await this.getReferenceById(id);
      if (!reference.success) {
        return reference;
      }
      
      // Удаление
      const result = await dbHelpers.runAsync(
        'DELETE FROM alpha_beta_references WHERE id = ?',
        [id]
      );
      
      if (result.changes === 0) {
        return {
          success: false,
          error: 'Запись не найдена'
        };
      }
      
      // Запись в историю изменений
      await dbHelpers.runAsync(
        `INSERT INTO reference_history 
         (action, tissue, alphaBeta, description, timestamp) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          'DELETE',
          reference.data.tissue,
          reference.data.alphaBeta,
          reference.data.description,
          new Date().toISOString()
        ]
      );
      
      return {
        success: true,
        message: 'Запись успешно удалена'
      };
      
    } catch (error) {
      console.error('Ошибка удаления записи:', error);
      return {
        success: false,
        error: 'Ошибка базы данных: ' + error.message
      };
    }
  }

  // Получение истории изменений
  async getChangeHistory(limit = 50) {
    try {
      const history = await dbHelpers.getAllAsync(
        `SELECT * FROM reference_history 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [limit]
      );
      
      // Форматируем даты
      const formattedHistory = history.map(item => ({
        ...item,
        formattedDate: new Date(item.timestamp).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        actionText: this.getActionText(item.action)
      }));
      
      return {
        success: true,
        data: formattedHistory,
        count: formattedHistory.length
      };
      
    } catch (error) {
      console.error('Ошибка получения истории изменений:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  // Текст действия для отображения
  getActionText(action) {
    const actions = {
      'ADD': 'Добавление',
      'UPDATE': 'Обновление',
      'DELETE': 'Удаление'
    };
    return actions[action] || action;
  }
}

// Экспортируем синглтон
const referenceService = new ReferenceService();
export default referenceService;