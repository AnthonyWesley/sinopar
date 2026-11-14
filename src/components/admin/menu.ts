import { Boxes, House, Package, ReceiptText, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/server/auth";

export type MenuItem = { href: string; label: string; Icon: LucideIcon; ownerOnly?: boolean };

/** Menu do painel. Itens `ownerOnly` só aparecem para o Responsável (a página confere de novo). */
export const MENU: MenuItem[] = [
  { href: "/admin", label: "Início", Icon: House },
  { href: "/admin/produtos", label: "Produtos", Icon: Package },
  { href: "/admin/estoque", label: "Estoque", Icon: Boxes },
  { href: "/admin/pedidos", label: "Pedidos", Icon: ReceiptText },
  { href: "/admin/usuarios", label: "Usuários", Icon: Users, ownerOnly: true },
  { href: "/admin/seguranca", label: "Segurança", Icon: ShieldCheck },
];

export const menuFor = (role: Role) => MENU.filter((item) => !item.ownerOnly || role === "owner");

/** Item ativo: o Início só na própria página; os outros também nas subpáginas. */
export const isActive = (href: string, pathname: string) =>
  href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
