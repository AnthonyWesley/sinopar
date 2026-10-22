import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { categories } from "@/lib/catalog";
import { mainNav, paymentMethods, site, whatsappLink } from "@/lib/site";
import { Logo } from "./logo";

const pending = <span className="text-muted">a confirmar</span>;

export function SiteFooter() {
  const wa = whatsappLink();
  const links = "inline-flex min-h-9 items-center text-ink-soft hover:text-ink hover:underline";
  return (
    <footer className="mt-20 bg-surface-2">
      <div className="container-site grid gap-10 pt-14 pb-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <address className="not-italic">
          <Logo />
          <p className="mt-4 max-w-sm text-ink-soft">{site.description}</p>
          <ul className="mt-5 space-y-2.5">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>
                {site.street ?? <>Endereço {pending}</>}, {site.city} - {site.state}
              </span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              {site.phone ? <a href={`tel:${site.phone.replace(/\D/g, "")}`} className="font-semibold">{site.phone}</a> : <span>Telefone {pending}</span>}
            </li>
            {wa && (
              <li className="flex gap-3">
                <MessageCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <a href={wa} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                  WhatsApp
                </a>
              </li>
            )}
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              {site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : <span>E-mail {pending}</span>}
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>{site.hours ?? <>Horário {pending}</>}</span>
            </li>
          </ul>
        </address>
        <nav aria-label="Departamentos no rodapé">
          <p className="font-bold tracking-wide uppercase">Departamentos</p>
          <ul className="mt-3 space-y-0.5">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/produtos/${c.slug}`} className={links}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Ajuda">
          <p className="font-bold tracking-wide uppercase">Ajuda</p>
          <ul className="mt-3 space-y-0.5">
            {[
              { href: "/servicos#entrega", label: "Entrega e retirada" },
              { href: "/servicos#pagamento", label: "Formas de pagamento" },
              { href: "/servicos#trocas", label: "Trocas e devoluções" },
              { href: "/servicos#orcamento", label: "Orçamento para empresas" },
              { href: "/carrinho", label: "Carrinho" },
            ].map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={links}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="A loja">
          <p className="font-bold tracking-wide uppercase">A loja</p>
          <ul className="mt-3 space-y-0.5">
            {[{ href: "/", label: "Início" }, ...mainNav].map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={links}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="container-site">
        <div className="flex flex-col gap-4 rounded-lg bg-white p-5 shadow-[0_4px_16px_rgb(0_0_0/0.06)] sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-3">
            <span className="font-bold tracking-wide uppercase">Siga a Sinopar:</span>
            {site.instagram ? (
              <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="btn bg-surface-2 hover:bg-surface-3">
                Instagram
              </a>
            ) : (
              <span className="text-ink-soft">Instagram {pending}</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold tracking-wide uppercase">Pagamento:</span>
            {paymentMethods.map((m) => (
              <span key={m} className="rounded-md px-2.5 py-1 text-sm font-semibold ring-1 ring-line-strong">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="container-site py-6 text-sm text-muted">
        © {site.name}. CNPJ a confirmar. Fotos de produtos provisórias: Wikimedia Commons, licenças Creative Commons (créditos em docs/creditos-imagens.md).
      </p>
    </footer>
  );
}
