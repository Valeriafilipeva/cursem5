import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import BottomTabs from './navigation/BottomTabs';
import { initDB } from './database/db';

export default function App() {
  useEffect(() => {
    initDB(); // Инициализация базы при старте
  }, []);

  return (
    <NavigationContainer>
      <BottomTabs />
    </NavigationContainer>
  );
}
