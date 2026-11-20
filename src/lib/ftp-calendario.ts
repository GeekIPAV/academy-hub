/**
 * Calendário ancorado na FTP — regras puras (sem acesso à base de dados),
 * partilhadas pelo servidor e pela interface.
 *
 * A data da FTP é a âncora: a FTC abre 14 dias antes (1.ª semana para
 * concluir, 2.ª semana para a inscrição na FTP) e cada FTP forma uma turma
 * de acreditação com 5 a 20 Educadores.
 */

/** A FTC abre 14 dias antes da FTP. */
export const FTC_DIAS_ANTES_FTP = 14;
/** Dias da 1.ª semana, para concluir a FTC. */
export const FTC_DIAS_CONCLUSAO = 7;
export const FTP_MIN_EDUCADORES = 5;
export const FTP_MAX_EDUCADORES = 20;

export function hojeISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function somarDias(dataISO: string, dias: number): string {
  const d = new Date(`${dataISO.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(deISO: string, ateISO: string): number {
  const a = Date.parse(`${deISO.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${ateISO.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export interface JanelaFtc {
  /** Dia em que a FTC abre (FTP − 14). */
  abertura: string;
  /** Último dia da 1.ª semana, para concluir a FTC (FTP − 8). */
  fimConclusao: string;
  /** Primeiro dia da 2.ª semana, a da inscrição na FTP (FTP − 7). */
  inscricaoInicio: string;
  /** Véspera da FTP, fim da janela de inscrição (FTP − 1). */
  inscricaoFim: string;
  ftp: string;
}

export function janelaFtc(ftpData: string): JanelaFtc {
  const ftp = ftpData.slice(0, 10);
  const abertura = somarDias(ftp, -FTC_DIAS_ANTES_FTP);
  return {
    abertura,
    fimConclusao: somarDias(abertura, FTC_DIAS_CONCLUSAO - 1),
    inscricaoInicio: somarDias(abertura, FTC_DIAS_CONCLUSAO),
    inscricaoFim: somarDias(ftp, -1),
    ftp,
  };
}

/**
 * Data em que um módulo abre, ou null se já está aberto.
 *
 * - Turma ancorada numa FTP: nada abre antes da abertura da FTC
 *   (FTP − 14), qualquer que seja a modalidade do curso; `abertura_dias`
 *   conta a partir dessa data.
 * - Outras turmas: regra de sempre — só em cursos por turma e só quando o
 *   módulo tem `abertura_dias`.
 */
export function aberturaModuloTurma(input: {
  modalidade: string;
  aberturaDias: number | null;
  turmaInicio: string | null;
  ftpData?: string | null;
  hoje?: string;
}): string | null {
  const hoje = input.hoje ?? hojeISO();
  if (input.ftpData) {
    const inicio = janelaFtc(input.ftpData).abertura;
    const abre = somarDias(inicio, Math.max(0, input.aberturaDias ?? 0));
    return abre > hoje ? abre : null;
  }
  if (input.modalidade !== "turma" || input.aberturaDias == null || !input.turmaInicio) return null;
  const abre = somarDias(input.turmaInicio, input.aberturaDias);
  return abre > hoje ? abre : null;
}

export type EstadoVagasFtp = "abaixo_minimo" | "ok" | "cheia" | "acima_maximo";

export function estadoVagas(educadores: number, min: number | null, max: number | null): EstadoVagasFtp {
  if (max != null && educadores > max) return "acima_maximo";
  if (max != null && educadores === max) return "cheia";
  if (min != null && educadores < min) return "abaixo_minimo";
  return "ok";
}

/** Vagas que sobram numa FTP (null quando não há máximo). */
export function vagasRestantes(educadores: number, max: number | null): number | null {
  return max == null ? null : Math.max(0, max - educadores);
}

/** A escola só pode juntar-se a uma FTP se couberem todos os seus Educadores. */
export function cabeNaFtp(educadoresFtp: number, educadoresEscola: number, max: number | null): boolean {
  return max == null || educadoresFtp + educadoresEscola <= max;
}

/**
 * A pessoa de contacto escolhe (ou muda) a FTP até ao dia em que a FTC dessa
 * FTP abre. Depois disso, só a equipa IPAV pode mudar a escola de FTP.
 */
export function escolhaAbertaParaEscola(ftpData: string | null, hoje: string = hojeISO()): boolean {
  if (!ftpData) return true;
  return hoje <= janelaFtc(ftpData).abertura;
}

/** Uma FTP pode ser escolhida pela escola se a FTC ainda não abriu. */
export function ftpEscolhivelPelaEscola(ftpData: string, hoje: string = hojeISO()): boolean {
  return hoje <= janelaFtc(ftpData).abertura;
}

/**
 * Uma FTP (ou slot de Semana Ubuntu) sem projetos serve todas as escolas do
 * programa; com projetos, só as escolas desses projetos.
 */
export function disponivelParaEscola(projetosDaData: string[], projetosDaEscola: string[]): boolean {
  if (projetosDaData.length === 0) return true;
  const meus = new Set(projetosDaEscola);
  return projetosDaData.some((p) => meus.has(p));
}

export const ESTADOS_INATIVOS_FTP = ["Cancelada", "Fechada"];

export function ftpAtiva(status: string | null | undefined): boolean {
  return !ESTADOS_INATIVOS_FTP.includes(status ?? "");
}

export function formatarDataPt(dataISO: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!dataISO) return "—";
  return new Intl.DateTimeFormat("pt-PT", opts ?? { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${dataISO.slice(0, 10)}T12:00:00Z`),
  );
}

// ---------------------------------------------------------------------------
// Fase 2 — etapas com condição
// ---------------------------------------------------------------------------

export const FTP_DIAS_DECISAO_PADRAO = 21;

export interface CondicoesInscricaoFtp {
  hoje: string;
  ftpData: string;
  ftpAtiva: boolean;
  /** Estado do Educador no programa (inscritos_programa.status). */
  estadoPrograma: string | null;
  /** Data (YYYY-MM-DD) em que concluiu a FTC, ou null. */
  ftcConcluidaEm: string | null;
  /** Tem o badge da FTC válido (ou o curso não tem badge e concluiu). */
  temBadgeFtc: boolean;
  /** Regra do programa: quem falha a 1.ª semana ainda vai a esta FTP. */
  atrasoPermitido: boolean;
  /** Prazo extra dado pela equipa IPAV para concluir a FTC. */
  prazoExtraAte: string | null;
  jaInscrito: boolean;
}

export type ResultadoInscricaoFtp =
  | { pode: true }
  | { pode: false; motivo: string; abreEm?: string };

/** Prazo para concluir a FTC e continuar nesta FTP. */
export function prazoFtc(ftpData: string, atrasoPermitido: boolean, prazoExtraAte: string | null): string {
  const j = janelaFtc(ftpData);
  const base = atrasoPermitido ? j.inscricaoFim : j.fimConclusao;
  return prazoExtraAte && prazoExtraAte > base ? (prazoExtraAte > j.inscricaoFim ? j.inscricaoFim : prazoExtraAte) : base;
}

/**
 * Inscrição na FTP: só na 2.ª semana (FTP − 7 a FTP − 1), só com o badge da
 * FTC e só para quem não desistiu. Se o programa não permite atraso, a FTC
 * tem de estar concluída até ao fim da 1.ª semana (ou do prazo extra).
 */
export function avaliarInscricaoFtp(c: CondicoesInscricaoFtp): ResultadoInscricaoFtp {
  const j = janelaFtc(c.ftpData);
  if (c.jaInscrito) return { pode: false, motivo: "Já estás inscrito nesta FTP." };
  if (!c.ftpAtiva) return { pode: false, motivo: "Esta FTP foi cancelada." };
  if (c.estadoPrograma === "desistiu") return { pode: false, motivo: "A tua participação no programa foi dada como desistência." };
  if (c.estadoPrograma && c.estadoPrograma !== "aprovada") return { pode: false, motivo: "A tua inscrição no programa ainda não está aprovada." };
  if (c.hoje > j.inscricaoFim) return { pode: false, motivo: "A inscrição nesta FTP já fechou." };
  if (!c.temBadgeFtc || !c.ftcConcluidaEm) {
    return c.hoje < j.inscricaoInicio
      ? { pode: false, motivo: "Conclui a FTC para te poderes inscrever.", abreEm: j.inscricaoInicio }
      : { pode: false, motivo: "Conclui a FTC para te poderes inscrever." };
  }
  const prazo = prazoFtc(c.ftpData, c.atrasoPermitido, c.prazoExtraAte);
  if (c.ftcConcluidaEm.slice(0, 10) > prazo) {
    return { pode: false, motivo: "Concluíste a FTC depois do prazo desta FTP. Fala com a equipa IPAV." };
  }
  if (c.hoje < j.inscricaoInicio) {
    return { pode: false, motivo: "A inscrição na FTP abre na 2.ª semana.", abreEm: j.inscricaoInicio };
  }
  return { pode: true };
}

/** FTC por concluir depois do prazo (para alertas e para a lista da equipa). */
export function ftcEmAtraso(ftpData: string, ftcConcluidaEm: string | null, prazoExtraAte: string | null, hoje: string = hojeISO()): boolean {
  if (ftcConcluidaEm) return false;
  const limite = prazoExtraAte && prazoExtraAte > janelaFtc(ftpData).fimConclusao ? prazoExtraAte : janelaFtc(ftpData).fimConclusao;
  return hoje > limite;
}

/** Uma FTP abaixo do mínimo entra na janela de decisão N dias antes. */
export function decisaoPendente(
  educadores: number,
  min: number | null,
  diasParaFtp: number | null,
  diasDecisao: number,
): boolean {
  return min != null && educadores < min && diasParaFtp != null && diasParaFtp >= 0 && diasParaFtp <= diasDecisao;
}

/** Espelho de public.e_bloco_semana_ubuntu (migração 0011). */
export function eBlocoSemanaUbuntu(bloco: string | null | undefined): boolean {
  if (!bloco) return false;
  const b = bloco.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  return b === "su" || b.includes("semana ubuntu");
}

// ---------------------------------------------------------------------------
// Fase 3 — fim do ano letivo
// ---------------------------------------------------------------------------

export const FIM_ACESSO_PADRAO = "08-31";
export const AVISO_FIM_ACESSO_DIAS_PADRAO = 30;

/**
 * Último dia de acesso à FTC e à Semana Ubuntu: o primeiro dia MM-DD
 * (fim do ano letivo) a partir da data da FTP. Espelho de
 * public.fim_acesso_ftp (migração 0012).
 */
export function fimAcessoAnoLetivo(ftpData: string, mmdd: string = FIM_ACESSO_PADRAO): string {
  const ftp = ftpData.slice(0, 10);
  const [m, d] = mmdd.split("-").map(Number);
  const candidato = (ano: number) => somarDias(`${ano}-${String(m).padStart(2, "0")}-01`, d - 1);
  const ano = Number(ftp.slice(0, 4));
  const este = candidato(ano);
  return este >= ftp ? este : candidato(ano + 1);
}

export function acessoTerminado(fimAcesso: string | null, hoje: string = hojeISO()): boolean {
  return !!fimAcesso && hoje > fimAcesso;
}

/** Dentro da janela de aviso para descarregar os materiais. */
export function emAvisoFimAcesso(fimAcesso: string | null, diasAviso: number, hoje: string = hojeISO()): boolean {
  return !!fimAcesso && hoje <= fimAcesso && hoje >= somarDias(fimAcesso, -diasAviso);
}

/** Valida 'MM-DD'. */
export function mmddValido(v: string): boolean {
  return /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(v);
}
