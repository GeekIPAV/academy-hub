import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CalendarPlus, ChevronDown, ChevronRight, Pencil, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/shell/PageHeader";
import { StatusChip, type ChipTone } from "@/components/shell/StatusChip";
import { FormField } from "@/components/shell/FormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TurmaFtpDialog } from "@/components/equipa/TurmaFtpDialog";
import { BadgesDasEtapas } from "@/components/equipa/BadgesDasEtapas";
import { EnvioAlunosResumo } from "@/components/semana-ubuntu/AlunosSemanaUbuntu";
import { DocumentosSemanaUbuntuEquipa } from "@/components/semana-ubuntu/DocumentosSemanaUbuntuEquipa";
import { guardarRegrasPrograma } from "@/lib/ftp-etapas.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  cancelarDataPrograma,
  definirFtcPrograma,
  getCalendarioPrograma,
  guardarDataPrograma,
  moverEscolaData,
  type CalendarioPrograma,
  type DataPrograma,
  type TipoData,
} from "@/lib/ftp-calendario.functions";
import {
  FTC_DIAS_ANTES_FTP,
  FTP_MAX_EDUCADORES,
  FTP_MIN_EDUCADORES,
  fimAcessoAnoLetivo,
  formatarDataPt,
  ftpAtiva,
  mmddValido,
} from "@/lib/ftp-calendario";
import { FORMATOS_ACAO } from "@/lib/acoes-opcoes";

const NENHUMA = "__nenhuma";

const VAGAS_CHIP: Record<DataPrograma["estado_vagas"], { tone: ChipTone; label: string }> = {
  abaixo_minimo: { tone: "yellow", label: "Abaixo do mínimo" },
  ok: { tone: "green", label: "Com turma" },
  cheia: { tone: "navy", label: "Cheia" },
  acima_maximo: { tone: "red", label: "Acima do máximo" },
};

function nomeTipo(tipo: TipoData) {
  return tipo === "FTP" ? "FTP" : "Semana Ubuntu";
}

function rotuloData(d: Pick<DataPrograma, "start_date" | "end_date" | "localizacao">) {
  const fim = d.end_date && d.end_date !== d.start_date ? ` a ${formatarDataPt(d.end_date)}` : "";
  return `${formatarDataPt(d.start_date)}${fim}${d.localizacao ? ` · ${d.localizacao}` : ""}`;
}

/**
 * `parte` mostra só uma parte: "etapas" (FTC, regras e badges das etapas) ou
 * "calendario" (datas de FTP e Semana Ubuntu, documentos, escolas sem data).
 */
export function CalendarioFtpEquipa({ programId, parte = "tudo" }: { programId: string; parte?: "tudo" | "etapas" | "calendario" }) {
  const fn = useServerFn(getCalendarioPrograma);
  const { data, isLoading, error } = useQuery({
    queryKey: ["calendario-ftp", programId],
    queryFn: () => fn({ data: { programId } }),
  });
  const [editar, setEditar] = useState<{ tipo: TipoData; data: DataPrograma | null } | null>(null);
  const [cancelar, setCancelar] = useState<DataPrograma | null>(null);
  const [turma, setTurma] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !data) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-sm text-destructive">
        Não foi possível carregar o calendário ({(error as Error | null)?.message ?? "erro"}).
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {parte !== "calendario" && (
        <>
      <FtcDoPrograma cal={data} />
      <RegrasDoPrograma key={`${data.programa.id}-${data.programa.su_badge_id}-${data.programa.ftp_dias_decisao}-${data.programa.ftc_atraso_permitido}-${data.programa.fim_acesso}-${data.programa.aviso_fim_acesso_dias}`} cal={data} />
      <BadgesDasEtapas programId={data.programa.id} />
        </>
      )}

      {parte !== "etapas" && (
        <>

      <DatasTabela
        cal={data}
        tipo="FTP"
        titulo="Datas de FTP"
        descricao={`Cada FTP forma uma turma de acreditação de ${FTP_MIN_EDUCADORES} a ${FTP_MAX_EDUCADORES} Educadores. A FTC abre ${FTC_DIAS_ANTES_FTP} dias antes. Sem projetos, a data serve todas as escolas do programa.`}
        onNova={() => setEditar({ tipo: "FTP", data: null })}
        onEditar={(d) => setEditar({ tipo: "FTP", data: d })}
        onCancelar={setCancelar}
        onTurma={setTurma}
      />

      <DatasTabela
        cal={data}
        tipo="SU"
        titulo="Slots da Semana Ubuntu"
        descricao="A pessoa de contacto escolhe um slot depois da FTP. O máximo conta escolas."
        onNova={() => setEditar({ tipo: "SU", data: null })}
        onEditar={(d) => setEditar({ tipo: "SU", data: d })}
        onCancelar={setCancelar}
      />

      <DocumentosSemanaUbuntuEquipa />

      <EscolasSemData cal={data} />
        </>
      )}

      {editar && (
        <DataDialog
          programId={programId}
          cal={data}
          tipo={editar.tipo}
          inicial={editar.data}
          onClose={() => setEditar(null)}
        />
      )}
      {turma && <TurmaFtpDialog ftpId={turma} onClose={() => setTurma(null)} />}
      {cancelar && <CancelarDialog programId={programId} cal={data} alvo={cancelar} onClose={() => setCancelar(null)} />}
    </div>
  );
}

function useInvalidar(programId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["calendario-ftp", programId] });
}

function FtcDoPrograma({ cal }: { cal: CalendarioPrograma }) {
  const invalidar = useInvalidar(cal.programa.id);
  const fn = useServerFn(definirFtcPrograma);
  const m = useMutation({
    mutationFn: (cursoId: string | null) => fn({ data: { programId: cal.programa.id, cursoId } }),
    onSuccess: (r) => {
      toast.success(r.escolas ? `FTC definida. ${r.escolas} escola(s) sincronizada(s).` : "FTC do programa guardada.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Section
      title="FTC do programa"
      description="O curso de e-learning que os Educadores fazem antes da FTP. Cada FTP tem a sua turma, criada automaticamente."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={cal.programa.ftc_curso_id ?? NENHUMA}
          onValueChange={(v) => m.mutate(v === NENHUMA ? null : v)}
          disabled={m.isPending}
        >
          <SelectTrigger className="w-full max-w-md" aria-label="Curso da FTC">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NENHUMA}>Sem FTC definida</SelectItem>
            {cal.cursos.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
                {c.estado === "rascunho" ? " (rascunho)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!cal.programa.ftc_curso_id && (
          <span className="flex items-center gap-1.5 text-xs text-[#6B4200]">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Sem FTC, a escolha da FTP não inscreve os Educadores no e-learning.
          </span>
        )}
      </div>
    </Section>
  );
}

function RegrasDoPrograma({ cal }: { cal: CalendarioPrograma }) {
  const invalidar = useInvalidar(cal.programa.id);
  const fn = useServerFn(guardarRegrasPrograma);
  const [f, setF] = useState({
    atraso: cal.programa.ftc_atraso_permitido,
    dias: String(cal.programa.ftp_dias_decisao),
    badge: cal.programa.su_badge_id ?? NENHUMA,
    fim: cal.programa.fim_acesso,
    aviso: String(cal.programa.aviso_fim_acesso_dias),
  });
  const fimValido = mmddValido(f.fim);
  const alterado =
    f.atraso !== cal.programa.ftc_atraso_permitido ||
    Number(f.dias) !== cal.programa.ftp_dias_decisao ||
    (f.badge === NENHUMA ? null : f.badge) !== cal.programa.su_badge_id ||
    f.fim !== cal.programa.fim_acesso ||
    Number(f.aviso) !== cal.programa.aviso_fim_acesso_dias;
  const m = useMutation({
    mutationFn: () =>
      fn({
        data: {
          programId: cal.programa.id,
          ftc_atraso_permitido: f.atraso,
          ftp_dias_decisao: Math.max(0, Math.min(120, Number(f.dias) || 0)),
          su_badge_id: f.badge === NENHUMA ? null : f.badge,
          fim_acesso: f.fim,
          aviso_fim_acesso_dias: Math.max(0, Math.min(120, Number(f.aviso) || 0)),
        },
      }),
    onSuccess: () => {
      toast.success("Regras do programa guardadas.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Section
      title="Regras das etapas"
      description="Condições entre a FTC, a FTP e a Semana Ubuntu deste programa."
      actions={
        <Button size="sm" disabled={!alterado || !fimValido || m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? "A guardar…" : "Guardar regras"}
        </Button>
      }
    >
      <div className="grid gap-5 md:grid-cols-3">
        <FormField
          id="regra-fim"
          label="Fim do acesso (fim do ano letivo)"
          error={fimValido ? null : "Usa o formato MM-DD, por exemplo 08-31."}
          hint={`A FTC e a Semana Ubuntu fecham neste dia, para quem fez a FTP nesse ano letivo. Ex.: FTP a 15/02/2027 → acesso até ${formatarDataPt(
            fimValido ? fimAcessoAnoLetivo("2027-02-15", f.fim) : "2027-08-31",
          )}.`}
        >
          <Input id="regra-fim" value={f.fim} placeholder="08-31" maxLength={5} onChange={(e) => setF({ ...f, fim: e.target.value })} />
        </FormField>
        <FormField
          id="regra-aviso"
          label="Aviso para descarregar"
          hint="Dias antes do fecho em que os Educadores recebem o aviso para descarregar o caderno e os materiais."
        >
          <Input id="regra-aviso" type="number" min={0} max={120} value={f.aviso} onChange={(e) => setF({ ...f, aviso: e.target.value })} />
        </FormField>
        <FormField
          id="regra-atraso"
          label="Prazo falhado na FTC"
          hint={
            f.atraso
              ? "Quem não concluir na 1.ª semana ainda pode concluir e inscrever-se na FTP durante a 2.ª."
              : "Quem não concluir na 1.ª semana não entra nesta FTP, a não ser com prazo extra dado pela equipa."
          }
        >
          <div className="flex items-center gap-2 pt-1">
            <Switch id="regra-atraso" checked={f.atraso} onCheckedChange={(v) => setF({ ...f, atraso: v })} />
            <span className="text-sm">{f.atraso ? "Ainda vai a esta FTP" : "Passa para outra FTP"}</span>
          </div>
        </FormField>
        <FormField
          id="regra-dias"
          label="Decidir FTP abaixo do mínimo"
          hint="Dias antes da FTP em que a data passa a «Decidir já» se não tiver o mínimo de Educadores."
        >
          <Input id="regra-dias" type="number" min={0} max={120} value={f.dias} onChange={(e) => setF({ ...f, dias: e.target.value })} />
        </FormField>
      </div>
    </Section>
  );
}

function DatasTabela({
  cal,
  tipo,
  titulo,
  descricao,
  onNova,
  onEditar,
  onCancelar,
  onTurma,
}: {
  cal: CalendarioPrograma;
  tipo: TipoData;
  titulo: string;
  descricao: string;
  onNova: () => void;
  onEditar: (d: DataPrograma) => void;
  onCancelar: (d: DataPrograma) => void;
  onTurma?: (ftpId: string) => void;
}) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [verCanceladas, setVerCanceladas] = useState(false);
  const todas = tipo === "FTP" ? cal.ftps : cal.slots_su;
  const linhas = verCanceladas ? todas : todas.filter((d) => ftpAtiva(d.status));
  const projetoNome = useMemo(() => new Map(cal.projetos.map((p) => [p.id, p.title])), [cal.projetos]);
  const alertas = tipo === "FTP" ? linhas.filter((d) => d.decisao_pendente) : [];
  const atrasos = tipo === "FTP" ? linhas.reduce((n, d) => n + d.ftc_em_atraso, 0) : 0;

  return (
    <Section
      title={titulo}
      description={descricao}
      actions={
        <>
          {todas.length !== linhas.length || verCanceladas ? (
            <Button variant="ghost" size="sm" onClick={() => setVerCanceladas((v) => !v)}>
              {verCanceladas ? "Esconder canceladas" : "Ver canceladas"}
            </Button>
          ) : null}
          <Button size="sm" onClick={onNova}>
            <CalendarPlus className="mr-1.5 h-4 w-4" />
            {tipo === "FTP" ? "Nova FTP" : "Novo slot"}
          </Button>
        </>
      }
    >
      {alertas.length > 0 && (
        <div className="flex gap-3 rounded-xl bg-[#FFF1CC] p-4 text-sm text-[#6B4200]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <strong className="font-semibold">
              {alertas.length} FTP abaixo do mínimo a menos de {cal.programa.ftp_dias_decisao} dias.
            </strong>{" "}
            {alertas.map((a) => `${formatarDataPt(a.start_date)} (${a.ocupacao}/${a.min ?? "—"})`).join(", ")}. Decide se juntas
            com outra data ou cancelas.
          </p>
        </div>
      )}
      {atrasos > 0 && (
        <div className="flex gap-3 rounded-xl bg-[#FDEDEC] p-4 text-sm text-[#B42318]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <strong className="font-semibold">{atrasos} Educador(es) com a FTC em atraso.</strong> Abre a turma da FTP para dar
            mais tempo ou registar a desistência.
          </p>
        </div>
      )}
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Data</TableHead>
              <TableHead>Projetos</TableHead>
              <TableHead className="w-44">{tipo === "FTP" ? "Educadores" : "Escolas"}</TableHead>
              <TableHead className="w-56 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  {tipo === "FTP" ? "Ainda não há datas de FTP neste programa." : "Ainda não há slots da Semana Ubuntu."}
                </TableCell>
              </TableRow>
            )}
            {linhas.map((d) => {
              const ativa = ftpAtiva(d.status);
              const expandida = aberta === d.id;
              const chip = VAGAS_CHIP[d.estado_vagas];
              return (
                <Fragment key={d.id}>
                  <TableRow className={ativa ? "" : "opacity-60"}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={expandida ? "Esconder escolas" : "Ver escolas"}
                        aria-expanded={expandida}
                        onClick={() => setAberta(expandida ? null : d.id)}
                      >
                        {expandida ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{rotuloData(d)}</div>
                      <div className="text-xs text-muted-foreground">
                        {!ativa
                          ? d.status
                          : tipo === "FTP" && d.ftc_abre
                            ? `FTC abre a ${formatarDataPt(d.ftc_abre)}`
                            : d.formato ?? ""}
                        {ativa && d.dias_para != null && d.dias_para >= 0 ? ` · daqui a ${d.dias_para} dias` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.projetos.length ? d.projetos.map((p) => projetoNome.get(p) ?? "Projeto").join(", ") : "Todas as escolas"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm font-medium">
                          {d.ocupacao}
                          {d.max != null ? ` / ${d.max}` : ""}
                          {tipo === "FTP" && d.min != null ? <span className="font-normal text-muted-foreground"> (mín. {d.min})</span> : null}
                        </span>
                        {ativa && (tipo === "FTP" || d.estado_vagas === "cheia" || d.estado_vagas === "acima_maximo") && (
                          <StatusChip tone={d.decisao_pendente ? "red" : chip.tone}>
                            {d.decisao_pendente ? "Decidir já" : chip.label}
                          </StatusChip>
                        )}
                        {d.ftc_em_atraso > 0 && <StatusChip tone="red">{d.ftc_em_atraso} FTC em atraso</StatusChip>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {ativa && (
                        <div className="flex justify-end gap-1">
                          {onTurma && (
                            <Button variant="ghost" size="sm" onClick={() => onTurma(d.id)}>
                              <Users className="mr-1 h-4 w-4" />
                              Turma
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => onEditar(d)} aria-label="Editar data">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onCancelar(d)}>
                            <XCircle className="mr-1 h-4 w-4" />
                            Juntar ou cancelar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandida && (
                    <TableRow>
                      <TableCell />
                      <TableCell colSpan={4} className="bg-muted/30">
                        <EscolasDaData cal={cal} data={d} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}

function MoverSelect({
  cal,
  tipo,
  cohortId,
  atual,
  placeholder,
}: {
  cal: CalendarioPrograma;
  tipo: TipoData;
  cohortId: string;
  atual: string | null;
  placeholder: string;
}) {
  const invalidar = useInvalidar(cal.programa.id);
  const fn = useServerFn(moverEscolaData);
  const m = useMutation({
    mutationFn: (destinoId: string | null) => fn({ data: { cohortId, tipo, destinoId } }),
    onSuccess: (r) => {
      if (r.acimaDoMaximo) toast.warning("Escola mudada. Atenção: a FTP ficou acima do máximo.");
      else toast.success("Escola mudada. A pessoa de contacto foi avisada.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const opcoes = (tipo === "FTP" ? cal.ftps : cal.slots_su).filter((d) => ftpAtiva(d.status));
  return (
    <Select value={atual ?? NENHUMA} onValueChange={(v) => m.mutate(v === NENHUMA ? null : v)} disabled={m.isPending}>
      <SelectTrigger className="h-8 w-full max-w-xs text-xs" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NENHUMA}>{atual ? "Retirar da data" : placeholder}</SelectItem>
        {opcoes.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {rotuloData(o)} ({o.ocupacao}
            {o.max != null ? `/${o.max}` : ""})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EscolasDaData({ cal, data }: { cal: CalendarioPrograma; data: DataPrograma }) {
  if (data.escolas.length === 0) {
    return <p className="py-1 text-sm text-muted-foreground">Nenhuma escola escolheu esta data.</p>;
  }
  return (
    <ul className="divide-y">
      {data.escolas.map((e) => (
        <li key={e.cohort_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span className="min-w-0 text-sm">
            <span className="font-medium">{e.entity_name}</span>
            {data.tipo === "FTP" && <span className="text-muted-foreground"> · {e.educadores} Educadores</span>}
            {data.tipo === "SU" && (
              <span className="ml-2">
                <EnvioAlunosResumo cohortId={e.cohort_id} />
              </span>
            )}
          </span>
          <MoverSelect cal={cal} tipo={data.tipo} cohortId={e.cohort_id} atual={data.id} placeholder="Mudar para…" />
        </li>
      ))}
    </ul>
  );
}

function EscolasSemData({ cal }: { cal: CalendarioPrograma }) {
  const semFtp = cal.escolas.filter((e) => !e.ftp_acao_id);
  const semSu = cal.escolas.filter((e) => !e.su_acao_id);
  if (cal.escolas.length === 0) return null;
  return (
    <Section
      title="Escolas por escolher"
      description="Escolas aprovadas neste programa que ainda não têm FTP ou Semana Ubuntu. A pessoa de contacto escolhe na página da organização; aqui podes atribuir uma data."
    >
      {semFtp.length === 0 && semSu.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todas as escolas já escolheram as datas.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Escola</TableHead>
                <TableHead className="w-24">Educadores</TableHead>
                <TableHead>FTP</TableHead>
                <TableHead>Semana Ubuntu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cal.escolas
                .filter((e) => !e.ftp_acao_id || !e.su_acao_id)
                .map((e) => (
                  <TableRow key={e.cohort_id}>
                    <TableCell className="font-medium">{e.entity_name}</TableCell>
                    <TableCell>{e.educadores}</TableCell>
                    <TableCell>
                      {e.ftp_acao_id ? (
                        <span className="text-sm text-muted-foreground">Escolhida</span>
                      ) : (
                        <MoverSelect cal={cal} tipo="FTP" cohortId={e.cohort_id} atual={null} placeholder="Atribuir FTP…" />
                      )}
                    </TableCell>
                    <TableCell>
                      {e.su_acao_id ? (
                        <span className="text-sm text-muted-foreground">Escolhida</span>
                      ) : (
                        <MoverSelect cal={cal} tipo="SU" cohortId={e.cohort_id} atual={null} placeholder="Atribuir slot…" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  );
}

function DataDialog({
  programId,
  cal,
  tipo,
  inicial,
  onClose,
}: {
  programId: string;
  cal: CalendarioPrograma;
  tipo: TipoData;
  inicial: DataPrograma | null;
  onClose: () => void;
}) {
  const invalidar = useInvalidar(programId);
  const fn = useServerFn(guardarDataPrograma);
  const [f, setF] = useState({
    start_date: inicial?.start_date ?? "",
    end_date: inicial?.end_date ?? "",
    localizacao: inicial?.localizacao ?? "",
    formato: inicial?.formato ?? "Presencial",
    min: String(inicial?.min ?? (tipo === "FTP" ? FTP_MIN_EDUCADORES : "")),
    max: String(inicial?.max ?? (tipo === "FTP" ? FTP_MAX_EDUCADORES : "")),
    projetoIds: inicial?.projetos ?? [],
  });
  const [erro, setErro] = useState<string | null>(null);
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const m = useMutation({
    mutationFn: () =>
      fn({
        data: {
          programId,
          tipo,
          id: inicial?.id,
          start_date: f.start_date,
          end_date: f.end_date || null,
          localizacao: f.localizacao || null,
          formato: (f.formato as "Presencial" | "Online") || null,
          min: tipo === "FTP" ? num(f.min) : null,
          max: num(f.max),
          projetoIds: f.projetoIds,
        },
      }),
    onSuccess: () => {
      toast.success(inicial ? "Data atualizada." : `${nomeTipo(tipo)} criada.`);
      invalidar();
      onClose();
    },
    onError: (e: Error) => setErro(e.message),
  });

  const toggleProjeto = (id: string, on: boolean) =>
    setF((s) => ({ ...s, projetoIds: on ? [...s.projetoIds, id] : s.projetoIds.filter((p) => p !== id) }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {inicial ? "Editar" : "Nova"} {tipo === "FTP" ? "FTP" : "Semana Ubuntu"} · {cal.programa.title}
          </DialogTitle>
          <DialogDescription>
            {tipo === "FTP"
              ? "Mudar a data volta a calcular a abertura da FTC e avisa as escolas e os Educadores."
              : "As escolas escolhem um slot depois da sua FTP."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setErro(null);
            if (!f.start_date) return setErro("Indica a data de início.");
            m.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="cal-inicio" label="Início" required>
              <Input id="cal-inicio" type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
            </FormField>
            <FormField id="cal-fim" label="Fim" optional>
              <Input id="cal-fim" type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
            </FormField>
            <FormField id="cal-local" label="Local" optional>
              <Input id="cal-local" value={f.localizacao} onChange={(e) => setF({ ...f, localizacao: e.target.value })} />
            </FormField>
            <FormField id="cal-formato" label="Formato">
              <Select value={f.formato} onValueChange={(v) => setF({ ...f, formato: v })}>
                <SelectTrigger id="cal-formato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATOS_ACAO.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {tipo === "FTP" && (
              <FormField id="cal-min" label="Mínimo de Educadores">
                <Input id="cal-min" type="number" min={0} value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} />
              </FormField>
            )}
            <FormField id="cal-max" label={tipo === "FTP" ? "Máximo de Educadores" : "Máximo de escolas"} optional={tipo === "SU"}>
              <Input id="cal-max" type="number" min={1} value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} />
            </FormField>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium text-secondary">Projetos</legend>
            <p className="text-xs text-muted-foreground">Sem nenhum marcado, a data serve todas as escolas do programa.</p>
            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border p-2">
              {cal.projetos.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={f.projetoIds.includes(p.id)} onCheckedChange={(v) => toggleProjeto(p.id, v === true)} />
                  <span className="min-w-0 break-words">{p.title}</span>
                </label>
              ))}
              {cal.projetos.length === 0 && <p className="text-xs text-muted-foreground">Não há projetos.</p>}
            </div>
          </fieldset>
          {erro && (
            <p role="alert" className="text-sm font-medium text-[#B42318]">
              {erro}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending ? "A guardar…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelarDialog({
  programId,
  cal,
  alvo,
  onClose,
}: {
  programId: string;
  cal: CalendarioPrograma;
  alvo: DataPrograma;
  onClose: () => void;
}) {
  const invalidar = useInvalidar(programId);
  const fn = useServerFn(cancelarDataPrograma);
  const [destino, setDestino] = useState(NENHUMA);
  const outras = (alvo.tipo === "FTP" ? cal.ftps : cal.slots_su).filter((d) => d.id !== alvo.id && ftpAtiva(d.status));
  const m = useMutation({
    mutationFn: () => fn({ data: { id: alvo.id, destinoId: destino === NENHUMA ? null : destino } }),
    onSuccess: (r) => {
      toast.success(
        destino === NENHUMA
          ? `Data cancelada. ${r.escolas} escola(s) vão escolher outra data.`
          : `Datas juntas. ${r.escolas} escola(s) mudaram de data.`,
      );
      invalidar();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Juntar ou cancelar a {nomeTipo(alvo.tipo)} de {formatarDataPt(alvo.start_date)}</DialogTitle>
          <DialogDescription>
            {alvo.escolas.length
              ? `${alvo.escolas.length} escola(s) escolheram esta data. As pessoas de contacto recebem um aviso.`
              : "Nenhuma escola escolheu esta data."}
          </DialogDescription>
        </DialogHeader>
        <FormField
          id="cal-destino"
          label="Para onde vão as escolas?"
          hint="Ao juntar, os Educadores mudam para a turma da FTC da nova data e mantêm o progresso."
        >
          <Select value={destino} onValueChange={setDestino}>
            <SelectTrigger id="cal-destino">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NENHUMA}>Cancelar — as escolas escolhem outra data</SelectItem>
              {outras.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  Juntar com {rotuloData(o)} ({o.ocupacao}
                  {o.max != null ? `/${o.max}` : ""})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button variant="destructive" disabled={m.isPending} onClick={() => m.mutate()}>
            {destino === NENHUMA ? "Cancelar data" : "Juntar datas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
