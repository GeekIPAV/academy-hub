import { describe, expect, it } from "vitest";
import { pctPorModulos, podeConcluirCurso } from "./elearning-progress";

const m1 = { passos: [{ id: "a", obrigatorio: true }, { id: "b", obrigatorio: true }] };
const vazio = { passos: [] };

describe("conclusão de curso", () => {
  it("não conclui quando há módulos vazios, mesmo com o módulo 1 completo", () => {
    expect(podeConcluirCurso([m1, vazio], new Set(["a", "b"]))).toBe(false);
  });
  it("não conclui com módulo só com passos opcionais", () => {
    expect(podeConcluirCurso([m1, { passos: [{ id: "c", obrigatorio: false }] }], new Set(["a", "b", "c"]))).toBe(false);
  });
  it("conclui quando todos os módulos têm obrigatórios concluídos", () => {
    expect(podeConcluirCurso([m1, { passos: [{ id: "c", obrigatorio: true }] }], new Set(["a", "b", "c"]))).toBe(true);
  });
  it("falta um obrigatório → não conclui", () => {
    expect(podeConcluirCurso([m1], new Set(["a"]))).toBe(false);
  });
});

describe("progresso do curso", () => {
  it("módulo 1 de 5 concluído (restantes vazios) mostra 20%, não 100%", () => {
    expect(pctPorModulos([{ total: 9, feitos: 9 }, { total: 0, feitos: 0 }, { total: 0, feitos: 0 }, { total: 0, feitos: 0 }, { total: 0, feitos: 0 }])).toBe(20);
  });
  it("todos completos → 100%", () => {
    expect(pctPorModulos([{ total: 2, feitos: 2 }, { total: 1, feitos: 1 }])).toBe(100);
  });
});

import { situacaoInscrito } from "./elearning-progress";
describe("situação do inscrito", () => {
  const agora = new Date("2026-10-08T12:00:00Z").getTime();
  it("inscrito sem atividade → Não começou", () => expect(situacaoInscrito("inscrito", false, null, agora)).toBe("nao_comecou"));
  it("último acesso há 8 dias → parado", () => expect(situacaoInscrito("em_curso", true, "2026-09-30T12:00:00Z", agora)).toBe("parado"));
  it("último acesso há 6 dias → em curso", () => expect(situacaoInscrito("em_curso", true, "2026-10-02T12:00:00Z", agora)).toBe("em_curso"));
  it("concluído prevalece", () => expect(situacaoInscrito("concluido", true, "2026-01-01T00:00:00Z", agora)).toBe("concluido"));
});
