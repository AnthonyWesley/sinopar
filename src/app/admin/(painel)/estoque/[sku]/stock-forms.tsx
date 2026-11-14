"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Field } from "@/components/admin/field";
import { FormError } from "@/components/admin/form-error";
import { Panel } from "@/components/admin/panel";
import { SubmitButton } from "@/components/admin/submit-button";
import { Toast } from "@/components/admin/toast";
import { addStockAction, setStockAction, type StockFormState } from "@/lib/actions/stock";

const EMPTY: StockFormState = {};

/** Atualiza a tela (quantidades e histórico) quando uma action responde com sucesso. */
function useRefreshOnSuccess(state: StockFormState) {
  const router = useRouter();
  useEffect(() => {
    if (state.message) router.refresh();
  }, [state, router]);
}

/** Entrada (compra, reposição) e ajuste por contagem de uma variação. */
export function StockForms({ sku, stock, reserved }: { sku: string; stock: number; reserved: number }) {
  const [addState, addAction] = useActionState(addStockAction, EMPTY);
  const [setState, setAction] = useActionState(setStockAction, EMPTY);
  const [qty, setQty] = useState("");
  const [addReason, setAddReason] = useState("");
  const [counted, setCounted] = useState("");
  const [setReason, setSetReason] = useState("");
  // depois de uma resposta com sucesso o formulário esvazia; com erro, mantém o que foi digitado
  const [seenAdd, setSeenAdd] = useState(addState);
  if (addState !== seenAdd) {
    setSeenAdd(addState);
    if (addState.message) {
      setQty("");
      setAddReason("");
    }
  }
  const [seenSet, setSeenSet] = useState(setState);
  if (setState !== seenSet) {
    setSeenSet(setState);
    if (setState.message) {
      setCounted("");
      setSetReason("");
    }
  }
  useRefreshOnSuccess(addState);
  useRefreshOnSuccess(setState);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Panel>
        <form action={addAction} className="space-y-4">
          <input type="hidden" name="sku" value={sku} />
          <h2 className="text-lg font-semibold">Entrada</h2>
          <p className="text-sm text-muted">Chegou mercadoria? Informe quantas unidades entraram. Elas são somadas ao estoque.</p>
          <FormError message={addState.error} />
          <Field label="Unidades que entraram" name="qty" type="text" inputMode="numeric" autoComplete="off" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Field label="Motivo" name="reason" optional help="Por exemplo, o número da nota." autoComplete="off" value={addReason} onChange={(e) => setAddReason(e.target.value)} />
          <SubmitButton className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 text-base font-semibold text-white hover:bg-ink-soft disabled:opacity-60 sm:w-auto">
            Registrar entrada
          </SubmitButton>
          <Toast message={addState.message} token={addState} />
        </form>
      </Panel>
      <Panel>
        <form action={setAction} className="space-y-4">
          <input type="hidden" name="sku" value={sku} />
          <h2 className="text-lg font-semibold">Ajuste por contagem</h2>
          <p className="text-sm text-muted">
            Contou diferente do sistema? Informe o total que existe agora (hoje: {stock}
            {reserved > 0 ? `, com ${reserved} reservadas em pedidos não pagos` : ""}).
          </p>
          <FormError message={setState.error} />
          <Field label="Total contado" name="counted" type="text" inputMode="numeric" autoComplete="off" value={counted} onChange={(e) => setCounted(e.target.value)} />
          <Field label="Motivo do ajuste" name="reason" help="Obrigatório. Por exemplo, contagem do mês ou item avariado." autoComplete="off" value={setReason} onChange={(e) => setSetReason(e.target.value)} />
          <SubmitButton className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-base font-medium text-ink hover:bg-surface-2 disabled:opacity-60 sm:w-auto">
            Ajustar estoque
          </SubmitButton>
          <Toast message={setState.message} token={setState} />
        </form>
      </Panel>
    </div>
  );
}
