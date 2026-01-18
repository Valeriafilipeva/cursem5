import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { 
  Text, 
  TextInput, 
  Button, 
  ActivityIndicator, 
  Card, 
  Chip 
} from "react-native-paper";
import { insertCalculation } from "../database/calculationsRepo";
import { calculateBED, calculateEQD2, validateInput, getRiskLevel } from "../services/radiobiology";
import { getAllReferences } from "../database/referenceRepo";
import AlphaBetaPicker from "../components/AlphaBetaPicker";
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function CalculatorScreen({ route, navigation }) {
  const [dose, setDose] = useState("");
  const [fractions, setFractions] = useState("");
  const [alphaBeta, setAlphaBeta] = useState(null);
  const [bed, setBed] = useState(null);
  const [eqd2, setEqd2] = useState(null);
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const scrollViewRef = useRef(null);
  const doseInputRef = useRef(null);
  const fractionsInputRef = useRef(null);

  // Функция загрузки данных
  const loadReferences = useCallback(async () => {
    try {
      setLoading(true);
      const refs = await getAllReferences();
      console.log('Загружено тканей:', refs.length, 'Первая ткань:', refs[0]?.tissue);
      setReferences(refs);
      
      if (route?.params?.presetAlphaBeta) {
        const presetAlphaBeta = route.params.presetAlphaBeta;
        const found = refs.find(ref => 
          ref.alphaBeta?.toString() === presetAlphaBeta || 
          ref.value === presetAlphaBeta
        );
        if (found) {
          console.log('Найдена ткань по preset:', found.tissue);
          setAlphaBeta(found);
        }
      }
    } catch (error) {
      console.error('Error fetching references:', error);
      setReferences([
        { 
          id: 1, 
          tissue: 'Легкие', 
          value: '3', 
          alphaBeta: 3,
          description: 'Для поздних эффектов в легочной ткани',
        },
        { 
          id: 2, 
          tissue: 'Прямая кишка', 
          value: '3', 
          alphaBeta: 3,
          description: 'Для поздних проктитов',
        },
        { 
          id: 3, 
          tissue: 'Кожа', 
          value: '10', 
          alphaBeta: 10,
          description: 'Для ранних реакций кожи',
        },
        { 
          id: 4, 
          tissue: 'Опухоль', 
          value: '10', 
          alphaBeta: 10,
          description: 'Для быстрорастущих опухолей',
        },
        { 
          id: 5, 
          tissue: 'Спинной мозг', 
          value: '2', 
          alphaBeta: 2,
          description: 'Консервативное значение для спинного мозга',
        },
        { 
          id: 6, 
          tissue: 'Печень', 
          value: '2', 
          alphaBeta: 2,
          description: 'Для поздних эффектов радиационного гепатита',
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [route?.params?.presetAlphaBeta]);

  // Обработка preset параметров
  useEffect(() => {
    if (route?.params) {
      const { presetDose, presetFractions, presetAlphaBeta } = route.params;
      
      console.log('Получены параметры:', { presetDose, presetFractions, presetAlphaBeta });
      
      if (presetDose) setDose(presetDose);
      if (presetFractions) setFractions(presetFractions);
      
      if (presetAlphaBeta && references.length > 0) {
        const found = references.find(ref => 
          ref.alphaBeta?.toString() === presetAlphaBeta || 
          ref.value === presetAlphaBeta
        );
        if (found) {
          console.log('Установлена ткань из preset:', found.tissue);
          setAlphaBeta(found);
        }
      }
    }
  }, [route?.params, references]);

  // Загрузка данных
  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  // Обновление при фокусе
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadReferences();
    });

    return unsubscribe;
  }, [navigation, loadReferences]);

  // Отслеживание клавиатуры
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

  // Основная функция расчета - ИСПРАВЛЕННАЯ ВЕРСИЯ
  const handleCalculate = async () => {
    Keyboard.dismiss();
    setIsCalculating(true);
    
    if (!alphaBeta) {
      Alert.alert("Выберите ткань", "Пожалуйста, выберите тип ткани из списка");
      setIsCalculating(false);
      return;
    }
    
    console.log('Выбранная ткань для расчета:', {
      tissue: alphaBeta.tissue,
      value: alphaBeta.value,
      alphaBeta: alphaBeta.alphaBeta,
      fullObject: alphaBeta
    });
    
    const alphaBetaValue = alphaBeta.value || alphaBeta.alphaBeta?.toString() || '';
    
    if (!alphaBetaValue) {
      Alert.alert("Ошибка", "Не удалось получить значение α/β для выбранной ткани");
      setIsCalculating(false);
      return;
    }
    
    // ГАРАНТИРОВАННОЕ получение названия ткани
    const tissueName = alphaBeta.tissue || 
                      (alphaBeta.tissue && alphaBeta.tissue !== 'undefined' ? alphaBeta.tissue : null) ||
                      'Не указана';
    
    console.log('Ткань для сохранения в историю:', tissueName);
    
    // Нормализация ввода
    const normalizedDose = dose.replace(',', '.');
    const normalizedAlphaBeta = alphaBetaValue.toString().replace(',', '.');
    
    const validation = validateInput(normalizedDose, fractions, normalizedAlphaBeta);
    if (!validation.valid) {
      Alert.alert("Проверьте ввод", validation.message);
      setIsCalculating(false);
      return;
    }

    const { d, n, ab } = validation;

    try {
      const bedCalc = calculateBED(d, n, ab);
      const eqd2Calc = calculateEQD2(bedCalc, ab);
      const totalDose = d * n;
      
      const riskLevel = getRiskLevel(bedCalc, eqd2Calc, ab);

      setBed(bedCalc.toFixed(2));
      setEqd2(eqd2Calc.toFixed(2));

      // ГАРАНТИРОВАННОЕ сохранение с названием ткани
      console.log('Сохранение расчета с тканью:', tissueName);
      
      await insertCalculation({
        dose: d,
        fractions: n,
        alphaBeta: ab,
        bed: bedCalc,
        eqd2: eqd2Calc,
        date: new Date().toISOString(),
        tissue: tissueName, // Теперь всегда будет значение
        totalDose: totalDose,
        riskLevel: riskLevel.level
      });

      console.log('✅ Расчет успешно сохранен с тканью:', tissueName);

      // Прокрутка к результатам
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 400, animated: true });
      }, 300);

    } catch (error) {
      console.error('Calculation error:', error);
      Alert.alert("Ошибка расчета", "Проверьте введенные значения");
    } finally {
      setIsCalculating(false);
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

  const isCalculateDisabled = !dose || !fractions || !alphaBeta || isCalculating;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={{ marginTop: 16, color: '#666' }}>
          Загрузка справочника...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Заголовок */}
          <View style={styles.header}>
            <Text style={styles.title}>🧮 Калькулятор BED/EQD₂</Text>
            <Text style={styles.subtitle}>
              Расчет биологически эффективной дозы (BED) и эквивалентной дозы в 2 Гр фракциях
            </Text>
          </View>

          {/* Основная форма */}
          <View style={styles.cardWrapper}>
            <Card style={styles.formCard} elevation={2}>
              <Card.Content>
                <Text style={styles.formTitle}>Параметры расчета</Text>
                
                {/* Поле ввода дозы */}
                <TextInput
                  ref={doseInputRef}
                  label="Доза за фракцию (Гр)"
                  value={dose}
                  onChangeText={setDose}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  mode="outlined"
                  placeholder="2.0"
                  outlineColor="#e0e0e0"
                  activeOutlineColor="#1976d2"
                  left={<TextInput.Icon icon="radioactive" color="#666" />}
                  right={<TextInput.Affix text="Гр" />}
                />

                {/* Поле ввода фракций */}
                <TextInput
                  ref={fractionsInputRef}
                  label="Количество фракций"
                  value={fractions}
                  onChangeText={setFractions}
                  keyboardType="number-pad"
                  style={styles.input}
                  mode="outlined"
                  placeholder="30"
                  outlineColor="#e0e0e0"
                  activeOutlineColor="#1976d2"
                  left={<TextInput.Icon icon="numeric" color="#666" />}
                />

                {/* Выбор ткани */}
                <View style={styles.pickerSection}>
                  <Text style={styles.sectionTitle}>
                    <Icon name="science" size={18} color="#1976d2" /> Выберите ткань:
                  </Text>
                  {references.length > 0 ? (
                    <AlphaBetaPicker
                      references={references}
                      selected={alphaBeta}
                      onSelect={setAlphaBeta}
                    />
                  ) : (
                    <View style={styles.emptyState}>
                      <Icon name="error" size={24} color="#ff9800" />
                      <Text style={styles.emptyStateText}>Справочник не загружен</Text>
                    </View>
                  )}
                  
                  {alphaBeta && (
                    <View style={styles.selectedTissueContainer}>
                      <View style={styles.selectedChipContainer}>
                        <Icon name="check-circle" size={18} color="#1e40af" />
                        <Text style={styles.selectedChipText}>
                          {alphaBeta.tissue} (α/β = {alphaBeta.value || alphaBeta.alphaBeta})
                        </Text>
                      </View>
                      {alphaBeta.description && (
                        <Text style={styles.tissueDescription}>
                          {alphaBeta.description}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Кнопки действий */}
                <View style={styles.actionButtons}>
                  <Button
                    mode="outlined"
                    onPress={handleReset}
                    style={styles.resetButton}
                    icon="refresh"
                    disabled={isCalculating}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.resetButtonLabel}
                  >
                    Сбросить
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleCalculate}
                    style={styles.calculateButton}
                    disabled={isCalculateDisabled}
                    icon={isCalculating ? "loading" : "calculator"}
                    loading={isCalculating}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.calculateButtonLabel}
                  >
                    {isCalculating ? "Расчет..." : "Рассчитать"}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>

          {/* Результаты */}
          {bed !== null && eqd2 !== null && (
            <View style={styles.cardWrapper}>
              <Card style={styles.resultsCard} elevation={3}>
                <Card.Content>
                  <View style={styles.resultsHeader}>
                    <Text style={styles.resultsTitle}>
                      <Icon name="check-circle" size={22} color="#4CAF50" /> Результаты расчета
                    </Text>
                  </View>
                  
                  {/* Основные результаты */}
                  <View style={styles.mainResults}>
                    <View style={styles.mainResultItem}>
                      <Text style={styles.mainResultLabel}>BED</Text>
                      <Text style={[styles.mainResultValue, styles.bedValue]}>
                        {bed} Гр
                      </Text>
                      <Text style={styles.mainResultDescription}>Биологически эффективная доза</Text>
                    </View>
                    
                    <View style={styles.resultsDivider} />
                    
                    <View style={styles.mainResultItem}>
                      <Text style={styles.mainResultLabel}>EQD₂</Text>
                      <Text style={[styles.mainResultValue, styles.eqd2Value]}>
                        {eqd2} Гр
                      </Text>
                      <Text style={styles.mainResultDescription}>Эквивалент в 2 Гр фракциях</Text>
                    </View>
                  </View>
                  
                  {/* Дополнительная информация */}
                  <View style={styles.additionalInfo}>
                    <View style={styles.infoItem}>
                      <Icon name="radioactive" size={16} color="#FF9800" />
                      <Text style={styles.infoLabel}>Общая доза:</Text>
                      <Text style={styles.infoValue}>
                        {(parseFloat(dose) * parseInt(fractions)).toFixed(1)} Гр
                      </Text>
                    </View>
                    
                    <View style={styles.infoDivider} />
                    
                    <View style={styles.infoItem}>
                      <Icon name="science" size={16} color="#9C27B0" />
                      <Text style={styles.infoLabel}>Ткань:</Text>
                      <Text style={styles.infoValue}>
                        {alphaBeta?.tissue || 'Не указана'} (α/β = {alphaBeta?.value || alphaBeta?.alphaBeta})
                      </Text>
                    </View>
                    
                    <View style={styles.infoDivider} />
                    
                    <View style={styles.infoItem}>
                      <Icon name="format-list-numbered" size={16} color="#1976d2" />
                      <Text style={styles.infoLabel}>Режим:</Text>
                      <Text style={styles.infoValue}>
                        {fractions} × {dose} Гр
                      </Text>
                    </View>
                  </View>
                  
                  {/* Только кнопка "Поделиться" */}
                  <View style={styles.shareButtonContainer}>
                    <Button
                      mode="contained"
                      icon="share"
                      style={styles.shareButton}
                      onPress={() => {
                        const shareText = `Расчет BED/EQD₂:\n` +
                          `Доза: ${dose} Гр × ${fractions}\n` +
                          `Ткань: ${alphaBeta?.tissue || 'Не указана'} (α/β = ${alphaBeta?.value || alphaBeta?.alphaBeta})\n` +
                          `BED: ${bed} Гр\n` +
                          `EQD₂: ${eqd2} Гр`;
                        Alert.alert("Результаты расчета", shareText, [
                          { text: "OK", style: "default" },
                          { 
                            text: "Скопировать", 
                            onPress: () => {
                              Alert.alert("Скопировано", "Результаты скопированы");
                            }
                          }
                        ]);
                      }}
                      labelStyle={styles.shareButtonLabel}
                    >
                      Поделиться результатами
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </View>
          )}

          {/* Пустое пространство для клавиатуры */}
          <View style={keyboardVisible ? styles.spacerLarge : styles.spacerSmall} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e40af',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '90%',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
    fontSize: 16,
  },
  pickerSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  emptyState: {
    padding: 20,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    marginTop: 8,
    color: '#92400e',
    fontSize: 14,
  },
  selectedTissueContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  selectedChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  selectedChipText: {
    color: '#1e40af',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6,
  },
  tissueDescription: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#1976d2',
    backgroundColor: 'white',
  },
  resetButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976d2',
  },
  calculateButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#1e40af',
  },
  calculateButtonLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
  },
  buttonContent: {
    height: 48,
  },
  resultsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultsHeader: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  mainResults: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderRadius: 10,
  },
  mainResultItem: {
    flex: 1,
    alignItems: 'center',
  },
  mainResultLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '500',
  },
  mainResultValue: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  bedValue: {
    color: '#1e40af',
  },
  eqd2Value: {
    color: '#059669',
  },
  mainResultDescription: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  resultsDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 20,
  },
  additionalInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 12,
    marginRight: 8,
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  shareButtonContainer: {
    marginTop: 10,
  },
  shareButton: {
    backgroundColor: '#1e40af',
    borderRadius: 8,
  },
  shareButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  spacerSmall: {
    height: 30,
  },
  spacerLarge: {
    height: 120,
  },
});