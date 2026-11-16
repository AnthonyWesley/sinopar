import type { CepAddress } from "./cep";

const KEYS = ["rua", "bairro", "cidade", "uf"] as const;

/**
 * Coloca no formulário o endereço que veio do CEP. Só mexe em campo vazio ou que ainda tem o que
 * veio do CEP anterior (`previous`): o que o cliente digitou fica. Devolve quantos campos preencheu.
 */
export function fillAddress(form: HTMLFormElement, address: CepAddress, previous: CepAddress | null): number {
  let filled = 0;
  for (const key of KEYS) {
    const el = form.elements.namedItem(key);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) continue;
    const next = address[key];
    if (!next) continue;
    const current = el.value.trim();
    if (current && current !== previous?.[key]) continue;
    el.value = next;
    filled++;
  }
  return filled;
}
