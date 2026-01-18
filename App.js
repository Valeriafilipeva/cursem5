import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper'; // Добавьте этот импорт

// Импортируем BottomTabs из отдельного файла
import BottomTabs from './navigation/BottomTabs';

// Импортируем инициализацию БД
import { initDB } from './database/db';

// Создаем тему для react-native-paper
const theme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976d2',
    secondary: '#ff4081',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#000000',
  },
};

// Компонент загрузки
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#1976d2" />
      <Text style={{ marginTop: 20, fontSize: 16, color: '#666' }}>
        Инициализация приложения...
      </Text>
    </View>
  );
}

// Компонент ошибки
function ErrorScreen({ error, onRetry }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, color: '#FF3B30', marginBottom: 10 }}>
        Ошибка загрузки
      </Text>
      <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
        {error}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{
          backgroundColor: '#1976d2',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8
        }}
      >
        <Text style={{ color: 'white', fontSize: 16 }}>Повторить</Text>
      </TouchableOpacity>
    </View>
  );
}

// Главный компонент приложения
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Инициализация при загрузке
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🔄 Инициализация приложения...');
      
      // Инициализация базы данных
      const dbInitialized = await initDB();
      
      if (!dbInitialized) {
        console.warn('⚠️ База данных не инициализирована, работаем в режиме без БД');
      }
      
      console.log('✅ Приложение инициализировано');
      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  // Показываем экран загрузки
  if (isLoading) {
    return (
      <PaperProvider theme={theme}>
        <LoadingScreen />
      </PaperProvider>
    );
  }

  // Показываем экран ошибки
  if (error) {
    return (
      <PaperProvider theme={theme}>
        <ErrorScreen error={error} onRetry={initializeApp} />
      </PaperProvider>
    );
  }

  // Основное приложение - ВАЖНО: PaperProvider должен быть на самом верхнем уровне
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#1976d2" />
        <BottomTabs />
      </NavigationContainer>
    </PaperProvider>
  );
}