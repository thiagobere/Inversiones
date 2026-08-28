import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

let db: Database.Database | null = null;

/**
 * Lazily opens the SQLite database and applies the schema.
 * The schema is written with IF NOT EXISTS throughout, so this is idempotent
 * and doubles as the migration step on startup.
 */
export function getDb(): Database.Database {
  if (db) return db;

  const path = process.env.DATABASE_PATH ?? join(process.cwd(), 'data', 'inversiones.db');
  mkdirSync(dirname(path), { recursive: true });

  db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = readFileSync(join(process.cwd(), 'src', 'lib', 'db', 'schema.sql'), 'utf8');
  db.exec(schema);

  return db;
}
