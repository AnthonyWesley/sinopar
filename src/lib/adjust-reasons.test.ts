import { describe, expect, it } from "vitest";
import { ADJUST_REASONS, adjustReasonText } from "./adjust-reasons";

describe("motivo do ajuste", () => {
  it("tem as opções fixas e termina em Outro", () => {
    expect(ADJUST_REASONS).toEqual(["Contagem", "Avaria", "Perda ou extravio", "Uso interno", "Devolução ao fornecedor", "Outro"]);
  });
  it("opção fixa vira o próprio texto; Outro usa o que foi digitado", () => {
    expect(adjustReasonText("Avaria", "ignorado")).toBe("Avaria");
    expect(adjustReasonText("Outro", "  brinde para cliente ")).toBe("brinde para cliente");
  });
  it("sem escolha, ou Outro sem texto, fica vazio (o servidor recusa)", () => {
    expect(adjustReasonText("", "")).toBe("");
    expect(adjustReasonText("Outro", "   ")).toBe("");
  });
});
