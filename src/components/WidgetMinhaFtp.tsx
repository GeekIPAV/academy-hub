import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/shell/StatusChip";
import { getMinhaFtp, inscreverNaFtp, type MinhaFtp } from "@/lib/ftp-etapas.functions";
import { formatarDataPt } from "@/lib/ftp-calendario";

const curta = (d: string) => formatarDataPt(d, { day: "numeric", month: "short" });

/** «A tua FTP»: datas, estado da FTC, inscrição e acesso à Semana Ubuntu. */
export function WidgetMinhaFtp() {
  const fn = useServerFn(getMinhaFtp);
  const { data } = useQuery({ queryKey: ["minha-ftp"], queryFn: () => fn() });
  const itens = (data ?? []).filter((m) => m.ftp.ativa && m.estado_programa !== "desistiu");
  if (itens.length === 0) return null;
  return (
    <section aria-labelledby="minha-ftp-title" className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 id="minha-ftp-title" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          A tua formação
        </h2>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
        {itens.map((m) => (
          <CartaoFtp key={m.inscricao_programa_id} m={m} />
        ))}
      </div>
    </section>
  );
}

function Etapa({ feita, atual, titulo, detalhe }: { feita: boolean; atual: boolean; titulo: string; detalhe: string }) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          feita ? "border-[#11643F] bg-[#11643F] text-white" : atual ? "border-primary" : "border-border"
        }`}
        aria-hidden="true"
      >
        {feita && <Check className="h-3 w-3" />}
      </span>
      <div className="min-w-0">
        <p className={`text-sm ${atual ? "font-semibold text-secondary" : feita ? "text-secondary" : "text-muted-foreground"}`}>{titulo}</p>
        <p className="text-xs text-muted-foreground">{detalhe}</p>
      </div>
    </li>
  );
}

function CartaoFtp({ m }: { m: MinhaFtp }) {
  const qc = useQueryClient();
  const fn = useServerFn(inscreverNaFtp);
  const insc = useMutation({
    mutationFn: () => fn({ data: { inscricaoProgramaId: m.inscricao_programa_id } }),
    onSuccess: () => {
      toast.success("Inscrição na FTP confirmada.");
      qc.invalidateQueries({ queryKey: ["minha-ftp"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const j = m.janela;
  const ftcFeita = !!m.ftc.concluida_em;
  const inscrito = m.inscricao_ftp === "aceite" || m.inscricao_ftp === "presente";
  const presente = m.inscricao_ftp === "presente";
  const motivo = m.resultado.pode ? null : m.resultado.motivo;

  return (
    <Card className="flex min-w-0 flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-[15px] font-semibold text-secondary">{m.program_title ?? "Programa"}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            FTP a {formatarDataPt(m.ftp.start_date)}
            {m.ftp.localizacao ? ` · ${m.ftp.localizacao}` : ""}
          </p>
        </div>
        {m.apto_semana_ubuntu && <StatusChip tone="green">Semana Ubuntu aberta</StatusChip>}
      </div>

      <ol className="space-y-3">
        <Etapa
          feita={ftcFeita}
          atual={!ftcFeita}
          titulo="Concluir a FTC"
          detalhe={
            ftcFeita
              ? `Concluída a ${curta(m.ftc.concluida_em!)}${m.ftc.tem_badge ? " · badge recebido" : ""}`
              : `De ${curta(j.abertura)} a ${curta(m.prazo_ftc)}`
          }
        />
        <Etapa
          feita={inscrito}
          atual={ftcFeita && !inscrito}
          titulo="Inscrever-me na FTP"
          detalhe={inscrito ? "Inscrição confirmada" : `De ${curta(j.inscricaoInicio)} a ${curta(j.inscricaoFim)}, com o badge da FTC`}
        />
        <Etapa
          feita={presente}
          atual={inscrito && !presente}
          titulo="Ir à FTP"
          detalhe={presente ? "Presença registada" : `${formatarDataPt(m.ftp.start_date)}. A presença abre a Semana Ubuntu.`}
        />
      </ol>

      {m.aviso_acesso ? (
        <p className="rounded-lg bg-[#FFF1CC] px-3 py-2 text-xs text-[#6B4200]">
          O acesso à FTC e à Semana Ubuntu termina a {formatarDataPt(m.acesso_ate)}. Descarrega o teu caderno e os materiais de que precisas.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Acesso à FTC e à Semana Ubuntu até {formatarDataPt(m.acesso_ate)}.</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {m.resultado.pode ? (
          <Button size="sm" disabled={insc.isPending} onClick={() => insc.mutate()}>
            {insc.isPending ? "A inscrever…" : "Inscrever-me na FTP"}
          </Button>
        ) : !ftcFeita && m.ftc.curso_id ? (
          <Button asChild size="sm">
            <Link to="/elearning/$cursoId" params={{ cursoId: m.ftc.curso_id }}>
              Ir para a FTC
            </Link>
          </Button>
        ) : m.apto_semana_ubuntu ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/recursos">Abrir a Semana Ubuntu</Link>
          </Button>
        ) : null}
        {motivo && !inscrito && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {motivo}
            {!m.resultado.pode && m.resultado.abreEm ? ` Abre a ${curta(m.resultado.abreEm)}.` : ""}
          </p>
        )}
      </div>
    </Card>
  );
}
