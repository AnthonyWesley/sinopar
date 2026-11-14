"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { BTN_DANGER, BTN_SECONDARY } from "@/components/admin/field";
import { FormError } from "@/components/admin/form-error";
import { SubmitButton } from "@/components/admin/submit-button";
import { Toast } from "@/components/admin/toast";
import { deleteProduct, setProductStatus, type ProductFormState } from "@/lib/actions/products";
import type { ProductStatus } from "@/lib/server/catalog-repo";

const EMPTY: ProductFormState = {};

/** Pausar/ativar e excluir (com confirmação). Produto com histórico é pausado em vez de excluído. */
export function ProductActions({ id, name, status }: { id: number; name: string; status: ProductStatus }) {
  const [statusState, statusAction] = useActionState(setProductStatus, EMPTY);
  const [deleteState, deleteAction] = useActionState(deleteProduct, EMPTY);
  const [confirming, setConfirming] = useState(false);
  // a confirmação fecha quando a exclusão responde (pausado ou erro; excluído redireciona)
  const [seen, setSeen] = useState(deleteState);
  if (deleteState !== seen) {
    setSeen(deleteState);
    setConfirming(false);
  }

  return (
    <div className="space-y-3">
      <FormError message={statusState.error ?? deleteState.error} />
      <div className="grid grid-cols-1 gap-2 sm:flex">
        <form action={statusAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={status === "ativo" ? "pausado" : "ativo"} />
          <SubmitButton className={`${BTN_SECONDARY} w-full sm:w-auto`}>
            {status === "ativo" ? (
              <>
                <Pause className="size-5" aria-hidden="true" /> Pausar (tirar da loja)
              </>
            ) : (
              <>
                <Play className="size-5" aria-hidden="true" /> Ativar na loja
              </>
            )}
          </SubmitButton>
        </form>
        <button type="button" className={BTN_DANGER} aria-expanded={confirming} onClick={() => setConfirming(!confirming)}>
          <Trash2 className="size-5" aria-hidden="true" /> Excluir
        </button>
      </div>
      {confirming ? (
        <form
          action={deleteAction}
          className="space-y-3 rounded-xl border border-line bg-surface-2 p-4"
        >
          <input type="hidden" name="id" value={id} />
          <p>
            Excluir <strong className="break-words">{name}</strong>? Se ele já teve pedidos ou movimentações de estoque, ele só será pausado,
            para não perder o histórico.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:flex">
            <SubmitButton className={`${BTN_DANGER} w-full sm:w-auto`}>Sim, excluir</SubmitButton>
            <button type="button" className={BTN_SECONDARY} onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
      <Toast message={statusState.message} token={statusState} />
      <Toast message={deleteState.message} token={deleteState} />
    </div>
  );
}
