// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const actions = vi.hoisted(() => ({
  login: vi.fn(),
  recover: vi.fn(),
}));
vi.mock("@/lib/actions/auth", () => actions);

import { LoginForm } from "./login-form";

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  actions.login.mockReset();
  actions.recover.mockReset();
});
afterEach(cleanup);

describe("LoginForm", () => {
  it("login errado mostra a mensagem do servidor", async () => {
    actions.login.mockResolvedValue({ error: "E-mail ou senha incorretos." });
    render(<LoginForm />);
    type("E-mail", "dono@loja.com");
    type("Senha", "errada123");
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
    const form = actions.login.mock.calls[0][1] as FormData;
    expect(form.get("email")).toBe("dono@loja.com");
    expect(form.get("password")).toBe("errada123");
    // o e-mail continua preenchido para tentar de novo
    expect(screen.getByLabelText("E-mail")).toHaveValue("dono@loja.com");
  });

  it('"Esqueci minha senha" envia email, code e next', async () => {
    actions.recover.mockResolvedValue({ error: "E-mail ou código incorretos." });
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));

    type("E-mail", "dono@loja.com");
    type("Código de recuperação", "ABCD-EFGH-IJKL");
    type("Senha nova", "senhanova123");
    type("Repita a senha nova", "senhanova123");
    fireEvent.click(screen.getByRole("button", { name: "Redefinir senha e entrar" }));

    await waitFor(() => expect(actions.recover).toHaveBeenCalledTimes(1));
    const form = actions.recover.mock.calls[0][1] as FormData;
    expect(form.get("email")).toBe("dono@loja.com");
    expect(form.get("code")).toBe("ABCD-EFGH-IJKL");
    expect(form.get("next")).toBe("senhanova123");
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou código incorretos.");
  });

  it("Voltar retorna ao login", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));
    fireEvent.click(screen.getByRole("button", { name: /Voltar/ }));
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });
});
