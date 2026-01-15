// screens/CalculatorScreen.js
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { insertCalculation } from "../database/calculationsRepo";
import { calculateBED, calculateEQD2 } from "../services/radiobiology";
import { getAllReferences } from "../database/referenceRepo";
import AlphaBetaPicker from "../components/AlphaBetaPicker";

export default function CalculatorScreen() {
  const [dose, setDose] = useState(""); // d
  const [fractions, setFractions] = useState(""); // n
  const [alphaBeta, setAlphaBeta] = useState(null);
  const [bed, setBed] = useState(null);
  const [eqd2, setEqd2] = useState(null);
  const [references, setReferences] = useState([]);

  useEffect(() => {
    async function fetchRefs() {
      const refs = await getAllReferences();
      setReferences(refs);
    }
    fetchRefs();
  }, []);

  const handleCalculate = async () => {
    if (!dose || !fractions || !alphaBeta) {
      Alert.alert("Ошибка", "Заполните все поля!");
      return;
    }

    const d = parseFloat(dose);
    const n = parseInt(fractions);
    const aB = parseFloat(alphaBeta.value);

    const bedCalc = calculateBED(d, n, aB);
    const eqd2Calc = calculateEQD2(bedCalc, aB);

    setBed(bedCalc.toFixed(2));
    setEqd2(eqd2Calc.toFixed(2));

    // сохраняем результат автоматически в SQLite
    await insertCalculation({
      dose: d,
      fractions: n,
      alphaBeta: aB,
      bed: bedCalc,
      eqd2: eqd2Calc,
      date: new Date().toISOString(),
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Калькулятор BED / EQD2</Text>

      <TextInput
        label="Доза за фракцию (Гр)"
        value={dose}
        onChangeText={setDose}
        keyboardType="numeric"
        style={styles.input}
      />

      <TextInput
        label="Количество фракций"
        value={fractions}
        onChangeText={setFractions}
        keyboardType="numeric"
        style={styles.input}
      />

      <AlphaBetaPicker
        references={references}
        selected={alphaBeta}
        onSelect={setAlphaBeta}
      />

      <Button
        mode="contained"
        onPress={handleCalculate}
        style={styles.button}
      >
        Рассчитать
      </Button>

      {bed !== null && eqd2 !== null && (
        <View style={styles.results}>
          <Text>BED: {bed} Гр</Text>
          <Text>EQD2: {eqd2} Гр</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginVertical: 16,
  },
  results: {
    marginTop: 24,
  },
});
