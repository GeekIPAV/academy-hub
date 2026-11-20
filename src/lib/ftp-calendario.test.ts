import { describe, expect, it } from "vitest";
import {
  aberturaModuloTurma,
  cabeNaFtp,
  disponivelParaEscola,
  escolhaAbertaParaEscola,
  estadoVagas,
  ftpAtiva,
  janelaFtc,
  vagasRestantes,
} from "./ftp-calendario";

describe("janelaFtc", () => {
  it("abre 14 dias antes e divide em duas semanas", () => {
    expect(janelaFtc("2027-02-15")).toEqual({
      abertura: "2027-02-01",
      fimConclusao: "2027-02-07",
      inscricaoInicio: "2027-02-08",
      inscricaoFim: "2027-02-14",
      ftp: "2027-02-15",
    });
  });

  it("atravessa meses e anos", () => {
    expect(janelaFtc("2027-01-05").abertura).toBe("2026-12-22");
  });
});

describe("aberturaModuloTurma", () => {
  it("turma ancorada na FTP fica fechada até à abertura da FTC, mesmo em curso autónomo", () => {
    expect(
      aberturaModuloTurma({ modalidade: "autonomo", aberturaDias: null, turmaInicio: null, ftpData: "2027-02-15", hoje: "2027-01-20" }),
    ).toBe("2027-02-01");
  });

  it("turma ancorada abre no dia da abertura", () => {
    expect(
      aberturaModuloTurma({ modalidade: "turma", aberturaDias: null, turmaInicio: null, ftpData: "2027-02-15", hoje: "2027-02-01" }),
    ).toBeNull();
  });

  it("abertura_dias conta a partir da abertura da FTC", () => {
    expect(
      aberturaModuloTurma({ modalidade: "turma", aberturaDias: 3, turmaInicio: "2000-01-01", ftpData: "2027-02-15", hoje: "2027-02-02" }),
    ).toBe("2027-02-04");
  });

  it("mantém a regra antiga para turmas sem FTP", () => {
    expect(aberturaModuloTurma({ modalidade: "autonomo", aberturaDias: 5, turmaInicio: "2027-01-01", hoje: "2026-12-01" })).toBeNull();
    expect(aberturaModuloTurma({ modalidade: "turma", aberturaDias: null, turmaInicio: "2027-01-01", hoje: "2026-12-01" })).toBeNull();
    expect(aberturaModuloTurma({ modalidade: "turma", aberturaDias: 2, turmaInicio: "2027-01-01", hoje: "2026-12-01" })).toBe("2027-01-03");
  });
});

describe("vagas", () => {
  it("classifica a turma de acreditação", () => {
    expect(estadoVagas(3, 5, 20)).toBe("abaixo_minimo");
    expect(estadoVagas(5, 5, 20)).toBe("ok");
    expect(estadoVagas(20, 5, 20)).toBe("cheia");
    expect(estadoVagas(21, 5, 20)).toBe("acima_maximo");
    expect(estadoVagas(0, null, null)).toBe("ok");
  });

  it("só deixa entrar a escola inteira", () => {
    expect(cabeNaFtp(15, 5, 20)).toBe(true);
    expect(cabeNaFtp(16, 5, 20)).toBe(false);
    expect(cabeNaFtp(100, 5, null)).toBe(true);
    expect(vagasRestantes(18, 20)).toBe(2);
    expect(vagasRestantes(25, 20)).toBe(0);
  });
});

describe("escolha pela escola", () => {
  it("pode mudar até ao dia em que a FTC abre", () => {
    expect(escolhaAbertaParaEscola(null, "2027-02-10")).toBe(true);
    expect(escolhaAbertaParaEscola("2027-02-15", "2027-02-01")).toBe(true);
    expect(escolhaAbertaParaEscola("2027-02-15", "2027-02-02")).toBe(false);
  });

  it("filtra por projeto", () => {
    expect(disponivelParaEscola([], ["p1"])).toBe(true);
    expect(disponivelParaEscola(["p1", "p2"], ["p2"])).toBe(true);
    expect(disponivelParaEscola(["p1"], [])).toBe(false);
  });

  it("ignora FTP canceladas", () => {
    expect(ftpAtiva("Marcada")).toBe(true);
    expect(ftpAtiva("Cancelada")).toBe(false);
  });
});
