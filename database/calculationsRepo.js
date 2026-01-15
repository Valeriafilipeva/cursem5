import db from './db';

export const addCalculation = (
  dose,
  fractions,
  alphaBeta,
  bed,
  eqd2
) => {
  const date = new Date().toISOString();

  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO calculations 
         (dose, fractions, alpha_beta, bed, eqd2, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [dose, fractions, alphaBeta, bed, eqd2, date],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export const getCalculations = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM calculations ORDER BY created_at DESC',
        [],
        (_, result) => resolve(result.rows._array),
        (_, error) => reject(error)
      );
    });
  });
};
