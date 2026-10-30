import { Disc3, Drill, Flame, HardHat, Package, Ruler, Scissors, Toolbox, Wrench, Zap, type LucideIcon } from "lucide-react";

// Ícone de cada departamento (menu lateral, menu de departamentos e atalhos do celular).
const icons: Record<string, LucideIcon> = {
  "brocas-e-serras-copo": Drill,
  "discos-e-abrasivos": Disc3,
  alicates: Scissors,
  "ferramentas-manuais": Wrench,
  medicao: Ruler,
  "acessorios-parafusadeira": Zap,
  organizacao: Toolbox,
  macaricos: Flame,
  epi: HardHat,
};

export function CategoryIcon({ slug, className = "size-5" }: { slug: string; className?: string }) {
  const Icon = icons[slug] ?? Package;
  return <Icon className={className} aria-hidden="true" />;
}
