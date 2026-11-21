import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { StatusChip } from "@/components/shell/StatusChip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  escolherCalendarioEscola,
  getCalendarioEscola,
  type CalendarioEscolaItem,
  type OpcaoData,
} from "@/lib/ftp-calendario.functions";
import { FTC_DIAS_ANTES_FTP, formatarDataPt } from "@/lib/ftp-calendario";
import { AlunosSemanaUbuntu } from "@/components/semana-ubuntu/AlunosSemanaUbuntu";

function rotulo(o: Pick<OpcaoData, "start_date" | "end_date" | "localizacao" | "formato">) {
  const fim = o.end_date && o.end_date !== o.start_date ? ` a ${formatarDataPt(o.end_date)}` : "";
  const onde = [o.localizacao, o.formato].filter(Boolean).join(" · ");
  return `${formatarDataPt(o.start_date)}${fim}${onde ? ` — ${onde}` : ""}`;
}

function vagasTexto(o: OpcaoData, unidade: string) {
  if (o.vagas_restantes == null) return "";
  return ` (${o.vagas_restantes} ${unidade} livres)`;
}

/**
 * A pessoa de contacto escolhe, para cada programa, a data da FTP e o slot da
 * Semana Ubuntu. A escolha vale para todos os Educadores da escola e a FTC
 * abre sozinha 14 dias antes da FTP.
 */
export function CalendarioEscola({ entityId, cohortId }: { entityId?: string; cohortId?: string }) {
  const fn = useServerFn(getCalendarioEscola);
  const { data, isLoading } = useQuery({
    queryKey: ["calendario-escola", entityId ?? "self"],
    queryFn: () => fn(entityId ? { data: { entityId } } : (undefined as never)),
  });
  const itens = (Array.isArray(data) ? data : []).filter((c) => !cohortId || c.cohort_id === cohortId);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (itens.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="calendario-t">
      <div>
        <h2 id="calendario-t" className="text-base font-semibold text-secondary">
          Calendário da formação
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Escolham a data da FTP e da Semana Ubuntu. Vale para todos os Educadores da escola. A FTC abre{" "}
          {FTC_DIAS_ANTES_FTP} dias antes da FTP: uma semana para concluir e outra para a inscrição na FTP.
        </p>
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
        {itens.map((c) => (
          <CalendarioCard key={c.cohort_id} item={c} entityId={entityId} />
        ))}
      </div>
    </section>
  );
}

function CalendarioCard({ item, entityId }: { item: CalendarioEscolaItem; entityId?: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(escolherCalendarioEscola);
  const [mudarFtp, setMudarFtp] = useState(false);
  const [ftpSel, setFtpSel] = useState<string>("");
  const [suSel, setSuSel] = useState<string>("");

  const m = useMutation({
    mutationFn: (vars: { ftpId?: string | null; suId?: string | null }) => fn({ data: { cohortId: item.cohort_id, ...vars } }),
    onSuccess: (r, vars) => {
      if (vars.ftpId) {
        const n = r.sincronizacao ? r.sincronizacao.inscritos + r.sincronizacao.movidos : 0;
        toast.success(n ? `FTP escolhida. ${n} Educador(es) avisado(s) da data da FTC.` : "FTP escolhida.");
      } else {
        toast.success("Semana Ubuntu escolhida.");
      }
      setMudarFtp(false);
      setFtpSel("");
      setSuSel("");
      qc.invalidateQueries({ queryKey: ["calendario-escola", entityId ?? "self"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ftc = item.ftp?.ftc ?? null;
  const mostrarEscolhaFtp = !item.ftp || mudarFtp;
  const opcoesSu = item.opcoes_su.filter((s) => !item.ftp?.start_date || !s.start_date || s.start_date > item.ftp.start_date);

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-[15px] font-semibold text-secondary">{item.program_title ?? "Programa"}</h3>
        <StatusChip tone={item.ftp && item.su ? "green" : "yellow"}>{item.ftp && item.su ? "Datas escolhidas" : "Por escolher"}</StatusChip>
      </div>
      <p className="text-xs text-muted-foreground">{item.educadores} Educador(es) inscrito(s)</p>

      {/* FTP */}
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-secondary">FTP — Formação Teórico-Prática</p>
        {item.ftp && !mudarFtp && (
          <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
            <p className="flex items-start gap-2 font-medium">
              <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {rotulo(item.ftp)}
            </p>
            {!item.ftp.ativa && <p className="text-xs font-medium text-[#B42318]">Esta FTP foi cancelada. Escolham outra data.</p>}
            {ftc && item.ftp.ativa && (
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                <li>FTC abre a {formatarDataPt(ftc.abertura)}</li>
                <li>Concluir a FTC até {formatarDataPt(ftc.fimConclusao)}</li>
                <li>
                  Inscrição na FTP de {formatarDataPt(ftc.inscricaoInicio)} a {formatarDataPt(ftc.inscricaoFim)}
                </li>
              </ul>
            )}
            {item.pode_mudar_ftp || !item.ftp.ativa ? (
              <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setMudarFtp(true)}>
                Mudar de data
              </Button>
            ) : (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />A FTC já abriu. Para mudar de FTP, falem com a
                equipa IPAV.
              </p>
            )}
          </div>
        )}
        {mostrarEscolhaFtp &&
          (item.opcoes_ftp.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              A equipa IPAV ainda não publicou datas de FTP para este programa.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <Select value={ftpSel} onValueChange={setFtpSel}>
                <SelectTrigger aria-label={`Data da FTP de ${item.program_title ?? "programa"}`}>
                  <SelectValue placeholder="Escolher a data da FTP" />
                </SelectTrigger>
                <SelectContent>
                  {item.opcoes_ftp.map((o) => (
                    <SelectItem key={o.id} value={o.id} disabled={!o.disponivel || o.id === item.ftp?.id}>
                      {rotulo(o)}
                      {o.disponivel ? vagasTexto(o, "vagas") : ` — ${o.motivo}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={!ftpSel || m.isPending} onClick={() => m.mutate({ ftpId: ftpSel })}>
                  {m.isPending ? "A guardar…" : "Escolher FTP"}
                </Button>
                {mudarFtp && (
                  <Button size="sm" variant="ghost" onClick={() => setMudarFtp(false)}>
                    Manter a data atual
                  </Button>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Semana Ubuntu */}
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-secondary">Semana Ubuntu</p>
        {item.su ? (
          <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm">
            <p className="flex items-start gap-2 font-medium">
              <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {rotulo(item.su)}
            </p>
            {!item.su.ativa && <p className="text-xs font-medium text-[#B42318]">Este slot foi cancelado. Escolham outro.</p>}
          </div>
        ) : null}
        {item.su?.ativa && <AlunosSemanaUbuntu alvo={{ cohortId: item.cohort_id }} compacto />}
        {(!item.su || !item.su.ativa || suSel) &&
          (opcoesSu.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              {item.ftp ? "Ainda não há slots da Semana Ubuntu depois da vossa FTP." : "Escolham primeiro a FTP."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <Select value={suSel} onValueChange={setSuSel}>
                <SelectTrigger aria-label={`Slot da Semana Ubuntu de ${item.program_title ?? "programa"}`}>
                  <SelectValue placeholder="Escolher o slot da Semana Ubuntu" />
                </SelectTrigger>
                <SelectContent>
                  {opcoesSu.map((o) => (
                    <SelectItem key={o.id} value={o.id} disabled={!o.disponivel}>
                      {rotulo(o)}
                      {o.disponivel ? vagasTexto(o, "lugares") : ` — ${o.motivo}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="self-start" disabled={!suSel || m.isPending} onClick={() => m.mutate({ suId: suSel })}>
                Escolher Semana Ubuntu
              </Button>
            </div>
          ))}
        {item.su?.ativa && !suSel && opcoesSu.some((o) => o.disponivel && o.id !== item.su?.id) && (
          <Select value="" onValueChange={setSuSel}>
            <SelectTrigger className="h-8 text-xs" aria-label="Mudar o slot da Semana Ubuntu">
              <SelectValue placeholder="Mudar de slot" />
            </SelectTrigger>
            <SelectContent>
              {opcoesSu
                .filter((o) => o.id !== item.su?.id)
                .map((o) => (
                  <SelectItem key={o.id} value={o.id} disabled={!o.disponivel}>
                    {rotulo(o)}
                    {o.disponivel ? vagasTexto(o, "lugares") : ` — ${o.motivo}`}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </article>
  );
}
