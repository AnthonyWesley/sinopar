import { describe, it, expect } from "vitest";
import { groupByCategory } from "./group-by-category";

const cats = [
  { slug: "brocas", name: "Brocas" },
  { slug: "discos", name: "Discos" },
  { slug: "alicates", name: "Alicates" },
];

describe("groupByCategory", () => {
  it("agrupa na ordem dos departamentos, mantendo a ordem dos itens e omitindo grupos vazios", () => {
    const items = [
      { id: 1, category: "discos" },
      { id: 2, category: "brocas" },
      { id: 3, category: "discos" },
    ];
    expect(groupByCategory(items, cats)).toEqual([
      { slug: "brocas", name: "Brocas", items: [{ id: 2, category: "brocas" }] },
      { slug: "discos", name: "Discos", items: [{ id: 1, category: "discos" }, { id: 3, category: "discos" }] },
    ]);
  });

  it("departamento desconhecido vai para o fim com o próprio código como nome", () => {
    const items = [{ id: 1, category: "antigo" }, { id: 2, category: "alicates" }];
    expect(groupByCategory(items, cats).map((g) => [g.slug, g.name])).toEqual([
      ["alicates", "Alicates"],
      ["antigo", "antigo"],
    ]);
  });

  it("lista vazia dá nenhum grupo", () => {
    expect(groupByCategory([], cats)).toEqual([]);
  });
});
