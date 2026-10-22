import { ArrowRight, ClipboardList, Clock, CreditCard, MapPin, MessageCircle, RotateCcw, ShieldCheck, Store, Truck, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { DepartmentsList, SIDEBAR_ID } from "@/components/departments-menu";
import { Price } from "@/components/price";
import { ProductCard } from "@/components/product-card";
import { departments } from "@/components/site-header";
import { StockStatus } from "@/components/stock";
import { categories, fromPrice, hasDiscount, products, segments, totalStock, type Product } from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/format";
import { paymentMethods, returnsSummary, site, whatsappLink } from "@/lib/site";

// Fotos com fundo branco ganham mix-blend-multiply: o branco some sobre o cinza dos banners.

export default function HomePage() {
  const offers = products.filter(hasDiscount);
  // destaques: primeiro os marcados como destaque, depois o resto; sem repetir ofertas nem
  // os produtos que já aparecem nas vitrines de parafusos e ferramentas manuais acima
  const shown = new Set([...byCategory("parafusos").slice(0, 4), ...byCategory("ferramentas-manuais").slice(0, 5)].map((p) => p.slug));
  const pool = products.filter((p) => !hasDiscount(p) && !shown.has(p.slug));
  const highlights = [...pool.filter((p) => p.featured), ...pool.filter((p) => !p.featured)].slice(0, 9);

  return (
    <>
      {/* ---------- banner + departamentos ---------- */}
      <section className="container-site pt-3 lg:pt-0" aria-labelledby="chamada">
        <div className="grid gap-3 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-stretch">
          <nav id={SIDEBAR_ID} aria-label="Departamentos" className="hidden rounded-b-lg bg-white shadow-[0_6px_16px_rgb(0_0_0/0.08)] ring-1 ring-line lg:block">
            <Suspense fallback={null}>
              <DepartmentsList departments={departments} />
            </Suspense>
          </nav>
          <div className="relative grid min-h-64 overflow-hidden rounded-lg bg-surface-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:mt-3">
            <div className="relative z-10 flex flex-col justify-center p-5 sm:p-8 lg:p-10">
              <p className="text-sm font-bold tracking-wide uppercase">
                {site.city}, {site.state} · envio para todo o Brasil
              </p>
              <h1 id="chamada" className="section-title mt-2 max-w-xl text-[clamp(1.5rem,1.15rem+1.2vw,2.125rem)] leading-[1.12]">
                Parafusos e ferramentas para obra, campo e oficina
              </h1>
              <p className="mt-3 max-w-md text-ink-soft">Compre online e retire na loja ou receba em casa. Pix, boleto ou cartão.</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href="/produtos" className="btn-dark min-h-12 px-6 uppercase">
                  Ver produtos
                </Link>
                <Link href="/servicos#orcamento" className="inline-flex min-h-11 items-center gap-1 font-semibold underline-offset-4 hover:underline">
                  Orçamento para empresas
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="relative hidden min-h-56 sm:block">
              <Image
                src="/images/produtos/parafusadeira-bateria.webp"
                alt="Parafusadeira a bateria"
                fill
                priority
                sizes="(min-width: 1024px) 34vw, 45vw"
                className="object-contain p-6 mix-blend-multiply"
              />
            </div>
          </div>
        </div>
      </section>

      {/* departamentos no celular: na tela grande eles já estão no menu lateral */}
      <section className="container-site mt-5 lg:hidden" aria-labelledby="departamentos">
        <h2 id="departamentos" className="section-title mb-3">
          Departamentos
        </h2>
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
          {categories.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link href={`/produtos/${c.slug}`} className="flex min-h-12 items-center gap-2 rounded-full bg-surface-2 px-4 font-semibold whitespace-nowrap hover:bg-surface-3">
                <CategoryIcon slug={c.slug} />
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- garantias ---------- */}
      <section className="container-site mt-5 lg:mt-4" aria-label="Por que comprar na Sinopar">
        <ul className="grid gap-3 md:grid-cols-3">
          {[
            { icon: Truck, title: "Envio para todo o Brasil", text: `Ou retirada grátis na loja em ${site.city}. Frete calculado pelo CEP.` },
            { icon: ShieldCheck, title: "Pagamento seguro", text: `${paymentMethods.join(", ")} na página segura do Asaas.` },
            { icon: MessageCircle, title: "Atendimento", text: "Tire dúvidas de medida e aplicação antes de comprar." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-4 rounded-lg bg-surface-2 px-4 py-3 lg:p-6">
              <span className="grid size-11 shrink-0 lg:size-14 place-items-center rounded-full bg-white">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold uppercase">{title}</span>
                <span className="mt-0.5 block text-ink-soft">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- ofertas ---------- */}
      {offers.length > 0 && (
        <section className="container-site mt-12" aria-labelledby="ofertas">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 id="ofertas" className="section-title">
              Ofertas
            </h2>
            <SeeAll href="/produtos?ordem=menor-preco" label="Ver produtos" />
          </div>
          <ul className="grid gap-4 md:grid-cols-2">
            {offers.slice(0, 4).map((p, i) => (
              <li key={p.slug}>
                <OfferCard product={p} priority={i < 2} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- parafusos (com atalhos por uso) ---------- */}
      <CategorySection slug="parafusos" withSegments />

      {/* ---------- banners de departamento ---------- */}
      <section className="container-site mt-12" aria-label="Departamentos em destaque">
        <ul className="grid gap-4 md:grid-cols-3">
          {[
            { slug: "ferramentas-manuais", title: "Martelos, chaves e alicates", cta: "Ver ferramentas", image: "martelo-unha" },
            { slug: "brocas-e-discos", title: "Discos de corte e brocas", cta: "Ver brocas e discos", image: "disco-corte" },
            { slug: "epi", title: "Capacetes, luvas e óculos", cta: "Ver EPI", image: "capacete" },
          ].map((b) => (
            <li key={b.slug}>
              <Link href={`/produtos/${b.slug}`} className="group relative flex min-h-48 overflow-hidden rounded-lg bg-surface-2 p-6 hover:bg-surface-3">
                <span className="relative z-10 flex max-w-[60%] flex-col items-start">
                  <span className="text-sm font-bold tracking-wide text-ink-soft uppercase">{categories.find((c) => c.slug === b.slug)?.name}</span>
                  <span className="section-title mt-1 text-xl">{b.title}</span>
                  <span className="btn-dark mt-auto min-h-10 px-5 text-sm uppercase">{b.cta}</span>
                </span>
                <Image
                  src={`/images/produtos/${b.image}.webp`}
                  alt=""
                  width={240}
                  height={240}
                  className="absolute top-1/2 -right-4 size-44 -translate-y-1/2 object-contain mix-blend-multiply transition-transform duration-200 motion-safe:group-hover:scale-105"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- ferramentas manuais ---------- */}
      <CategorySection slug="ferramentas-manuais" columns={5} />

      {/* ---------- orçamento para empresas ---------- */}
      <section className="container-site mt-12" aria-labelledby="empresas">
        <div className="relative overflow-hidden rounded-lg bg-surface-2">
          <Image src="/images/produtos/serra-circular.webp" alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover opacity-30 sm:left-auto sm:w-3/5 sm:opacity-100" />
          <div className="absolute inset-y-0 left-0 hidden w-3/5 bg-gradient-to-r from-surface-2 from-55% to-transparent sm:block" aria-hidden="true" />
          <div className="relative max-w-xl p-6 sm:p-10 lg:py-16">
            <p className="text-sm font-bold tracking-wide text-ink-soft uppercase">Construtoras, fazendas e empresas</p>
            <h2 id="empresas" className="section-title mt-2 text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)]">
              Orçamento para compra em quantidade
            </h2>
            <p className="mt-3 text-lg text-ink-soft">
              Mande a lista de materiais com medidas e quantidades. A gente devolve o orçamento com disponibilidade e combina a retirada ou a entrega.
            </p>
            <Link href="/servicos#orcamento" className="btn-dark mt-6 min-h-12 px-6 uppercase">
              Pedir orçamento
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- destaques: um grande no meio ---------- */}
      {highlights.length > 0 && <Highlights items={highlights} />}

      {/* ---------- loja e serviços ---------- */}
      <StoreAndServices />

    </>
  );
}

const byCategory = (slug: string) => products.filter((p) => p.category === slug);

function SeeAll({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold tracking-wide uppercase underline-offset-4 hover:underline" aria-label={label}>
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">Ver todos</span>
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

/** título em aba amarela com a linha da seção, como nas vitrines por departamento */
function TabTitle({ id, title, href, label }: { id: string; title: string; href: string; label: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3 border-b-[3px] border-brand">
      <h2 id={id} className="section-title min-w-0 rounded-tl-md bg-brand py-2.5 pr-12 pl-5 text-lg [clip-path:polygon(0_0,calc(100%-2rem)_0,100%_100%,0_100%)] sm:text-xl">
        {title}
      </h2>
      <SeeAll href={href} label={label} />
    </div>
  );
}

function CategorySection({ slug, columns = 4, withSegments = false }: { slug: string; columns?: 4 | 5; withSegments?: boolean }) {
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;
  const items = byCategory(slug).slice(0, withSegments ? 4 : columns);
  const href = `/produtos/${slug}`;
  const used = segments.filter((s) => products.some((p) => p.category === slug && p.segments.includes(s.slug)));

  return (
    <section className="container-site mt-12" aria-labelledby={`dep-${slug}`}>
      <TabTitle id={`dep-${slug}`} title={category.name} href={href} label={`Ver ${category.name.toLowerCase()}`} />
      <div className={withSegments ? "grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]" : ""}>
        {withSegments && (
          <nav aria-label={`${category.name} por uso`} className="rounded-lg bg-surface-2 p-5">
            <p className="text-sm font-bold tracking-wide uppercase">Compre por uso</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 lg:block">
              {used.map((s) => (
                <li key={s.slug}>
                  <Link href={`${href}?segmento=${s.slug}`} className="inline-flex min-h-10 items-center text-ink-soft hover:text-ink hover:underline">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={href} className="mt-3 inline-flex min-h-10 items-center gap-1 font-semibold hover:underline">
              Ver tudo
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </nav>
        )}
        <ul className={`rail ${columns === 5 ? "lg:grid-cols-5" : ""}`}>
          {items.map((p) => (
            <li key={p.slug} className="flex">
              <ProductCard product={p} rail />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** oferta em cartão largo: foto à esquerda, preço e estoque reais à direita (sem contagem regressiva) */
function OfferCard({ product, priority }: { product: Product; priority?: boolean }) {
  const best = fromPrice(product);
  const varies = new Set(product.variants.map((v) => v.price)).size > 1;
  const href = `/produto/${product.slug}`;
  return (
    <article className="group grid h-full grid-cols-[8rem_minmax(0,1fr)] items-center gap-4 rounded-lg bg-white p-4 ring-2 ring-brand transition-shadow hover:shadow-lg sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6 sm:p-5">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-square overflow-hidden rounded-md bg-surface-2">
        <Image src={product.image} alt="" fill sizes="176px" priority={priority} className="object-cover" />
        {best.compareAt && (
          <span className="absolute top-2 left-2 rounded-sm bg-discount px-2 py-0.5 text-sm font-bold text-white tabular-nums">
            −{discountPercent(best.price, best.compareAt)}%
          </span>
        )}
      </Link>
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-medium tracking-wide text-muted uppercase">{product.unit}</p>
        <h3 className="mt-1 line-clamp-2 font-semibold">
          <Link href={href} className="underline-offset-4 hover:underline">
            {product.name}
          </Link>
        </h3>
        <div className="mt-1">
          <Price price={best.price} compareAt={best.compareAt} from={varies} />
        </div>
        <StockStatus stock={totalStock(product)} className="mt-1" />
        <Link href={href} className="btn-dark mt-3 min-h-10 px-5 text-sm uppercase" aria-label={`Ver oferta: ${product.name}`}>
          Ver oferta
        </Link>
      </div>
    </article>
  );
}

function MiniCard({ product }: { product: Product }) {
  const best = fromPrice(product);
  const varies = new Set(product.variants.map((v) => v.price)).size > 1;
  const href = `/produto/${product.slug}`;
  return (
    <article className="group flex h-full flex-col">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-square overflow-hidden rounded-lg bg-white ring-1 ring-line group-hover:ring-line-strong">
        <Image src={product.image} alt="" fill sizes="(min-width: 1024px) 12vw, 45vw" className="object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.03]" />
      </Link>
      <h3 className="mt-2.5 line-clamp-2 min-h-12 leading-6 font-semibold">
        <Link href={href} className="underline-offset-4 hover:underline">
          {product.name}
        </Link>
      </h3>
      <p className="mt-1 flex items-baseline gap-1.5">
        {varies && <span className="text-sm text-muted">a partir de</span>}
        <span className="price text-xl">{formatPrice(best.price)}</span>
      </p>
    </article>
  );
}

function Highlights({ items }: { items: Product[] }) {
  const [main, ...rest] = items;
  const left = rest.slice(0, 4);
  const right = rest.slice(4, 8);
  const best = fromPrice(main);
  const varies = new Set(main.variants.map((v) => v.price)).size > 1;
  const href = `/produto/${main.slug}`;

  return (
    <section className="container-site mt-14" aria-labelledby="destaques">
      <h2 id="destaques" className="section-title mb-6 text-center">
        Destaques da loja
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-5">
        <article className="group col-span-2 flex flex-col rounded-lg bg-white p-5 ring-2 ring-brand lg:order-2 lg:col-span-1 lg:p-6">
          <p className="text-center text-sm font-bold tracking-wide uppercase">Escolha da Sinopar</p>
          <Link href={href} tabIndex={-1} aria-hidden="true" className="relative mx-auto mt-3 block aspect-square w-full max-w-sm overflow-hidden rounded-md">
            <Image src={main.image} alt="" fill sizes="(min-width: 1024px) 30vw, 90vw" className="object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.03]" />
          </Link>
          <p className="mt-4 text-[0.8125rem] font-medium tracking-wide text-muted uppercase">{main.unit}</p>
          <h3 className="mt-1 text-lg font-semibold">
            <Link href={href} className="underline-offset-4 hover:underline">
              {main.name}
            </Link>
          </h3>
          <div className="mt-1">
            <Price price={best.price} compareAt={best.compareAt} from={varies} />
          </div>
          <StockStatus stock={totalStock(main)} className="mt-1" />
          <Link href={href} className="btn-dark mt-4 min-h-12 w-full uppercase">
            Ver produto
          </Link>
        </article>
        {[left, right].map((group, i) => (
          <ul key={i} className={`col-span-2 grid grid-cols-2 gap-4 lg:col-span-1 ${i === 0 ? "lg:order-1" : "lg:order-3"}`}>
            {group.map((p) => (
              <li key={p.slug}>
                <MiniCard product={p} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

const services: { icon: LucideIcon; title: string; text: string; href: string }[] = [
  { icon: ClipboardList, title: "Orçamento para empresas", text: "Mande a lista de materiais e receba o orçamento com disponibilidade.", href: "/servicos#orcamento" },
  { icon: Store, title: "Retirada na loja", text: `Compre online e retire grátis em ${site.city}, sem pagar frete.`, href: "/servicos#entrega" },
  { icon: Truck, title: "Entrega no Brasil", text: "Frete e prazo calculados pelo CEP antes de pedir qualquer dado.", href: "/servicos#entrega" },
  { icon: CreditCard, title: "Pagamento seguro", text: `${paymentMethods.join(", ")} na página do Asaas.`, href: "/servicos#pagamento" },
  { icon: RotateCcw, title: "Trocas e devoluções", text: returnsSummary.short, href: "/servicos#trocas" },
];

function StoreAndServices() {
  const wa = whatsappLink("Olá! Quero saber o endereço e o horário da loja.");
  return (
    <section className="relative mt-16" aria-labelledby="nossa-loja">
      <div className="absolute inset-x-0 top-0 bottom-24 bg-surface-2" aria-hidden="true" />
      <div className="container-site relative pt-12">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-wide text-ink-soft uppercase">Nossa loja</p>
            <h2 id="nossa-loja" className="section-title mt-2 text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)] normal-case">
              Retire em {site.city} ou receba onde estiver
            </h2>
            <ul className="mt-6 space-y-4">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block font-bold">{site.name}</span>
                  <span className="text-ink-soft">
                    {site.street ?? "Endereço a confirmar"}, {site.city} - {site.state}
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block font-bold">Horário</span>
                  <span className="text-ink-soft">{site.hours ?? "A confirmar"}</span>
                </span>
              </li>
              <li className="flex gap-3">
                <Truck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block font-bold">Envio para todo o Brasil</span>
                  <span className="text-ink-soft">Prazo e valor pelo CEP, na página do produto e no carrinho.</span>
                </span>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contato" className="btn-dark min-h-12 uppercase">
                Ver no mapa
              </Link>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-12">
                  <MessageCircle className="size-5" aria-hidden="true" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
          <div className="relative hidden aspect-[16/10] overflow-hidden rounded-lg lg:block">
            <Image src="/images/banners/parafusos.webp" alt="Parafusos, porcas e arruelas de vários tamanhos" fill sizes="45vw" className="object-cover" />
          </div>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {services.map((s, i) => (
            <li key={s.title} className="flex flex-col items-center rounded-lg bg-white p-6 text-center shadow-[0_6px_20px_rgb(0_0_0/0.07)] ring-1 ring-line">
              <h3 className="font-bold">{s.title}</h3>
              <span className="mt-4 grid size-16 place-items-center rounded-full bg-brand">
                <s.icon className="size-7" aria-hidden="true" />
              </span>
              <p className="mt-4 flex-1 text-ink-soft">{s.text}</p>
              <Link href={s.href} className={`btn mt-5 min-h-10 px-5 text-sm uppercase ${i === 0 ? "bg-black text-white hover:bg-ink-soft" : "bg-surface-2 hover:bg-surface-3"}`} aria-label={`Saiba mais: ${s.title}`}>
                Saiba mais
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
