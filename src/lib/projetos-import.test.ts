import { describe, expect, it } from "vitest";
import { parseProjetosCsv } from "./projetos-import";

describe("parseProjetosCsv", () => {
  it("lê as quatro colunas com ; e datas portuguesas", () => {
    const r = parseProjetosCsv("Projeto;Data início;Data fim;Status\nAlfa;01/02/2026;31/12/2026;Em curso");
    expect(r.rows).toEqual([{ title: "Alfa", data_inicio: "2026-02-01", data_fim: "2026-12-31", status: "em_curso" }]);
  });
  it("aceita os novos status do Notion", () => {
    const csv = [
      "Projeto;Status",
      "Alfa;Possibilidade",
      "Beta;Em arranque",
      "Gama;Em contratualização",
      "Delta;Em progresso",
      "Épsilon;Institucional",
      "Zeta;Em fecho",
      "Eta;Terminado",
    ].join("\n");
    const r = parseProjetosCsv(csv);
    expect(r.errors).toHaveLength(0);
    expect(r.rows.map((x) => x.status)).toEqual([
      "possibilidade", "em_arranque", "em_contratualizacao", "em_progresso",
      "institucional", "em_fecho", "terminado",
    ]);
  });
  it("lê linhas coladas sem cabeçalho", () => {
    const r = parseProjetosCsv("Projeto Sem Cabeçalho;01/07/2024;31/12/2025;Em fecho\nOutro;;;Em arranque");
    expect(r.errors).toHaveLength(0);
    expect(r.rows).toEqual([
      { title: "Projeto Sem Cabeçalho", data_inicio: "2024-07-01", data_fim: "2025-12-31", status: "em_fecho" },
      { title: "Outro", data_inicio: null, data_fim: null, status: "em_arranque" },
    ]);
  });
  it("assinala status desconhecido", () => {
    const r = parseProjetosCsv("Projeto,Status\nBeta,xpto");
    expect(r.rows).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
  });
});
