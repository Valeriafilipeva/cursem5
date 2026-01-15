import { db } from './db';

export const getAllReferences = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM references',
        [],
        (_, { rows }) => resolve(rows._array),
        (_, err) => reject(err)
      );
    });
  });
};

export const insertReference = ({ tissue, alphaBeta }) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO references (tissue, alphaBeta) VALUES (?, ?)',
        [tissue, alphaBeta],
        (_, result) => resolve(result),
        (_, err) => reject(err)
      );
    });
  });
};
