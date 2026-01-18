// components/HistoryTabs.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

export default function HistoryTabs({ activeTab, onTabChange }) {
  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={activeTab}
        onValueChange={onTabChange}
        buttons={[
          {
            value: 'calculations',
            label: 'Расчеты',
            style: activeTab === 'calculations' ? styles.activeButton : styles.inactiveButton,
          },
          {
            value: 'references',
            label: 'Справочник',
            style: activeTab === 'references' ? styles.activeButton : styles.inactiveButton,
          },
        ]}
        style={styles.segmentedButtons}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  segmentedButtons: {
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: '#1976d2',
  },
  inactiveButton: {
    backgroundColor: '#f5f5f5',
  },
});