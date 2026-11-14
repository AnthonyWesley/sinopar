"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createCharge, type Charge } from "../asaas";
import { TAG_CATALOG, productTag } from "../cache-tags";
import type { Product, Variant } from "../catalog";
import { isValidCnpj, isValidCpf, onlyDigits } from "../documents";
import { newOrderId, type PaymentMethod } from "../orders";
import { formatPrice } from "../format";
import { findVariant } from "../server/catalog-repo";
import { getDb } from "../server/db";
import { attachCharge, cancelOrder, createOrderWithReservation, type NewOrder } from "../server/stock";
import { formatCep, isValidCep, pickQuote, quoteShipping, UFS } from "../shipping";

export type CheckoutState = {
  errors: Record<string, string>;
  values: Record<string, string>;
  /** erro geral (estoque mudou, Asaas fora do ar...) */
  message?: string;
  /** correções para o carrinho do navegador quando ele está desatualizado em relação ao catálogo */
  cartFix?: CartFix;
};

export type CartFix = { remove: string[]; update: { sku: string; unitPrice: number; compareAt?: number; maxQty: number }[] };

const FIELDS = ["nome", "email", "celular", "documento", "entrega", "cep", "rua", "numero", "complemento", "bairro", "cidade", "uf", "pagamento"] as const;
const PAYMENTS: PaymentMethod[] = ["PIX", "CREDIT_CARD"];

const cartMessage = (problems: string[]) => `Atualizamos seu carrinho: ${problems.join("; ")}. Confira o total e confirme de novo.`;

/** o disponível (estoque − reservado) não cobre o pedido: corrige o carrinho com o que restou */
function stockProblem(product: Product, variant: Variant, available: number, problems: string[], fix: CartFix) {
  problems.push(available ? `${product.name}: só restam ${available}` : `${product.name}: esgotado e saiu do carrinho`);
  if (available) fix.update.push({ sku: variant.sku, unitPrice: variant.price, compareAt: variant.compareAt, maxQty: available });
  else fix.remove.push(variant.sku);
}

/** a loja mostra o disponível: quem mexeu na reserva invalida o produto e as listagens */
function invalidate(slugs: string[]) {
  for (const slug of slugs) updateTag(productTag(slug));
  updateTag(TAG_CATALOG);
}

export async function placeOrder(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(form.get(f) ?? "").trim()])) as Record<(typeof FIELDS)[number], string>;
  const errors: Record<string, string> = {};
  const db = getDb();

  // ---------- itens: preço e estoque vêm do banco, nunca do navegador ----------
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("itens") ?? "[]"));
  } catch {
    raw = [];
  }
  type Requested = { sku: string; qty: number; name?: string; price?: number };
  const valid = Array.isArray(raw) ? raw.filter((i): i is Requested => typeof i?.sku === "string" && Number.isInteger(i?.qty) && i.qty > 0) : [];
  // o mesmo SKU repetido soma as quantidades antes de conferir o estoque
  const bySku = new Map<string, Requested>();
  for (const i of valid) {
    const prev = bySku.get(i.sku);
    bySku.set(i.sku, prev ? { ...prev, qty: prev.qty + i.qty } : i);
  }
  const requested = [...bySku.values()];
  if (!requested.length) return { errors, values, message: "Seu carrinho está vazio." };

  // O carrinho fica no navegador e pode estar velho (produto removido ou pausado, preço ou
  // disponível mudou). Nesses casos o pedido NÃO fecha com um total diferente do que a pessoa
  // viu: o carrinho é corrigido e ela confere antes de confirmar de novo.
  // `variant.stock` aqui já é o DISPONÍVEL (estoque − reservado).
  const lines: { sku: string; qty: number; unitPrice: number }[] = [];
  const catalog = new Map<string, { product: Product; variant: Variant }>();
  const problems: string[] = [];
  const fix: CartFix = { remove: [], update: [] };
  for (const { sku, qty, name, price } of requested) {
    const found = findVariant(db, sku);
    if (!found) {
      problems.push(`${name ?? sku}: não está mais à venda e saiu do carrinho`);
      fix.remove.push(sku);
      continue;
    }
    const { product, variant } = found;
    catalog.set(sku, { product, variant });
    if (variant.stock < qty) {
      stockProblem(product, variant, variant.stock, problems, fix);
      continue;
    }
    if (price !== undefined && price !== variant.price) {
      problems.push(`${product.name}: o preço mudou para ${formatPrice(variant.price)}`);
      fix.update.push({ sku, unitPrice: variant.price, compareAt: variant.compareAt, maxQty: variant.stock });
      continue;
    }
    lines.push({ sku, qty, unitPrice: variant.price });
  }
  if (problems.length) return { errors, values, cartFix: fix, message: cartMessage(problems) };

  // ---------- dados do comprador ----------
  if (values.nome.split(/\s+/).length < 2) errors.nome = "Informe nome e sobrenome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Informe um e-mail válido, ex.: nome@empresa.com.br.";
  const phone = onlyDigits(values.celular);
  if (phone.length < 10 || phone.length > 11) errors.celular = "Informe o celular com DDD, ex.: (66) 99999-0000.";
  const doc = onlyDigits(values.documento);
  if (!(doc.length === 11 ? isValidCpf(doc) : doc.length === 14 ? isValidCnpj(doc) : false))
    errors.documento = "CPF ou CNPJ inválido. Confira os números.";

  // ---------- entrega: o frete é recalculado aqui, o valor do navegador não vale ----------
  const quotes = quoteShipping(values.cep, lines);
  const shipping = pickQuote(quotes, values.entrega);
  if (!isValidCep(values.cep)) errors.cep = "Informe o CEP com 8 números.";
  else if (!shipping) errors.entrega = "Não há entrega para este CEP. Confira os números.";
  else if (values.entrega && shipping.id !== values.entrega) errors.entrega = "A opção de entrega mudou. Confira o CEP e escolha de novo.";
  if (!values.rua) errors.rua = "Informe a rua.";
  if (!values.numero) errors.numero = "Informe o número (ou “s/n”).";
  if (!values.bairro) errors.bairro = "Informe o bairro.";
  if (!values.cidade) errors.cidade = "Informe a cidade.";
  if (!UFS.includes(values.uf)) errors.uf = "Escolha o estado.";
  const address = `${values.rua}, ${values.numero}${values.complemento ? ` (${values.complemento})` : ""} - ${values.bairro}, ${values.cidade} - ${values.uf}, CEP ${formatCep(values.cep)}`;

  // ---------- pagamento ----------
  const method = values.pagamento as PaymentMethod;
  if (!PAYMENTS.includes(method)) errors.pagamento = "Escolha a forma de pagamento.";

  if (Object.keys(errors).length || !shipping) return { errors, values };

  // ---------- grava o pedido e reserva o disponível numa única transação ----------
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const order: NewOrder = {
    id: newOrderId(),
    token: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    customer: { name: values.nome, email: values.email, phone, document: doc },
    shipping: { method: shipping.id, label: shipping.label, price: shipping.price, estimate: shipping.estimate, address },
    paymentMethod: method,
    lines: lines.map(({ sku, qty }) => ({ sku, qty })),
    subtotal,
    total: subtotal + shipping.price,
  };
  const reserved = createOrderWithReservation(db, order);
  if (!reserved.ok) {
    // outra compra levou o disponível entre a conferência acima e a transação: nada foi gravado
    for (const { sku, available } of reserved.shortages) {
      const found = catalog.get(sku);
      if (found) stockProblem(found.product, found.variant, available, problems, fix);
    }
    return { errors, values, cartFix: fix, message: cartMessage(problems) };
  }
  invalidate(reserved.slugs);

  // ---------- cobrança: fora da transação; se falhar, cancela e libera a reserva ----------
  let charge: Charge;
  try {
    charge = await createCharge(order, method);
  } catch (e) {
    console.error("[checkout] Asaas:", e);
    const { slugs } = cancelOrder(db, order.id, { restock: false, userId: null, reason: "falha ao gerar cobrança" }, new Date());
    invalidate(slugs);
    return { errors, values, message: "Não conseguimos gerar a cobrança agora. Nada foi cobrado. Tente de novo em instantes." };
  }

  attachCharge(db, order.id, charge);
  redirect(`/pedido-confirmado?pedido=${order.token}`);
}
