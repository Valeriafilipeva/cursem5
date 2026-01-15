import db from './db';

export const getReference = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM reference',
        [],
        (_, result) => resolve(result.rows._array),
        (_, error) => reject(error)
      );
    });
  });
};

export const addReferenceItem = (name, alphaBeta) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO reference (name, alpha_beta) VALUES (?, ?)',
        [name, alphaBeta],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export const updateReferenceItem = (id, name, alphaBeta) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE reference SET name = ?, alpha_beta = ? WHERE id = ?',
        [name, alphaBeta, id],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};
