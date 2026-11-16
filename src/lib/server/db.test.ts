import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb } from "./db";
import { seedIfEmpty } from "./seed";
import { products } from "../catalog";

const count = (db: ReturnType<typeof openDb>, t: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;

describe("db", () => {
  it("user_version = 3 e foreign_keys ligado", () => {
    const db = openDb(":memory:");
    expect(db.pragma("user_version", { simple: true })).toBe(3);
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
  });

  it("banco já em uso (versão 1) ganha a tabela de banners sem perder nada", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sinopar-mig-")), "site.db");
    const old = openDb(file);
    old.exec("DROP TABLE banners");
    old.pragma("user_version = 1");
    old.prepare("INSERT INTO users (email,name,role,password_hash,created_at) VALUES ('a@b.c','A','owner','x','2026-01-01')").run();
    old.close();
    const db = openDb(file);
    expect(db.pragma("user_version", { simple: true })).toBe(3);
    expect(db.prepare("SELECT count(*) AS n FROM banners").get()).toEqual({ n: 0 });
    expect(db.prepare("SELECT count(*) AS n FROM users").get()).toEqual({ n: 1 });
    db.close();
  });

  it("banco na versão 2 ganha peso e medidas nas variações, vazios", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sinopar-mig3-")), "site.db");
    const old = openDb(file);
    seedIfEmpty(old);
    for (const c of ["weight_g", "length_cm", "width_cm", "height_cm"]) old.exec(`ALTER TABLE variants DROP COLUMN ${c}`);
    old.pragma("user_version = 2");
    old.close();
    const db = openDb(file);
    expect(db.pragma("user_version", { simple: true })).toBe(3);
    expect(db.prepare("SELECT count(*) AS n FROM variants WHERE weight_g IS NULL AND length_cm IS NULL").get()).toEqual({ n: 103 });
    db.close();
  });

  it("seed grava 61 produtos e 103 variações iguais ao catalog.ts", () => {
    const db = openDb(":memory:");
    seedIfEmpty(db);
    expect(count(db, "products")).toBe(61);
    expect(count(db, "variants")).toBe(103);
    expect(products.length).toBe(61);
    expect(products.reduce((n, p) => n + p.variants.length, 0)).toBe(103);
    const p = products[0];
    const row = db.prepare("SELECT * FROM products WHERE slug = ?").get(p.slug) as Record<string, unknown>;
    expect(row.name).toBe(p.name);
    expect(row.status).toBe("ativo");
    const v = db.prepare("SELECT * FROM variants WHERE sku = ?").get(p.variants[0].sku) as Record<string, unknown>;
    expect(v.price).toBe(p.variants[0].price);
    expect(v.stock).toBe(p.variants[0].stock);
    expect(v.reserved).toBe(0);
  });

  it("rodar duas vezes não duplica", () => {
    const db = openDb(":memory:");
    seedIfEmpty(db);
    seedIfEmpty(db);
    expect(count(db, "products")).toBe(61);
    expect(count(db, "variants")).toBe(103);
  });

  it("não roda se já houver produto", () => {
    const db = openDb(":memory:");
    db.prepare(
      "INSERT INTO products (slug,name,category,image,unit,segments,description,specs,featured,status,created_at,updated_at) VALUES ('x','X','c','i','un','[]','','[]',0,'ativo','t','t')",
    ).run();
    seedIfEmpty(db);
    expect(count(db, "products")).toBe(1);
    expect(count(db, "variants")).toBe(0);
  });

  it("seed grava uma entrada 'Estoque inicial' por variação com estoque, e o histórico bate", () => {
    const db = openDb(":memory:");
    seedIfEmpty(db);
    const rows = db
      .prepare(
        `SELECT v.sku, v.stock, v.reserved, COALESCE(SUM(m.qty), 0) AS total, COUNT(m.id) AS n
         FROM variants v LEFT JOIN stock_movements m ON m.variant_id = v.id GROUP BY v.id`,
      )
      .all() as { sku: string; stock: number; reserved: number; total: number; n: number }[];
    expect(rows).toHaveLength(103);
    for (const r of rows) {
      expect({ sku: r.sku, total: r.total, reserved: r.reserved, n: r.n }).toEqual({
        sku: r.sku, total: r.stock, reserved: 0, n: r.stock > 0 ? 1 : 0,
      });
    }
    const bad = db
      .prepare("SELECT COUNT(*) AS n FROM stock_movements WHERE kind <> 'entrada' OR reason <> 'Estoque inicial' OR user_id IS NOT NULL")
      .get() as { n: number };
    expect(bad.n).toBe(0);
    expect(count(db, "stock_movements")).toBeGreaterThan(0);
  });

  it("variação com movimentação não pode ser apagada (histórico nunca some)", () => {
    const db = openDb(":memory:");
    seedIfEmpty(db);
    const vid = (db.prepare("SELECT variant_id AS id FROM stock_movements LIMIT 1").get() as { id: number }).id;
    expect(() => db.prepare("DELETE FROM variants WHERE id = ?").run(vid)).toThrow(/FOREIGN KEY/);
    const pid = (db.prepare("SELECT product_id AS id FROM variants WHERE id = ?").get(vid) as { id: number }).id;
    expect(() => db.prepare("DELETE FROM products WHERE id = ?").run(pid)).toThrow(/FOREIGN KEY/);
  });

  it("CHECK impede reserved > stock", () => {
    const db = openDb(":memory:");
    seedIfEmpty(db);
    const pid = (db.prepare("SELECT id FROM products LIMIT 1").get() as { id: number }).id;
    expect(() =>
      db
        .prepare("INSERT INTO variants (product_id,sku,label,price,stock,reserved,box_qty,position) VALUES (?, 'ZZ', 'z', 100, 1, 2, 1, 0)")
        .run(pid),
    ).toThrow(/CHECK/);
  });
});
