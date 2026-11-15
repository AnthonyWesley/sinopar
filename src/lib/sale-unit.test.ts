import { describe, expect, it } from "vitest";
import { formatSaleUnit, parseSaleUnit } from "./sale-unit";

describe("unidade de venda", () => {
  it("lê os formatos do catálogo como tipo + quantidade", () => {
    expect(parseSaleUnit("Unidade")).toEqual({ kind: "Unidade", count: "", other: "" });
    expect(parseSaleUnit("Jogo com 5")).toEqual({ kind: "Jogo", count: "5", other: "" });
    expect(parseSaleUnit("Kit com 43")).toEqual({ kind: "Kit", count: "43", other: "" });
    expect(parseSaleUnit("Jogo")).toEqual({ kind: "Jogo", count: "", other: "" });
    expect(parseSaleUnit("caixa com 100")).toEqual({ kind: "Caixa", count: "100", other: "" });
  });

  it("texto fora do padrão vira Outro, sem perder o que estava escrito", () => {
    expect(parseSaleUnit("Rolo de 50 m")).toEqual({ kind: "Outro", count: "", other: "Rolo de 50 m" });
    expect(parseSaleUnit("Jogo c/ 5")).toEqual({ kind: "Outro", count: "", other: "Jogo c/ 5" });
  });

  it("vazio começa como Unidade", () => {
    expect(parseSaleUnit("")).toEqual({ kind: "Unidade", count: "", other: "" });
  });

  it("monta o texto mostrado na loja", () => {
    expect(formatSaleUnit({ kind: "Unidade", count: "9", other: "" })).toBe("Unidade");
    expect(formatSaleUnit({ kind: "Jogo", count: "5", other: "" })).toBe("Jogo com 5");
    expect(formatSaleUnit({ kind: "Par", count: "", other: "" })).toBe("Par");
    expect(formatSaleUnit({ kind: "Kit", count: " 12 ", other: "" })).toBe("Kit com 12");
    expect(formatSaleUnit({ kind: "Outro", count: "", other: "  Rolo de 50 m " })).toBe("Rolo de 50 m");
  });

  it("ler e montar de novo devolve o mesmo texto", () => {
    for (const t of ["Unidade", "Jogo com 7", "Kit", "Rolo de 50 m"]) expect(formatSaleUnit(parseSaleUnit(t))).toBe(t);
  });
});
