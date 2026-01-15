// components/CalculationCard.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Text } from 'react-native-paper';

export default function CalculationCard({ calculation }) {
  const { date, tissueType, dosePerFraction, fractions, bed, eqd2, comment } = calculation;

  return (
    <Card style={styles.card} elevation={3}>
      <Card.Content>
        <Title>{tissueType.charAt(0).toUpperCase() + tissueType.slice(1)}</Title>
        <Paragraph>Date: {date}</Paragraph>
        <Paragraph>Dose per fraction: {dosePerFraction} Gy</Paragraph>
        <Paragraph>Fractions: {fractions}</Paragraph>
        <Paragraph>BED: {bed.toFixed(2)}</Paragraph>
        <Paragraph>EQD2: {eqd2.toFixed(2)}</Paragraph>
        {comment ? <Text style={styles.comment}>Comment: {comment}</Text> : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 12,
    padding: 8,
  },
  comment: {
    marginTop: 4,
    fontStyle: 'italic',
    color: '#555',
  },
});
