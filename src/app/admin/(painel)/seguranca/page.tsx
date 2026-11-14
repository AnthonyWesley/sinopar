import { Download, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { BTN_SECONDARY } from "@/components/admin/field";
import { PageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { requireUser } from "@/lib/session";
import { RecoveryCodeForm } from "./recovery-code-form";

export const metadata: Metadata = { title: "Segurança" };

export default async function SecurityPage() {
  const user = await requireUser();
  const owner = user.role === "owner";
  return (
    <div className="space-y-5">
      <PageHeader
        title="Segurança"
        intro={owner ? "Como voltar a entrar se esquecer a senha, e uma cópia dos dados." : "Como voltar a entrar se esquecer a senha."}
      />

      <Panel>
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Código de recuperação</h2>
            <p className="text-muted">
              Se você esquecer a senha, entre com este código em &quot;Esqueci minha senha&quot;, na tela de login. Cada código serve
              uma vez só.
            </p>
          </div>
        </div>
        <RecoveryCodeForm hasRecoveryCode={user.hasRecoveryCode} />
      </Panel>

      {owner ? (
        <Panel>
          <div className="flex items-start gap-3">
            <Download className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Cópia dos dados</h2>
              <p className="text-muted">
                O site já guarda uma cópia por dia. Se quiser uma cópia também no seu computador, baixe aqui de vez em quando.
              </p>
            </div>
          </div>
          <a href="/admin/backup" download className={`${BTN_SECONDARY} w-full sm:w-auto`}>
            <Download className="size-5" aria-hidden="true" /> Baixar cópia dos dados
          </a>
        </Panel>
      ) : null}
    </div>
  );
}
