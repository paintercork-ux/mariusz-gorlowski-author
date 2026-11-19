import { DatabaseSync } from 'node:sqlite';

export function previewStorage(filename) {
  const database = new DatabaseSync(filename);
  return {
    database,
    sql: {
      exec(query, ...parameters) {
        const rows = database.prepare(query).all(...parameters);
        return { toArray: () => rows };
      },
    },
    transactionSync(callback) {
      database.exec('BEGIN IMMEDIATE');
      try {
        const result = callback();
        database.exec('COMMIT');
        return result;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
