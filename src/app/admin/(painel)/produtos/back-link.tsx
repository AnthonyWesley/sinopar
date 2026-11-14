import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Volta para a lista de produtos. */
export function BackLink() {
  return (
    <Link href="/admin/produtos" className="inline-flex min-h-11 items-center gap-2 font-medium text-ink underline-offset-4 hover:underline">
      <ArrowLeft className="size-5" aria-hidden="true" /> Produtos
    </Link>
  );
}
