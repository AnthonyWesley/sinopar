"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { BTN_DANGER, BTN_SECONDARY } from "@/components/admin/field";
import { FormError } from "@/components/admin/form-error";
import { SubmitButton } from "@/components/admin/submit-button";
import { deleteBannerAction, moveBannerAction, type BannerFormState } from "@/lib/actions/banners";

const EMPTY: BannerFormState = {};

/** Subir/descer na ordem do carrossel. */
export function MoveButtons({ id, title, first, last }: { id: number; title: string; first: boolean; last: boolean }) {
  const [state, action] = useActionState(moveBannerAction, EMPTY);
  return (
    <div className="space-y-1">
      <form action={action} className="flex gap-1">
        <input type="hidden" name="id" value={id} />
        <button type="submit" name="dir" value="up" disabled={first} className={`${BTN_SECONDARY} size-11 px-0`} aria-label={`Subir ${title}`} title="Subir">
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
        <button type="submit" name="dir" value="down" disabled={last} className={`${BTN_SECONDARY} size-11 px-0`} aria-label={`Descer ${title}`} title="Descer">
          <ArrowDown className="size-5" aria-hidden="true" />
        </button>
      </form>
      <FormError message={state.error} />
    </div>
  );
}

/** Excluir com confirmação na própria página (sem janela do navegador). */
export function DeleteBanner({ id, title }: { id: number; title: string }) {
  const [state, action] = useActionState(deleteBannerAction, EMPTY);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="space-y-3">
      <FormError message={state.error} />
      <button type="button" className={`${BTN_DANGER} w-full sm:w-auto`} aria-expanded={confirming} onClick={() => setConfirming(!confirming)}>
        <Trash2 className="size-5" aria-hidden="true" /> Excluir banner
      </button>
      {confirming ? (
        <form action={action} className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
          <input type="hidden" name="id" value={id} />
          <p>
            Excluir <strong className="break-words">{title}</strong>? As imagens também são apagadas. Para só tirar da loja, desmarque
            &quot;Ativo&quot;.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:flex">
            <SubmitButton className={`${BTN_DANGER} w-full sm:w-auto`}>Sim, excluir</SubmitButton>
            <button type="button" className={BTN_SECONDARY} onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
