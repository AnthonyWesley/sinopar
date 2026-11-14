import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seedIfEmpty } from "./seed";

export type Db = Database.Database;

const MIGRATIONS: ((db: Db) => void)[] = [
  // versão 1: esquema inicial (idempotente)
  (db) =>
    db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      image TEXT NOT NULL,
      variant_name TEXT,
      unit TEXT NOT NULL,
      segments TEXT NOT NULL DEFAULT '[]',
      description TEXT NOT NULL DEFAULT '',
      specs TEXT NOT NULL DEFAULT '[]',
      featured INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sku TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      price INTEGER NOT NULL,
      compare_at INTEGER,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
      box_qty INTEGER NOT NULL DEFAULT 1,
      position INTEGER NOT NULL DEFAULT 0,
      CHECK (stock >= reserved)
    );
    CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id, position);
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
      must_change_password INTEGER NOT NULL DEFAULT 0,
      recovery_hash TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      key TEXT NOT NULL,
      at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON login_attempts(key, at);
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      customer TEXT NOT NULL,
      shipping TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      invoice_url TEXT,
      asaas_payment_id TEXT,
      demo INTEGER NOT NULL DEFAULT 0,
      subtotal INTEGER NOT NULL,
      total INTEGER NOT NULL,
      tracking_code TEXT,
      refund_flag INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);
    CREATE TABLE IF NOT EXISTS order_lines (
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      sku TEXT NOT NULL,
      variant_id INTEGER REFERENCES variants(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      variant_label TEXT NOT NULL,
      qty INTEGER NOT NULL,
      unit_price INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_order_lines_order ON order_lines(order_id);
    CREATE TABLE IF NOT EXISTS order_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, at);
    CREATE TABLE IF NOT EXISTS payment_events (
      event_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      type TEXT NOT NULL,
      at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
      kind TEXT NOT NULL,
      qty INTEGER NOT NULL,
      reason TEXT,
      order_id TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON stock_movements(variant_id, at);
  `),
  // versão 2...: acrescente novos passos aqui, nunca edite os anteriores
];

export function migrate(db: Db): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      MIGRATIONS[v](db);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

export function openDb(file: string): Db {
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

const g = globalThis as unknown as { __sinoparDb?: Db };

export function getDb(): Db {
  if (!g.__sinoparDb) {
    const dir = process.env.DATA_DIR || "./data";
    fs.mkdirSync(dir, { recursive: true });
    const db = openDb(path.join(dir, "site.db"));
    seedIfEmpty(db);
    g.__sinoparDb = db;
  }
  return g.__sinoparDb;
}
