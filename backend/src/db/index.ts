import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.ts';

// Load the built-in SQLite driver at runtime (avoids tooling that cannot resolve
// the `node:sqlite` specifier). Available since Node 22.5+.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as typeof import('node:sqlite');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbPath(dbPath: string): string {
  // ':memory:' databases are used by the test suite.
  if (dbPath === ':memory:') return dbPath;
  const resolved = path.isAbsolute(dbPath) ? dbPath : path.resolve(__dirname, '..', '..', dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

export type SqlValue = string | number | bigint | null | Uint8Array;

export type DbRow = Record<string, SqlValue>;

const db = new DatabaseSync(resolveDbPath(config.dbPath));

// Enforce foreign keys on every connection. SQLite defaults to OFF.
db.exec('PRAGMA foreign_keys = ON');
if (config.dbPath !== ':memory:') {
  db.exec('PRAGMA journal_mode = WAL');
}

export { db };

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function lastInsertId(): number {
  const row = db.prepare('SELECT last_insert_rowid() AS id').get() as { id: number };
  return row.id;
}
