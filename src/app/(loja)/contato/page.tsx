import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contato",
  description: `Fale com a ${site.name}: WhatsApp, telefone, e-mail e horário de atendimento.`,
  alternates: { canonical: "/contato" },
};

// Só canais de atendimento: o site não mostra endereço nem mapa da loja física
// (pedido do cliente em 09/11/2026). Razão social e CNPJ ficam aqui e no rodapé.
export default function ContactPage() {
  const wa = whatsappLink("Olá! Vim pelo site da Fixa Store.");
  const pending = <span className="text-muted">a confirmar</span>;

  const items = [
    { icon: MessageCircle, label: "WhatsApp", value: wa ? "Conversar agora" : pending, href: wa },
    { icon: Phone, label: "Telefone", value: site.phone ?? pending, href: site.phone ? `tel:${site.phone.replace(/\D/g, "")}` : null },
    { icon: Mail, label: "E-mail", value: site.email ?? pending, href: site.email ? `mailto:${site.email}` : null },
    { icon: Clock, label: "Horário de atendimento", value: site.hours ?? pending, href: null },
  ];

  return (
    <div className="container-site pt-4">
      <Breadcrumbs items={[{ label: "Contato" }]} />
      <h1 className="font-wide mt-2 text-[length:var(--text-title)]">Contato</h1>
      <p className="mt-1 max-w-2xl text-lg text-muted">Dúvida sobre medida, aplicação ou estoque? Fale com a gente antes de comprar.</p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, label, value, href }) => (
          <li key={label} className="flex gap-3 rounded-xl p-4 ring-1 ring-line">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted">{label}</p>
              {href ? (
                <a href={href} className="font-semibold break-words underline-offset-4 hover:underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  {value}
                </a>
              ) : (
                <p className="font-semibold">{value}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-2xl bg-surface-2 p-6" aria-labelledby="empresa">
        <h2 id="empresa" className="font-wide text-xl">
          Dados da empresa
        </h2>
        <p className="mt-2 text-ink-soft">
          {site.name} é o nome fantasia de {site.legalName ?? <>Sinopar ({pending})</>}. CNPJ: {site.cnpj ?? pending}. As notas fiscais saem em nome da empresa.
        </p>
      </section>
    </div>
  );
}
