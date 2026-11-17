import { describe, expect, it } from "vitest";
import { escondeTemasVazios, temaSemConteudo } from "./recursos-temas-visiveis";

const vazio = { recursosCount: 0, blocosCount: 0 };

describe("temas vazios no Centro de recursos", () => {
  it("tema sem texto, recursos nem blocos é vazio", () => {
    expect(temaSemConteudo({ ...vazio, description: "  ", intro: "<p></p>" })).toBe(true);
  });
  it("tema com um recurso não é vazio", () => {
    expect(temaSemConteudo({ ...vazio, recursosCount: 1 })).toBe(false);
  });
  it("tema com descrição não é vazio", () => {
    expect(temaSemConteudo({ ...vazio, description: "Texto" })).toBe(false);
  });
  it("só Utilizador não vê temas vazios", () => {
    expect(escondeTemasVazios(["Utilizador"])).toBe(true);
  });
  it.each(["Entidade", "Admin", "Equipa IPAV", "Teste"])("%s continua a ver temas vazios", (r) => {
    expect(escondeTemasVazios([r])).toBe(false);
    expect(escondeTemasVazios(["Utilizador", r])).toBe(false);
  });
});
