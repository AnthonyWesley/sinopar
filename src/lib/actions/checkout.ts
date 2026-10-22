"use server";

import { redirect } from "next/navigation";
import { createCharge } from "../asaas";
import { findVariant } from "../catalog";
import { isValidCnpj, isValidCpf, onlyDigits } from "../documents";
import { newOrderId, saveOrder, type Order, type PaymentMethod } from "../orders";
import { formatPrice } from "../format";
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
const PAYMENTS: PaymentMethod[] = ["PIX", "BOLETO", "CREDIT_CARD"];

export async function placeOrder(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(form.get(f) ?? "").trim()])) as Record<(typeof FIELDS)[number], string>;
  const errors: Record<string, string> = {};

  // ---------- itens: preço e estoque vêm do catálogo, nunca do navegador ----------
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

  // O carrinho fica no navegador e pode estar velho (produto removido, preço ou estoque mudou).
  // Nesses casos o pedido NÃO fecha com um total diferente do que a pessoa viu: o carrinho é
  // corrigido e ela confere antes de confirmar de novo.
  const lines: Order["lines"] = [];
  const problems: string[] = [];
  const fix: CartFix = { remove: [], update: [] };
  for (const { sku, qty, name, price } of requested) {
    const found = findVariant(sku);
    if (!found) {
      problems.push(`${name ?? sku}: não está mais à venda e saiu do carrinho`);
      fix.remove.push(sku);
      continue;
    }
    const { product, variant } = found;
    const update = { sku, unitPrice: variant.price, compareAt: variant.compareAt, maxQty: variant.stock };
    if (variant.stock < qty) {
      problems.push(variant.stock ? `${product.name}: só restam ${variant.stock}` : `${product.name}: esgotado e saiu do carrinho`);
      if (variant.stock) fix.update.push(update);
      else fix.remove.push(sku);
      continue;
    }
    if (price !== undefined && price !== variant.price) {
      problems.push(`${product.name}: o preço mudou para ${formatPrice(variant.price)}`);
      fix.update.push(update);
      continue;
    }
    const hasChoice = product.variantName && product.variants.length > 1;
    lines.push({ sku, name: product.name, variant: hasChoice ? `${product.variantName}: ${variant.label}` : null, qty, unitPrice: variant.price });
  }
  if (problems.length)
    return { errors, values, cartFix: fix, message: `Atualizamos seu carrinho: ${problems.join("; ")}. Confira o total e confirme de novo.` };

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
  if (values.entrega && shipping.id !== values.entrega) errors.entrega = "A opção de entrega mudou. Confira o CEP e escolha de novo.";
  let address: string | null = null;
  if (shipping.needsAddress) {
    if (!isValidCep(values.cep)) errors.cep = "Informe o CEP com 8 números.";
    if (!values.rua) errors.rua = "Informe a rua.";
    if (!values.numero) errors.numero = "Informe o número (ou “s/n”).";
    if (!values.bairro) errors.bairro = "Informe o bairro.";
    if (!values.cidade) errors.cidade = "Informe a cidade.";
    if (!UFS.includes(values.uf)) errors.uf = "Escolha o estado.";
    address = `${values.rua}, ${values.numero}${values.complemento ? ` (${values.complemento})` : ""} - ${values.bairro}, ${values.cidade} - ${values.uf}, CEP ${formatCep(values.cep)}`;
  }

  // ---------- pagamento ----------
  const method = values.pagamento as PaymentMethod;
  if (!PAYMENTS.includes(method)) errors.pagamento = "Escolha a forma de pagamento.";

  if (Object.keys(errors).length) return { errors, values };

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const base: Omit<Order, "payment"> = {
    id: newOrderId(),
    token: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    customer: { name: values.nome, email: values.email, phone, document: doc },
    shipping: { method: shipping.id, label: shipping.label, price: shipping.price, estimate: shipping.estimate, address },
    lines,
    subtotal,
    total: subtotal + shipping.price,
  };

  let charge: { invoiceUrl: string | null; demo: boolean };
  try {
    charge = await createCharge(base, method);
  } catch (e) {
    console.error("[checkout] Asaas:", e);
    return { errors, values, message: "Não conseguimos gerar a cobrança agora. Nada foi cobrado. Tente de novo em instantes." };
  }

  saveOrder({ ...base, payment: { method, ...charge } });
  redirect(`/pedido-confirmado?pedido=${base.token}`);
}
