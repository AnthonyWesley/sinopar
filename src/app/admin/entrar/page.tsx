import type { Metadata } from "next";
import { LoginForm } from "./login-form";

// Fora do grupo (painel): quem não entrou ainda não passa pelo requireUser.
export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main id="conteudo" className="admin-root flex-1 px-4 pb-12">
      <LoginForm />
    </main>
  );
}
