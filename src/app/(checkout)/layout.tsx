import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { site } from "@/lib/site";

// Checkout sem distrações: sem menu, sem busca, sem vitrine. Só o caminho de volta ao carrinho.
export default function CheckoutLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b-4 border-brand bg-white">
        <div className="container-site flex min-h-16 items-center justify-between gap-4">
          <Logo />
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Lock className="size-4" aria-hidden="true" />
            Compra segura
          </p>
        </div>
      </header>
      <main id="conteudo" className="flex-1 pb-16">
        <div className="container-site pt-4">
          <Link href="/carrinho" className="inline-flex min-h-11 items-center gap-2 font-medium underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar ao carrinho
          </Link>
        </div>
        {children}
      </main>
      <footer className="border-t border-line py-5 text-center text-sm text-muted">
        {site.name} · {site.city}, {site.state} · Pagamentos processados pelo Asaas
      </footer>
    </>
  );
}
