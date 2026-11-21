import { describe, expect, it } from "vitest";
import { folgaPlano, verificarLimite } from "./planos-subscricao";
import { acessoTerminado, emAvisoFimAcesso, fimAcessoAnoLetivo, mmddValido } from "./ftp-calendario";

describe("planos", () => {
  it("sem plano não há limite", () => {
    expect(verificarLimite(null, true, "escolas", 99)).toEqual({ pode: true, aviso: false, max: null });
  });
  it("bloqueia só quando configurado", () => {
    expect(verificarLimite("C", true, "escolas", 1).pode).toBe(false);
    expect(verificarLimite("C", false, "escolas", 1)).toEqual({ pode: true, aviso: true, max: 1 });
    expect(verificarLimite("A", true, "educadores", 16, 1)).toEqual({ pode: true, aviso: false, max: 18 });
    expect(verificarLimite("A", true, "educadores", 17, 1)).toEqual({ pode: true, aviso: true, max: 18 });
    expect(verificarLimite("A", true, "educadores", 17, 3).pode).toBe(false);
  });
  it("calcula a folga", () => {
    expect(folgaPlano("B", { escolas: 1, educadores: 13, replicacoes: 0 })).toEqual({ escolas: 1, educadores: -1, replicacoes: 12 });
  });
});

describe("fim do ano letivo", () => {
  it("fecha no fim do ano letivo da FTP", () => {
    expect(fimAcessoAnoLetivo("2027-02-15")).toBe("2027-08-31");
    expect(fimAcessoAnoLetivo("2026-10-10")).toBe("2027-08-31");
    expect(fimAcessoAnoLetivo("2027-07-10", "07-31")).toBe("2027-07-31");
    expect(fimAcessoAnoLetivo("2027-08-31")).toBe("2027-08-31");
  });
  it("avisa e corta", () => {
    expect(emAvisoFimAcesso("2027-08-31", 30, "2027-08-01")).toBe(true);
    expect(emAvisoFimAcesso("2027-08-31", 30, "2027-07-31")).toBe(false);
    expect(acessoTerminado("2027-08-31", "2027-08-31")).toBe(false);
    expect(acessoTerminado("2027-08-31", "2027-09-01")).toBe(true);
    expect(mmddValido("08-31")).toBe(true);
    expect(mmddValido("13-01")).toBe(false);
  });
});
