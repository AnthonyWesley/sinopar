"use client";

import { useActionState, useState } from "react";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, Field } from "@/components/admin/field";
import { FormError } from "@/components/admin/form-error";
import { SubmitButton } from "@/components/admin/submit-button";
import { Toast } from "@/components/admin/toast";
import {
  advanceStage,
  backStage,
  cancelOrderAction,
  fulfillOutOfStockAction,
  markPaidDemo,
  saveTracking,
  type OrderActionState,
} from "@/lib/actions/orders";
import {
  ADVANCE_LABEL,
  BACK_LABEL,
  cancelAsksRestock,
  nextStage,
  previousStage,
  type OrderButton,
} from "@/lib/order-status";
import type { OrderStatus } from "@/lib/server/orders-repo";

const EMPTY: OrderActionState = {};
const OPS = {
  markPaid: markPaidDemo,
  advance: advanceStage,
  back: backStage,
  cancel: cancelOrderAction,
  fulfill: fulfillOutOfStockAction,
  tracking: saveTracking,
} as const;
type Op = keyof typeof OPS;

const run = async (prev: OrderActionState, form: FormData): Promise<OrderActionState> => {
  const op = form.get("op") as Op;
  const action = OPS[op];
  if (!action) return { error: "Ação desconhecida." };
  try {
    return await action(prev, form);
  } catch {
    return { error: "Não foi possível falar com o servidor. Tente de novo." };
  }
};

const WIDE = "w-full sm:w-auto";

/**
 * Botões da etapa do pedido (a lista vem do servidor: `orderButtons`). Cancelar abre uma
 * confirmação; depois de pago, pergunta se as unidades voltam para o estoque.
 * O estado fica entre etapas (sem `key`), para o aviso de sucesso aparecer depois do refresh.
 */
export function OrderActions({
  orderId,
  status,
  buttons,
  trackingCode,
}: {
  orderId: string;
  status: OrderStatus;
  buttons: OrderButton[];
  trackingCode: string | null;
}) {
  const [state, dispatch] = useActionState(run, EMPTY);
  const [confirming, setConfirming] = useState(false);
  const [tracking, setTracking] = useState(trackingCode ?? "");
  // mudou de etapa (resposta da action ou outra pessoa): fecha a confirmação e pega o código salvo
  const [seen, setSeen] = useState({ status, trackingCode });
  if (seen.status !== status || seen.trackingCode !== trackingCode) {
    setSeen({ status, trackingCode });
    setConfirming(false);
    setTracking(trackingCode ?? "");
  }
  const next = nextStage(status);
  const prev = previousStage(status);
  const cancelButton = buttons.includes("cancelRefund") ? "cancelRefund" : buttons.includes("cancel") ? "cancel" : null;
  const showTrackingEdit = status === "enviado" || status === "entregue";

  const hidden = (op: Op) => (
    <>
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="from" value={status} />
    </>
  );

  // cancelado: sem botões, mas o aviso do cancelamento que acabou de acontecer ainda aparece
  if (buttons.length === 0 && !showTrackingEdit) {
    return (
      <>
        <p className="text-muted">Pedido cancelado. Não há mais nada a fazer nele.</p>
        <Toast message={state.message} token={state} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <FormError message={state.error} />

      {status === "separado" && buttons.includes("advance") ? (
        <form action={dispatch} className="space-y-3">
          {hidden("advance")}
          <Field
            label="Código de rastreio"
            name="tracking"
            optional
            autoComplete="off"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            help="Se já tiver o código dos Correios ou da transportadora."
          />
          <SubmitButton className={`${BTN_PRIMARY} ${WIDE}`}>{ADVANCE_LABEL.enviado}</SubmitButton>
        </form>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {buttons.includes("markPaid") ? (
          <form action={dispatch}>
            {hidden("markPaid")}
            <SubmitButton className={`${BTN_PRIMARY} ${WIDE}`}>Marcar como pago</SubmitButton>
          </form>
        ) : null}
        {buttons.includes("advance") && status !== "separado" && next ? (
          <form action={dispatch}>
            {hidden("advance")}
            <SubmitButton className={`${BTN_PRIMARY} ${WIDE}`}>{ADVANCE_LABEL[next]}</SubmitButton>
          </form>
        ) : null}
        {buttons.includes("fulfill") ? (
          <form action={dispatch}>
            {hidden("fulfill")}
            <SubmitButton className={`${BTN_PRIMARY} ${WIDE}`}>Atender</SubmitButton>
          </form>
        ) : null}
        {buttons.includes("back") && prev ? (
          <form action={dispatch}>
            {hidden("back")}
            <SubmitButton className={`${BTN_SECONDARY} ${WIDE}`}>{BACK_LABEL[prev]}</SubmitButton>
          </form>
        ) : null}
        {cancelButton && !confirming ? (
          <button type="button" className={`${BTN_DANGER} ${WIDE}`} onClick={() => setConfirming(true)}>
            {cancelButton === "cancelRefund" ? "Cancelar e estornar" : "Cancelar"}
          </button>
        ) : null}
      </div>

      {cancelButton && confirming ? (
        <form action={dispatch} className="space-y-3 rounded-2xl border border-error/40 bg-error-soft/40 p-4">
          {hidden("cancel")}
          {cancelAsksRestock(status) ? (
            <fieldset className="space-y-2">
              <legend className="font-semibold">As unidades voltam para o estoque?</legend>
              <div className="flex gap-2">
                {[
                  ["sim", "Sim"],
                  ["nao", "Não"],
                ].map(([value, label]) => (
                  <label key={value} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-white px-4 font-medium">
                    <input type="radio" name="restock" value={value} required className="size-5" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="font-semibold">
              {status === "aguardando"
                ? "Cancelar este pedido? As unidades reservadas voltam a ficar disponíveis."
                : "Cancelar este pedido? O estoque não muda, porque nada foi tirado dele."}
            </p>
          )}
          {status !== "aguardando" ? <p className="text-sm">O estorno do dinheiro é feito no painel do Asaas.</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitButton className={`${BTN_DANGER} ${WIDE}`}>Confirmar cancelamento</SubmitButton>
            <button type="button" className={`${BTN_SECONDARY} ${WIDE}`} onClick={() => setConfirming(false)}>
              Não cancelar
            </button>
          </div>
        </form>
      ) : null}

      {showTrackingEdit ? (
        <form action={dispatch} className="space-y-3 border-t border-line pt-4">
          {hidden("tracking")}
          <Field
            label="Código de rastreio"
            name="tracking"
            autoComplete="off"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />
          <SubmitButton className={`${BTN_SECONDARY} ${WIDE}`}>Salvar código</SubmitButton>
        </form>
      ) : null}

      <Toast message={state.message} token={state} />
    </div>
  );
}
