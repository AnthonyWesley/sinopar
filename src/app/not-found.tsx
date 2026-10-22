import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main id="conteudo" className="container-site flex flex-1 flex-col items-start justify-center gap-4 py-16">
      <Logo />
      <h1 className="font-wide text-[length:var(--text-title)]">Página não encontrada</h1>
      <p className="text-lg text-muted">O endereço pode ter mudado. Procure pelo produto ou volte ao início.</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/produtos" className="btn-dark">
          Ver produtos
        </Link>
        <Link href="/" className="btn-outline">
          Página inicial
        </Link>
      </div>
    </main>
  );
}
