import { ArrowRight, CreditCard, MessageCircle, RotateCcw, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { DepartmentsList, SIDEBAR_ID } from "@/components/departments-menu";
import { BannerCarousel } from "@/components/banner-carousel";
import { Price } from "@/components/price";
import { ProductCard } from "@/components/product-card";
import { departmentsOf } from "@/components/site-header";
import { StockStatus } from "@/components/stock";
import { categories, fromPrice, hasDiscount, NO_PHOTO, segments, totalStock, type Product } from "@/lib/catalog";
import { getLiveBanners } from "@/lib/banners-data";
import { getCatalog } from "@/lib/catalog-data";
import { discountPercent, formatPrice } from "@/lib/format";
import { returnsSummary, whatsappLink } from "@/lib/site";

// Fotos com fundo branco ganham mix-blend-multiply: o branco some sobre o cinza dos banners.
// As vitrines leem o catálogo do banco na requisição (ver catalog-data.ts), por isso cada uma
// fica em <Suspense>; o resto da página é estático. Enquanto o catálogo não chega, cada vitrine
// mostra um esqueleto com a mesma estrutura e altura da versão final, para a página não pular
// quando ela aparece (ver "esqueletos" no fim do arquivo).

export default function HomePage() {
  return (
    <>
      {/* ---------- banner + departamentos ---------- */}
      <section className="container-site pt-3 lg:pt-0" aria-labelledby="chamada">
        <div className="grid gap-3 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-stretch">
          <nav id={SIDEBAR_ID} aria-label="Departamentos" className="hidden rounded-b-lg bg-white shadow-[0_6px_16px_rgb(0_0_0/0.08)] ring-1 ring-line lg:block">
            <Suspense fallback={<DepartmentsSkeleton />}>
              <HomeDepartments />
            </Suspense>
          </nav>
          <Suspense fallback={<HeroSkeleton />}>
            <HomeHero />
          </Suspense>
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
      <section className="container-site mt-5 lg:mt-4" aria-label="Por que comprar na Fixa Store">
        <ul className="grid gap-3 md:grid-cols-3">
          {[
            { icon: Truck, title: "Envio para todo o Brasil", text: "Frete e prazo calculados pelo CEP, antes de pedir qualquer dado." },
            { icon: ShieldCheck, title: "Pagamento seguro", text: "Pix ou cartão de crédito na página segura do Asaas." },
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
      <Suspense fallback={<OffersSkeleton />}>
        <Offers />
      </Suspense>

      {/* ---------- discos e abrasivos (com atalhos por uso) ---------- */}
      <Suspense fallback={<CategorySkeleton slug="discos-e-abrasivos" withSegments />}>
        <CategorySection slug="discos-e-abrasivos" withSegments />
      </Suspense>

      {/* ---------- banners de departamento ---------- */}
      <section className="container-site mt-12" aria-label="Departamentos em destaque">
        <ul className="grid gap-4 md:grid-cols-3">
          {[
            { slug: "brocas-e-serras-copo", title: "Brocas, serras copo e fresas", cta: "Ver brocas", image: "jogo-brocas" },
            { slug: "ferramentas-manuais", title: "Chaves, extratores e soquetes", cta: "Ver ferramentas", image: "jogo-chaves-fenda" },
            { slug: "epi", title: "Óculos, máscara e filtros", cta: "Ver EPI", image: "oculos-protecao" },
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

      {/* ---------- alicates ---------- */}
      <Suspense fallback={<CategorySkeleton slug="alicates" columns={5} />}>
        <CategorySection slug="alicates" columns={5} />
      </Suspense>

      {/* ---------- destaques: um grande no meio ---------- */}
      <Suspense fallback={<HighlightsSkeleton />}>
        <HomeHighlights />
      </Suspense>

      {/* ---------- loja e serviços ---------- */}
      <StoreAndServices />

    </>
  );
}

const byCategory = (catalog: Product[], slug: string) => catalog.filter((p) => p.category === slug);

// Banners do painel (painel > Banners) no lugar do destaque. Sem banner no ar, fica o destaque
// fixo abaixo. O título da página continua existindo para leitor de tela e Google.
async function HomeHero() {
  const banners = await getLiveBanners();
  if (banners.length === 0) return <DefaultHero />;
  return (
    <div className="flex min-w-0 flex-col">
      <h1 id="chamada" className="sr-only">
        Fixa Store: ferramentas e acessórios para obra, campo e oficina
      </h1>
      <BannerCarousel banners={banners.map((b) => ({ id: b.id, title: b.title, desktop: b.imageDesktop, mobile: b.imageMobile, link: b.link }))} />
    </div>
  );
}

function DefaultHero() {
  return (
    <div className="relative grid min-h-64 overflow-hidden rounded-lg bg-surface-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:mt-3">
      <div className="relative z-10 flex flex-col justify-center p-5 sm:p-8 lg:p-10">
        <p className="text-sm font-bold tracking-wide uppercase">Envio para todo o Brasil</p>
        <h1 id="chamada" className="section-title mt-2 max-w-xl text-[clamp(1.5rem,1.15rem+1.2vw,2.125rem)] leading-[1.12]">
          Ferramentas e acessórios para obra, campo e oficina
        </h1>
        <p className="mt-3 max-w-md text-ink-soft">Compre online e receba onde estiver. Pague com Pix ou cartão de crédito.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/produtos" className="btn-dark min-h-12 px-6 uppercase">
            Ver produtos
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
  );
}

async function HomeDepartments() {
  return <DepartmentsList departments={departmentsOf(await getCatalog())} />;
}

async function Offers() {
  const offers = (await getCatalog()).filter(hasDiscount);
  if (!offers.length) return null;
  return (
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
  );
}

async function HomeHighlights() {
  const catalog = await getCatalog();
  // destaques: primeiro os marcados como destaque, depois o resto; sem repetir ofertas nem
  // os produtos que já aparecem nas vitrines de discos e alicates acima
  const shown = new Set([...byCategory(catalog, "discos-e-abrasivos").slice(0, 4), ...byCategory(catalog, "alicates").slice(0, 5)].map((p) => p.slug));
  const pool = catalog.filter((p) => !hasDiscount(p) && !shown.has(p.slug));
  const highlights = [...pool.filter((p) => p.featured), ...pool.filter((p) => !p.featured)].slice(0, 9);
  return highlights.length > 0 ? <Highlights items={highlights} /> : null;
}

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
function TabTitle({ id, title, href, label }: { id?: string; title: string; href: string; label: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3 border-b-[3px] border-brand">
      <h2 id={id} className="section-title min-w-0 rounded-tl-md bg-brand py-2.5 pr-12 pl-5 text-lg [clip-path:polygon(0_0,calc(100%-2rem)_0,100%_100%,0_100%)] sm:text-xl">
        {title}
      </h2>
      <SeeAll href={href} label={label} />
    </div>
  );
}

async function CategorySection({ slug, columns = 4, withSegments = false }: { slug: string; columns?: 4 | 5; withSegments?: boolean }) {
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;
  const inCategory = byCategory(await getCatalog(), slug);
  const items = inCategory.slice(0, withSegments ? 4 : columns);
  const href = `/produtos/${slug}`;
  const used = segments.filter((s) => inCategory.some((p) => p.segments.includes(s.slug)));

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
  // o cartão grande do meio vai para o primeiro destaque que já tem foto
  const mainIndex = Math.max(0, items.findIndex((p) => p.image !== NO_PHOTO));
  const main = items[mainIndex];
  const rest = items.filter((_, i) => i !== mainIndex);
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
          <p className="text-center text-sm font-bold tracking-wide uppercase">Escolha da Fixa Store</p>
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
  { icon: Truck, title: "Entrega no Brasil", text: "Frete e prazo calculados pelo CEP antes de pedir qualquer dado.", href: "/servicos#entrega" },
  { icon: CreditCard, title: "Pagamento seguro", text: "Pix ou cartão de crédito na página do Asaas.", href: "/servicos#pagamento" },
  { icon: RotateCcw, title: "Trocas e devoluções", text: returnsSummary.short, href: "/servicos#trocas" },
];

function StoreAndServices() {
  const wa = whatsappLink("Olá! Vim pelo site da Fixa Store.");
  return (
    <section className="relative mt-16" aria-labelledby="nossa-loja">
      <div className="absolute inset-x-0 top-0 bottom-24 bg-surface-2" aria-hidden="true" />
      <div className="container-site relative pt-12">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-wide text-ink-soft uppercase">Compra online</p>
            <h2 id="nossa-loja" className="section-title mt-2 text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)] normal-case">
              Receba onde estiver, em todo o Brasil
            </h2>
            <ul className="mt-6 space-y-4">
              <li className="flex gap-3">
                <CreditCard className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block font-bold">Pix ou cartão de crédito</span>
                  <span className="text-ink-soft">Pagamento na página segura do Asaas.</span>
                </span>
              </li>
              <li className="flex gap-3">
                <MessageCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block font-bold">Atendimento</span>
                  <span className="text-ink-soft">Tire dúvidas de medida e aplicação antes de comprar.</span>
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
              <Link href="/produtos" className="btn-dark min-h-12 uppercase">
                Ver produtos
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

        <ul className="mt-12 grid gap-4 sm:grid-cols-3">
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

// ---------- esqueletos (fallback das vitrines) ----------
// Mesmas classes de layout das vitrines de verdade; o texto vira um bloco cinza com o texto
// transparente dentro, para a altura das linhas ser a mesma da fonte real.

function Bone({ children }: { children: React.ReactNode }) {
  return <span className="rounded-sm bg-surface-2 text-transparent motion-safe:animate-pulse">{children}</span>;
}

/** lista do menu lateral sem as contagens (os nomes dos departamentos são fixos) */
/** mesmo lugar e altura mínima do destaque, sem conteúdo (não pisca texto antes do banner) */
function HeroSkeleton() {
  return <div aria-hidden="true" className="min-h-64 rounded-lg bg-surface-2 sm:min-h-80 lg:mt-3" />;
}

function DepartmentsSkeleton() {
  return (
    <ul className="p-2" aria-hidden="true">
      {categories.map((c) => (
        <li key={c.slug} className="flex min-h-11 items-center gap-3 px-3 text-[0.9375rem]">
          <CategoryIcon slug={c.slug} className="size-5 text-ink-soft" />
          <span className="flex-1">{c.name}</span>
        </li>
      ))}
      <li className="mt-1 border-t border-line pt-1">
        <span className="flex min-h-11 items-center px-3 text-[0.9375rem] font-semibold">Ver todos os produtos</span>
      </li>
    </ul>
  );
}

function PriceSkeleton() {
  return (
    <div className="flex flex-col">
      <span className="h-5" />
      <span className="h-5" />
      <span className="price text-2xl leading-tight">
        <Bone>R$ 00,00</Bone>
      </span>
    </div>
  );
}

/** n linhas de nome de produto, cada uma com a altura de uma linha da fonte (1lh), sem quebrar */
function Lines({ n }: { n: number }) {
  return Array.from({ length: n }, (_, i) => (
    <span key={i} className="flex h-[1lh] items-center">
      <span className={`h-[0.8lh] rounded-sm bg-surface-2 motion-safe:animate-pulse ${i === n - 1 && n > 1 ? "w-1/2" : "w-11/12"}`} />
    </span>
  ));
}

function OffersSkeleton() {
  return (
    <section className="container-site mt-12" aria-label="Ofertas" aria-busy="true">
      <div className="mb-5 flex items-end justify-between gap-3">
        <h2 className="section-title">Ofertas</h2>
        <SeeAll href="/produtos?ordem=menor-preco" label="Ver produtos" />
      </div>
      <ul className="grid gap-4 md:grid-cols-2" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i}>
            <div className="grid h-full grid-cols-[8rem_minmax(0,1fr)] items-center gap-4 rounded-lg bg-white p-4 ring-2 ring-line sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6 sm:p-5">
              <div className="aspect-square rounded-md bg-surface-2" />
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-medium tracking-wide uppercase">
                  <Bone>Unidade</Bone>
                </p>
                {/* nome em até 2 linhas (line-clamp-2): reserva o máximo */}
                <p className="mt-1 font-semibold">
                  <Lines n={2} />
                </p>
                <div className="mt-1">
                  <PriceSkeleton />
                </div>
                <p className="mt-1 text-sm font-semibold">
                  <Bone>Em estoque</Bone>
                </p>
                <span className="btn mt-3 min-h-10 bg-surface-2 px-5 text-sm text-transparent uppercase">Ver oferta</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CardSkeleton() {
  return (
    <div className="flex h-full w-[min(66vw,15rem)] shrink-0 snap-start flex-col lg:w-full lg:min-w-0">
      <div className="aspect-square rounded-lg bg-surface-2" />
      <div className="flex flex-1 flex-col gap-1.5 pt-3">
        <p className="text-[0.8125rem] font-medium tracking-wide uppercase">
          <Bone>Unidade</Bone>
        </p>
        <p className="min-h-12 text-base leading-6 font-semibold">
          <Lines n={2} />
        </p>
        <PriceSkeleton />
        <p className="text-sm font-semibold">
          <Bone>Em estoque</Bone>
        </p>
        <div className="mt-auto pt-1.5">
          <span className="btn w-full bg-surface-2 text-transparent">Adicionar</span>
        </div>
      </div>
    </div>
  );
}

function CategorySkeleton({ slug, columns = 4, withSegments = false }: { slug: string; columns?: 4 | 5; withSegments?: boolean }) {
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;
  const href = `/produtos/${slug}`;
  return (
    <section className="container-site mt-12" aria-label={category.name} aria-busy="true">
      <TabTitle title={category.name} href={href} label={`Ver ${category.name.toLowerCase()}`} />
      <div className={withSegments ? "grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]" : ""} aria-hidden="true">
        {withSegments && (
          <div className="rounded-lg bg-surface-2 p-5">
            <p className="text-sm font-bold tracking-wide uppercase">Compre por uso</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 lg:block">
              {segments.map((s) => (
                <li key={s.slug} className="flex min-h-10 items-center text-transparent">
                  {s.name}
                </li>
              ))}
            </ul>
            <p className="mt-3 flex min-h-10 items-center font-semibold">Ver tudo</p>
          </div>
        )}
        <ul className={`rail ${columns === 5 ? "lg:grid-cols-5" : ""}`}>
          {Array.from({ length: withSegments ? 4 : columns }, (_, i) => (
            <li key={i} className="flex">
              <CardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MiniCardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="aspect-square rounded-lg bg-surface-2" />
      <p className="mt-2.5 min-h-12 leading-6 font-semibold">
        <Lines n={2} />
      </p>
      <p className="price mt-1 text-xl">
        <Bone>R$ 00,00</Bone>
      </p>
    </div>
  );
}

function HighlightsSkeleton() {
  return (
    <section className="container-site mt-14" aria-label="Destaques da loja" aria-busy="true">
      <h2 className="section-title mb-6 text-center">Destaques da loja</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-5" aria-hidden="true">
        <div className="col-span-2 flex flex-col rounded-lg bg-white p-5 ring-2 ring-line lg:order-2 lg:col-span-1 lg:p-6">
          <p className="text-center text-sm font-bold tracking-wide uppercase">Escolha da Fixa Store</p>
          <div className="mx-auto mt-3 aspect-square w-full max-w-sm rounded-md bg-surface-2" />
          <p className="mt-4 text-[0.8125rem] font-medium tracking-wide uppercase">
            <Bone>Unidade</Bone>
          </p>
          <p className="mt-1 text-lg font-semibold">
            <Lines n={2} />
          </p>
          <div className="mt-1">
            <PriceSkeleton />
          </div>
          <p className="mt-1 text-sm font-semibold">
            <Bone>Em estoque</Bone>
          </p>
          <span className="btn mt-4 min-h-12 w-full bg-surface-2 text-transparent">Ver produto</span>
        </div>
        {["lg:order-1", "lg:order-3"].map((order) => (
          <ul key={order} className={`col-span-2 grid grid-cols-2 gap-4 lg:col-span-1 ${order}`}>
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <MiniCardSkeleton />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
