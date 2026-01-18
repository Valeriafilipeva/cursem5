// navigation/BottomTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import CalculatorScreen from '../screens/CalculatorScreen';
import ReferenceScreen from '../screens/ReferenceScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#1976d2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen 
        name="Calculator"  // Изменено с "Калькулятор"
        component={CalculatorScreen}
        options={{
          tabBarLabel: 'Калькулятор',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calculate" size={size} color={color} />
          ),
          headerTitle: 'Калькулятор BED/EQD₂',
        }}
      />
      <Tab.Screen 
        name="Reference"  // Изменено с "Справочник"
        component={ReferenceScreen}
        options={{
          tabBarLabel: 'Справочник',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="menu-book" size={size} color={color} />
          ),
          headerTitle: 'Справочник α/β тканей',
        }}
      />
      <Tab.Screen 
        name="History"  // Изменено с "История"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'История',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="history" size={size} color={color} />
          ),
          headerTitle: 'История расчётов',
        }}
      />
    </Tab.Navigator>
  );
}