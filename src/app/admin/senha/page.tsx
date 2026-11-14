import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireUser } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

// Fora do grupo (painel): com a troca de senha pendente, o portão do grupo mandaria para cá de
// novo (laço). Aqui a pendência é permitida; sem ela, a página aparece com o menu completo.
export const metadata: Metadata = { title: "Trocar senha" };

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="admin-root flex-1" aria-busy="true" />}>
      <ChangePassword />
    </Suspense>
  );
}

async function ChangePassword() {
  const user = await requireUser({ allowPendingPassword: true });
  return (
    <AdminShell user={{ name: user.name, role: user.role }} nav={!user.mustChangePassword}>
      <ChangePasswordForm forced={user.mustChangePassword} />
    </AdminShell>
  );
}
