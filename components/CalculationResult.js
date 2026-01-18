// components/CalculationResult.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Text, Chip } from 'react-native-paper';

export default function CalculationResult({ calculation, onPress, showDelete = false, onDelete }) {
  // Безопасное извлечение данных
  const { 
    id,
    dose = 0,
    fractions = 0,
    alphaBeta = 0,
    bed = 0,
    eqd2 = 0,
    date = new Date().toISOString(),
    comment = ''
  } = calculation || {};

  // Форматирование даты
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Дата не указана';
    }
  };

  // Форматирование чисел
  const formatNumber = (num, decimals = 2) => {
    const value = parseFloat(num);
    if (isNaN(value) || !isFinite(value)) return '0.00';
    return value.toFixed(decimals);
  };

  return (
    <Card 
      style={styles.card} 
      elevation={2}
      onPress={onPress}
    >
      <Card.Content>
        <View style={styles.header}>
          <Title style={styles.title}>α/β = {formatNumber(alphaBeta, 1)}</Title>
          <Text style={styles.date}>{formatDate(date)}</Text>
        </View>
        
        <View style={styles.parameters}>
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>Доза за фракцию:</Text>
            <Text style={styles.paramValue}>{formatNumber(dose, 1)} Гр</Text>
          </View>
          
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>Количество фракций:</Text>
            <Text style={styles.paramValue}>{fractions}</Text>
          </View>
          
          <View style={styles.paramRow}>
            <Text style={styles.paramLabel}>α/β значение:</Text>
            <Text style={[styles.paramValue, styles.alphaBetaValue]}>
              {formatNumber(alphaBeta, 1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.results}>
          <View style={styles.resultItem}>
            <Chip icon="calculator" style={[styles.chip, styles.bedChip]}>
              <Text style={styles.chipText}>БЭД: {formatNumber(bed)} Гр</Text>
            </Chip>
          </View>
          
          <View style={styles.resultItem}>
            <Chip icon="equal" style={[styles.chip, styles.eqd2Chip]}>
              <Text style={styles.chipText}>ЭКВД₂: {formatNumber(eqd2)} Гр</Text>
            </Chip>
          </View>
        </View>
        
        {comment && comment.trim() !== '' && (
          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Примечание:</Text>
            <Text style={styles.commentText}>{comment}</Text>
          </View>
        )}
        
        {showDelete && onDelete && (
          <View style={styles.footer}>
            <Chip 
              icon="delete" 
              mode="outlined" 
              style={styles.deleteChip}
              onPress={() => {
                if (id && onDelete) {
                  onDelete(id);
                }
              }}
              textStyle={styles.deleteChipText}
            >
              Удалить
            </Chip>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    color: '#1976d2',
  },
  date: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  parameters: {
    marginBottom: 12,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paramLabel: {
    fontSize: 14,
    color: '#666',
  },
  paramValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  alphaBetaValue: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  results: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  chip: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  bedChip: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  eqd2Chip: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff9800',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  footer: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  deleteChip: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  deleteChipText: {
    color: '#f44336',
    fontSize: 12,
  },
});