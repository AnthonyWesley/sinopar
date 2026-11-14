import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

// banco num arquivo temporário: getDb() lê DATA_DIR na primeira chamada
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sinopar-products-"));
process.env.DATA_DIR = dir;

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("../session", () => ({ authorizeAction: vi.fn() }));

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { authorizeAction } from "../session";
import { getDb } from "../server/db";
import { getAdminProduct, getProductBySlug, listProducts, slugify } from "../server/catalog-repo";
import { products } from "../catalog";
import { deleteProduct, saveProduct, setProductStatus, uploadProductPhoto, type ProductFormState } from "./products";

const staff = { id: 2, email: "f@x.com", name: "Func", role: "staff" as const, mustChangePassword: false, hasRecoveryCode: true };
const EMPTY: ProductFormState = {};

type V = { id?: string; sku: string; label?: string; price: string; compareAt?: string; boxQty?: string };

function form(over: Record<string, string | string[]> = {}, variants: V[] = [{ sku: "TR-500", price: "R$ 12,90", boxQty: "12" }]) {
  const f = new FormData();
  const fields: Record<string, string | string[]> = {
    name: "Trena de aço 5 m",
    category: "medicao",
    description: "Trena com trava.",
    unit: "Unidade",
    variantName: "",
    image: "",
    segments: ["construcao", "casa"],
    specLabel: ["Comprimento", ""],
    specValue: ["5 m", ""],
    ...over,
  };
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  for (const v of variants) {
    f.append("variantId", v.id ?? "");
    f.append("sku", v.sku);
    f.append("label", v.label ?? "");
    f.append("price", v.price);
    f.append("compareAt", v.compareAt ?? "");
    f.append("boxQty", v.boxQty ?? "");
  }
  return f;
}

/** chama a action esperando o redirect; devolve a URL */
async function redirected(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as { url: string }).url;
  }
  throw new Error("esperava redirect");
}

const idOf = (slug: string) => (getDb().prepare("SELECT id FROM products WHERE slug = ?").get(slug) as { id: number }).id;
const tags = () => vi.mocked(updateTag).mock.calls.map((c) => c[0]);

beforeEach(() => {
  vi.mocked(updateTag).mockClear();
  vi.mocked(redirect).mockClear();
  vi.mocked(authorizeAction).mockResolvedValue({ ok: true, user: staff });
});

describe("saveProduct", () => {
  it("sem sessão: erro e nada gravado", async () => {
    vi.mocked(authorizeAction).mockResolvedValue({ ok: false, error: "Sua sessão expirou. Entre de novo." });
    expect(await saveProduct(EMPTY, form({ name: "Sem sessão" }))).toEqual({ error: "Sua sessão expirou. Entre de novo." });
    expect(listProducts(getDb()).some((p) => p.name === "Sem sessão")).toBe(false);
  });

  it("criar → aparece no listProducts, preço em centavos, estoque 0, invalida as tags", async () => {
    const url = await redirected(saveProduct(EMPTY, form()));
    const p = listProducts(getDb()).find((x) => x.slug === "trena-de-aco-5-m")!;
    expect(url).toBe(`/admin/produtos/${idOf(p.slug)}?criado=1`);
    expect(p).toMatchObject({
      name: "Trena de aço 5 m",
      category: "medicao",
      image: "/images/produtos/sem-foto.webp",
      variantName: null,
      segments: ["construcao", "casa"],
      specs: [{ label: "Comprimento", value: "5 m" }],
      variants: [{ sku: "TR-500", label: "Padrão", price: 1290, stock: 0, boxQty: 12 }],
    });
    expect(tags()).toEqual(expect.arrayContaining(["catalogo", "produto:trena-de-aco-5-m"]));
  });

  it("SKU duplicado → \"Este código já está em outro produto.\"", async () => {
    const r = await saveProduct(EMPTY, form({ name: "Outro" }, [{ sku: products[0].variants[0].sku, price: "10" }]));
    expect(r.errors?.["variant-0-sku"]).toBe("Este código já está em outro produto.");
    expect(r.error).toBe("Confira os campos marcados.");
    expect(tags()).toEqual([]);
  });

  it("compare_at menor que o preço → erro", async () => {
    const r = await saveProduct(EMPTY, form({ name: "Com desconto" }, [{ sku: "CD-1", price: "20,00", compareAt: "15,00" }]));
    expect(r.errors?.["variant-0-compareAt"]).toBe('O preço "de" precisa ser maior que o preço.');
    expect(getDb().prepare("SELECT 1 FROM variants WHERE sku = 'CD-1'").get()).toBeUndefined();
  });

  it("valida nome, departamento, variação, preço e código repetido no próprio formulário", async () => {
    expect((await saveProduct(EMPTY, form({ name: " " }))).errors?.name).toBe("Informe o nome do produto.");
    expect((await saveProduct(EMPTY, form({ category: "nao-existe" }))).errors?.category).toBe("Escolha um departamento.");
    expect((await saveProduct(EMPTY, form({}, []))).errors?.variants).toBe("Cadastre ao menos uma variação.");
    expect((await saveProduct(EMPTY, form({}, [{ sku: "Z1", price: "0" }]))).errors?.["variant-0-price"]).toBe(
      "O preço precisa ser maior que zero.",
    );
    expect((await saveProduct(EMPTY, form({}, [{ sku: "Z1", price: "doze" }]))).errors?.["variant-0-price"]).toBe(
      "Informe o preço, por exemplo 12,90.",
    );
    const dup = await saveProduct(EMPTY, form({ variantName: "Medida" }, [
      { sku: "Z1", label: "A", price: "1" },
      { sku: "z1 ", label: "B", price: "1" },
    ]));
    expect(dup.errors?.["variant-1-sku"]).toBe("Este código está repetido neste produto.");
    const noName = await saveProduct(EMPTY, form({}, [
      { sku: "Z1", label: "A", price: "1" },
      { sku: "Z2", label: "B", price: "1" },
    ]));
    expect(noName.errors?.variantName).toBe("Diga o que muda entre as variações (por exemplo, Medida).");
    expect((await saveProduct(EMPTY, form({ image: "https://evil/x.png" }))).errors?.image).toBe("Foto inválida. Envie a foto de novo.");
    expect((await saveProduct(EMPTY, form({ specLabel: ["Peso"], specValue: [""] }))).errors?.["spec-0"]).toBe(
      "Preencha o nome e o valor da característica.",
    );
  });

  it("editar: troca nome e preço, invalida slug antigo e novo, não mexe no estoque", async () => {
    const p = products[2];
    const id = idOf(p.slug);
    const before = getAdminProduct(getDb(), id)!;
    const v = before.variants[0];
    const r = await saveProduct(
      EMPTY,
      form({ id: String(id), name: `${p.name} reforçado`, category: p.category, image: p.image }, [
        { id: String(v.id), sku: v.sku, price: "99,90", boxQty: String(v.boxQty) },
      ]),
    );
    expect(r).toEqual({ message: "Alterações salvas." });
    const after = getAdminProduct(getDb(), id)!;
    expect(after.variants[0]).toMatchObject({ price: 9990, stock: v.stock });
    expect(after.slug).toBe(slugify(`${p.name} reforçado`));
    expect(tags()).toEqual(expect.arrayContaining(["catalogo", `produto:${p.slug}`, `produto:${after.slug}`]));
  });

  it("editar só o preço de um produto do catálogo original não muda o endereço", async () => {
    const p = products[5];
    const id = idOf(p.slug);
    const v = getAdminProduct(getDb(), id)!.variants;
    const r = await saveProduct(
      EMPTY,
      form(
        { id: String(id), name: p.name, category: p.category, image: p.image, variantName: p.variantName ?? "" },
        v.map((x) => ({ id: String(x.id), sku: x.sku, label: x.label, price: "77,00" })),
      ),
    );
    expect(r).toEqual({ message: "Alterações salvas." });
    expect(getAdminProduct(getDb(), id)!.slug).toBe(p.slug);
  });
});

describe("setProductStatus / deleteProduct", () => {
  it("pausar some da loja", async () => {
    const p = products[3];
    const f = new FormData();
    f.set("id", String(idOf(p.slug)));
    f.set("status", "pausado");
    expect(await setProductStatus(EMPTY, f)).toEqual({ message: "Produto pausado. Ele não aparece mais na loja." });
    expect(getProductBySlug(getDb(), p.slug)).toBeNull();
    expect(tags()).toEqual(expect.arrayContaining(["catalogo", `produto:${p.slug}`]));
    f.set("status", "ativo");
    expect(await setProductStatus(EMPTY, f)).toEqual({ message: "Produto ativo de novo na loja." });
    expect(getProductBySlug(getDb(), p.slug)?.slug).toBe(p.slug);
  });

  it("status inválido", async () => {
    const f = new FormData();
    f.set("id", String(idOf(products[3].slug)));
    f.set("status", "apagado");
    expect(await setProductStatus(EMPTY, f)).toEqual({ error: "Situação inválida." });
  });

  it("excluir produto com pedido → pausado e com o aviso", async () => {
    const p = products[4];
    const id = idOf(p.slug);
    const db = getDb();
    db.prepare(
      `INSERT INTO orders (id, token, status, created_at, customer, shipping, payment_method, subtotal, total)
       VALUES ('PX1', 'tx1', 'pago', '2026-11-14T12:00:00Z', '{}', '{}', 'PIX', 100, 100)`,
    ).run();
    db.prepare("INSERT INTO order_lines (order_id, sku, variant_id, name, qty, unit_price) VALUES ('PX1', ?, ?, 'x', 1, 100)").run(
      p.variants[0].sku,
      getAdminProduct(db, id)!.variants[0].id,
    );
    const f = new FormData();
    f.set("id", String(id));
    expect(await deleteProduct(EMPTY, f)).toEqual({ message: "Este produto já teve pedidos; ele foi pausado em vez de excluído." });
    expect(getAdminProduct(db, id)?.status).toBe("pausado");
    expect(getProductBySlug(db, p.slug)).toBeNull();
    expect(tags()).toEqual(expect.arrayContaining(["catalogo", `produto:${p.slug}`]));
  });

  it("excluir produto sem histórico apaga o produto e a foto enviada", async () => {
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#0a0" } }).png().toBuffer();
    const up = new FormData();
    up.set("photo", new File([new Uint8Array(png)], "foto.png", { type: "image/png" }));
    const { url } = await uploadProductPhoto({}, up);
    expect(url).toMatch(/^\/uploads\//);
    await redirected(saveProduct(EMPTY, form({ name: "Para apagar", image: url! }, [{ sku: "DEL-1", price: "5" }])));
    const id = idOf("para-apagar");
    const file = path.join(dir, url!);
    expect(fs.existsSync(file)).toBe(true);
    const f = new FormData();
    f.set("id", String(id));
    expect(await redirected(deleteProduct(EMPTY, f))).toBe("/admin/produtos?excluido=1");
    expect(getAdminProduct(getDb(), id)).toBeNull();
    expect(fs.existsSync(file)).toBe(false);
  });
});

describe("uploadProductPhoto", () => {
  const send = (data: Uint8Array, name: string, type: string) => {
    const f = new FormData();
    f.set("photo", new File([new Uint8Array(data)], name, { type }));
    return uploadProductPhoto({}, f);
  };

  it("PNG vira WebP", async () => {
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#222" } }).png().toBuffer();
    const r = await send(png, "a.png", "image/png");
    expect(r.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.webp$/);
    expect((await sharp(path.join(dir, r.url!)).metadata()).format).toBe("webp");
  });

  it("11 MB e .svg recusados; sem arquivo também", async () => {
    expect(await send(new Uint8Array(11 * 1024 * 1024), "big.jpg", "image/jpeg")).toEqual({ error: "Foto muito grande (máximo 10 MB)." });
    expect(await send(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"), "x.svg", "image/svg+xml")).toEqual({
      error: "Envie uma foto JPG, PNG, WebP ou HEIC.",
    });
    expect(await uploadProductPhoto({}, new FormData())).toEqual({ error: "Escolha uma foto." });
  });

  it("sem sessão: recusa", async () => {
    vi.mocked(authorizeAction).mockResolvedValue({ ok: false, error: "Sua sessão expirou. Entre de novo." });
    expect(await send(new Uint8Array(10), "a.png", "image/png")).toEqual({ error: "Sua sessão expirou. Entre de novo." });
  });
});
