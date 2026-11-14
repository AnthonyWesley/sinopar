"use client";

import { useEffect } from "react";
import { Toast } from "./toast";

/**
 * Aviso que chega pela URL depois de um redirect (ex.: `?criado=1`). Mostra o Toast e tira o
 * parâmetro da barra de endereço com history.replaceState (integrado ao roteador do Next, sem
 * nova requisição): recarregar a página ou copiar o link não repete o aviso.
 */
export function FlashToast({ message, param }: { message?: string; param: string }) {
  useEffect(() => {
    if (!message) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(param)) return;
    url.searchParams.delete(param);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [message, param]);

  return <Toast message={message} token={message} />;
}
