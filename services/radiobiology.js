// services/radiobiology.js

/**
 * Расчет биологически эффективной дозы (BED)
 * по линейно-квадратичной модели
 * 
 * @param {number} dosePerFraction - Доза за фракцию (Гр)
 * @param {number} fractions - Количество фракций
 * @param {number} alphaBeta - Соотношение α/β для ткани (Гр)
 * @returns {number} BED в Гр
 */
export const calculateBED = (dosePerFraction, fractions, alphaBeta) => {
  // Проверка входных параметров
  if (!dosePerFraction || !fractions || !alphaBeta) {
    throw new Error('Все параметры должны быть указаны');
  }
  
  if (dosePerFraction <= 0 || fractions <= 0 || alphaBeta <= 0) {
    throw new Error('Параметры должны быть положительными числами');
  }
  
  const totalDose = dosePerFraction * fractions;
  const bed = totalDose * (1 + (dosePerFraction / alphaBeta));
  
  // Ограничиваем нереалистично высокие значения
  return Math.min(bed, 1000);
};

/**
 * Расчет эквивалентной дозы в 2 Гр фракциях (EQD₂)
 * 
 * @param {number} bed - Биологически эффективная доза (Гр)
 * @param {number} alphaBeta - Соотношение α/β для ткани (Гр)
 * @returns {number} EQD₂ в Гр
 */
export const calculateEQD2 = (bed, alphaBeta) => {
  // Проверка входных параметров
  if (!bed || !alphaBeta) {
    throw new Error('Все параметры должны быть указаны');
  }
  
  if (bed <= 0 || alphaBeta <= 0) {
    throw new Error('Параметры должны быть положительными числами');
  }
  
  const eqd2 = bed / (1 + (2 / alphaBeta));
  
  // Ограничиваем нереалистично высокие значения
  return Math.min(eqd2, 500);
};

/**
 * Валидация входных данных
 * Поддерживает и точку, и запятую как разделитель
 * 
 * @param {string} dose - Доза за фракцию
 * @param {string} fractions - Количество фракций
 * @param {string} alphaBeta - Соотношение α/β
 * @returns {object} Результат валидации
 */
export const validateInput = (dose, fractions, alphaBeta) => {
  // Проверка на пустые значения
  if (!dose || dose.trim() === '') {
    return { valid: false, message: 'Введите дозу за фракцию' };
  }
  
  if (!fractions || fractions.trim() === '') {
    return { valid: false, message: 'Введите количество фракций' };
  }
  
  if (!alphaBeta || alphaBeta.trim() === '') {
    return { valid: false, message: 'Выберите ткань (α/β значение)' };
  }
  
  // Нормализация: заменяем запятые на точки
  const normalizedDose = dose.replace(',', '.').trim();
  const normalizedAlphaBeta = alphaBeta.replace(',', '.').trim();
  
  const d = parseFloat(normalizedDose);
  const n = parseInt(fractions, 10);
  const ab = parseFloat(normalizedAlphaBeta);
  
  // Проверка корректности чисел
  if (isNaN(d) || !isFinite(d)) {
    return { valid: false, message: 'Доза должна быть числом' };
  }
  
  if (d <= 0) {
    return { valid: false, message: 'Доза должна быть положительным числом' };
  }
  
  if (d > 20) {
    return { valid: false, message: 'Доза за фракцию слишком высока (>20 Гр)' };
  }
  
  if (isNaN(n) || !isFinite(n)) {
    return { valid: false, message: 'Количество фракций должно быть целым числом' };
  }
  
  if (n <= 0) {
    return { valid: false, message: 'Количество фракций должно быть положительным числом' };
  }
  
  if (n > 100) {
    return { valid: false, message: 'Количество фракций слишком велико (>100)' };
  }
  
  if (!Number.isInteger(n)) {
    return { valid: false, message: 'Количество фракций должно быть целым числом' };
  }
  
  if (isNaN(ab) || !isFinite(ab)) {
    return { valid: false, message: 'α/β должно быть числом' };
  }
  
  if (ab <= 0) {
    return { valid: false, message: 'α/β должно быть положительным числом' };
  }
  
  if (ab > 100) {
    return { valid: false, message: 'α/β значение слишком велико (>100)' };
  }
  
  return { valid: true, d, n, ab };
};

/**
 * Форматирование чисел для отображения
 * 
 * @param {number} value - Число для форматирования
 * @param {number} decimals - Количество знаков после запятой
 * @returns {string} Отформатированная строка
 */
export const formatNumber = (value, decimals = 2) => {
  if (isNaN(value) || !isFinite(value)) {
    return '—';
  }
  
  return value.toFixed(decimals).replace('.', ',');
};

/**
 * Получение пояснения для α/β значения
 * 
 * @param {number} alphaBeta - Значение α/β
 * @returns {string} Пояснение
 */
export const getAlphaBetaExplanation = (alphaBeta) => {
  const ab = parseFloat(alphaBeta);
  
  if (isNaN(ab)) return '';
  
  if (ab < 2) {
    return 'Очень низкое значение: поздно реагирующие ткани, радиорезистентные опухоли (рак простаты, меланома)';
  } else if (ab >= 2 && ab < 5) {
    return 'Низкое значение: большинство поздних реакций нормальных тканей (спинной мозг, печень, почки)';
  } else if (ab >= 5 && ab < 8) {
    return 'Среднее значение: ранние реакции нормальных тканей, некоторые опухоли';
  } else if (ab >= 8 && ab <= 10) {
    return 'Высокое значение: большинство опухолей, ранние реакции (кожа, слизистые)';
  } else {
    return 'Очень высокое значение: быстрорастущие опухоли, острые реакции';
  }
};

/**
 * Проверка безопасности дозы для выбранной ткани
 * 
 * @param {number} dosePerFraction - Доза за фракцию
 * @param {number} alphaBeta - α/β значение
 * @returns {object} Результат проверки безопасности
 */
export const checkDoseSafety = (dosePerFraction, alphaBeta) => {
  const d = parseFloat(dosePerFraction);
  const ab = parseFloat(alphaBeta);
  
  if (isNaN(d) || isNaN(ab)) {
    return { safe: false, warning: 'Неверные параметры' };
  }
  
  // Эмпирические правила безопасности
  if (ab < 3 && d > 2) {
    return { 
      safe: false, 
      warning: 'Внимание: высокая доза за фракцию для тканей с низким α/β',
      recommendation: 'Рассмотрите уменьшение дозы за фракцию'
    };
  }
  
  if (ab >= 3 && ab < 8 && d > 3) {
    return { 
      safe: false, 
      warning: 'Высокая доза за фракцию',
      recommendation: 'Проверьте допустимость дозы по протоколам'
    };
  }
  
  if (d > 5) {
    return { 
      safe: false, 
      warning: 'Очень высокая доза за фракцию',
      recommendation: 'Требуется особое обоснование'
    };
  }
  
  return { safe: true, warning: '', recommendation: '' };
};

/**
 * Расчет нормализованной суммарной дозы (NTD)
 * Альтернативный метод оценки
 * 
 * @param {number} dosePerFraction - Доза за фракцию
 * @param {number} fractions - Количество фракций
 * @param {number} alphaBeta - α/β значение
 * @param {number} referenceDose - Референсная доза (по умолчанию 2 Гр)
 * @returns {number} NTD в Гр
 */
export const calculateNTD = (dosePerFraction, fractions, alphaBeta, referenceDose = 2) => {
  const bed = calculateBED(dosePerFraction, fractions, alphaBeta);
  const ntd = bed / (1 + (referenceDose / alphaBeta));
  return ntd;
};