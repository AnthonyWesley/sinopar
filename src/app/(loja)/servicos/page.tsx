import { CreditCard, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ShippingCalculator } from "@/components/shipping-calculator";
import { paymentMethods, returnsSummary, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Serviços, entrega e trocas",
  description: `Entrega para todo o Brasil, formas de pagamento e política de trocas da ${site.name}.`,
  alternates: { canonical: "/servicos" },
};

// "Serviços" do brief adaptado a uma loja: as regras de compra. Sem orçamento para compra em
// quantidade e sem retirada na loja (pedido do cliente em 09/11/2026).
export default function ServicesPage() {
  return (
    <div className="container-site pt-4">
      <Breadcrumbs items={[{ label: "Serviços" }]} />
      <h1 className="font-wide mt-2 text-[length:var(--text-title)]">Serviços, entrega e trocas</h1>
      <p className="mt-1 max-w-2xl text-lg text-muted">Tudo o que você precisa saber antes de comprar.</p>

      <nav aria-label="Nesta página" className="mt-5">
        <ul className="flex flex-wrap gap-2">
          {[
            ["#entrega", "Entrega"],
            ["#pagamento", "Pagamento"],
            ["#trocas", "Trocas e devoluções"],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="inline-flex min-h-11 items-center rounded-full bg-surface-2 px-4 font-medium hover:bg-surface-3">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section id="entrega" className="scroll-mt-32 rounded-2xl p-6 ring-1 ring-line sm:p-8" aria-labelledby="t-entrega">
          <Truck className="size-7" aria-hidden="true" />
          <h2 id="t-entrega" className="font-wide mt-3 text-xl">
            Entrega
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
            <li>Envio para todo o Brasil, com prazo e valor calculados pelo CEP.</li>
            <li>O frete aparece na página do produto e no carrinho, antes de você informar qualquer dado.</li>
          </ul>
          <div className="mt-5">
            <ShippingCalculator items={[{ qty: 1 }]} />
          </div>
        </section>

        <section id="pagamento" className="scroll-mt-32 rounded-2xl p-6 ring-1 ring-line sm:p-8" aria-labelledby="t-pagamento">
          <CreditCard className="size-7" aria-hidden="true" />
          <h2 id="t-pagamento" className="font-wide mt-3 text-xl">
            Pagamento
          </h2>
          <p className="mt-3">Aceitamos {paymentMethods.join(" e ").toLowerCase()}.</p>
          <ul className="mt-3 space-y-2 text-muted">
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden="true" />
              O pagamento é feito na página segura do Asaas. O site não recebe nem guarda dados de cartão.
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden="true" />
              Compra sem cadastro: só pedimos os dados necessários para a cobrança e a nota fiscal.
            </li>
          </ul>
        </section>

        <section id="trocas" className="scroll-mt-32 rounded-2xl p-6 ring-1 ring-line sm:p-8 lg:col-span-2" aria-labelledby="t-trocas">
          <RotateCcw className="size-7" aria-hidden="true" />
          <h2 id="t-trocas" className="font-wide mt-3 text-xl">
            Trocas e devoluções
          </h2>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-ink-soft">
            <li>
              <strong>Desistência:</strong> {returnsSummary.short} O valor pago é devolvido integralmente.
            </li>
            <li>
              <strong>Defeito:</strong> {returnsSummary.warranty}
            </li>
            <li>Para pedir troca ou devolução, fale com a loja informando o número do pedido.</li>
          </ul>
          <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm text-muted">
            Estas são as garantias do Código de Defesa do Consumidor. Regras próprias da Fixa Store (troca de medida errada,
            frete da devolução) entram aqui quando a loja confirmar.
          </p>
        </section>
      </div>
    </div>
  );
}
