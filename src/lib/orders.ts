import "server-only";

// Pedidos em memória: somem quando o servidor reinicia. Serve para a demonstração; com o
// backend real, cada pedido vai para o banco (e para o ERP) antes de cobrar.

export type PaymentMethod = "PIX" | "BOLETO" | "CREDIT_CARD";

export type Order = {
  /** número curto para a pessoa anotar */
  id: string;
  /** chave secreta do link da confirmação: o número curto é fácil de adivinhar e a página mostra dados pessoais */
  token: string;
  createdAt: string;
  customer: { name: string; email: string; phone: string; document: string };
  shipping: { method: string; label: string; price: number; estimate: string; address: string | null };
  payment: { method: PaymentMethod; invoiceUrl: string | null; demo: boolean };
  lines: { sku: string; name: string; variant: string | null; qty: number; unitPrice: number }[];
  subtotal: number;
  total: number;
};

const store: Map<string, Order> = ((globalThis as { __sinoparOrders?: Map<string, Order> }).__sinoparOrders ??= new Map<string, Order>());

export function saveOrder(order: Order) {
  store.set(order.token, order);
}

export function getOrder(token: string) {
  return store.get(token) ?? null;
}

export function newOrderId() {
  return `SP-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}
