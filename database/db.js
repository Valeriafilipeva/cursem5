import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('radiation_dose.db');

export const initDB = () => {
  db.transaction(tx => {
    // Таблица расчетов
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS calculations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dose REAL NOT NULL,
        fractions INTEGER NOT NULL,
        alpha_beta REAL NOT NULL,
        bed REAL NOT NULL,
        eqd2 REAL NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Таблица справочника α/β
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS reference (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        alpha_beta REAL NOT NULL
      );
    `);
  });
};

export default db;
