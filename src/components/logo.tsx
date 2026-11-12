import Image from "next/image";
import Link from "next/link";

// Logotipo Fixa Store, modelo A (chave no X), versão para fundo claro: FIXA amarelo, STORE preto.
// Todos os lugares que usam o logo (cabeçalho, rodapé, checkout, 404) têm fundo branco ou cinza claro.
// Fonte dos vetores: sinopar-click-hub/brand/fixa-store/escolha/modelo-a.

export function Logo({ className = "h-12 w-auto sm:h-14 lg:h-16" }: { className?: string }) {
  return (
    <Link href="/" className="flex shrink-0 items-center rounded-md" aria-label="Fixa Store, página inicial">
      <Image src="/images/logo-fixastore.svg" alt="" width={779} height={446} priority className={className} />
    </Link>
  );
}
