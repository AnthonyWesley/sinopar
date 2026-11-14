import { FormError } from "@/components/admin/form-error";
import { PageHeader } from "@/components/admin/page-header";
import { getDb } from "@/lib/server/db";
import { listUsers } from "@/lib/server/users";
import { requireOwner } from "@/lib/session";
import { NewStaffForm, StaffActions } from "./users-forms";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Cuiaba", dateStyle: "short" });

/** Tela de Usuários. Só o Responsável: funcionário vai para o Início, sem sessão vai para o login. */
export async function UsersList() {
  const user = await requireOwner();
  const r = listUsers(getDb(), user);
  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" intro="Quem pode entrar no painel. Funcionários cuidam de produtos, estoque e pedidos, mas não veem esta tela." />
      {r.ok ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          {r.users.map((u) => (
            <li key={u.id} className="px-5 py-4">
              <p className="break-words font-medium">
                {u.name}
                {u.id === user.id ? <span className="font-normal text-muted"> (você)</span> : null}
              </p>
              <p className="break-all text-muted">{u.email}</p>
              <p className="text-sm">
                {u.role === "owner" ? "Responsável" : "Funcionário"}
                <span className="text-muted"> · desde {dateFmt.format(new Date(u.createdAt))}</span>
                {u.mustChangePassword ? <span className="text-muted"> · ainda não trocou a senha provisória</span> : null}
              </p>
              {u.role === "staff" ? <StaffActions id={u.id} name={u.name} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <FormError message={r.error} />
      )}
      <NewStaffForm />
    </div>
  );
}
