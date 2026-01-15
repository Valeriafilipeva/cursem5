// screens/HistoryScreen.js
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { getAllCalculations } from '../database/calculationsRepo';
import CalculationResult from '../components/CalculationResult';

export default function HistoryScreen() {
  const [calculations, setCalculations] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const data = await getAllCalculations();
      setCalculations(data);
    }
    fetchData();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {calculations.length === 0 ? (
        <Text>История пуста</Text>
      ) : (
        calculations.map(calc => (
          <CalculationResult key={calc.id} calculation={calc} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
