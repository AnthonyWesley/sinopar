import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Volta para a lista de banners. */
export function BackLink() {
  return (
    <Link href="/admin/banners" className="inline-flex min-h-11 items-center gap-2 font-medium text-ink underline-offset-4 hover:underline">
      <ArrowLeft className="size-5" aria-hidden="true" /> Banners
    </Link>
  );
}
