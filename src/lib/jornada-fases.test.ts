import { describe, expect, it } from "vitest";
import { calcularFase, type EstadoEducador } from "./jornada-fases";

const base: EstadoEducador = {
  hoje: "2027-01-20",
  estadoPrograma: "aprovada",
  ftpData: "2027-02-15",
  ftpAtiva: true,
  ftcConfigurada: true,
  ftcEstado: null,
  ftcConcluidaEm: null,
  inscricaoFtp: null,
  aptoSemanaUbuntu: false,
  prazoExtraAte: null,
  atrasoPermitido: true,
  fimAcesso: "2027-08-31",
};

const fase = (p: Partial<EstadoEducador>) => calcularFase({ ...base, ...p }).fase;

describe("fase do Educador", () => {
  it("segue o percurso", () => {
    expect(fase({ estadoPrograma: "lista_espera" })).toBe("pendente");
    expect(fase({ ftpData: null })).toBe("sem_ftp");
    expect(fase({})).toBe("aguarda_ftc");
    expect(fase({ hoje: "2027-02-03" })).toBe("ftc_em_curso");
    expect(fase({ hoje: "2027-02-09" })).toBe("ftc_atraso");
    expect(fase({ hoje: "2027-02-09", ftcConcluidaEm: "2027-02-05", ftcEstado: "concluido" })).toBe("inscricao_ftp");
    expect(fase({ hoje: "2027-02-10", inscricaoFtp: "aceite" })).toBe("inscrito_ftp");
    expect(fase({ hoje: "2027-02-15", inscricaoFtp: "aceite" })).toBe("presenca_por_marcar");
    expect(fase({ hoje: "2027-02-16", inscricaoFtp: "presente", aptoSemanaUbuntu: true })).toBe("semana_ubuntu");
    expect(fase({ hoje: "2027-09-01", inscricaoFtp: "presente" })).toBe("terminado");
  });

  it("assinala o que precisa da equipa", () => {
    expect(calcularFase({ ...base, hoje: "2027-02-15", inscricaoFtp: "aceite" })).toMatchObject({ alerta: true, quem: "Equipa IPAV" });
    expect(calcularFase({ ...base, hoje: "2027-02-03" }).alerta).toBe(false);
    expect(calcularFase({ ...base, ftcConfigurada: false, hoje: "2027-02-03" })).toMatchObject({ fase: "aguarda_ftc", alerta: true });
  });

  it("desistências e faltas saem do percurso", () => {
    expect(fase({ estadoPrograma: "desistiu", inscricaoFtp: "presente" })).toBe("desistiu");
    expect(fase({ inscricaoFtp: "faltou" })).toBe("faltou");
    expect(fase({ ftpAtiva: false })).toBe("sem_ftp");
  });

  it("o prazo extra mantém a FTC em curso", () => {
    expect(fase({ hoje: "2027-02-09", prazoExtraAte: "2027-02-11" })).toBe("ftc_em_curso");
  });
});
