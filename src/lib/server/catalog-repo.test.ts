import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type Db } from "./db";
import { seedIfEmpty } from "./seed";
import { findVariant, getProductBySlug, listProducts, productSlugExists } from "./catalog-repo";
import { products } from "../catalog";

let db: Db;
const first = products[0];
const second = products[1];

beforeEach(() => {
  db = openDb(":memory:");
  seedIfEmpty(db);
});

const pause = (slug: string) => db.prepare("UPDATE products SET status = 'pausado' WHERE slug = ?").run(slug);

describe("catalog-repo", () => {
  it("listProducts devolve o catálogo no mesmo formato e ordem do seed", () => {
    const list = listProducts(db);
    expect(list).toHaveLength(products.length);
    expect(list.map((p) => p.slug)).toEqual(products.map((p) => p.slug));
    expect(list[0]).toEqual(first);
  });

  it("listProducts esconde pausados e calcula o disponível (stock 10, reserved 3 → 7)", () => {
    const sku = first.variants[0].sku;
    db.prepare("UPDATE variants SET stock = 10, reserved = 3 WHERE sku = ?").run(sku);
    pause(second.slug);
    const list = listProducts(db);
    expect(list.some((p) => p.slug === second.slug)).toBe(false);
    expect(list.find((p) => p.slug === first.slug)!.variants[0].stock).toBe(7);
  });

  it("includePaused mostra os pausados", () => {
    pause(second.slug);
    expect(listProducts(db, { includePaused: true }).some((p) => p.slug === second.slug)).toBe(true);
    expect(getProductBySlug(db, second.slug)).toBeNull();
    expect(getProductBySlug(db, second.slug, { includePaused: true })?.slug).toBe(second.slug);
  });

  it("getProductBySlug de slug inexistente → null", () => {
    expect(getProductBySlug(db, "nao-existe")).toBeNull();
    expect(getProductBySlug(db, first.slug)).toEqual(first);
  });

  it("findVariant devolve produto, variação e id; produto pausado → null", () => {
    const sku = first.variants[1].sku;
    const found = findVariant(db, sku);
    expect(found?.product.slug).toBe(first.slug);
    expect(found?.variant).toEqual(first.variants[1]);
    expect(typeof found?.variantId).toBe("number");
    expect(findVariant(db, "nao-existe")).toBeNull();
    pause(first.slug);
    expect(findVariant(db, sku)).toBeNull();
  });

  it("productSlugExists só para ativos", () => {
    expect(productSlugExists(db, first.slug)).toBe(true);
    expect(productSlugExists(db, "nao-existe")).toBe(false);
    pause(first.slug);
    expect(productSlugExists(db, first.slug)).toBe(false);
  });
});
