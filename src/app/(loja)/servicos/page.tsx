import { ClipboardList, CreditCard, MessageCircle, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ShippingCalculator } from "@/components/shipping-calculator";
import { paymentMethods, returnsSummary, site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Serviços, entrega e trocas",
  description: `Orçamento para obras e empresas, retirada em ${site.city}, entrega para todo o Brasil, formas de pagamento e política de trocas da ${site.name}.`,
  alternates: { canonical: "/servicos" },
};

// "Serviços" do brief adaptado a uma loja: o que a Sinopar oferece além do produto e as
// regras de compra. Itens marcados A CONFIRMAR dependem da Sinopar.
export default function ServicesPage() {
  const wa = whatsappLink("Olá! Quero um orçamento para compra em quantidade.");
  return (
    <div className="container-site pt-4">
      <Breadcrumbs items={[{ label: "Serviços" }]} />
      <h1 className="font-wide mt-2 text-[length:var(--text-title)]">Serviços, entrega e trocas</h1>
      <p className="mt-1 max-w-2xl text-lg text-muted">Tudo o que você precisa saber antes de comprar.</p>

      <nav aria-label="Nesta página" className="mt-5">
        <ul className="flex flex-wrap gap-2">
          {[
            ["#orcamento", "Orçamento para empresas"],
            ["#entrega", "Entrega e retirada"],
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
        <section id="orcamento" className="scroll-mt-32 rounded-2xl bg-brand p-6 sm:p-8 lg:col-span-2" aria-labelledby="t-orcamento">
          <ClipboardList className="size-8" aria-hidden="true" />
          <h2 id="t-orcamento" className="font-wide mt-3 text-2xl">
            Orçamento para obras, fazendas e empresas
          </h2>
          <p className="mt-2 max-w-2xl text-lg text-black/85">
            Comprando em quantidade? Mande a lista de materiais (medidas e quantidades) e a gente devolve o orçamento com
            disponibilidade e prazo de separação.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-dark min-h-12">
                <MessageCircle className="size-5" aria-hidden="true" />
                Pedir orçamento no WhatsApp
              </a>
            ) : (
              <Link href="/contato" className="btn-dark min-h-12">
                Pedir orçamento
              </Link>
            )}
            <Link href="/produtos" className="btn min-h-12 bg-white/60 text-black hover:bg-white">
              Comprar online
            </Link>
          </div>
        </section>

        <section id="entrega" className="scroll-mt-32 rounded-2xl p-6 ring-1 ring-line sm:p-8" aria-labelledby="t-entrega">
          <Truck className="size-7" aria-hidden="true" />
          <h2 id="t-entrega" className="font-wide mt-3 text-xl">
            Entrega e retirada
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
            <li>Retirada grátis na loja em {site.city}.</li>
            <li>Entrega local em {site.city} e envio para todo o Brasil, com prazo e valor calculados pelo CEP.</li>
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
          <p className="mt-3">Aceitamos {paymentMethods.join(", ").toLowerCase()}.</p>
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
            Estas são as garantias do Código de Defesa do Consumidor. Regras próprias da Sinopar (troca de medida errada,
            prazo para retirada, frete da devolução) entram aqui quando a loja confirmar.
          </p>
        </section>
      </div>
    </div>
  );
}
