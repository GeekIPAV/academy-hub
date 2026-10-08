import { describe, expect, it } from "vitest";
import { bloqueiosSequenciais, entradaSubmetida } from "./elearning-sequencial";

const modulos = [{ passos: [{ id: "a", obrigatorio: true }, { id: "b", obrigatorio: true }, { id: "opcional", obrigatorio: false }] }, { passos: [{ id: "c", obrigatorio: true }] }];
describe("progressão sequencial", () => {
  it("desligada não bloqueia momentos", () => expect(bloqueiosSequenciais(modulos, new Set(), false).size).toBe(0));
  it("primeiro momento abre e seguinte exige o anterior", () => {
    const b = bloqueiosSequenciais(modulos, new Set(), true);
    expect(b.has("a")).toBe(false);
    expect(b.get("b")).toBe("Conclui o momento anterior");
  });
  it("módulo 2 exige obrigatórios do módulo 1", () => expect(bloqueiosSequenciais(modulos, new Set(["a"]), true).get("c")).toBe("Abre após concluir o Módulo 1"));
  it("opcional por concluir não impede abrir o módulo seguinte", () => expect(bloqueiosSequenciais(modulos, new Set(["a", "b"]), true).has("c")).toBe(false));
  it("módulo vazio impede saltar para o seguinte", () => expect(bloqueiosSequenciais([{ passos: [] }, modulos[1]], new Set(), true).get("c")).toBe("Abre após concluir o Módulo 1"));
  it("momento seguinte exige anterior mesmo opcional", () => expect(bloqueiosSequenciais([{ passos: [{ id: "a", obrigatorio: false }, { id: "b", obrigatorio: true }] }], new Set(), true).has("b")).toBe(true));
});
describe("entradas privadas do Caderno", () => {
  it("rascunho não conta como entrada", () => expect(entradaSubmetida("em_curso", { texto: "Reflexão em rascunho" })).toBeNull());
  it("reflexão submetida conta como entrada", () => expect(entradaSubmetida("concluido", { texto: "A minha reflexão" })).toBe("A minha reflexão"));
});