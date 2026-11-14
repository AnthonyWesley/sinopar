"use server";

import { updateTag } from "next/cache";
import { productTag, TAG_CATALOG } from "../cache-tags";
import { getDb } from "../server/db";
import { addStock, setStock } from "../server/stock";
import { authorizeAction } from "../session";

// Server Actions da tela Estoque (Responsável e funcionário). Campos: sku, qty (entrada) ou
// counted (ajuste), reason. Formato para useActionState.

export type StockFormState = { error?: string; message?: string };

function invalidate(slugs: string[]) {
  updateTag(TAG_CATALOG);
  for (const slug of slugs) updateTag(productTag(slug));
}

const text = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};
const whole = (s: string) => (/^\s*\d+\s*$/.test(s) ? Number(s) : NaN);

export async function addStockAction(_prev: StockFormState, form: FormData): Promise<StockFormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const qty = whole(text(form, "qty"));
  if (!Number.isSafeInteger(qty) || qty < 1) return { error: "Informe quantas unidades entraram (1 ou mais)." };
  try {
    const r = addStock(getDb(), text(form, "sku"), qty, text(form, "reason"), auth.user.id, new Date());
    invalidate(r.slugs);
    return { message: `Entrada de ${qty} registrada.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar a entrada." };
  }
}

export async function setStockAction(_prev: StockFormState, form: FormData): Promise<StockFormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const counted = whole(text(form, "counted"));
  if (!Number.isSafeInteger(counted)) return { error: "Informe um número inteiro, zero ou mais." };
  if (!text(form, "reason").trim()) return { error: "Informe o motivo." };
  try {
    const r = setStock(getDb(), text(form, "sku"), counted, text(form, "reason"), auth.user.id, new Date());
    if (!r.ok) return { error: r.error };
    invalidate(r.slugs);
    return { message: "Estoque ajustado." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível ajustar o estoque." };
  }
}
