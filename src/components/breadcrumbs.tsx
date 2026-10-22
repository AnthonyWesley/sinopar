import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { site } from "@/lib/site";
import { JsonLd } from "./json-ld";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ label: "Início", href: "/" }, ...items];
  return (
    <nav aria-label="Você está em" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {all.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className="inline-flex min-h-8 items-center underline-offset-4 hover:text-ink hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            ...(c.href ? { item: `${site.url}${c.href}` } : {}),
          })),
        }}
      />
    </nav>
  );
}
