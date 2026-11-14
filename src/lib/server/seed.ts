import type { Db } from "./db";
import { products } from "../catalog";

/** Carrega o catálogo de src/lib/catalog.ts, mas só quando a tabela products está vazia. */
export function seedIfEmpty(db: Db): void {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number };
  if (n > 0) return;
  const now = new Date().toISOString();
  const insProduct = db.prepare(
    `INSERT INTO products (slug,name,category,image,variant_name,unit,segments,description,specs,featured,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,'ativo',?,?)`,
  );
  const insVariant = db.prepare(
    `INSERT INTO variants (product_id,sku,label,price,compare_at,stock,reserved,box_qty,position)
     VALUES (?,?,?,?,?,?,0,?,?)`,
  );
  // o estoque inicial entra como movimentação, para o histórico sempre somar o estoque
  const insMovement = db.prepare(
    `INSERT INTO stock_movements (variant_id,kind,qty,reason,order_id,user_id,at)
     VALUES (?,'entrada',?,'Estoque inicial',NULL,NULL,?)`,
  );
  db.transaction(() => {
    for (const p of products) {
      const { lastInsertRowid } = insProduct.run(
        p.slug, p.name, p.category, p.image, p.variantName, p.unit,
        JSON.stringify(p.segments), p.description, JSON.stringify(p.specs),
        p.featured ? 1 : 0, now, now,
      );
      p.variants.forEach((v, i) => {
        const variant = insVariant.run(lastInsertRowid, v.sku, v.label, v.price, v.compareAt ?? null, v.stock, v.boxQty, i);
        if (v.stock > 0) insMovement.run(variant.lastInsertRowid, v.stock, now);
      });
    }
  })();
}
