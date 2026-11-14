import "server-only";
import { getDb } from "./server/db";
import { getOrderByToken as getOrderByTokenFrom, type OrderRecord } from "./server/orders-repo";

// Pedidos ficam no banco (src/lib/server/orders-repo.ts para ler, stock.ts para gravar).
// Aqui ficam os atalhos que a loja usa.

export type { PaymentMethod, OrderRecord } from "./server/orders-repo";

/**
 * Pedido pela chave secreta do link da confirmação: o número curto é fácil de adivinhar e a
 * página mostra dados pessoais.
 */
export function getOrderByToken(token: string): OrderRecord | null {
  return getOrderByTokenFrom(getDb(), token);
}

/** número curto para a pessoa anotar */
export function newOrderId() {
  return `SP-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}
