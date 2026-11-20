import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { StatusChip } from "@/components/shell/StatusChip";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getPlanoProjeto, guardarPlanoProjeto } from "@/lib/planos.functions";
import { ACESSOS_PLANOS, LIMITE_LABEL, PLANOS, formatarValor, type Limite, type PlanoId } from "@/lib/planos-subscricao";

const SEM = "__sem";
const LIMITES: Limite[] = ["escolas", "educadores", "replicacoes"];

/** Plano A, B ou C do protocolo, com os limites a contar sozinhos. */
export function PlanoProjeto({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(getPlanoProjeto);
  const saveFn = useServerFn(guardarPlanoProjeto);
  const chave = ["plano-projeto", projectId];
  const { data } = useQuery({ queryKey: chave, queryFn: () => fn({ data: { projectId } }) });
  const m = useMutation({
    mutationFn: (v: { plano: PlanoId | null; bloqueia: boolean }) => saveFn({ data: { projectId, ...v } }),
    onSuccess: () => {
      toast.success("Plano guardado.");
      qc.invalidateQueries({ queryKey: chave });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!data) return null;
  const limites = data.plano ? PLANOS[data.plano] : null;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">Plano de subscrição</h3>
          <p className="text-xs text-muted-foreground">
            Para novos protocolos. Os limites contam sozinhos a partir das escolas do projeto, dos seus Educadores aprovados e
            das Semanas Ubuntu de replicação.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={data.plano ?? SEM}
            onValueChange={(v) => m.mutate({ plano: v === SEM ? null : (v as PlanoId), bloqueia: data.bloqueia })}
            disabled={m.isPending}
          >
            <SelectTrigger className="w-52" aria-label="Plano do projeto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM}>Sem plano (protocolo atual)</SelectItem>
              {(Object.keys(PLANOS) as PlanoId[]).map((p) => (
                <SelectItem key={p} value={p}>
                  Plano {p} · {formatarValor(PLANOS[p].valor)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.plano && (
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={data.bloqueia}
                disabled={m.isPending}
                onCheckedChange={(v) => m.mutate({ plano: data.plano, bloqueia: v })}
              />
              {data.bloqueia ? "Bloqueia acima do limite" : "Só avisa"}
            </label>
          )}
        </div>
      </div>

      {limites && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {LIMITES.map((l) => {
              const usado = data.uso[l];
              const max = limites[l];
              const pct = Math.min(100, Math.round((usado / max) * 100));
              return (
                <div key={l} className="min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{LIMITE_LABEL[l]}</p>
                    {usado >= max && <StatusChip tone={usado > max ? "red" : "yellow"}>{usado > max ? "Acima" : "No limite"}</StatusChip>}
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {usado} <span className="font-normal text-muted-foreground">de {max}</span>
                  </p>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.bloqueia
              ? "Acima do limite, a plataforma não deixa acrescentar escolas, inscrever Educadores nem marcar replicações. A equipa é avisada ao chegar ao máximo."
              : "A plataforma deixa passar do limite, mas avisa a equipa IPAV quando se chega ao máximo."}{" "}
            Acessos incluídos: {ACESSOS_PLANOS.join("; ")}.
          </p>
        </>
      )}
    </div>
  );
}
