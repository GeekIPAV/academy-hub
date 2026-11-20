import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, CalendarClock, UserX, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { StatusChip } from "@/components/shell/StatusChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  darMaisTempoFtc,
  enviarLembretesFtc,
  getTurmaFtp,
  marcarPresencaFtp,
  registarDesistencia,
  type EducadorTurma,
} from "@/lib/ftp-etapas.functions";
import { formatarDataPt, hojeISO } from "@/lib/ftp-calendario";

function FtcChip({ e }: { e: EducadorTurma }) {
  if (e.ftc_concluida_em) {
    return <StatusChip tone="green">{e.ftc_badge ? "Badge" : "Concluída"} · {formatarDataPt(e.ftc_concluida_em, { day: "numeric", month: "short" })}</StatusChip>;
  }
  if (e.ftc_em_atraso) return <StatusChip tone="red">Em atraso</StatusChip>;
  if (e.ftc_estado) return <StatusChip tone="yellow">Em curso</StatusChip>;
  return <StatusChip tone="grey">Por iniciar</StatusChip>;
}

function InscricaoChip({ status }: { status: string | null }) {
  if (status === "presente") return <StatusChip tone="green">Presente</StatusChip>;
  if (status === "faltou") return <StatusChip tone="red">Faltou</StatusChip>;
  if (status === "aceite") return <StatusChip tone="navy">Inscrito</StatusChip>;
  if (status === "cancelado") return <StatusChip tone="grey">Cancelada</StatusChip>;
  return <span className="text-xs text-muted-foreground">Por inscrever</span>;
}

export function TurmaFtpDialog({ ftpId, onClose }: { ftpId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const fn = useServerFn(getTurmaFtp);
  const chave = ["turma-ftp", ftpId];
  const { data, isLoading, error } = useQuery({ queryKey: chave, queryFn: () => fn({ data: { ftpId } }) });
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: chave });
    qc.invalidateQueries({ queryKey: ["calendario-ftp"] });
  };

  const presencaFn = useServerFn(marcarPresencaFtp);
  const desistFn = useServerFn(registarDesistencia);
  const tempoFn = useServerFn(darMaisTempoFtc);
  const lembreteFn = useServerFn(enviarLembretesFtc);

  const presenca = useMutation({
    mutationFn: (v: { userId: string; presenca: "presente" | "faltou" | "aceite" }) => presencaFn({ data: { ftpId, ...v } }),
    onSuccess: (r, v) => {
      if (v.presenca === "presente") {
        toast[r.semBadge ? "warning" : "success"](
          r.semBadge
            ? "Presença marcada. Define o badge «Apto para a Semana Ubuntu» nas regras do programa para abrir o bloco."
            : "Presença marcada. A Semana Ubuntu abriu para este Educador.",
        );
      } else toast.success(v.presenca === "faltou" ? "Falta registada. A escola foi avisada." : "Presença retirada.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const desistencia = useMutation({
    mutationFn: (v: { inscricaoProgramaId: string; desistiu: boolean }) => desistFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.desistiu ? "Desistência registada. A escola foi avisada." : "Desistência retirada.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const tempo = useMutation({
    mutationFn: (v: { inscricaoProgramaId: string; ate: string | null }) => tempoFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.ate ? "Prazo alargado. O Educador foi avisado." : "Prazo extra retirado.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const lembrete = useMutation({
    mutationFn: () => lembreteFn({ data: { ftpId } }),
    onSuccess: (r) => toast.success(r.enviados ? `Lembrete enviado a ${r.enviados} Educador(es).` : "Todos já concluíram a FTC."),
    onError: (e: Error) => toast.error(e.message),
  });

  const hoje = hojeISO();
  const diaDaFtp = !!data?.ftp.start_date && hoje >= data.ftp.start_date;
  const porConcluir = (data?.educadores ?? []).filter((e) => e.estado_programa === "aprovada" && !e.ftc_concluida_em).length;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Turma da FTP de {formatarDataPt(data?.ftp.start_date)}
            {data?.ftp.localizacao ? ` · ${data.ftp.localizacao}` : ""}
          </DialogTitle>
          <DialogDescription>
            {data?.janela
              ? `FTC de ${formatarDataPt(data.janela.abertura)} a ${formatarDataPt(data.janela.fimConclusao)}; inscrição na FTP de ${formatarDataPt(data.janela.inscricaoInicio)} a ${formatarDataPt(data.janela.inscricaoFim)}. ${
                  data.programa.ftc_atraso_permitido
                    ? "Quem não concluir na 1.ª semana ainda pode concluir e inscrever-se na 2.ª."
                    : "Quem não concluir na 1.ª semana só entra com prazo extra."
                }`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : error || !data ? (
          <p className="text-sm text-destructive">{(error as Error | null)?.message ?? "Erro ao carregar a turma."}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {data.educadores.length} Educador(es) · {data.educadores.filter((e) => e.inscricao_ftp === "aceite" || e.inscricao_ftp === "presente").length} inscrito(s) ·{" "}
                {porConcluir} com a FTC por concluir
              </p>
              <Button size="sm" variant="outline" disabled={!porConcluir || lembrete.isPending} onClick={() => lembrete.mutate()}>
                <BellRing className="mr-1.5 h-4 w-4" />
                Lembrar quem não concluiu
              </Button>
            </div>
            {!data.programa.su_badge_id && (
              <p className="rounded-lg bg-[#FFF1CC] px-3 py-2 text-xs text-[#6B4200]">
                Define o badge «Apto para a Semana Ubuntu» nas regras do programa: sem ele, a presença fica registada mas não abre a Semana Ubuntu.
              </p>
            )}
            <div className="overflow-x-auto rounded-md border">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Educador</TableHead>
                    <TableHead>FTC</TableHead>
                    <TableHead>FTP</TableHead>
                    <TableHead className="w-40">Presença</TableHead>
                    <TableHead className="w-56 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.educadores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        Nenhuma escola com Educadores nesta FTP.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.educadores.map((e) => {
                    const desistiu = e.estado_programa === "desistiu";
                    return (
                      <TableRow key={e.inscricao_programa_id} className={desistiu ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="font-medium">{e.nome}</div>
                          <div className="text-xs text-muted-foreground">{e.escola}</div>
                          {desistiu && <StatusChip tone="red" className="mt-1">Desistiu</StatusChip>}
                          {e.apto_semana_ubuntu && <StatusChip tone="green" className="mt-1">Apto para a Semana Ubuntu</StatusChip>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <FtcChip e={e} />
                            {e.prazo_extra_ate && (
                              <span className="text-xs text-muted-foreground">Prazo extra até {formatarDataPt(e.prazo_extra_ate)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <InscricaoChip status={e.inscricao_ftp} />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={e.inscricao_ftp === "presente" || e.inscricao_ftp === "faltou" ? e.inscricao_ftp : "aceite"}
                            onValueChange={(v) => presenca.mutate({ userId: e.user_id, presenca: v as "presente" | "faltou" | "aceite" })}
                            disabled={!diaDaFtp || desistiu || presenca.isPending}
                          >
                            <SelectTrigger className="h-8 text-xs" aria-label={`Presença de ${e.nome}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aceite">Por marcar</SelectItem>
                              <SelectItem value="presente">Presente</SelectItem>
                              <SelectItem value="faltou">Faltou</SelectItem>
                            </SelectContent>
                          </Select>
                          {!diaDaFtp && <p className="mt-1 text-[11px] text-muted-foreground">A partir do dia da FTP</p>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {!e.ftc_concluida_em && !desistiu && (
                              <MaisTempo
                                atual={e.prazo_extra_ate}
                                max={data.janela?.inscricaoFim ?? null}
                                pending={tempo.isPending}
                                onGuardar={(ate) => tempo.mutate({ inscricaoProgramaId: e.inscricao_programa_id, ate })}
                              />
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={desistencia.isPending}
                              onClick={() => desistencia.mutate({ inscricaoProgramaId: e.inscricao_programa_id, desistiu: !desistiu })}
                            >
                              {desistiu ? <Undo2 className="mr-1 h-4 w-4" /> : <UserX className="mr-1 h-4 w-4" />}
                              {desistiu ? "Retirar" : "Desistiu"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MaisTempo({
  atual,
  max,
  pending,
  onGuardar,
}: {
  atual: string | null;
  max: string | null;
  pending: boolean;
  onGuardar: (ate: string | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [ate, setAte] = useState(atual ?? max ?? "");
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <CalendarClock className="mr-1 h-4 w-4" />
          Mais tempo
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3">
        <label className="block space-y-1.5 text-[13px] font-medium text-secondary">
          Concluir a FTC até
          <Input type="date" value={ate} max={max ?? undefined} onChange={(e) => setAte(e.target.value)} />
        </label>
        <p className="text-xs text-muted-foreground">No máximo até à véspera da FTP.</p>
        <div className="flex justify-between gap-2">
          {atual ? (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => { onGuardar(null); setAberto(false); }}>
              Retirar
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" disabled={!ate || pending} onClick={() => { onGuardar(ate); setAberto(false); }}>
            Guardar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
