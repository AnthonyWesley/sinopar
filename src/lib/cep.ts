import { onlyCepDigits, isValidCep, UFS } from "./shipping";

// Endereço pelo CEP (ViaCEP, gratuito, sem chave). Roda no navegador do cliente durante o checkout
// e só preenche: se a consulta falhar, o cliente digita o endereço como antes.

export type CepAddress = { rua: string; bairro: string; cidade: string; uf: string };

const TIMEOUT_MS = 5000;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function lookupCep(cep: string, fetchImpl: typeof fetch = fetch): Promise<CepAddress | null> {
  if (!isValidCep(cep)) return null;
  try {
    const res = await fetchImpl(`https://viacep.com.br/ws/${onlyCepDigits(cep)}/json/`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (data.erro) return null;
    const uf = str(data.uf).toUpperCase();
    const cidade = str(data.localidade);
    if (!UFS.includes(uf) || !cidade) return null;
    return { rua: str(data.logradouro), bairro: str(data.bairro), cidade, uf };
  } catch {
    return null;
  }
}
