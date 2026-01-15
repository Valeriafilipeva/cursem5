import * as SQLite from 'expo-sqlite';
export const db = SQLite.openDatabase('radiationDose.db');

export const initDB = () => {
  db.transaction(tx => {
    // Таблица расчётов
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS calculations (
        id INTEGER PRIMARY KEY NOT NULL,
        dose REAL NOT NULL,
        fractions INTEGER NOT NULL,
        alphaBeta REAL NOT NULL,
        bed REAL NOT NULL,
        eqd2 REAL NOT NULL,
        date TEXT NOT NULL
      );`
    );
    // Таблица справочника α/β
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS references (
        id INTEGER PRIMARY KEY NOT NULL,
        tissue TEXT NOT NULL,
        alphaBeta REAL NOT NULL
      );`
    );
  });
};
