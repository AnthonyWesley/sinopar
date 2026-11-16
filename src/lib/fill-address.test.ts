// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { fillAddress } from "./fill-address";

function form(values: Record<string, string> = {}) {
  const f = document.createElement("form");
  f.innerHTML = `<input name="rua"><input name="bairro"><input name="cidade"><select name="uf"><option value=""></option><option>MT</option><option>SP</option></select>`;
  for (const [k, v] of Object.entries(values)) (f.elements.namedItem(k) as HTMLInputElement).value = v;
  return f;
}
const val = (f: HTMLFormElement, k: string) => (f.elements.namedItem(k) as HTMLInputElement).value;
const SINOP = { rua: "Avenida das Itaúbas", bairro: "Setor Comercial", cidade: "Sinop", uf: "MT" };

describe("fillAddress", () => {
  it("preenche os campos vazios e diz quantos preencheu", () => {
    const f = form();
    expect(fillAddress(f, SINOP, null)).toBe(4);
    expect([val(f, "rua"), val(f, "bairro"), val(f, "cidade"), val(f, "uf")]).toEqual(["Avenida das Itaúbas", "Setor Comercial", "Sinop", "MT"]);
  });

  it("não apaga o que o cliente digitou", () => {
    const f = form({ rua: "Rua das Flores" });
    fillAddress(f, SINOP, null);
    expect(val(f, "rua")).toBe("Rua das Flores");
    expect(val(f, "cidade")).toBe("Sinop");
  });

  it("trocando o CEP, troca o que veio do CEP anterior", () => {
    const f = form();
    fillAddress(f, SINOP, null);
    const sp = { rua: "Avenida Paulista", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP" };
    fillAddress(f, sp, SINOP);
    expect([val(f, "rua"), val(f, "cidade"), val(f, "uf")]).toEqual(["Avenida Paulista", "São Paulo", "SP"]);
  });

  it("CEP sem rua (cidade pequena) não limpa a rua digitada nem a anterior", () => {
    const f = form({ rua: "Rua A" });
    fillAddress(f, { rua: "", bairro: "", cidade: "Cláudia", uf: "MT" }, null);
    expect(val(f, "rua")).toBe("Rua A");
    expect(val(f, "cidade")).toBe("Cláudia");
  });
});
