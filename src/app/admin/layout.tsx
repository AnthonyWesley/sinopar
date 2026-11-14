import type { Metadata } from "next";

// Tudo em /admin: fora dos buscadores e com o tema do painel (.admin-root em globals.css).
// O controle de acesso fica em (painel)/layout.tsx; entrar/ e senha/ ficam fora daquele grupo.
export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
