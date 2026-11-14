import { describe, it, expect } from "vitest";
import { openDb } from "./db";
import { seedIfEmpty } from "./seed";
import { products } from "../catalog";

const count = (db: ReturnType<typeof openDb>, t: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;

describe("db", () => {
  it("user_version = 1 e foreign_keys ligado", () => {
    const db = openDb(":memory:");
    expect(db.pragma("user_version", { simple: true })).toBe(1);
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
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
