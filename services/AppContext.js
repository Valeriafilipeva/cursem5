import React, { createContext, useState, useContext, useEffect } from 'react';
import appService from './AppService';
import calculationService from './CalculationService';
import referenceService from './ReferenceService';

// Создаем контекст
const AppContext = createContext();

// Провайдер контекста
export const AppProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appStatus, setAppStatus] = useState(null);
  const [error, setError] = useState(null);

  // Инициализация при загрузке
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await appService.initialize();
      
      if (result.success) {
        setIsInitialized(true);
        
        // Получаем статус приложения
        const status = await appService.getAppStatus();
        if (status.success) {
          setAppStatus(status.data);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Ошибка инициализации:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Выполнение расчета
  const performCalculation = async (params) => {
    try {
      const result = await calculationService.calculateAndSave(params);
      
      // Обновляем статус после расчета
      if (result.success) {
        const status = await appService.getAppStatus();
        if (status.success) {
          setAppStatus(status.data);
        }
      }
      
      return result;
    } catch (err) {
      console.error('Ошибка расчета:', err);
      return {
        success: false,
        error: err.message
      };
    }
  };

  // Поиск в справочнике
  const searchReferences = async (searchTerm) => {
    try {
      return await referenceService.searchReferences(searchTerm);
    } catch (err) {
      console.error('Ошибка поиска:', err);
      return {
        success: false,
        error: err.message
      };
    }
  };

  // Получение истории расчетов
  const getCalculationHistory = async (limit) => {
    try {
      return await calculationService.getHistory(limit);
    } catch (err) {
      console.error('Ошибка получения истории:', err);
      return {
        success: false,
        error: err.message
      };
    }
  };

  // Очистка истории
  const clearHistory = async () => {
    try {
      const result = await calculationService.clearHistory();
      
      // Обновляем статус
      if (result.success) {
        const status = await appService.getAppStatus();
        if (status.success) {
          setAppStatus(status.data);
        }
      }
      
      return result;
    } catch (err) {
      console.error('Ошибка очистки истории:', err);
      return {
        success: false,
        error: err.message
      };
    }
  };

  // Значения контекста
  const contextValue = {
    // Состояние
    isInitialized,
    isLoading,
    appStatus,
    error,
    
    // Действия
    initializeApp,
    performCalculation,
    searchReferences,
    getCalculationHistory,
    clearHistory,
    
    // Сервисы (для прямого доступа если нужно)
    calculationService,
    referenceService,
    appService
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Хук для использования контекста
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp должен использоваться внутри AppProvider');
  }
  return context;
};