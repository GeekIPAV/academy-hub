import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Award,
  BellRing,
  Check,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { StatusChip } from "@/components/shell/StatusChip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MaisTempo, TurmaFtpDialog } from "@/components/equipa/TurmaFtpDialog";
import { getAcompanhamento, lembrarEducadores, type Acompanhamento, type BadgeDaLinha, type LinhaAcompanhamento } from "@/lib/jornada-acompanhamento.functions";
import { atribuirBadgeComExcecao, concluirSessaoFinal, prolongarBadge, retirarExcecaoBadge } from "@/lib/badges-etapas.functions";
import { inscreverNaFtpPelaEquipa, marcarFtcPelaEquipa } from "@/lib/jornada-gestao.functions";
import { moverEscolaData } from "@/lib/ftp-calendario.functions";
import { Textarea } from "@/components/ui/textarea";
import type { EtapaBadge } from "@/lib/badges-etapas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { darMaisTempoFtc, marcarPresencaFtp, registarDesistencia } from "@/lib/ftp-etapas.functions";
import { atualizarEstadoParticipante } from "@/lib/equipa-programas.functions";
import { FASES, FASE_POR_ID, type FaseId } from "@/lib/jornada-fases";
import { formatarDataPt, hojeISO } from "@/lib/ftp-calendario";

const TODOS = "__todos";
const curta = (d: string | null | undefined) => (d ? formatarDataPt(d, { day: "numeric", month: "short" }) : "—");
const ETAPAS = ["Inscrição", "FTC", "FTP", "Semana Ubuntu", "Sessão Final", "Fora do percurso"] as const;

function FaseChip({ fase }: { fase: FaseId }) {
  const f = FASE_POR_ID[fase];
  return (
    <StatusChip tone={f.tom} dot>
      {f.label}
    </StatusChip>
  );
}

function useAcoesEducador(chave: unknown[]) {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: chave });
  const presencaFn = useServerFn(marcarPresencaFtp);
  const desistFn = useServerFn(registarDesistencia);
  const tempoFn = useServerFn(darMaisTempoFtc);
  const aprovarFn = useServerFn(atualizarEstadoParticipante);
  const sessaoFinalFn = useServerFn(concluirSessaoFinal);
  const prolongarFn = useServerFn(prolongarBadge);
  const retirarExcecaoFn = useServerFn(retirarExcecaoBadge);
  const moverFn = useServerFn(moverEscolaData);
  const ftcFn = useServerFn(marcarFtcPelaEquipa);
  const inscreverFn = useServerFn(inscreverNaFtpPelaEquipa);
  const excecaoFn = useServerFn(atribuirBadgeComExcecao);
  const erro = (e: Error) => toast.error(e.message);
  return {
    presenca: useMutation({
      mutationFn: (v: { ftpId: string; userId: string; presenca: "presente" | "faltou" | "aceite" }) => presencaFn({ data: v }),
      onSuccess: (_r, v) => {
        toast.success(v.presenca === "presente" ? "Presença marcada." : v.presenca === "faltou" ? "Falta registada." : "Presença retirada.");
        invalidar();
      },
      onError: erro,
    }),
    desistencia: useMutation({
      mutationFn: (v: { inscricaoProgramaId: string; desistiu: boolean }) => desistFn({ data: v }),
      onSuccess: (_r, v) => {
        toast.success(v.desistiu ? "Desistência registada. A escola foi avisada." : "Desistência retirada.");
        invalidar();
      },
      onError: erro,
    }),
    tempo: useMutation({
      mutationFn: (v: { inscricaoProgramaId: string; ate: string | null }) => tempoFn({ data: v }),
      onSuccess: () => {
        toast.success("Prazo da FTC atualizado.");
        invalidar();
      },
      onError: erro,
    }),
    aprovar: useMutation({
      mutationFn: (id: string) => aprovarFn({ data: { id, status: "aprovada" } }),
      onSuccess: () => {
        toast.success("Inscrição aprovada.");
        invalidar();
      },
      onError: erro,
    }),
    sessaoFinal: useMutation({
      mutationFn: (v: { inscricaoProgramaId: string; concluida: boolean }) => sessaoFinalFn({ data: v }),
      onSuccess: (r, v) => {
        toast.success(
          v.concluida
            ? r.semBadge
              ? "Percurso concluído. Define o badge da Sessão Final nas regras do programa."
              : "Percurso concluído. O badge final foi atribuído."
            : "Conclusão retirada.",
        );
        invalidar();
      },
      onError: erro,
    }),
    prolongar: useMutation({
      mutationFn: (v: { userId: string; badgeId: string; ate: string | null }) => prolongarFn({ data: v }),
      onSuccess: () => {
        toast.success("Validade do badge atualizada.");
        invalidar();
      },
      onError: erro,
    }),
    retirarExcecao: useMutation({
      mutationFn: (excecaoId: string) => retirarExcecaoFn({ data: { excecaoId } }),
      onSuccess: (r) => {
        toast.success(r.badgeRetirado ? "Exceção retirada. O badge foi retirado." : "Exceção retirada; a etapa já está cumprida.");
        invalidar();
      },
      onError: erro,
    }),
    mover: useMutation({
      mutationFn: (v: { cohortId: string; tipo: "FTP" | "SU"; destinoId: string | null }) => moverFn({ data: v }),
      onSuccess: (r, v) => {
        toast.success(v.tipo === "FTP" ? "FTP da escola atualizada. A escola foi avisada." : "Semana Ubuntu da escola atualizada.");
        if (r.acimaDoMaximo) toast.warning("Esta FTP ficou acima do máximo de vagas.");
        invalidar();
      },
      onError: erro,
    }),
    ftc: useMutation({
      mutationFn: (v: { inscricaoProgramaId: string; concluida: boolean; motivo?: string }) => ftcFn({ data: v }),
      onSuccess: (_r, v) => {
        toast.success(v.concluida ? "FTC marcada como concluída." : "Conclusão da FTC retirada.");
        invalidar();
      },
      onError: erro,
    }),
    inscreverFtp: useMutation({
      mutationFn: (v: { inscricaoProgramaId: string; inscrito: boolean }) => inscreverFn({ data: v }),
      onSuccess: (_r, v) => {
        toast.success(v.inscrito ? "Inscrito na FTP." : "Inscrição na FTP retirada.");
        invalidar();
      },
      onError: erro,
    }),
    excecao: useMutation({
      mutationFn: (v: { badgeId: string; userId: string; programId: string; etapa: EtapaBadge; motivo: string }) => excecaoFn({ data: v }),
      onSuccess: () => {
        toast.success("Badge atribuído por decisão da equipa.");
        invalidar();
      },
      onError: erro,
    }),
  };
}

export function AcompanhamentoJornada() {
  const fn = useServerFn(getAcompanhamento);
  const lembrarFn = useServerFn(lembrarEducadores);
  const [programId, setProgramId] = useState<string>(TODOS);
  const [ftpId, setFtpId] = useState<string>(TODOS);
  const [escola, setEscola] = useState<string>(TODOS);
  const [q, setQ] = useState("");
  const [fase, setFase] = useState<FaseId | null>(null);
  const [soAcao, setSoAcao] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState<LinhaAcompanhamento | null>(null);
  const [turma, setTurma] = useState<string | null>(null);

  const chave = ["acompanhamento", programId];
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: chave,
    queryFn: () => fn({ data: { programId: programId === TODOS ? null : programId } }),
  });
  const acoes = useAcoesEducador(chave);

  const linhas = data?.linhas ?? [];
  const ftpsDoPrograma = (data?.ftps ?? []).filter((f) => programId === TODOS || f.program_id === programId);
  const escolas = useMemo(() => Array.from(new Set(linhas.map((l) => l.escola))).sort((a, b) => a.localeCompare(b, "pt-PT")), [linhas]);

  // Filtros base (sem a fase), para o funil mostrar contagens úteis.
  const base = useMemo(() => {
    const t = q.trim().toLowerCase();
    return linhas.filter(
      (l) =>
        (ftpId === TODOS || l.ftp?.id === ftpId) &&
        (escola === TODOS || l.escola === escola) &&
        (!soAcao || l.alerta) &&
        (!t || `${l.nome} ${l.email ?? ""} ${l.escola}`.toLowerCase().includes(t)),
    );
  }, [linhas, ftpId, escola, soAcao, q]);
  const visiveis = fase ? base.filter((l) => l.fase === fase) : base;
  const contagem = useMemo(() => {
    const m = new Map<FaseId, { total: number; alerta: number }>();
    for (const l of base) {
      const c = m.get(l.fase) ?? { total: 0, alerta: 0 };
      c.total++;
      if (l.alerta) c.alerta++;
      m.set(l.fase, c);
    }
    return m;
  }, [base]);
  const totalAlertas = base.filter((l) => l.alerta).length;
  const selecionadas = visiveis.filter((l) => sel.has(l.inscricao_programa_id));
  const todasSel = visiveis.length > 0 && selecionadas.length === visiveis.length;

  const lembrar = useMutation({
    mutationFn: (ids: string[]) => lembrarFn({ data: { programId: programId === TODOS ? null : programId, inscricaoIds: ids } }),
    onSuccess: (r) =>
      toast.success(
        r.enviados
          ? `Lembrete enviado a ${r.enviados} Educador(es).${r.ignorados ? ` ${r.ignorados} não tinham nada a fazer.` : ""}`
          : "Nenhum dos selecionados tem um passo seu por fazer.",
      ),
    onError: (e: Error) => toast.error(e.message),
  });

  const [emLote, setEmLote] = useState(false);
  const presencaEmLote = async (presenca: "presente" | "faltou") => {
    const alvo = selecionadas.filter((l) => l.ftp && (l.fase === "presenca_por_marcar" || l.fase === "inscrito_ftp") && l.ftp.start_date && hojeISO() >= l.ftp.start_date);
    if (!alvo.length) return toast.info("Nenhum dos selecionados tem a FTP por marcar hoje ou antes.");
    setEmLote(true);
    let ok = 0;
    for (const l of alvo) {
      try {
        await acoes.presenca.mutateAsync({ ftpId: l.ftp!.id, userId: l.user_id, presenca });
        ok++;
      } catch {
        /* o toast de erro já foi mostrado */
      }
    }
    setEmLote(false);
    setSel(new Set());
    toast.success(`${ok} presença(s) registada(s).`);
  };

  const toggle = (id: string, on: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <Filtro label="Programa">
          <Select
            value={programId}
            onValueChange={(v) => {
              setProgramId(v);
              setFtpId(TODOS);
              setEscola(TODOS);
              setSel(new Set());
            }}
          >
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os programas ativos</SelectItem>
              {(data?.programas ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title ?? "Programa"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Filtro>
        <Filtro label="FTP">
          <Select value={ftpId} onValueChange={setFtpId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas as FTP</SelectItem>
              {ftpsDoPrograma.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {formatarDataPt(f.start_date)}
                  {f.localizacao ? ` · ${f.localizacao}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Filtro>
        <Filtro label="Escola">
          <Select value={escola} onValueChange={setEscola}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas as escolas</SelectItem>
              {escolas.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Filtro>
        <Filtro label="Procurar">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou email" className="w-56 pl-8" />
          </div>
        </Filtro>
        <label className="flex h-10 items-center gap-2 text-sm">
          <Switch checked={soAcao} onCheckedChange={setSoAcao} />
          Só o que precisa de ação
        </label>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : error ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-destructive">{(error as Error).message}</p>
      ) : (
        <>
          {/* Funil por fase */}
          <div className="min-w-0 overflow-x-auto">
            <div className="flex min-w-max gap-4">
              {ETAPAS.map((etapa) => {
                const fases = FASES.filter((f) => f.etapa === etapa);
                return (
                  <div key={etapa} className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{etapa}</p>
                    <div className="flex gap-2">
                      {fases.map((f) => {
                        const c = contagem.get(f.id) ?? { total: 0, alerta: 0 };
                        const ativa = fase === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            aria-pressed={ativa}
                            onClick={() => setFase(ativa ? null : f.id)}
                            className={`w-36 rounded-lg border p-3 text-left transition-colors ${
                              ativa ? "border-secondary bg-secondary/5 ring-1 ring-secondary" : "bg-card hover:bg-muted/50"
                            } ${c.total === 0 ? "opacity-60" : ""}`}
                          >
                            <p className="text-2xl font-semibold tabular-nums text-secondary">{c.total}</p>
                            <p className="text-xs leading-snug text-muted-foreground">{f.label}</p>
                            {c.alerta > 0 && (
                              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#B42318]">
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                {c.alerta} com ação
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {visiveis.length} Educador(es)
              {fase ? ` em «${FASE_POR_ID[fase].label}»` : ""} · {totalAlertas} precisam de ação
              {fase && (
                <button type="button" className="ml-2 text-secondary underline-offset-4 hover:underline" onClick={() => setFase(null)}>
                  ver todas as fases
                </button>
              )}
            </p>
            {selecionadas.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-secondary-foreground">
                <span className="text-sm">{selecionadas.length} selecionado(s)</span>
                <Button size="sm" variant="outline" className="border-0 bg-white text-secondary hover:bg-white/90" disabled={lembrar.isPending} onClick={() => lembrar.mutate(selecionadas.map((l) => l.inscricao_programa_id))}>
                  <BellRing className="mr-1.5 h-4 w-4" />
                  Lembrar próximo passo
                </Button>
                <Button size="sm" variant="outline" className="border-0 bg-white text-secondary hover:bg-white/90" disabled={emLote} onClick={() => presencaEmLote("presente")}>
                  {emLote ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserCheck className="mr-1.5 h-4 w-4" />}
                  Marcar presentes
                </Button>
                <Button size="sm" variant="outline" className="border-0 bg-white text-secondary hover:bg-white/90" disabled={emLote} onClick={() => presencaEmLote("faltou")}>
                  Marcar falta
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-secondary-foreground" aria-label="Limpar seleção" onClick={() => setSel(new Set())}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={todasSel}
                      onCheckedChange={(v) => setSel(v ? new Set(visiveis.map((l) => l.inscricao_programa_id)) : new Set())}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Educador</TableHead>
                  <TableHead>Escola · programa</TableHead>
                  <TableHead className="w-28">FTP</TableHead>
                  <TableHead className="w-48">Fase</TableHead>
                  <TableHead>Próximo passo</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      {linhas.length === 0
                        ? "Ainda não há Educadores inscritos nos programas ativos."
                        : "Nenhum Educador com estes filtros."}
                    </TableCell>
                  </TableRow>
                )}
                {visiveis.map((l) => (
                  <TableRow key={l.inscricao_programa_id} className="cursor-pointer" onClick={() => setAberto(l)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={sel.has(l.inscricao_programa_id)}
                        onCheckedChange={(v) => toggle(l.inscricao_programa_id, v === true)}
                        aria-label={`Selecionar ${l.nome}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{l.nome}</div>
                      <div className="text-xs text-muted-foreground">{l.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{l.escola}</div>
                      <div className="text-xs text-muted-foreground">{l.program_title}</div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{l.ftp ? curta(l.ftp.start_date) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <FaseChip fase={l.fase} />
                        {l.porExcecao && <StatusChip tone="navy">Por decisão da equipa</StatusChip>}
                        {l.aviso_badge && <span className="text-[11px] font-medium text-[#6B4200]">Badge a expirar</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className={`text-sm ${l.alerta ? "font-medium text-[#B42318]" : ""}`}>{l.proximo}</p>
                      {l.quem && <p className="text-xs text-muted-foreground">Quem: {l.quem}</p>}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <MenuAcoes l={l} acoes={acoes} onAbrir={() => setAberto(l)} onTurma={setTurma} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <FichaEducador
        linha={aberto ? linhas.find((l) => l.inscricao_programa_id === aberto.inscricao_programa_id) ?? aberto : null}
        ftps={data?.ftps ?? []}
        sus={data?.sus ?? []}
        colegas={aberto ? linhas.filter((l) => l.cohort_id === aberto.cohort_id).length : 0}
        acoes={acoes}
        onClose={() => setAberto(null)}
        onTurma={setTurma}
      />
      {turma && <TurmaFtpDialog ftpId={turma} onClose={() => setTurma(null)} />}
    </div>
  );
}

function Filtro({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

type Acoes = ReturnType<typeof useAcoesEducador>;

function podeMarcarPresenca(l: LinhaAcompanhamento) {
  return !!l.ftp?.start_date && hojeISO() >= l.ftp.start_date && l.estado_programa !== "desistiu";
}

function MenuAcoes({
  l,
  acoes,
  onAbrir,
  onTurma,
}: {
  l: LinhaAcompanhamento;
  acoes: Acoes;
  onAbrir: () => void;
  onTurma: (ftpId: string) => void;
}) {
  const desistiu = l.estado_programa === "desistiu";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Ações para ${l.nome}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{l.nome}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onAbrir}>Ver percurso</DropdownMenuItem>
        {l.ftp && <DropdownMenuItem onSelect={() => onTurma(l.ftp!.id)}>Abrir a turma da FTP</DropdownMenuItem>}
        <DropdownMenuSeparator />
        {l.fase === "pendente" && (
          <DropdownMenuItem onSelect={() => acoes.aprovar.mutate(l.inscricao_programa_id)}>Aprovar inscrição</DropdownMenuItem>
        )}
        {podeMarcarPresenca(l) && l.inscricao_ftp !== "presente" && (
          <DropdownMenuItem onSelect={() => acoes.presenca.mutate({ ftpId: l.ftp!.id, userId: l.user_id, presenca: "presente" })}>
            Marcar presente
          </DropdownMenuItem>
        )}
        {podeMarcarPresenca(l) && l.inscricao_ftp !== "faltou" && (
          <DropdownMenuItem onSelect={() => acoes.presenca.mutate({ ftpId: l.ftp!.id, userId: l.user_id, presenca: "faltou" })}>
            Marcar falta
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => acoes.desistencia.mutate({ inscricaoProgramaId: l.inscricao_programa_id, desistiu: !desistiu })}>
          {desistiu ? "Retirar desistência" : "Registar desistência"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Marco({
  feito,
  atual,
  titulo,
  detalhe,
  badge,
  children,
}: {
  feito: boolean;
  atual?: boolean;
  titulo: string;
  detalhe?: string | null;
  badge?: BadgeDaLinha | null;
  children?: ReactNode;
}) {
  return (
    <li className="group flex gap-3">
      <div className="flex w-5 shrink-0 flex-col items-center">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
            feito ? "bg-[#11643F] text-white" : atual ? "border-2 border-primary bg-card" : "border-2 border-border bg-card"
          }`}
          aria-hidden="true"
        >
          {feito && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        <span className={`w-0.5 flex-1 group-last:hidden ${feito ? "bg-[#11643F]" : "bg-border"}`} aria-hidden="true" />
      </div>
      <div className="min-w-0 pb-5 group-last:pb-0">
        <p className={`text-sm ${atual ? "font-semibold text-secondary" : feito ? "text-secondary" : "text-muted-foreground"}`}>
          {titulo}
          {feito && <span className="sr-only"> (concluído)</span>}
          {atual && <span className="sr-only"> (etapa atual)</span>}
        </p>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
        {badge && <BadgeDoMarco b={badge} />}
        {children && <div className="mt-2 flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </li>
  );
}

function BadgeDoMarco({ b }: { b: BadgeDaLinha }) {
  const tom = b.excecao
    ? "border-[#C9D6E8] bg-[#E6EDF6]"
    : b.tem
      ? "border-transparent bg-muted/60"
      : "border-dashed border-border bg-card";
  const info = b.excecao
    ? `Dado à mão a ${curta(b.excecao.criado_em.slice(0, 10))} · ${b.excecao.motivo}`
    : b.tem
      ? b.expira_em
        ? `Válido até ${formatarDataPt(b.expira_em.slice(0, 10))}`
        : "Permanente"
      : "Dado ao cumprir esta etapa";
  return (
    <div className={`mt-2 flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${tom}`}>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          b.tem ? (b.excecao ? "bg-white text-secondary" : "bg-[#E7F5EE] text-[#11643F]") : "bg-[#EFEFF1] text-[#544E4F]"
        }`}
      >
        <Award className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-secondary">{b.titulo}</p>
        <p className="text-[11px] text-muted-foreground">{info}</p>
      </div>
    </div>
  );
}

type DataFtp = Acompanhamento["ftps"][number];
type DataSu = Acompanhamento["sus"][number];

function descreverFtp(f: { start_date: string | null; localizacao: string | null }) {
  return `${f.start_date ? formatarDataPt(f.start_date) : "Sem data"}${f.localizacao ? ` · ${f.localizacao}` : ""}`;
}
function descreverSu(f: { start_date: string | null; end_date: string | null; localizacao: string | null }) {
  const de = f.start_date ? curta(f.start_date) : "Sem data";
  const ate = f.end_date && f.end_date !== f.start_date ? ` a ${curta(f.end_date)}` : "";
  return `${de}${ate}${f.localizacao ? ` · ${f.localizacao}` : ""}`;
}

function FichaEducador({
  linha: l,
  ftps,
  sus,
  colegas,
  acoes,
  onClose,
  onTurma,
}: {
  linha: LinhaAcompanhamento | null;
  ftps: DataFtp[];
  sus: DataSu[];
  colegas: number;
  acoes: Acoes;
  onClose: () => void;
  onTurma: (ftpId: string) => void;
}) {
  const ordem: FaseId[] = ["pendente", "sem_ftp", "aguarda_ftc", "ftc_em_curso", "ftc_atraso", "inscricao_ftp", "inscrito_ftp", "presenca_por_marcar", "semana_ubuntu", "concluido"];
  const badgeDe = (etapa: EtapaBadge) => l?.badges.find((b) => b.etapa === etapa) ?? null;
  const aExpirar = (l?.badges ?? []).find((b) => b.tem && b.expira_em && l?.fim_acesso && b.expira_em.slice(0, 10) < l.fim_acesso) ?? null;
  const concluido = l?.estado_programa === "concluido";
  const pos = l ? ordem.indexOf(l.fase) : -1;
  const passou = (f: FaseId) => pos > ordem.indexOf(f);
  const j = l?.janela ?? null;
  const desistiu = l?.estado_programa === "desistiu";
  const pendente = l?.fase === "pendente";

  /** Botões de badge de uma etapa: dar por decisão da equipa ou retirar a exceção. */
  const badgeAcoes = (etapa: EtapaBadge, rotulo: string) => {
    const b = badgeDe(etapa);
    if (!l || !b) return null;
    if (b.excecao) {
      return (
        <Button size="sm" variant="ghost" className="h-8" onClick={() => acoes.retirarExcecao.mutate(b.excecao!.id)}>
          Retirar exceção
        </Button>
      );
    }
    if (b.tem || desistiu) return null;
    return (
      <ComMotivo
        rotulo={rotulo}
        titulo={`Dar «${b.titulo}» sem a etapa cumprida`}
        ajuda="Fica registado como decisão da equipa, com o motivo, e aparece assim na jornada."
        pending={acoes.excecao.isPending}
        onGuardar={(motivo) => acoes.excecao.mutate({ badgeId: b.badge_id, userId: l.user_id, programId: l.program_id, etapa, motivo })}
      />
    );
  };

  const ftpsDoPrograma = l ? ftps.filter((f) => f.program_id === l.program_id) : [];
  const susDoPrograma = l ? sus.filter((f) => f.program_id === l.program_id) : [];
  const avisoEscola = colegas > 1 ? `Vale para toda a escola (${colegas} Educadores). A escola é avisada.` : "A escola é avisada.";
  const inscritoFtp = l?.inscricao_ftp === "aceite" || l?.inscricao_ftp === "presente";

  return (
    <Sheet open={!!l} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-lg overflow-y-auto sm:max-w-lg">
        {l && (
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <SheetTitle>{l.nome}</SheetTitle>
              <SheetDescription>
                {l.escola} · {l.program_title}
              </SheetDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                <FaseChip fase={l.fase} />
                {l.porExcecao && <StatusChip tone="navy">Por decisão da equipa</StatusChip>}
                {l.alerta && <StatusChip tone="red">Precisa de ação</StatusChip>}
              </div>
            </SheetHeader>

            <div className={`rounded-lg p-3 text-sm ${l.alerta ? "bg-[#FDEDEC] text-[#B42318]" : "bg-muted/50"}`}>
              <p className="font-medium">Próximo passo</p>
              <p>{l.proximo}</p>
              {l.quem && <p className="mt-1 text-xs opacity-80">Quem: {l.quem}</p>}
            </div>

            {l.aviso_badge && (
              <div role="note" className="flex gap-2.5 rounded-lg bg-[#FFF1CC] p-3 text-sm text-[#6B4200]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  <strong className="font-semibold">Um badge expira antes do fim do percurso.</strong> {l.aviso_badge}
                </p>
              </div>
            )}

            {desistiu && (
              <div role="note" className="rounded-lg bg-muted/60 p-3 text-sm">
                Registado como desistência. Retira a desistência no fim da ficha para voltar a gerir as etapas.
              </div>
            )}

            <ol>
              <Marco feito={!pendente} atual={pendente} titulo="Inscrição no programa" detalhe={pendente ? "Por aprovar" : "Aprovada"} badge={badgeDe("inscricao")}>
                {pendente && (
                  <Button size="sm" className="h-8" onClick={() => acoes.aprovar.mutate(l.inscricao_programa_id)}>
                    <Check className="mr-1.5 h-4 w-4" />
                    Aprovar inscrição
                  </Button>
                )}
                {!pendente && badgeAcoes("inscricao", "Dar badge")}
              </Marco>

              <Marco
                feito={!!l.ftp && l.fase !== "sem_ftp"}
                atual={l.fase === "sem_ftp"}
                titulo="FTP escolhida pela escola"
                detalhe={l.ftp ? `${descreverFtp(l.ftp)}${l.ftp.ativa ? "" : " (cancelada)"}` : "Por escolher"}
              >
                {!desistiu && (
                  <EscolherData
                    rotulo={l.ftp ? "Mudar FTP" : "Escolher FTP"}
                    titulo="FTP da escola"
                    atual={l.ftp?.id ?? null}
                    opcoes={ftpsDoPrograma.map((f) => ({ id: f.id, nome: descreverFtp(f) }))}
                    vazio="Este programa ainda não tem datas de FTP. Cria-as no Calendário FTP."
                    aviso={avisoEscola}
                    pending={acoes.mover.isPending}
                    onGuardar={(id) => acoes.mover.mutate({ cohortId: l.cohort_id, tipo: "FTP", destinoId: id })}
                  />
                )}
                {l.ftp && (
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => onTurma(l.ftp!.id)}>
                    <Users className="mr-1.5 h-4 w-4" />
                    Turma
                  </Button>
                )}
              </Marco>

              <Marco
                feito={!!l.ftc.concluida_em}
                atual={["aguarda_ftc", "ftc_em_curso", "ftc_atraso"].includes(l.fase)}
                titulo="FTC (e-learning)"
                detalhe={
                  !l.ftc.curso_id
                    ? "FTC do programa por definir no Calendário FTP"
                    : l.ftc.concluida_em
                      ? `Concluída a ${curta(l.ftc.concluida_em)}${l.ftc.badge ? " · badge" : ""}`
                      : j
                        ? `De ${curta(j.abertura)} a ${curta(j.fimConclusao)}${l.prazo_extra_ate ? ` · prazo extra até ${curta(l.prazo_extra_ate)}` : ""}`
                        : l.ftc.estado === "em_curso"
                          ? "Em curso"
                          : null
                }
                badge={badgeDe("ftc")}
              >
                {l.ftc.curso_id && !desistiu && !l.ftc.concluida_em && (
                  <ComMotivo
                    rotulo="Marcar concluída"
                    titulo="Marcar a FTC como concluída"
                    ajuda="Conclui a FTC e dá o badge. Fica registado como decisão da equipa."
                    inicial="Concluiu a FTC fora da plataforma."
                    pending={acoes.ftc.isPending}
                    onGuardar={(motivo) => acoes.ftc.mutate({ inscricaoProgramaId: l.inscricao_programa_id, concluida: true, motivo })}
                  />
                )}
                {l.ftc.concluida_em && !inscritoFtp && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => acoes.ftc.mutate({ inscricaoProgramaId: l.inscricao_programa_id, concluida: false })}
                  >
                    Retirar conclusão
                  </Button>
                )}
                {!l.ftc.concluida_em && !desistiu && j && (
                  <MaisTempo
                    atual={l.prazo_extra_ate}
                    max={j.inscricaoFim}
                    pending={acoes.tempo.isPending}
                    onGuardar={(ate) => acoes.tempo.mutate({ inscricaoProgramaId: l.inscricao_programa_id, ate })}
                  />
                )}
              </Marco>

              <Marco
                feito={inscritoFtp}
                atual={l.fase === "inscricao_ftp"}
                titulo="Inscrição na FTP"
                detalhe={inscritoFtp ? "Inscrito" : j ? `De ${curta(j.inscricaoInicio)} a ${curta(j.inscricaoFim)}` : null}
              >
                {l.ftp && !desistiu && !inscritoFtp && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => acoes.inscreverFtp.mutate({ inscricaoProgramaId: l.inscricao_programa_id, inscrito: true })}
                  >
                    Inscrever na FTP
                  </Button>
                )}
                {l.inscricao_ftp === "aceite" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => acoes.inscreverFtp.mutate({ inscricaoProgramaId: l.inscricao_programa_id, inscrito: false })}
                  >
                    Retirar inscrição
                  </Button>
                )}
              </Marco>

              <Marco
                feito={l.inscricao_ftp === "presente"}
                atual={l.fase === "inscrito_ftp" || l.fase === "presenca_por_marcar"}
                titulo="Presença na FTP"
                detalhe={
                  l.inscricao_ftp === "faltou"
                    ? "Faltou"
                    : l.inscricao_ftp === "presente"
                      ? "Presente"
                      : l.ftp?.start_date
                        ? podeMarcarPresenca(l)
                          ? curta(l.ftp.start_date)
                          : `Marca-se a partir de ${curta(l.ftp.start_date)}`
                        : null
                }
              >
                {podeMarcarPresenca(l) && l.inscricao_ftp !== "presente" && (
                  <Button size="sm" className="h-8" onClick={() => acoes.presenca.mutate({ ftpId: l.ftp!.id, userId: l.user_id, presenca: "presente" })}>
                    <UserCheck className="mr-1.5 h-4 w-4" />
                    Presente
                  </Button>
                )}
                {podeMarcarPresenca(l) && l.inscricao_ftp !== "faltou" && l.inscricao_ftp !== "presente" && (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => acoes.presenca.mutate({ ftpId: l.ftp!.id, userId: l.user_id, presenca: "faltou" })}>
                    Faltou
                  </Button>
                )}
                {(l.inscricao_ftp === "presente" || l.inscricao_ftp === "faltou") && l.ftp && (
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => acoes.presenca.mutate({ ftpId: l.ftp!.id, userId: l.user_id, presenca: "aceite" })}>
                    {l.inscricao_ftp === "presente" ? "Retirar presença" : "Retirar falta"}
                  </Button>
                )}
              </Marco>

              <Marco
                feito={l.apto_semana_ubuntu || passou("semana_ubuntu")}
                atual={l.fase === "semana_ubuntu"}
                titulo="Semana Ubuntu"
                detalhe={[
                  l.su ? `Escola: ${descreverSu(l.su)}` : "Data da escola por escolher",
                  l.apto_semana_ubuntu ? "Bloco aberto no Centro de recursos" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                badge={badgeDe("presenca_ftp")}
              >
                {!desistiu && (
                  <EscolherData
                    rotulo={l.su ? "Mudar data" : "Escolher data"}
                    titulo="Semana Ubuntu da escola"
                    atual={l.su?.id ?? null}
                    opcoes={susDoPrograma.map((f) => ({ id: f.id, nome: descreverSu(f) }))}
                    vazio="Este programa ainda não tem datas de Semana Ubuntu. Cria-as no Calendário FTP."
                    aviso={avisoEscola}
                    pending={acoes.mover.isPending}
                    onGuardar={(id) => acoes.mover.mutate({ cohortId: l.cohort_id, tipo: "SU", destinoId: id })}
                  />
                )}
                {badgeAcoes("presenca_ftp", "Abrir sem presença")}
              </Marco>

              <Marco
                feito={concluido}
                titulo="Sessão Final"
                detalhe={concluido ? "Concluída · percurso fechado" : "Fecha o percurso"}
                badge={badgeDe("sessao_final")}
              >
                {!desistiu && !pendente && (
                  <Button
                    size="sm"
                    variant={concluido ? "ghost" : l.fase === "semana_ubuntu" ? "default" : "outline"}
                    className="h-8"
                    onClick={() => acoes.sessaoFinal.mutate({ inscricaoProgramaId: l.inscricao_programa_id, concluida: !concluido })}
                  >
                    {!concluido && <Check className="mr-1.5 h-4 w-4" />}
                    {concluido ? "Retirar conclusão" : "Concluir Sessão Final"}
                  </Button>
                )}
              </Marco>

              <Marco feito={l.fase === "terminado"} titulo="Fim do acesso" detalhe={l.fim_acesso ? formatarDataPt(l.fim_acesso) : "Definido pela data da FTP"}>
                {aExpirar && (
                  <ProlongarBadge
                    titulo={aExpirar.titulo}
                    sugestao={l.fim_acesso}
                    pending={acoes.prolongar.isPending}
                    onGuardar={(ate) => acoes.prolongar.mutate({ userId: l.user_id, badgeId: aExpirar.badge_id, ate })}
                  />
                )}
              </Marco>
            </ol>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => acoes.desistencia.mutate({ inscricaoProgramaId: l.inscricao_programa_id, desistiu: !desistiu })}
              >
                <UserX className="mr-1.5 h-4 w-4" />
                {desistiu ? "Retirar desistência" : "Registar desistência"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EscolherData({
  rotulo,
  titulo,
  atual,
  opcoes,
  vazio,
  aviso,
  pending,
  onGuardar,
}: {
  rotulo: string;
  titulo: string;
  atual: string | null;
  opcoes: { id: string; nome: string }[];
  vazio: string;
  aviso: string;
  pending: boolean;
  onGuardar: (id: string | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState<string>(atual ?? "");
  return (
    <Popover
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (o) setValor(atual ?? "");
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          {rotulo}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3">
        <p className="text-[13px] font-medium text-secondary">{titulo}</p>
        {opcoes.length === 0 ? (
          <p className="text-xs text-muted-foreground">{vazio}</p>
        ) : (
          <>
            <Select value={valor} onValueChange={setValor}>
              <SelectTrigger>
                <SelectValue placeholder="Escolhe a data" />
              </SelectTrigger>
              <SelectContent>
                {opcoes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{aviso}</p>
          </>
        )}
        <div className="flex justify-between gap-2">
          {atual ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                onGuardar(null);
                setAberto(false);
              }}
            >
              Retirar a data
            </Button>
          ) : (
            <span />
          )}
          <Button
            size="sm"
            disabled={!valor || valor === atual || pending}
            onClick={() => {
              onGuardar(valor);
              setAberto(false);
            }}
          >
            Guardar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ComMotivo({
  rotulo,
  titulo,
  ajuda,
  inicial = "",
  pending,
  onGuardar,
}: {
  rotulo: string;
  titulo: string;
  ajuda: string;
  inicial?: string;
  pending: boolean;
  onGuardar: (motivo: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState(inicial);
  return (
    <Popover
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (o) setMotivo(inicial);
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          {rotulo}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3">
        <p className="text-[13px] font-medium text-secondary">{titulo}</p>
        <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
          Motivo
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Porque é que esta pessoa avança sem a etapa?" />
        </label>
        <p className="text-xs text-muted-foreground">{ajuda}</p>
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={motivo.trim().length < 3 || pending}
            onClick={() => {
              onGuardar(motivo.trim());
              setAberto(false);
            }}
          >
            Confirmar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProlongarBadge({
  titulo,
  sugestao,
  pending,
  onGuardar,
}: {
  titulo: string;
  sugestao: string | null;
  pending: boolean;
  onGuardar: (ate: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [ate, setAte] = useState(sugestao ?? "");
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          Prolongar badge
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <label className="block space-y-1.5 text-[13px] font-medium text-secondary">
          «{titulo}» válido até
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </label>
        <p className="text-xs text-muted-foreground">Sugestão: o fim do acesso ao percurso.</p>
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!ate || pending}
            onClick={() => {
              onGuardar(ate);
              setAberto(false);
            }}
          >
            Guardar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
