import "server-only";
import type { Customer, PaymentMethod } from "./server/orders-repo";

// Integração com o Asaas (API v3): cria o cliente e a cobrança e devolve a fatura
// (invoiceUrl), onde o comprador paga com Pix ou cartão de crédito na página segura do Asaas.
// Assim o site nunca recebe dados de cartão.
// Sem ASAAS_API_KEY o checkout roda em modo demonstração e não chama nada.
// A CONFIRMAR com a Sinopar: conta Asaas, vencimento do boleto (aqui: 3 dias) e se já
// existe integração/webhook em uso — se existir, este arquivo deve seguir o contrato dela.

const apiUrl = process.env.ASAAS_API_URL ?? "https://sandbox.asaas.com/api/v3";
const apiKey = process.env.ASAAS_API_KEY;

export const asaasEnabled = Boolean(apiKey);

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey!, "User-Agent": "sinopar-ferramentas" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.errors?.[0]?.description ?? `Asaas respondeu ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

function dueDate(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export type Charge = { asaasPaymentId: string | null; invoiceUrl: string | null; demo: boolean };

/** o que a cobrança precisa do pedido; `total` em centavos */
export type ChargeOrder = { id: string; customer: Customer; total: number };

export async function createCharge(order: ChargeOrder, method: PaymentMethod): Promise<Charge> {
  if (!apiKey) return { asaasPaymentId: null, invoiceUrl: null, demo: true };

  const customer = await call<{ id: string }>("/customers", {
    name: order.customer.name,
    cpfCnpj: order.customer.document,
    email: order.customer.email,
    mobilePhone: order.customer.phone,
    externalReference: order.id,
  });
  const payment = await call<{ id: string; invoiceUrl: string }>("/payments", {
    customer: customer.id,
    billingType: method,
    value: order.total / 100,
    dueDate: dueDate(3),
    description: `Pedido ${order.id} - Fixa Store`,
    externalReference: order.id,
  });
  return { asaasPaymentId: payment.id, invoiceUrl: payment.invoiceUrl, demo: false };
}
