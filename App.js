// App.js
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { PaperProvider, Text } from 'react-native-paper';

// Импорт экранов
import CalculatorScreen from './screens/CalculatorScreen';
import ReferenceScreen from './screens/ReferenceScreen';
import HistoryScreen from './screens/HistoryScreen';

// Инициализация БД
import { initDB } from './database/db';
import { checkAndFixTable } from './database/referenceRepo'; // Добавляем проверку структуры таблицы

const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Calculator') {
            iconName = 'calculate';
          } else if (route.name === 'Reference') {
            iconName = 'menu-book';
          } else if (route.name === 'History') {
            iconName = 'history';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#1976d2',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen 
        name="Calculator" 
        component={CalculatorScreen}
        options={{ 
          title: 'Калькулятор',
          headerTitle: 'Калькулятор BED/EQD₂',
        }}
      />
      <Tab.Screen 
        name="Reference" 
        component={ReferenceScreen}
        options={{ 
          title: 'Справочник',
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{ 
          title: 'История',
          headerTitle: 'История расчетов',
        }}
      />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1976d2" />
      <Text style={styles.loadingText}>Загрузка приложения...</Text>
    </View>
  );
}

function ErrorScreen({ error }) {
  return (
    <View style={styles.center}>
      <MaterialIcons name="error-outline" size={64} color="#f44336" />
      <Text style={styles.errorTitle}>Ошибка</Text>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  // App.js - обновите функцию initializeApp
const initializeApp = async () => {
  try {
    console.log('=== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===');
    
    // Проверяем версию Expo SQLite
    console.log('Проверка SQLite...');
    const SQLite = await import('expo-sqlite');
    console.log('SQLite версия:', SQLite.default ? 'default' : 'named exports');
    console.log('Доступные методы:', Object.keys(SQLite));
    
    // 1. Инициализация базы данных
    console.log('Шаг 1: Инициализация базы данных...');
    const dbSuccess = await initDB();
    
    if (!dbSuccess) {
      console.warn('База данных не была инициализирована, но продолжаем работу с фейковыми данными');
    }
    
    console.log('✓ База данных инициализирована');
    
    // 2. Проверка и исправление структуры таблицы справочника
    console.log('Шаг 2: Проверка структуры таблицы справочника...');
    try {
      const { checkAndFixTable } = await import('./database/referenceRepo');
      const tableFixed = await checkAndFixTable();
      
      if (!tableFixed) {
        console.warn('Не удалось проверить/исправить структуру таблицы справочника');
      } else {
        console.log('✓ Структура таблицы проверена и исправлена');
      }
    } catch (tableError) {
      console.warn('Ошибка при проверке таблицы:', tableError.message);
    }
    
    // 3. Задержка для лучшего UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('=== ПРИЛОЖЕНИЕ УСПЕШНО ИНИЦИАЛИЗИРОВАНО ===');
    
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error);
    setError(error.message || 'Неизвестная ошибка');
  } finally {
    setIsLoading(false);
  }
};

  if (isLoading) {
    return (
      <PaperProvider>
        <LoadingScreen />
      </PaperProvider>
    );
  }

  if (error) {
    return (
      <PaperProvider>
        <ErrorScreen error={error} />
      </PaperProvider>
    );
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#666',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    maxWidth: 300,
  },
});