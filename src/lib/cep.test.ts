import { describe, it, expect, vi } from "vitest";
import { lookupCep } from "./cep";

const ok = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

describe("lookupCep", () => {
  it("devolve rua, bairro, cidade e UF do ViaCEP", async () => {
    const f = ok({ cep: "78550-000", logradouro: "Avenida das Itaúbas", bairro: "Setor Comercial", localidade: "Sinop", uf: "MT" });
    expect(await lookupCep("78550-000", f)).toEqual({ rua: "Avenida das Itaúbas", bairro: "Setor Comercial", cidade: "Sinop", uf: "MT" });
    expect(f).toHaveBeenCalledWith("https://viacep.com.br/ws/78550000/json/", expect.objectContaining({ signal: expect.anything() }));
  });

  it("CEP de cidade pequena: sem rua nem bairro, só cidade e UF", async () => {
    const f = ok({ logradouro: "", bairro: "", localidade: "Cláudia", uf: "MT" });
    expect(await lookupCep("78540000", f)).toEqual({ rua: "", bairro: "", cidade: "Cláudia", uf: "MT" });
  });

  it("CEP que não existe devolve null", async () => {
    expect(await lookupCep("99999999", ok({ erro: true }))).toBeNull();
    expect(await lookupCep("99999999", ok({ erro: "true" }))).toBeNull();
  });

  it("CEP incompleto nem consulta", async () => {
    const f = ok({});
    expect(await lookupCep("7855", f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("falha de rede, resposta 500 ou UF fora da lista devolvem null (o cliente digita)", async () => {
    expect(await lookupCep("78550000", vi.fn(async () => { throw new Error("offline"); }))).toBeNull();
    expect(await lookupCep("78550000", vi.fn(async () => new Response("x", { status: 500 })))).toBeNull();
    expect(await lookupCep("78550000", ok({ localidade: "X", uf: "ZZ" }))).toBeNull();
  });
});
