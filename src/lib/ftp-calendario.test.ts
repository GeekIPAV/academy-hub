import { describe, expect, it } from "vitest";
import {
  aberturaModuloTurma,
  avaliarInscricaoFtp,
  decisaoPendente,
  eBlocoSemanaUbuntu,
  ftcEmAtraso,
  prazoFtc,
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

describe("Fase 2: inscrição na FTP", () => {
  const base = {
    hoje: "2027-02-09",
    ftpData: "2027-02-15",
    ftpAtiva: true,
    estadoPrograma: "aprovada",
    ftcConcluidaEm: "2027-02-05",
    temBadgeFtc: true,
    atrasoPermitido: true,
    prazoExtraAte: null,
    jaInscrito: false,
  };

  it("deixa inscrever na 2.ª semana com o badge", () => {
    expect(avaliarInscricaoFtp(base)).toEqual({ pode: true });
  });

  it("não deixa antes da 2.ª semana, e diz quando abre", () => {
    expect(avaliarInscricaoFtp({ ...base, hoje: "2027-02-06" })).toMatchObject({ pode: false, abreEm: "2027-02-08" });
  });

  it("exige o badge da FTC", () => {
    expect(avaliarInscricaoFtp({ ...base, temBadgeFtc: false, ftcConcluidaEm: null }).pode).toBe(false);
  });

  it("bloqueia desistências e FTP canceladas", () => {
    expect(avaliarInscricaoFtp({ ...base, estadoPrograma: "desistiu" }).pode).toBe(false);
    expect(avaliarInscricaoFtp({ ...base, ftpAtiva: false }).pode).toBe(false);
  });

  it("fecha na véspera da FTP", () => {
    expect(avaliarInscricaoFtp({ ...base, hoje: "2027-02-14" }).pode).toBe(true);
    expect(avaliarInscricaoFtp({ ...base, hoje: "2027-02-15" }).pode).toBe(false);
  });

  it("com atraso proibido, quem concluiu na 2.ª semana não entra, a não ser com prazo extra", () => {
    const tarde = { ...base, ftcConcluidaEm: "2027-02-09", atrasoPermitido: false };
    expect(avaliarInscricaoFtp(tarde).pode).toBe(false);
    expect(avaliarInscricaoFtp({ ...tarde, prazoExtraAte: "2027-02-10" }).pode).toBe(true);
    expect(avaliarInscricaoFtp({ ...base, ftcConcluidaEm: "2027-02-09" }).pode).toBe(true);
  });

  it("calcula o prazo da FTC", () => {
    expect(prazoFtc("2027-02-15", false, null)).toBe("2027-02-07");
    expect(prazoFtc("2027-02-15", true, null)).toBe("2027-02-14");
    expect(prazoFtc("2027-02-15", false, "2027-03-01")).toBe("2027-02-14");
  });

  it("marca atrasos e decisões pendentes", () => {
    expect(ftcEmAtraso("2027-02-15", null, null, "2027-02-08")).toBe(true);
    expect(ftcEmAtraso("2027-02-15", null, "2027-02-10", "2027-02-08")).toBe(false);
    expect(ftcEmAtraso("2027-02-15", "2027-02-03", null, "2027-02-10")).toBe(false);
    expect(decisaoPendente(3, 5, 10, 21)).toBe(true);
    expect(decisaoPendente(3, 5, 30, 21)).toBe(false);
    expect(decisaoPendente(6, 5, 10, 21)).toBe(false);
  });

  it("reconhece o bloco Semana Ubuntu", () => {
    expect(eBlocoSemanaUbuntu("SU")).toBe(true);
    expect(eBlocoSemanaUbuntu("Semana Ubuntu · dia 1")).toBe(true);
    expect(eBlocoSemanaUbuntu("FTP")).toBe(false);
    expect(eBlocoSemanaUbuntu(null)).toBe(false);
  });
});
