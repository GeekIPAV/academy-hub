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
