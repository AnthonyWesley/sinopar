import type { OrderStatus } from "./server/orders-repo";

// Etapas do pedido no painel: nomes em português, ordem das abas e quais botões cada etapa tem.
// Sem Next e sem banco, para servir à página, ao componente cliente e à Server Action.

export const STATUS_LABEL: Record<OrderStatus, string> = {
  aguardando: "Aguardando pagamento",
  pago: "Pago",
  separado: "Separado",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  pago_sem_estoque: "Pago sem estoque",
};

/** Ordem das abas da lista de pedidos. */
export const STATUS_TABS: OrderStatus[] = [
  "aguardando",
  "pago",
  "separado",
  "enviado",
  "entregue",
  "cancelado",
  "pago_sem_estoque",
];

export const isOrderStatus = (v: string): v is OrderStatus => (STATUS_TABS as string[]).includes(v);

const STAGES: OrderStatus[] = ["pago", "separado", "enviado", "entregue"];

/** Próxima etapa (pago → separado → enviado → entregue), ou null. */
export function nextStage(s: OrderStatus): OrderStatus | null {
  const i = STAGES.indexOf(s);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

/** Etapa anterior (entregue → enviado → separado → pago), ou null. */
export function previousStage(s: OrderStatus): OrderStatus | null {
  const i = STAGES.indexOf(s);
  return i > 0 ? STAGES[i - 1] : null;
}

/** Depois de pago (e ainda com as unidades baixadas): cancelar pergunta se elas voltam ao estoque. */
export const cancelAsksRestock = (s: OrderStatus) => s === "pago" || s === "separado" || s === "enviado";

/** "Marcar como pago" só existe no pedido de demonstração ou com o Asaas desligado. */
export const canMarkPaid = (o: { status: OrderStatus; demo: boolean }, asaasEnabled: boolean) =>
  o.status === "aguardando" && (o.demo || !asaasEnabled);

export type OrderButton = "markPaid" | "advance" | "back" | "cancel" | "fulfill" | "cancelRefund";

/** Botões de cada etapa, na ordem em que aparecem. */
export function orderButtons(o: { status: OrderStatus; demo: boolean }, asaasEnabled: boolean): OrderButton[] {
  switch (o.status) {
    case "aguardando":
      return canMarkPaid(o, asaasEnabled) ? ["markPaid", "cancel"] : ["cancel"];
    case "pago":
      return ["advance", "cancel"];
    case "separado":
    case "enviado":
      return ["advance", "back", "cancel"];
    case "entregue":
      return ["back"];
    case "pago_sem_estoque":
      return ["fulfill", "cancelRefund"];
    case "cancelado":
      return [];
  }
}

/** Texto do botão de avançar para a etapa `to`. */
export const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  separado: "Marcar como separado",
  enviado: "Marcar como enviado",
  entregue: "Marcar como entregue",
};

/** Texto do botão de voltar para a etapa `to`. */
export const BACK_LABEL: Partial<Record<OrderStatus, string>> = {
  pago: "Voltar para pago",
  separado: "Voltar para separado",
  enviado: "Voltar para enviado",
};
