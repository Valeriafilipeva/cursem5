// screens/CalculatorScreen.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Text, TextInput, Button, ActivityIndicator } from "react-native-paper";
import { insertCalculation } from "../database/calculationsRepo";
import { calculateBED, calculateEQD2, validateInput } from "../services/radiobiology";
import { getAllReferences } from "../database/referenceRepo";
import AlphaBetaPicker from "../components/AlphaBetaPicker";

export default function CalculatorScreen({ route, navigation }) {
  const [dose, setDose] = useState("");
  const [fractions, setFractions] = useState("");
  const [alphaBeta, setAlphaBeta] = useState(null);
  const [bed, setBed] = useState(null);
  const [eqd2, setEqd2] = useState(null);
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const scrollViewRef = useRef(null);

  // Функция загрузки данных
  const loadReferences = useCallback(async () => {
    try {
      setLoading(true);
      const refs = await getAllReferences();
      console.log('Loaded references:', refs.length);
      setReferences(refs);
      
      // После загрузки references, проверяем presetAlphaBeta
      if (route?.params?.presetAlphaBeta) {
        const presetAlphaBeta = route.params.presetAlphaBeta;
        const found = refs.find(ref => 
          ref.alphaBeta?.toString() === presetAlphaBeta || 
          ref.value === presetAlphaBeta
        );
        if (found) {
          console.log('Found tissue after references loaded:', found);
          setAlphaBeta(found);
        }
      }
    } catch (error) {
      console.error('Error fetching references:', error);
      // Используем тестовые данные при ошибке
      setReferences([
        { 
          id: 1, 
          tissue: 'Легкие', 
          value: '3', 
          alphaBeta: 3,
          description: 'Для поздних эффектов в легочной ткани'
        },
        { 
          id: 2, 
          tissue: 'Прямая кишка', 
          value: '3', 
          alphaBeta: 3,
          description: 'Для поздних проктитов'
        },
        { 
          id: 3, 
          tissue: 'Кожа', 
          value: '10', 
          alphaBeta: 10,
          description: 'Для ранних реакций кожи'
        },
        { 
          id: 4, 
          tissue: 'Опухоль', 
          value: '10', 
          alphaBeta: 10,
          description: 'Для быстрорастущих опухолей'
        },
        { 
          id: 5, 
          tissue: 'Спинной мозг', 
          value: '2', 
          alphaBeta: 2,
          description: 'Консервативное значение для спинного мозга'
        },
        { 
          id: 6, 
          tissue: 'Печень', 
          value: '2', 
          alphaBeta: 2,
          description: 'Для поздних эффектов радиационного гепатита'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [route?.params?.presetAlphaBeta]);

  // Обработка preset параметров из навигации
  useEffect(() => {
    if (route?.params) {
      const { presetDose, presetFractions, presetAlphaBeta } = route.params;
      
      console.log('Received preset params:', { presetDose, presetFractions, presetAlphaBeta });
      
      if (presetDose) setDose(presetDose);
      if (presetFractions) setFractions(presetFractions);
      
      if (presetAlphaBeta && references.length > 0) {
        // Ищем ткань с таким alphaBeta значением
        const found = references.find(ref => 
          ref.alphaBeta?.toString() === presetAlphaBeta || 
          ref.value === presetAlphaBeta
        );
        if (found) {
          console.log('Found tissue in loaded references:', found);
          setAlphaBeta(found);
        }
      }
    }
  }, [route?.params, references]);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  // Обновление данных при фокусе на экране
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('CalculatorScreen focused, refreshing data...');
      loadReferences();
    });

    return unsubscribe;
  }, [navigation, loadReferences]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleCalculate = async () => {
    Keyboard.dismiss();
    
    console.log('=== CALCULATION START ===');
    console.log('Dose:', dose);
    console.log('Fractions:', fractions);
    console.log('AlphaBeta object:', alphaBeta);
    
    if (!alphaBeta) {
      Alert.alert("Ошибка", "Выберите ткань из списка");
      return;
    }
    
    // Получаем значение α/β
    const alphaBetaValue = alphaBeta.value || alphaBeta.alphaBeta?.toString() || '';
    console.log('AlphaBeta value:', alphaBetaValue);
    
    if (!alphaBetaValue) {
      Alert.alert("Ошибка", "Не удалось получить значение α/β для выбранной ткани");
      return;
    }
    
    // Нормализуем ввод
    const normalizedDose = dose.replace(',', '.');
    const normalizedAlphaBeta = alphaBetaValue.toString().replace(',', '.');
    
    const validation = validateInput(normalizedDose, fractions, normalizedAlphaBeta);
    if (!validation.valid) {
      Alert.alert("Ошибка", validation.message);
      return;
    }

    const { d, n, ab } = validation;

    try {
      const bedCalc = calculateBED(d, n, ab);
      const eqd2Calc = calculateEQD2(bedCalc, ab);

      setBed(bedCalc.toFixed(2));
      setEqd2(eqd2Calc.toFixed(2));

      // Сохраняем результат
      await insertCalculation({
        dose: d,
        fractions: n,
        alphaBeta: ab,
        bed: bedCalc,
        eqd2: eqd2Calc,
        date: new Date().toISOString(),
      });

      // Прокрутка к результатам
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 600, animated: true });
      }, 300);

    } catch (error) {
      console.error('Calculation error:', error);
      Alert.alert("Ошибка", "Произошла ошибка при расчете");
    }
  };

  const handleReset = () => {
    setDose("");
    setFractions("");
    setAlphaBeta(null);
    setBed(null);
    setEqd2(null);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    
    // Очищаем параметры навигации
    if (navigation) {
      navigation.setParams({
        presetDose: undefined,
        presetFractions: undefined,
        presetAlphaBeta: undefined
      });
    }
  };

  const isCalculateDisabled = !dose || !fractions || !alphaBeta;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Загрузка справочника тканей...</Text>
      </View>
    );
  }

  // Определяем стили для контента с учетом клавиатуры
  const getScrollContentStyle = () => {
    return [
      styles.scrollContent,
      keyboardVisible && styles.scrollContentWithKeyboard
    ];
  };

  // Определяем стиль для spacer
  const getSpacerStyle = () => {
    return keyboardVisible ? styles.spacerWithKeyboard : styles.spacer;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={getScrollContentStyle()}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Информационный блок */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Как использовать калькулятор:</Text>
          <Text style={styles.infoText}>1. Введите дозу за фракцию в Гр</Text>
          <Text style={styles.infoText}>2. Укажите общее количество фракций</Text>
          <Text style={styles.infoText}>3. Выберите ткань из списка α/β значений</Text>
          <Text style={styles.infoText}>4. Нажмите "Рассчитать" для получения BED и EQD₂</Text>
        </View>

        <Text style={styles.title}>Калькулятор BED / EQD₂</Text>
        
        <Text style={styles.subtitle}>
          Рассчитайте биологически эффективную дозу (BED) и эквивалентную дозу в 2 Гр фракциях (EQD₂)
        </Text>

        {/* Поле ввода дозы */}
        <TextInput
          label="Доза за фракцию (Гр)"
          value={dose}
          onChangeText={setDose}
          keyboardType="decimal-pad"
          style={styles.input}
          mode="outlined"
          placeholder="Например: 2.0"
          right={<TextInput.Affix text="Гр" />}
        />

        {/* Поле ввода фракций */}
        <TextInput
          label="Количество фракций"
          value={fractions}
          onChangeText={setFractions}
          keyboardType="number-pad"
          style={styles.input}
          mode="outlined"
          placeholder="Например: 30"
        />

        {/* Выбор ткани */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Выберите ткань (α/β значение):</Text>
          {references.length > 0 ? (
            <AlphaBetaPicker
              references={references}
              selected={alphaBeta}
              onSelect={setAlphaBeta}
            />
          ) : (
            <View style={styles.emptyPicker}>
              <Text style={styles.emptyPickerText}>
                Справочник тканей не загружен
              </Text>
            </View>
          )}
        </View>

        {/* Кнопки */}
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={handleReset}
            style={[styles.button, styles.resetButton]}
            icon="refresh"
          >
            Сбросить
          </Button>
          <Button
            mode="contained"
            onPress={handleCalculate}
            style={[styles.button, styles.calculateButton]}
            disabled={isCalculateDisabled}
            icon="calculator"
          >
            Рассчитать
          </Button>
        </View>

        {/* Результаты */}
        {bed !== null && eqd2 !== null && (
          <View style={styles.results}>
            <Text style={styles.resultTitle}>📊 Результаты расчета</Text>
            
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>BED (Biologically Effective Dose):</Text>
                <Text style={[styles.resultValue, styles.bedValue]}>
                  {bed} Гр
                </Text>
              </View>
              <Text style={styles.resultDescription}>
                Биологически эффективная доза учитывает радиочувствительность ткани
              </Text>
            </View>

            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>EQD₂ (Equivalent Dose in 2 Gy fractions):</Text>
                <Text style={[styles.resultValue, styles.eqd2Value]}>
                  {eqd2} Гр
                </Text>
              </View>
              <Text style={styles.resultDescription}>
                Эквивалентная доза при стандартной фракционировании по 2 Гр
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Параметры расчета:</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ткань:</Text>
                <Text style={styles.summaryValue}>{alphaBeta?.tissue}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>α/β:</Text>
                <Text style={styles.summaryValue}>{alphaBeta?.value || alphaBeta?.alphaBeta}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Доза за фракцию:</Text>
                <Text style={styles.summaryValue}>{dose} Гр</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Количество фракций:</Text>
                <Text style={styles.summaryValue}>{fractions}</Text>
              </View>
            </View>

            <Text style={styles.note}>
              ✅ Результат автоматически сохранён в историю расчётов
            </Text>
          </View>
        )}

        {/* Пустое пространство */}
        <View style={getSpacerStyle()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  scrollContentWithKeyboard: {
    paddingBottom: 300,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#495057',
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 6,
    lineHeight: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1976d2',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  emptyPicker: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
  },
  emptyPickerText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  resetButton: {
    borderColor: '#6c757d',
  },
  calculateButton: {
    backgroundColor: '#1976d2',
  },
  results: {
    marginTop: 24,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  resultCard: {
    backgroundColor: '#f8fdff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e1f5fe',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  resultValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  bedValue: {
    color: '#1976d2',
  },
  eqd2Value: {
    color: '#4caf50',
  },
  resultDescription: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#555',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#777',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  note: {
    fontSize: 13,
    color: '#4caf50',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  spacer: {
    height: 50,
  },
  spacerWithKeyboard: {
    height: 150,
  },
});