// components/AlphaBetaPicker.js
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, RadioButton } from 'react-native-paper';

export default function AlphaBetaPicker({ references, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);

  // Проверка references
  if (!references || !Array.isArray(references)) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Ошибка загрузки данных</Text>
      </View>
    );
  }

  if (references.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Нет доступных тканей</Text>
      </View>
    );
  }

  // Сортируем по алфавиту (по названию ткани)
  const sortedReferences = [...references].sort((a, b) => {
    const tissueA = (a.tissue || '').toLowerCase();
    const tissueB = (b.tissue || '').toLowerCase();
    return tissueA.localeCompare(tissueB, 'ru');
  });

  // Обработка выбора
  const handleSelect = (item) => {
    onSelect(item);
    setExpanded(false);
  };

  return (
    <View style={styles.container}>
      {/* Заголовок выбора */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerText}>
          {selected ? `${selected.tissue} (α/β = ${selected.value || selected.alphaBeta})` : "Выберите ткань"}
        </Text>
        <Text style={styles.headerIcon}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Раскрывающийся список */}
      {expanded && (
        <View style={styles.dropdown}>
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {sortedReferences.map((item, index) => {
              const isSelected = selected && selected.id === item.id;
              
              return (
                <TouchableOpacity
                  key={`ref-${item.id || index}`}
                  style={[
                    styles.item,
                    isSelected && styles.selectedItem,
                    index === sortedReferences.length - 1 && styles.lastItem
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.6}
                >
                  <RadioButton
                    value={item.id?.toString()}
                    status={isSelected ? 'checked' : 'unchecked'}
                    onPress={() => handleSelect(item)}
                    color="#1976d2"
                  />
                  <Text style={[
                    styles.itemText,
                    isSelected && styles.selectedItemText
                  ]}>
                    {item.tissue} (α/β = {item.value || item.alphaBeta})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  headerText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  headerIcon: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  dropdown: {
    maxHeight: 250,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  scrollView: {
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  selectedItem: {
    backgroundColor: '#f0f7ff',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  selectedItemText: {
    color: '#1976d2',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});