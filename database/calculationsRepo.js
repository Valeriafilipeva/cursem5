import { db } from './db';

export const insertCalculation = ({ dose, fractions, alphaBeta, bed, eqd2, date }) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO calculations (dose, fractions, alphaBeta, bed, eqd2, date) VALUES (?, ?, ?, ?, ?, ?)',
        [dose, fractions, alphaBeta, bed, eqd2, date],
        (_, result) => resolve(result),
        (_, err) => reject(err)
      );
    });
  });
};

export const getAllCalculations = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM calculations ORDER BY date DESC',
        [],
        (_, { rows }) => resolve(rows._array),
        (_, err) => reject(err)
      );
    });
  });
};
