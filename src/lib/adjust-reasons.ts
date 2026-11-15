// Motivos do ajuste por contagem. Lista fixa para o histórico ficar legível; "Outro" abre um texto.

export const ADJUST_REASONS = ["Contagem", "Avaria", "Perda ou extravio", "Uso interno", "Devolução ao fornecedor", "Outro"] as const;

/** Texto gravado no histórico. Vazio quando falta escolher (o servidor recusa motivo vazio). */
export function adjustReasonText(choice: string, other: string): string {
  if (choice === "Outro") return other.trim();
  return choice.trim();
}
