/**
 * In-memory SQLite database seeded with fake users.
 *
 * Intentionally vulnerable: queryUsers() uses string concatenation, not parameterization.
 * The database exists only in process memory (":memory:") — dies on process exit.
 * No real PII; all data is fake.
 */
import Database from "better-sqlite3";

export interface User {
  id: number;
  name: string;
  role: string;
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(":memory:");
  _db.exec(`
    CREATE TABLE users (
      id   INTEGER PRIMARY KEY,
      name TEXT    NOT NULL,
      role TEXT    NOT NULL
    );
    INSERT INTO users VALUES
      (1, 'Alice Admin',    'admin'),
      (2, 'Bob User',       'user'),
      (3, 'Carol User',     'user'),
      (4, 'Dave Dev',       'developer'),
      (5, 'Eve External',   'external');
  `);
  return _db;
}

/**
 * Intentionally vulnerable: builds SQL via string concatenation.
 * Payload like  1' OR '1'='1  will dump all rows.
 */
export function queryUsers(id: string): User[] {
  const db = getDb();
  // INTENTIONAL VULNERABILITY: do not parameterize
  return db
    .prepare(`SELECT id, name, role FROM users WHERE id = '${id}'`)
    .all() as User[];
}
