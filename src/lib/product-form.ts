import { z } from "zod";
import { categories, NO_PHOTO, segments, type Segment } from "./catalog";
import { parsePrice } from "./money";
import type { ProductInput } from "./server/catalog-repo";

// Leitura e validação (zod) do formulário de produto do painel. Os campos repetidos (variações e
// características) chegam como listas paralelas no FormData, uma posição por linha.
// Erros por campo, com chaves que o formulário usa: name, category, variantName, image, unit,
// description, segments, variants, spec-<i>, variant-<i>-sku|label|price|compareAt|boxQty.

export type FieldErrors = Record<string, string>;
export type ParsedProduct = { ok: true; input: ProductInput } | { ok: false; errors: FieldErrors };

const categorySlugs = categories.map((c) => c.slug) as [string, ...string[]];
const segmentSlugs = segments.map((s) => s.slug) as [Segment, ...Segment[]];

/** foto do catálogo original (public/images/produtos) ou enviada pelo painel (/uploads/<uuid>.webp) */
const IMAGE = /^\/images\/produtos\/[a-z0-9-]+\.webp$|^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;
const SKU = /^[A-Z0-9][A-Z0-9./-]*$/;

const text = (max: number, tooLong: string) => z.string().trim().max(max, tooLong);

const price = z.string().transform((s, ctx) => {
  const cents = parsePrice(s);
  if (cents == null) {
    ctx.addIssue({ code: "custom", message: "Informe o preço, por exemplo 12,90." });
    return z.NEVER;
  }
  if (cents <= 0) {
    ctx.addIssue({ code: "custom", message: "O preço precisa ser maior que zero." });
    return z.NEVER;
  }
  return cents;
});

const compareAt = z.string().transform((s, ctx) => {
  if (!s.trim()) return null;
  const cents = parsePrice(s);
  if (cents == null) {
    ctx.addIssue({ code: "custom", message: 'Preço "de" inválido. Use o formato 12,90 ou deixe vazio.' });
    return z.NEVER;
  }
  return cents;
});

const boxQty = z.string().transform((s, ctx) => {
  const t = s.trim();
  if (!t) return 1;
  const n = Number(t);
  if (!/^\d+$/.test(t) || !Number.isSafeInteger(n) || n < 1) {
    ctx.addIssue({ code: "custom", message: "Use um número inteiro a partir de 1." });
    return z.NEVER;
  }
  return n;
});

const variantId = z.string().transform((s, ctx) => {
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n <= 0) {
    ctx.addIssue({ code: "custom", message: "Variação não encontrada." });
    return z.NEVER;
  }
  return n;
});

const variant = z
  .object({
    id: variantId,
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, "Informe o código.")
      .max(40, "Código muito longo (máximo 40 caracteres).")
      .regex(SKU, "Use só letras, números, ponto, barra e hífen no código."),
    label: text(80, "Texto muito longo (máximo 80 letras)."),
    price,
    compareAt,
    boxQty,
  })
  .superRefine((v, ctx) => {
    if (v.compareAt != null && v.compareAt <= v.price) {
      ctx.addIssue({ code: "custom", path: ["compareAt"], message: 'O preço "de" precisa ser maior que o preço.' });
    }
  });

const schema = z
  .object({
    name: text(120, "Nome muito longo (máximo 120 letras).").min(1, "Informe o nome do produto."),
    category: z.enum(categorySlugs, "Escolha um departamento."),
    image: z
      .string()
      .trim()
      .transform((s) => s || NO_PHOTO)
      .pipe(z.string().regex(IMAGE, "Foto inválida. Envie a foto de novo.")),
    variantName: text(40, "Texto muito longo (máximo 40 letras).").transform((s) => s || null),
    unit: text(40, "Texto muito longo (máximo 40 letras).").transform((s) => s || "Unidade"),
    description: text(2000, "Descrição muito longa (máximo 2000 letras)."),
    segments: z.array(z.enum(segmentSlugs, "Escolha um público da lista.")),
    featured: z.boolean(),
    specs: z.array(
      z
        .object({ label: text(60, "Texto muito longo (máximo 60 letras)."), value: text(200, "Texto muito longo (máximo 200 letras).") })
        .refine((s) => !s.label === !s.value, "Preencha o nome e o valor da característica."),
    ),
    variants: z.array(variant).min(1, "Cadastre ao menos uma variação.").max(100, "No máximo 100 variações por produto."),
  })
  .superRefine((p, ctx) => {
    const seen = new Set<string>();
    p.variants.forEach((v, i) => {
      if (seen.has(v.sku)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "Este código está repetido neste produto." });
      seen.add(v.sku);
    });
    if (p.variants.length > 1 && !p.variantName) {
      ctx.addIssue({ code: "custom", path: ["variantName"], message: "Diga o que muda entre as variações (por exemplo, Medida)." });
    }
    if (p.variantName) {
      p.variants.forEach((v, i) => {
        if (!v.label) ctx.addIssue({ code: "custom", path: ["variants", i, "label"], message: `Informe ${p.variantName!.toLowerCase()} desta variação.` });
      });
    }
  });

/** caminho do erro do zod → chave do campo no formulário */
function fieldKey(path: PropertyKey[]): string {
  const [head, i, sub] = path;
  if (head === "variants" && typeof i === "number") return `variant-${i}-${String(sub ?? "sku")}`;
  if (head === "specs" && typeof i === "number") return `spec-${i}`;
  return String(head ?? "form");
}

const str = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
};
const all = (form: FormData, name: string) => form.getAll(name).map((v) => (typeof v === "string" ? v : ""));

export function parseProductForm(form: FormData): ParsedProduct {
  const specLabels = all(form, "specLabel");
  const specValues = all(form, "specValue");
  const skus = all(form, "sku");
  const ids = all(form, "variantId");
  const labels = all(form, "label");
  const prices = all(form, "price");
  const compares = all(form, "compareAt");
  const boxes = all(form, "boxQty");
  const raw = {
    name: str(form, "name"),
    category: str(form, "category"),
    image: str(form, "image"),
    variantName: str(form, "variantName"),
    unit: str(form, "unit"),
    description: str(form, "description"),
    segments: all(form, "segments"),
    featured: form.get("featured") === "on",
    specs: specLabels.map((label, i) => ({ label, value: specValues[i] ?? "" })),
    variants: skus.map((sku, i) => ({
      id: ids[i] ?? "",
      sku,
      label: labels[i] ?? "",
      price: prices[i] ?? "",
      compareAt: compares[i] ?? "",
      boxQty: boxes[i] ?? "",
    })),
  };
  const r = schema.safeParse(raw);
  if (!r.success) {
    const errors: FieldErrors = {};
    for (const issue of r.error.issues) {
      const key = fieldKey(issue.path);
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const p = r.data;
  return {
    ok: true,
    input: {
      ...p,
      segments: [...new Set(p.segments)],
      // linha de característica totalmente vazia é ignorada (a posição conta só para os erros)
      specs: p.specs.filter((s) => s.label),
      // sem variação nomeada, a única variação se chama "Padrão" (como no catálogo original)
      variants: p.variants.map((v) => ({ ...v, label: v.label || "Padrão" })),
    },
  };
}
