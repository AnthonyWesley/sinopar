import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireUser } from "@/lib/session";

// Portão do painel: todas as páginas deste grupo exigem sessão (e senha já trocada).
// A leitura do cookie é dado de requisição: com cacheComponents ela fica atrás do <Suspense>.
// Cada página que mostra dados confere de novo (requireUser/requireOwner), porque layout e
// página são renderizados em paralelo e um segmento pode ser pedido sozinho.

export default function PainelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="admin-root flex-1" aria-busy="true" />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AdminShell user={{ name: user.name, role: user.role }} nav>
      {user.hasRecoveryCode ? null : <RecoveryBanner />}
      {children}
    </AdminShell>
  );
}

/** Aviso amarelo enquanto não houver código de recuperação. */
function RecoveryBanner() {
  return (
    <div className="mb-4 flex flex-col gap-1 rounded-xl border border-brand bg-brand-soft p-3 text-ink sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span>Gere seu código de recuperação para não perder o acesso se esquecer a senha.</span>
      <Link href="/admin/seguranca" className="inline-flex min-h-11 shrink-0 items-center font-semibold underline underline-offset-4">
        Gerar agora
      </Link>
    </div>
  );
}
