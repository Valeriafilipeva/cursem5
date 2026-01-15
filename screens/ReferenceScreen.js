// screens/ReferenceScreen.js
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { getAllReferences, insertReference } from '../database/referenceRepo';

export default function ReferenceScreen() {
  const [tissue, setTissue] = useState('');
  const [alphaBeta, setAlphaBeta] = useState('');
  const [references, setReferences] = useState([]);

  useEffect(() => {
    fetchRefs();
  }, []);

  const fetchRefs = async () => {
    const refs = await getAllReferences();
    setReferences(refs);
  };

  const handleAdd = async () => {
    if (!tissue || !alphaBeta) return;
    await insertReference({ tissue, alphaBeta: parseFloat(alphaBeta) });
    setTissue('');
    setAlphaBeta('');
    fetchRefs();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text>Справочник α/β</Text>

      <TextInput
        label="Тип ткани"
        value={tissue}
        onChangeText={setTissue}
        style={styles.input}
      />
      <TextInput
        label="α/β"
        value={alphaBeta}
        onChangeText={setAlphaBeta}
        keyboardType="numeric"
        style={styles.input}
      />
      <Button mode="contained" onPress={handleAdd} style={styles.button}>
        Добавить / Обновить
      </Button>

      {references.map(ref => (
        <Text key={ref.id}>{ref.tissue}: {ref.alphaBeta}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    marginVertical: 8,
  },
  button: {
    marginVertical: 16,
  },
});
