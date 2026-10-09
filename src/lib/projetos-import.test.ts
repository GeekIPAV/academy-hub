import { describe, expect, it } from "vitest";
import { parseProjetosCsv } from "./projetos-import";

describe("parseProjetosCsv", () => {
  it("lê as quatro colunas com ; e datas portuguesas", () => {
    const r = parseProjetosCsv("Projeto;Data início;Data fim;Status\nAlfa;01/02/2026;31/12/2026;Em curso");
    expect(r.rows).toEqual([{ title: "Alfa", data_inicio: "2026-02-01", data_fim: "2026-12-31", status: "em_curso" }]);
  });
  it("assinala status desconhecido", () => {
    const r = parseProjetosCsv("Projeto,Status\nBeta,xpto");
    expect(r.rows).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
  });
});
