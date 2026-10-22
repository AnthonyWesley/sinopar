import { Anchor, Bolt, Disc3, Drill, Hammer, HardHat, Hexagon, Package, type LucideIcon } from "lucide-react";

// Ícone de cada departamento (menu lateral, menu de departamentos e atalhos do celular).
const icons: Record<string, LucideIcon> = {
  parafusos: Bolt,
  "porcas-e-arruelas": Hexagon,
  "buchas-e-chumbadores": Anchor,
  "ferramentas-manuais": Hammer,
  "ferramentas-eletricas": Drill,
  "brocas-e-discos": Disc3,
  epi: HardHat,
};

export function CategoryIcon({ slug, className = "size-5" }: { slug: string; className?: string }) {
  const Icon = icons[slug] ?? Package;
  return <Icon className={className} aria-hidden="true" />;
}
