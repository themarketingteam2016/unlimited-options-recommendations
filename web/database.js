import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db = null;

export async function getDB() {
  if (db) return db;

  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  // Create tables for unlimited options
  await db.exec(`
    CREATE TABLE IF NOT EXISTS product_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop TEXT NOT NULL,
      product_id TEXT NOT NULL,
      option_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS option_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      option_id INTEGER NOT NULL,
      value TEXT NOT NULL,
      FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS variant_combinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop TEXT NOT NULL,
      product_id TEXT NOT NULL,
      combination_key TEXT NOT NULL,
      price DECIMAL(10,2),
      sku TEXT,
      inventory_qty INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(shop, product_id, combination_key)
    );

    CREATE TABLE IF NOT EXISTS variant_option_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL,
      option_name TEXT NOT NULL,
      option_value TEXT NOT NULL,
      FOREIGN KEY (variant_id) REFERENCES variant_combinations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_product_options_shop_product
      ON product_options(shop, product_id);
    CREATE INDEX IF NOT EXISTS idx_variant_combinations_shop_product
      ON variant_combinations(shop, product_id);
  `);

  return db;
}
