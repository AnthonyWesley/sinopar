// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const actions = vi.hoisted(() => ({
  advanceStage: vi.fn(),
  backStage: vi.fn(),
  cancelOrderAction: vi.fn(),
  fulfillOutOfStockAction: vi.fn(),
  markPaidDemo: vi.fn(),
  saveTracking: vi.fn(),
}));
vi.mock("@/lib/actions/orders", () => actions);

import { orderButtons } from "@/lib/order-status";
import { OrderActions } from "./[id]/order-actions";
import type { OrderStatus } from "@/lib/server/orders-repo";

function show(status: OrderStatus, opts: { demo?: boolean; asaas?: boolean; tracking?: string | null } = {}) {
  const buttons = orderButtons({ status, demo: opts.demo ?? false }, opts.asaas ?? true);
  return render(<OrderActions orderId="SP-1" status={status} buttons={buttons} trackingCode={opts.tracking ?? null} />);
}
const btn = (name: string) => screen.queryByRole("button", { name });

beforeEach(() => {
  for (const f of Object.values(actions)) f.mockReset().mockResolvedValue({ message: "ok" });
});
afterEach(cleanup);

describe("OrderActions", () => {
  it("aguardando com o Asaas ligado: só Cancelar; demonstração ou Asaas desligado: Marcar como pago", () => {
    show("aguardando");
    expect(btn("Marcar como pago")).toBeNull();
    expect(btn("Cancelar")).toBeInTheDocument();
    cleanup();
    show("aguardando", { demo: true });
    expect(btn("Marcar como pago")).toBeInTheDocument();
    cleanup();
    show("aguardando", { asaas: false });
    expect(btn("Marcar como pago")).toBeInTheDocument();
  });

  it("botões de cada etapa", () => {
    show("pago");
    expect(btn("Marcar como separado")).toBeInTheDocument();
    expect(btn("Voltar para pago")).toBeNull();
    cleanup();
    show("separado");
    expect(screen.getByLabelText(/Código de rastreio/)).toBeInTheDocument();
    expect(btn("Marcar como enviado")).toBeInTheDocument();
    expect(btn("Voltar para pago")).toBeInTheDocument();
    expect(btn("Cancelar")).toBeInTheDocument();
    cleanup();
    show("enviado");
    expect(btn("Marcar como entregue")).toBeInTheDocument();
    expect(btn("Voltar para separado")).toBeInTheDocument();
    cleanup();
    show("entregue");
    expect(btn("Voltar para enviado")).toBeInTheDocument();
    expect(btn("Cancelar")).toBeNull();
    cleanup();
    show("pago_sem_estoque");
    expect(btn("Atender")).toBeInTheDocument();
    expect(btn("Cancelar e estornar")).toBeInTheDocument();
  });

  it("cancelar depois de pago pergunta se as unidades voltam e lembra do Asaas", async () => {
    show("pago");
    fireEvent.click(btn("Cancelar")!);
    expect(screen.getByText("As unidades voltam para o estoque?")).toBeInTheDocument();
    expect(screen.getByText("O estorno do dinheiro é feito no painel do Asaas.")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Sim"));
    fireEvent.click(btn("Confirmar cancelamento")!);
    await waitFor(() => expect(actions.cancelOrderAction).toHaveBeenCalledTimes(1));
    const form = actions.cancelOrderAction.mock.calls[0][1] as FormData;
    expect(Object.fromEntries(form)).toMatchObject({ orderId: "SP-1", from: "pago", restock: "sim" });
  });

  it("depois do cancelamento (etapa nova vinda do refresh) o aviso continua na tela", async () => {
    actions.cancelOrderAction.mockResolvedValue({ message: "Pedido cancelado." });
    const { rerender } = show("aguardando");
    fireEvent.click(btn("Cancelar")!);
    fireEvent.click(btn("Confirmar cancelamento")!);
    expect(await screen.findByText("Pedido cancelado.")).toBeInTheDocument();
    rerender(<OrderActions orderId="SP-1" status="cancelado" buttons={[]} trackingCode={null} />);
    expect(screen.getByText("Pedido cancelado.")).toBeInTheDocument();
    expect(btn("Confirmar cancelamento")).toBeNull();
  });

  it("cancelar aguardando não pergunta do estoque", () => {
    show("aguardando");
    fireEvent.click(btn("Cancelar")!);
    expect(screen.queryByText("As unidades voltam para o estoque?")).toBeNull();
    expect(btn("Confirmar cancelamento")).toBeInTheDocument();
  });

  it("voltar etapa chama backStage com a etapa mostrada; erro aparece", async () => {
    actions.backStage.mockResolvedValue({ error: "O pedido mudou de etapa. Atualize a página." });
    show("enviado");
    fireEvent.click(btn("Voltar para separado")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("O pedido mudou de etapa. Atualize a página.");
    expect(Object.fromEntries(actions.backStage.mock.calls[0][1] as FormData)).toMatchObject({ from: "enviado" });
  });
});
