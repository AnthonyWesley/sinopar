"use client";

import { useSyncExternalStore } from "react";

// Carrinho no navegador (localStorage), sem conta. Cada linha guarda o que a tela precisa
// mostrar; preço e estoque são conferidos de novo no servidor ao finalizar o pedido.

export type CartLine = {
  sku: string;
  slug: string;
  name: string;
  variant: string | null;
  image: string;
  unitPrice: number;
  compareAt?: number;
  maxQty: number;
  qty: number;
};

/** shipping = id da opção escolhida; cep = último CEP calculado */
type CartState = { lines: CartLine[]; shipping: string; cep: string | null; drawerOpen: boolean; lastAdded: string | null };

const KEY = "sinopar-carrinho-v1";
const empty: CartState = { lines: [], shipping: "retirada", cep: null, drawerOpen: false, lastAdded: null };

let state: CartState = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (saved && Array.isArray(saved.lines)) state = { ...empty, lines: saved.lines, shipping: saved.shipping ?? "retirada", cep: saved.cep ?? null };
  } catch {
    // armazenamento bloqueado ou corrompido: começa vazio
  }
}

function set(next: Partial<CartState>) {
  state = { ...state, ...next };
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ lines: state.lines, shipping: state.shipping, cep: state.cep }));
  } catch {
    // modo privado: o carrinho vale só nesta aba
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  return useSyncExternalStore(
    subscribe,
    () => (load(), state),
    () => empty,
  );
}

export const cart = {
  add(line: Omit<CartLine, "qty">, qty: number) {
    const existing = state.lines.find((l) => l.sku === line.sku);
    const lines = existing
      ? state.lines.map((l) => (l.sku === line.sku ? { ...l, ...line, qty: Math.min(l.qty + qty, line.maxQty) } : l))
      : [...state.lines, { ...line, qty: Math.min(qty, line.maxQty) }];
    set({ lines, drawerOpen: true, lastAdded: line.sku });
  },
  setQty(sku: string, qty: number) {
    set({ lines: state.lines.map((l) => (l.sku === sku ? { ...l, qty: Math.max(1, Math.min(qty, l.maxQty)) } : l)) });
  },
  remove(sku: string) {
    set({ lines: state.lines.filter((l) => l.sku !== sku) });
  },
  clear() {
    set({ lines: [], lastAdded: null });
  },
  /** aplica as correções que o servidor mandou (produto removido, preço ou estoque novos) */
  reconcile(fix: { remove: string[]; update: { sku: string; unitPrice: number; compareAt?: number; maxQty: number }[] }) {
    const lines = state.lines
      .filter((l) => !fix.remove.includes(l.sku))
      .map((l) => {
        const u = fix.update.find((x) => x.sku === l.sku);
        return u ? { ...l, unitPrice: u.unitPrice, compareAt: u.compareAt, maxQty: u.maxQty, qty: Math.min(l.qty, u.maxQty) } : l;
      });
    set({ lines });
  },
  setShipping(shipping: string) {
    set({ shipping });
  },
  setCep(cep: string | null) {
    set({ cep });
  },
  open() {
    set({ drawerOpen: true, lastAdded: null });
  },
  close() {
    set({ drawerOpen: false });
  },
};

export function cartTotals(lines: CartLine[]) {
  const items = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  return { items, subtotal };
}
