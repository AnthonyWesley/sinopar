import { MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { categories, fromPrice, products } from "@/lib/catalog";
import { searchKeywords } from "@/lib/listing";
import { mainNav, site, whatsappLink } from "@/lib/site";
import { CartButton } from "./cart-button";
import { DepartmentsMenu } from "./departments-menu";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { SearchBox, type SearchItem } from "./search-box";

const searchItems: SearchItem[] = products.map((p) => ({
  slug: p.slug,
  name: p.name,
  image: p.image,
  price: fromPrice(p).price,
  category: categories.find((c) => c.slug === p.category)?.name ?? "",
  keywords: searchKeywords(p),
}));
const categoryLinks = categories.map((c) => ({ slug: c.slug, name: c.name }));
export const departments = categories.map((c) => ({ slug: c.slug, name: c.name, count: products.filter((p) => p.category === c.slug).length }));

// Cabeçalho em duas faixas: branca (logo, menu, contato) e amarela fixa no topo
// (departamentos, busca e carrinho), que continua visível ao rolar.
export function SiteHeader() {
  const wa = whatsappLink("Olá! Vim pelo site da Sinopar.");
  return (
    <>
      <p className="bg-surface-2 py-1.5 text-center text-sm text-muted">
        <strong className="font-semibold text-ink">Loja em demonstração:</strong> preços, estoques e prazos são exemplos.
      </p>

      <header className="bg-white">
        <div className="container-site flex min-h-16 items-center gap-2 py-2 sm:gap-4 lg:min-h-20">
          {/* os menus usam usePathname: ficam em Suspense com uma versão estática no lugar */}
          <Suspense fallback={<span className="size-12 lg:hidden" />}>
            <MobileMenu departments={categories.map((c) => ({ href: `/produtos/${c.slug}`, label: c.name }))} nav={mainNav} />
          </Suspense>
          <Logo />
          <nav aria-label="Principal" className="ml-6 hidden items-center gap-1 lg:flex">
            {[{ href: "/", label: "Início" }, ...mainNav].map((n) => (
              <Link key={n.href} href={n.href} className="flex min-h-11 items-center rounded-md px-3 font-semibold text-ink hover:bg-surface-2">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-5 text-sm">
            <Link href="/contato" className="hidden min-h-11 items-center gap-1.5 font-medium hover:underline xl:flex">
              <MapPin className="size-4" aria-hidden="true" />
              {site.city}, {site.state} · envio para todo o Brasil
            </Link>
            {wa && (
              <a href={wa} className="flex min-h-11 items-center gap-1.5 font-semibold hover:underline" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-5" aria-hidden="true" />
                <span className="hidden sm:inline">Fale no WhatsApp</span>
                <span className="sr-only sm:hidden">WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-30 bg-brand shadow-[0_1px_0_rgb(0_0_0/0.08)]">
        <div className="container-site flex items-center gap-2 py-2 sm:gap-3">
          <div className="-mb-2 hidden self-end lg:block">
            <Suspense
              fallback={
                <Link href="/produtos" className="flex min-h-12 w-68 items-center rounded-t-lg bg-white px-4 text-sm font-bold tracking-wide uppercase">
                  Departamentos
                </Link>
              }
            >
              <DepartmentsMenu departments={departments} />
            </Suspense>
          </div>
          <div className="min-w-0 flex-1">
            <SearchBox items={searchItems} categories={categoryLinks} />
          </div>
          <CartButton />
        </div>
      </div>
    </>
  );
}
