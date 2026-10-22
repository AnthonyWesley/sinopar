import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: `Contato e localização em ${site.city}`,
  description: `Fale com a ${site.name}: WhatsApp, telefone, e-mail, endereço e horário da loja em ${site.city}, ${site.state}.`,
  alternates: { canonical: "/contato" },
};

// "Contato" e "Localização" do brief na mesma página: quem procura um quer o outro.
export default function ContactPage() {
  const wa = whatsappLink("Olá! Vim pelo site da Sinopar.");
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(site.street ? `${site.street}, ${site.city} - ${site.state}` : site.mapsQuery)}&output=embed`;
  const pending = <span className="text-muted">a confirmar</span>;

  const items = [
    { icon: MessageCircle, label: "WhatsApp", value: wa ? "Conversar agora" : pending, href: wa },
    { icon: Phone, label: "Telefone", value: site.phone ?? pending, href: site.phone ? `tel:${site.phone.replace(/\D/g, "")}` : null },
    { icon: Mail, label: "E-mail", value: site.email ?? pending, href: site.email ? `mailto:${site.email}` : null },
    { icon: Clock, label: "Horário", value: site.hours ?? pending, href: null },
  ];

  return (
    <div className="container-site pt-4">
      <Breadcrumbs items={[{ label: "Contato e localização" }]} />
      <h1 className="font-wide mt-2 text-[length:var(--text-title)]">Contato e localização</h1>
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

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]" aria-labelledby="localizacao">
        <div>
          <h2 id="localizacao" className="font-wide text-xl">
            Onde estamos
          </h2>
          <address className="mt-3 flex gap-3 text-lg not-italic">
            <MapPin className="mt-1 size-5 shrink-0" aria-hidden="true" />
            <span>
              {site.street ?? <>Endereço {pending}</>}
              <br />
              {site.city} - {site.state}
              {site.postalCode && <>, CEP {site.postalCode}</>}
            </span>
          </address>
          <p className="mt-4 text-muted">Compre pelo site e retire aqui. A loja avisa quando o pedido estiver separado.</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.street ? `${site.name}, ${site.street}, ${site.city}` : site.mapsQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-dark mt-5"
          >
            Abrir no Google Maps
          </a>
        </div>
        <div className="overflow-hidden rounded-2xl ring-1 ring-line">
          <iframe title={`Mapa: ${site.name} em ${site.city}`} src={mapSrc} className="aspect-[4/3] w-full border-0 lg:aspect-[16/9]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </section>
    </div>
  );
}
