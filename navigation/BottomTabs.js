// navigation/BottomTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CalculatorScreen from '../screens/CalculatorScreen';
import ReferenceScreen from '../screens/ReferenceScreen';
import HistoryScreen from '../screens/HistoryScreen';
import { MaterialIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen 
        name="Calculator" 
        component={CalculatorScreen} 
        options={{ tabBarIcon: ({ color, size }) => <MaterialIcons name="calculate" size={size} color={color} /> }} 
      />
      <Tab.Screen 
        name="Reference" 
        component={ReferenceScreen} 
        options={{ tabBarIcon: ({ color, size }) => <MaterialIcons name="menu-book" size={size} color={color} /> }} 
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ tabBarIcon: ({ color, size }) => <MaterialIcons name="history" size={size} color={color} /> }} 
      />
    </Tab.Navigator>
  );
}
