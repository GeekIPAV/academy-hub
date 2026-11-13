import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ExternalLink, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, PageShell, SummaryStrip } from "@/components/shell/PageHeader";
import { StatusChip, acaoStatusTone } from "@/components/shell/StatusChip";
import { getAcaoResultados, listAcoesFull, type AcaoResultados, type AcaoRow } from "@/lib/admin-acoes-gestao.functions";
import { listAvaliacoesAcao } from "@/lib/avaliacao-acoes.functions";
import { avaliacoesQueryKey } from "@/lib/avaliacao-acoes-link";
import { INSCRICOES_ABERTAS } from "@/lib/acoes-opcoes";
import { AcaoDadosForm } from "./AcaoDadosForm";
import { AcaoAvaliacoesTab } from "./AcaoAvaliacoesTab";
import { InscritosTab, PaginaTab, ResultadosTab, CopiarLinkAvaliacaoButton } from "./AcaoSeparadores";

export type SeparadorAcao = "dados" | "inscritos" | "avaliacoes" | "pagina";

const SEPARADORES: { id: SeparadorAcao; label: string }[] = [
  { id: "dados", label: "Dados" },
  { id: "inscritos", label: "Inscritos" },
  { id: "avaliacoes", label: "Avaliações" },
  { id: "pagina", label: "Página de inscrição" },
];

export function formatarDatas(inicio: string | null, fim: string | null) {
  const f = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
  if (!inicio) return "Sem data";
  if (!fim || fim === inicio) return f(inicio);
  return `${f(inicio)} a ${f(fim)}`;
}

/** Página de uma ação na gestão: resumo no topo e separadores. */
export function AcaoDetalhePage({ actionId }: { actionId: string }) {
  const fetchAcoes = useServerFn(listAcoesFull);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-acoes-full"],
    queryFn: () => fetchAcoes(),
  });
  const listAv = useServerFn(listAvaliacoesAcao);
  const { data: avaliacoes } = useQuery({
    queryKey: avaliacoesQueryKey(actionId),
    queryFn: () => listAv({ data: { actionId } }),
  });
  const resFn = useServerFn(getAcaoResultados);
  const { data: resultados } = useQuery({
    queryKey: ["acao-resultados", actionId],
    queryFn: () => resFn({ data: { actionId } }),
  });
  const totalInscritos = (resultados as AcaoResultados | undefined)?.total;
  const [sep, setSep] = useState<SeparadorAcao>("dados");

  const acao = ((data ?? []) as AcaoRow[]).find((a) => a.id === actionId) ?? null;

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }
  if (!acao) {
    return (
      <PageShell narrow>
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="font-medium text-secondary">Ação não encontrada</p>
          <p className="mt-1 text-sm text-muted-foreground">Pode ter sido apagada ou o link está errado.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/admin/acoes">Voltar às ações</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const abertas = acao.registration_status === INSCRICOES_ABERTAS;
  const totalRespostas = (avaliacoes ?? []).reduce((n, a) => n + a.total_respostas, 0);
  const subtitulo = [acao.programa_title, acao.entidade_nome, formatarDatas(acao.start_date, acao.end_date)]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: "Ações", to: "/admin/acoes" }, { label: acao.title ?? "Ação" }]}
        chips={
          <>
            {acao.status && (
              <StatusChip tone={acaoStatusTone(acao.status)} dot>
                {acao.status}
              </StatusChip>
            )}
            <StatusChip tone={abertas ? "orange" : "grey"}>
              {abertas ? "Inscrições abertas" : "Inscrições fechadas"}
            </StatusChip>
            {acao.formato && <StatusChip tone="tag">{acao.formato}</StatusChip>}
          </>
        }
        title={acao.title ?? "(sem título)"}
        description={subtitulo}
        actions={
          <>
            <CopiarLinkInscricao actionId={acao.id} />
            <CopiarLinkAvaliacaoButton actionId={acao.id} onIrParaAvaliacoes={() => setSep("avaliacoes")} />
            <Button asChild variant="outline" size="sm">
              <a href={`/evento/${acao.id}`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Ver página pública
              </a>
            </Button>
          </>
        }
      />

      <SummaryStrip
        items={[
          { label: "Data", value: formatarDatas(acao.start_date, acao.end_date) },
          {
            label: "Inscritos",
            value:
              acao.max_capacity != null
                ? `${totalInscritos ?? 0} de ${acao.max_capacity} lugares`
                : `${totalInscritos ?? 0} inscritos`,
            extra:
              acao.max_capacity ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Math.round(((totalInscritos ?? 0) / acao.max_capacity) * 100))}%` }}
                  />
                </div>
              ) : undefined,
          },
          {
            label: "Avaliações",
            value:
              (avaliacoes ?? []).length === 0
                ? "Por criar"
                : `${avaliacoes?.length} · ${totalRespostas} ${totalRespostas === 1 ? "resposta" : "respostas"}`,
          },
          { label: "Responsável", value: acao.email_responsavel || "Sem responsável" },
        ]}
      />

      <div role="tablist" aria-label="Secções da ação" className="flex gap-1 overflow-x-auto border-b">
        {SEPARADORES.map((s) => {
          const on = s.id === sep;
          const n = s.id === "avaliacoes" ? (avaliacoes ?? []).length : s.id === "inscritos" ? totalInscritos ?? null : null;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setSep(s.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-medium transition-colors ${
                on ? "border-primary text-secondary" : "border-transparent text-muted-foreground hover:text-secondary"
              }`}
            >
              {s.label}
              {n != null && n > 0 && (
                <span className="rounded-full bg-muted px-2 py-px text-xs font-medium text-secondary">{n}</span>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="min-w-0">
        {sep === "dados" && <AcaoDadosForm key={acao.id} acao={acao} />}
        {sep === "inscritos" && (
          <div className="space-y-6">
            <ResultadosTab actionId={acao.id} />
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-secondary">Lista de inscritos</h2>
              <InscritosTab actionId={acao.id} />
            </div>
          </div>
        )}
        {sep === "avaliacoes" && (
          <AcaoAvaliacoesTab actionId={acao.id} totalInscritos={totalInscritos || undefined} />
        )}
        {sep === "pagina" && <PaginaTab acao={acao} />}
      </div>
    </PageShell>
  );
}

function CopiarLinkInscricao({ actionId }: { actionId: string }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/evento/${actionId}` : `/evento/${actionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      toast.success("Link de inscrição copiado.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={copiar}>
      {copiado ? <Check className="mr-1.5 h-4 w-4" /> : <LinkIcon className="mr-1.5 h-4 w-4" />}
      Copiar link de inscrição
    </Button>
  );
}
