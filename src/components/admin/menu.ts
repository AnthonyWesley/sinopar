import { Boxes, GalleryHorizontal, House, KeyRound, Package, ReceiptText, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/server/auth";

export type MenuItem = { href: string; label: string; Icon: LucideIcon; ownerOnly?: boolean };

/** Menu do painel. Itens `ownerOnly` só aparecem para o Responsável (a página confere de novo). */
export const MENU: MenuItem[] = [
  { href: "/admin", label: "Início", Icon: House },
  { href: "/admin/produtos", label: "Produtos", Icon: Package },
  { href: "/admin/estoque", label: "Estoque", Icon: Boxes },
  { href: "/admin/pedidos", label: "Pedidos", Icon: ReceiptText },
  { href: "/admin/banners", label: "Banners", Icon: GalleryHorizontal },
  { href: "/admin/usuarios", label: "Usuários", Icon: Users, ownerOnly: true },
  { href: "/admin/seguranca", label: "Segurança", Icon: ShieldCheck },
];

export const menuFor = (role: Role) => MENU.filter((item) => !item.ownerOnly || role === "owner");

/** Trocar a própria senha: fica no pé da barra lateral e, no celular, dentro de "Mais". */
export const PASSWORD_ITEM: MenuItem = { href: "/admin/senha", label: "Trocar minha senha", Icon: KeyRound };

/** Posições da barra de baixo do celular, contando o botão "Mais". */
export const MOBILE_BAR_MAX = 5;

/** Menu do celular: até 5 posições na barra; se não couber tudo, 4 atalhos + "Mais" com o resto. */
export function mobileMenuFor(role: Role): { bar: MenuItem[]; more: MenuItem[] } {
  const all = [...menuFor(role), PASSWORD_ITEM];
  if (all.length <= MOBILE_BAR_MAX) return { bar: all, more: [] };
  return { bar: all.slice(0, MOBILE_BAR_MAX - 1), more: all.slice(MOBILE_BAR_MAX - 1) };
}

/** Item ativo: o Início só na própria página; os outros também nas subpáginas. */
export const isActive = (href: string, pathname: string) =>
  href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
