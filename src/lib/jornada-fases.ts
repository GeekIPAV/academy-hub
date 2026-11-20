/**
 * Fase atual de cada Educador na Formação de Educadores Ubuntu, calculada a
 * partir do estado real (inscrição no programa, FTP da escola, FTC, inscrição
 * e presença na FTP, fim do ano letivo). Usada no acompanhamento da equipa
 * em /admin/jornada. Regras de datas em ftp-calendario.ts.
 */
import { ftcEmAtraso, formatarDataPt, janelaFtc, prazoFtc } from "@/lib/ftp-calendario";

export type FaseId =
  | "pendente"
  | "sem_ftp"
  | "aguarda_ftc"
  | "ftc_em_curso"
  | "ftc_atraso"
  | "inscricao_ftp"
  | "inscrito_ftp"
  | "presenca_por_marcar"
  | "semana_ubuntu"
  | "faltou"
  | "desistiu"
  | "terminado";

export interface FaseInfo {
  id: FaseId;
  label: string;
  /** Etapa do percurso a que pertence (para agrupar no funil). */
  etapa: "Inscrição" | "FTC" | "FTP" | "Semana Ubuntu" | "Fora do percurso";
  tom: "grey" | "navy" | "yellow" | "red" | "green" | "orange";
}

export const FASES: FaseInfo[] = [
  { id: "pendente", label: "Inscrição por aprovar", etapa: "Inscrição", tom: "yellow" },
  { id: "sem_ftp", label: "Escola sem FTP", etapa: "Inscrição", tom: "yellow" },
  { id: "aguarda_ftc", label: "À espera da FTC", etapa: "FTC", tom: "grey" },
  { id: "ftc_em_curso", label: "FTC em curso", etapa: "FTC", tom: "navy" },
  { id: "ftc_atraso", label: "FTC em atraso", etapa: "FTC", tom: "red" },
  { id: "inscricao_ftp", label: "Por inscrever na FTP", etapa: "FTP", tom: "orange" },
  { id: "inscrito_ftp", label: "Inscrito na FTP", etapa: "FTP", tom: "navy" },
  { id: "presenca_por_marcar", label: "Presença por marcar", etapa: "FTP", tom: "red" },
  { id: "semana_ubuntu", label: "Semana Ubuntu", etapa: "Semana Ubuntu", tom: "green" },
  { id: "faltou", label: "Faltou à FTP", etapa: "Fora do percurso", tom: "red" },
  { id: "desistiu", label: "Desistiu", etapa: "Fora do percurso", tom: "grey" },
  { id: "terminado", label: "Ano letivo terminado", etapa: "Fora do percurso", tom: "grey" },
];

export const FASE_POR_ID = Object.fromEntries(FASES.map((f) => [f.id, f])) as Record<FaseId, FaseInfo>;

export interface EstadoEducador {
  hoje: string;
  estadoPrograma: string | null;
  ftpData: string | null;
  ftpAtiva: boolean;
  ftcConfigurada: boolean;
  ftcEstado: string | null;
  ftcConcluidaEm: string | null;
  inscricaoFtp: string | null;
  aptoSemanaUbuntu: boolean;
  prazoExtraAte: string | null;
  atrasoPermitido: boolean;
  fimAcesso: string | null;
}

export interface FaseCalculada {
  fase: FaseId;
  /** O que tem de acontecer a seguir, em linguagem simples. */
  proximo: string;
  /** Quem tem de agir. */
  quem: "Educador" | "Escola" | "Equipa IPAV" | null;
  /** Precisa de atenção da equipa. */
  alerta: boolean;
}

const dia = (d: string) => formatarDataPt(d, { day: "numeric", month: "short" });

export function calcularFase(e: EstadoEducador): FaseCalculada {
  if (e.estadoPrograma === "desistiu") return { fase: "desistiu", proximo: "Fora do percurso.", quem: null, alerta: false };
  if (e.estadoPrograma === "lista_espera" || e.estadoPrograma === "pendente") {
    return { fase: "pendente", proximo: "Aprovar a inscrição no programa.", quem: "Equipa IPAV", alerta: true };
  }
  if (e.fimAcesso && e.hoje > e.fimAcesso) {
    return { fase: "terminado", proximo: `Acesso fechado a ${dia(e.fimAcesso)}.`, quem: null, alerta: false };
  }
  if (e.inscricaoFtp === "presente") {
    return {
      fase: "semana_ubuntu",
      proximo: e.aptoSemanaUbuntu ? "Viver a Semana Ubuntu no slot da escola." : "Definir o badge «Apto para a Semana Ubuntu» do programa.",
      quem: e.aptoSemanaUbuntu ? "Educador" : "Equipa IPAV",
      alerta: !e.aptoSemanaUbuntu,
    };
  }
  if (e.inscricaoFtp === "faltou") return { fase: "faltou", proximo: "Escolher outra FTP com a escola.", quem: "Equipa IPAV", alerta: true };
  if (!e.ftpData || !e.ftpAtiva) {
    return {
      fase: "sem_ftp",
      proximo: e.ftpData ? "A FTP foi cancelada: escolher outra data." : "A escola tem de escolher a data da FTP.",
      quem: "Escola",
      alerta: !!e.ftpData,
    };
  }

  const j = janelaFtc(e.ftpData);
  const inscrito = e.inscricaoFtp === "aceite";
  if (inscrito) {
    if (e.hoje >= e.ftpData) {
      return { fase: "presenca_por_marcar", proximo: `Marcar a presença na FTP de ${dia(e.ftpData)}.`, quem: "Equipa IPAV", alerta: true };
    }
    return { fase: "inscrito_ftp", proximo: `Ir à FTP a ${dia(e.ftpData)}.`, quem: "Educador", alerta: false };
  }
  if (!e.ftcConfigurada) {
    return { fase: "aguarda_ftc", proximo: "Definir a FTC do programa no calendário.", quem: "Equipa IPAV", alerta: true };
  }
  if (e.hoje < j.abertura) {
    return { fase: "aguarda_ftc", proximo: `A FTC abre a ${dia(j.abertura)}.`, quem: null, alerta: false };
  }
  if (e.ftcConcluidaEm) {
    const passou = e.hoje > j.inscricaoFim;
    return {
      fase: "inscricao_ftp",
      proximo: passou
        ? `Não se inscreveu na FTP de ${dia(e.ftpData)}.`
        : e.hoje < j.inscricaoInicio
          ? `Inscrever-se na FTP de ${dia(j.inscricaoInicio)} a ${dia(j.inscricaoFim)}.`
          : `Inscrever-se na FTP até ${dia(j.inscricaoFim)}.`,
      quem: passou ? "Equipa IPAV" : "Educador",
      alerta: passou || e.hoje >= j.inscricaoFim,
    };
  }
  if (ftcEmAtraso(e.ftpData, null, e.prazoExtraAte, e.hoje)) {
    const prazo = prazoFtc(e.ftpData, e.atrasoPermitido, e.prazoExtraAte);
    return {
      fase: "ftc_atraso",
      proximo:
        e.hoje > prazo
          ? "Dar mais tempo ou registar a desistência."
          : `Concluir a FTC até ${dia(prazo)} para ir a esta FTP.`,
      quem: e.hoje > prazo ? "Equipa IPAV" : "Educador",
      alerta: true,
    };
  }
  const limite = e.prazoExtraAte && e.prazoExtraAte > j.fimConclusao ? e.prazoExtraAte : j.fimConclusao;
  return {
    fase: "ftc_em_curso",
    proximo: `${e.ftcEstado ? "Concluir" : "Começar"} a FTC até ${dia(limite)}.`,
    quem: "Educador",
    alerta: false,
  };
}
