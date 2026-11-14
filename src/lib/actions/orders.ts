"use server";

import { refresh, updateTag } from "next/cache";
import { asaasEnabled } from "../asaas";
import { productTag, TAG_CATALOG } from "../cache-tags";
import { ADVANCE_LABEL, cancelAsksRestock, canMarkPaid, isOrderStatus, nextStage, previousStage, STATUS_LABEL } from "../order-status";
import { getDb } from "../server/db";
import { getOrderById, type OrderRecord, type OrderStatus } from "../server/orders-repo";
import { cancelOrder, confirmPayment, fulfillOutOfStock, moveStage, setTracking } from "../server/stock";
import { authorizeAction, type AuthUser } from "../session";

// Server Actions da tela do pedido (Responsável e funcionário). Campos: orderId, from (a etapa
// que a tela mostrava, para dois cliques ou duas pessoas não moverem o pedido duas vezes),
// tracking (opcional, ao enviar) e restock ("sim"/"nao", ao cancelar depois de pago).
// Formato para useActionState. Erro de regra vira mensagem; nunca lança.

export type OrderActionState = { error?: string; message?: string };

const ASAAS_REFUND = "O estorno do dinheiro é feito no painel do Asaas.";
const STALE = "O pedido mudou de etapa. Atualize a página.";

const text = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};

function invalidate(slugs: string[]) {
  if (slugs.length === 0) return;
  updateTag(TAG_CATALOG);
  for (const slug of slugs) updateTag(productTag(slug));
}

/** Mensagens das regras (stock.ts) que já servem para a tela; o resto vira uma genérica. */
function friendly(e: unknown, fallback: string): string {
  const m = e instanceof Error ? e.message : "";
  if (/não encontrad/.test(m) && /^Pedido/.test(m)) return "Pedido não encontrado.";
  if (/^Não dá para passar/.test(m)) return STALE;
  if (
    m === "Pedido entregue não pode ser cancelado." ||
    m === "Pedido já está cancelado." ||
    m === "O código de rastreio é informado ao marcar como enviado." ||
    m === "Informe o código de rastreio."
  ) {
    return m;
  }
  return fallback;
}

type Ctx = { user: AuthUser; order: OrderRecord };

/**
 * Sessão, pedido e etapa esperada. Devolve o contexto ou o estado de erro para a tela.
 * `from` vazio pula a checagem de etapa.
 */
async function load(form: FormData): Promise<Ctx | OrderActionState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const order = getOrderById(getDb(), text(form, "orderId"));
  if (!order) return { error: "Pedido não encontrado." };
  const from = text(form, "from");
  if (from && (!isOrderStatus(from) || from !== order.status)) return { error: STALE };
  return { user: auth.user, order };
}

const isCtx = (x: Ctx | OrderActionState): x is Ctx => "order" in x;

function move(ctx: Ctx, to: OrderStatus | null, tracking?: string): void {
  if (!to) throw new Error(`Não dá para passar o pedido de ${ctx.order.status}.`);
  moveStage(getDb(), ctx.order.id, to, ctx.user.id, new Date(), tracking);
}

export async function advanceStage(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  const ctx = await load(form);
  if (!isCtx(ctx)) return ctx;
  const to = nextStage(ctx.order.status);
  try {
    move(ctx, to, to === "enviado" ? text(form, "tracking") : undefined);
  } catch (e) {
    return { error: friendly(e, "Não foi possível mudar a etapa. Tente de novo.") };
  }
  refresh();
  return { message: `Pedido ${ADVANCE_LABEL[to!]!.replace(/^Marcar/, "marcado")}.` };
}

export async function backStage(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  const ctx = await load(form);
  if (!isCtx(ctx)) return ctx;
  const to = previousStage(ctx.order.status);
  try {
    move(ctx, to);
  } catch (e) {
    return { error: friendly(e, "Não foi possível mudar a etapa. Tente de novo.") };
  }
  refresh();
  return { message: `Pedido voltou para ${STATUS_LABEL[to!].toLowerCase()}.` };
}

export async function cancelOrderAction(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  const ctx = await load(form);
  if (!isCtx(ctx)) return ctx;
  const { status } = ctx.order;
  const answer = text(form, "restock");
  if (cancelAsksRestock(status) && answer !== "sim" && answer !== "nao") {
    return { error: "Responda se as unidades voltam para o estoque." };
  }
  try {
    const r = cancelOrder(
      getDb(), ctx.order.id,
      { restock: answer === "sim", userId: ctx.user.id, reason: "Cancelado no painel" },
      new Date(),
    );
    invalidate(r.slugs);
  } catch (e) {
    return { error: friendly(e, "Não foi possível cancelar o pedido. Tente de novo.") };
  }
  refresh();
  const paid = cancelAsksRestock(status) || status === "pago_sem_estoque";
  return { message: paid ? `Pedido cancelado. ${ASAAS_REFUND}` : "Pedido cancelado." };
}

export async function fulfillOutOfStockAction(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  const ctx = await load(form);
  if (!isCtx(ctx)) return ctx;
  try {
    const r = fulfillOutOfStock(getDb(), ctx.order.id, ctx.user.id, new Date());
    if (!r.ok) {
      const list = r.shortages.map((s) => `${s.sku} (disponível ${Math.max(0, s.available)})`).join(", ");
      return { error: `Ainda falta estoque: ${list}.` };
    }
    invalidate(r.slugs);
  } catch (e) {
    return { error: friendly(e, "Não foi possível atender o pedido. Tente de novo.") };
  }
  refresh();
  return { message: "Pedido atendido e passado para pago." };
}

export async function markPaidDemo(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  const ctx = await load(form);
  if (!isCtx(ctx)) return ctx;
  const { order } = ctx;
  if (!canMarkPaid({ status: order.status, demo: order.payment.demo }, asaasEnabled)) {
    if (order.status !== "aguardando") return { error: STALE };
    return { error: "Com o Asaas ligado, o pagamento só é confirmado pelo aviso do Asaas." };
  }
  try {
    const r = confirmPayment(getDb(), order.id, null, new Date(), "MANUAL_DEMO", {
      userId: ctx.user.id,
      note: "Marcado como pago no painel (demonstração)",
    });
    if (r.status !== "pago") return { error: STALE };
    invalidate(r.slugs);
  } catch (e) {
    return { error: friendly(e, "Não foi possível marcar como pago. Tente de novo.") };
  }
  refresh();
  return { message: "Pedido marcado como pago." };
}

export async function saveTracking(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  const ctx = await load(form);
  if (!isCtx(ctx)) return ctx;
  try {
    setTracking(getDb(), ctx.order.id, text(form, "tracking"), ctx.user.id, new Date());
  } catch (e) {
    return { error: friendly(e, "Não foi possível salvar o código. Tente de novo.") };
  }
  refresh();
  return { message: "Código de rastreio salvo." };
}
