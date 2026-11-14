// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const actions = vi.hoisted(() => ({ generateRecoveryCode: vi.fn() }));
vi.mock("@/lib/actions/auth", () => actions);
const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import { RecoveryCodeForm } from "./recovery-code-form";

beforeEach(() => {
  actions.generateRecoveryCode.mockReset();
  router.refresh.mockReset();
});
afterEach(cleanup);

describe("RecoveryCodeForm", () => {
  it('sem senha mostra "Informe sua senha atual." e não chama o servidor', async () => {
    render(<RecoveryCodeForm hasRecoveryCode={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar código" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Informe sua senha atual.");
    expect(actions.generateRecoveryCode).not.toHaveBeenCalled();
  });

  it("com a senha, mostra o código uma vez e atualiza o painel", async () => {
    actions.generateRecoveryCode.mockResolvedValue({ code: "ABCD-EFGH-IJKL" });
    render(<RecoveryCodeForm hasRecoveryCode={false} />);
    fireEvent.change(screen.getByLabelText("Sua senha atual"), { target: { value: "minhasenha1" } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar código" }));

    expect(await screen.findByText("ABCD-EFGH-IJKL")).toBeInTheDocument();
    expect((actions.generateRecoveryCode.mock.calls[0][1] as FormData).get("current")).toBe("minhasenha1");
    expect(router.refresh).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Gerar novo código" })).toBeInTheDocument();
  });

  it("quem já tem código vê o botão Gerar novo código", () => {
    render(<RecoveryCodeForm hasRecoveryCode />);
    expect(screen.getByRole("button", { name: "Gerar novo código" })).toBeInTheDocument();
  });
});
