import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#conteudo" className="sr-only z-50 rounded-lg bg-brand px-4 py-3 font-semibold text-black focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
