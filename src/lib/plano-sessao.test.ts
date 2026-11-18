import { describe, expect, it } from "vitest";
import {
  formatDuracao,
  isPausa,
  materiaisDaSessao,
  parseHorario,
  resumoSessao,
  separarMateriais,
  type PlanoBloco,
} from "./plano-sessao";

const bloco = (p: Partial<PlanoBloco>): PlanoBloco => ({
  id: Math.random().toString(36),
  tema_id: "t",
  sort_order: 0,
  tipo: null,
  title: null,
  description: null,
  duration_minutes: null,
  schedule: null,
  materials: null,
  objetivos: null,
  recurso_ids: [],
  ...p,
});

describe("plano de sessão", () => {
  it("lê horários com travessão, hífen ou 'h'", () => {
    expect(parseHorario("09:00–09:10")).toEqual({ inicio: "09:00", fim: "09:10" });
    expect(parseHorario("9h00 - 9h10")).toEqual({ inicio: "9h00", fim: "9h10" });
    expect(parseHorario(null)).toEqual({ inicio: null, fim: null });
  });

  it("separa o equipamento da sala do material específico", () => {
    expect(separarMateriais("Computador;\nProjetor;\nSistema de som.\nMúsica;\nFita-cola pintor")).toEqual({
      equipamento: ["PC", "Projetor", "Som"],
      materiais: ["Música", "Fita-cola pintor"],
    });
  });

  it("junta os materiais de todos os blocos sem repetir", () => {
    const blocos = [bloco({ materials: "Marcadores\nPost-its" }), bloco({ materials: "marcadores\nProjetor" })];
    expect(materiaisDaSessao(blocos)).toEqual(["Marcadores", "Post-its"]);
  });

  it("reconhece pausas e resume a sessão", () => {
    const blocos = [
      bloco({ title: "Acolhimento", schedule: "09:00–09:10", duration_minutes: 10 }),
      bloco({ tipo: "Intervalo", schedule: "09:10–09:30", duration_minutes: 20 }),
      bloco({ title: "Dinâmica", schedule: "09:30–10:00", duration_minutes: 30 }),
    ];
    expect(isPausa(blocos[1])).toBe(true);
    expect(resumoSessao(blocos)).toEqual({ inicio: "09:00", fim: "10:00", duracao: 60, momentos: 2 });
    expect(formatDuracao(60)).toBe("1h");
    expect(formatDuracao(95)).toBe("1h 35");
  });
});
