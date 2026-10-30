import Image from "next/image";
import Link from "next/link";

// Logotipo oficial da Sinopar (PNG transparente recortado em public/images/logo-sinopar.webp).
// Tem moldura própria, então funciona sobre fundo claro ou escuro.

export function Logo({ className = "h-11 w-auto sm:h-12" }: { className?: string }) {
  return (
    <Link href="/" className="flex shrink-0 items-center rounded-md" aria-label="Sinopar Ferramentas, página inicial">
      <Image src="/images/logo-sinopar.webp" alt="" width={720} height={196} priority className={className} />
    </Link>
  );
}
