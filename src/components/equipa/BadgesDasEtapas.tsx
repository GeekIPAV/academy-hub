import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Award } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/shell/PageHeader";
import { FormField } from "@/components/shell/FormField";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBadgesEtapas, guardarBadgesEtapas } from "@/lib/badges-etapas.functions";
import type { EtapaBadge } from "@/lib/badges-etapas";

const NENHUM = "__nenhum";
const TONS = ["bg-[#FFEBDC] text-[#A1420A]", "bg-[#E6EDF6] text-secondary", "bg-[#E7F5EE] text-[#11643F]", "bg-[#FFF1CC] text-[#6B4200]"];
const ORIGEM: Record<string, string> = { cluster: "vem do cluster", curso: "vem do curso da FTC" };

/** Que badge dá cada etapa da jornada, num só sítio, e a renovação. */
export function BadgesDasEtapas({ programId }: { programId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(getBadgesEtapas);
  const saveFn = useServerFn(guardarBadgesEtapas);
  const chave = ["badges-etapas", programId];
  const { data, isLoading } = useQuery({ queryKey: chave, queryFn: () => fn({ data: { programId } }) });
  const [sel, setSel] = useState<Record<EtapaBadge, string>>({ inscricao: NENHUM, ftc: NENHUM, presenca_ftp: NENHUM, sessao_final: NENHUM });
  const [renovar, setRenovar] = useState(false);
  const [badgeRenovacao, setBadgeRenovacao] = useState(NENHUM);

  useEffect(() => {
    if (!data) return;
    const s = { inscricao: NENHUM, ftc: NENHUM, presenca_ftp: NENHUM, sessao_final: NENHUM } as Record<EtapaBadge, string>;
    for (const e of data.etapas) s[e.etapa] = e.badge?.id ?? NENHUM;
    setSel(s);
    setRenovar(data.renovacao_ativa);
    setBadgeRenovacao(data.badge_renovacao_id ?? NENHUM);
  }, [data]);

  const m = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          programId,
          inscricao: sel.inscricao === NENHUM ? null : sel.inscricao,
          ftc: sel.ftc === NENHUM ? null : sel.ftc,
          presenca_ftp: sel.presenca_ftp === NENHUM ? null : sel.presenca_ftp,
          sessao_final: sel.sessao_final === NENHUM ? null : sel.sessao_final,
          renovacao_ativa: renovar,
          badge_renovacao_id: badgeRenovacao === NENHUM ? null : badgeRenovacao,
        },
      }),
    onSuccess: () => {
      toast.success("Badges das etapas guardados.");
      qc.invalidateQueries({ queryKey: chave });
      qc.invalidateQueries({ queryKey: ["calendario-ftp", programId] });
      qc.invalidateQueries({ queryKey: ["acompanhamento"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;
  const titulo = (id: string) => data.badges.find((b) => b.id === id)?.title ?? "Badge";

  return (
    <>
      <Section
        title="Badges das etapas"
        description="Cada etapa concluída dá um badge, e esse badge abre a etapa seguinte. Os badges guardam só conquistas; a fase de cada Educador continua a ser calculada pela jornada."
        actions={
          <Button size="sm" disabled={m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "A guardar…" : "Guardar"}
          </Button>
        }
      >
        <ol className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {data.etapas.map((e, i) => {
            const escolhido = sel[e.etapa];
            const semFtc = e.etapa === "ftc" && !data.ftc_configurada;
            return (
              <li key={e.etapa} className="flex min-w-0 flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {i + 1}
                  </span>
                  <p className="text-sm font-semibold text-secondary">{e.label}</p>
                </div>
                <FormField id={`badge-${e.etapa}`} label="Badge que dá" hint={semFtc ? "Define primeiro a FTC do programa." : undefined}>
                  <Select value={escolhido} onValueChange={(v) => setSel({ ...sel, [e.etapa]: v })} disabled={semFtc}>
                    <SelectTrigger id={`badge-${e.etapa}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NENHUM}>Sem badge</SelectItem>
                      {data.badges.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                {escolhido !== NENHUM && (
                  <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 p-2.5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONS[i]}`}>
                      <Award className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-secondary">{titulo(escolhido)}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.badge?.id === escolhido
                          ? `${e.quem_tem} ${e.quem_tem === 1 ? "Educador tem" : "Educadores têm"}${e.origem && e.origem !== "programa" ? ` · ${ORIGEM[e.origem]}` : ""}`
                          : "Por guardar"}
                      </p>
                    </div>
                  </div>
                )}
                <dl className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Quando</dt>
                  <dd>{e.quando}</dd>
                  <dt className="text-muted-foreground">Abre</dt>
                  <dd>{e.abre}</dd>
                  <dt className="text-muted-foreground">Validade</dt>
                  <dd>{e.validade}</dd>
                </dl>
                {e.excecoes > 0 && (
                  <p className="rounded-md bg-[#FFF1CC] px-2.5 py-1.5 text-xs text-[#6B4200]">
                    {e.excecoes} {e.excecoes === 1 ? "badge dado à mão" : "badges dados à mão"}, sem a etapa cumprida.
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-muted-foreground">
          O badge da FTC é o badge final do curso da FTC: mudá-lo aqui muda-o no curso. Sem badge escolhido na inscrição e na Sessão Final, valem os do cluster.
        </p>
      </Section>

      <Section title="Depois do fim do ano letivo" description="Quando o acesso fecha, a jornada pode continuar como replicação em vez de terminar.">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm">
            <Switch checked={renovar} onCheckedChange={setRenovar} className="mt-0.5" />
            <span>
              <span className="block font-semibold text-secondary">Oferecer renovação</span>
              <span className="block text-xs text-muted-foreground">
                {renovar
                  ? "Quem termina o ano letivo aparece na jornada com o próximo passo «Renovar para replicação»."
                  : "O acesso fecha e a pessoa fica em «Ano letivo terminado»."}
              </span>
            </span>
          </label>
          <FormField id="badge-renovacao" label="Badge de renovação" hint="O badge que a pessoa recebe ao renovar (por exemplo, ao concluir o curso de renovação).">
            <Select value={badgeRenovacao} onValueChange={setBadgeRenovacao} disabled={!renovar}>
              <SelectTrigger id="badge-renovacao">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Sem badge</SelectItem>
                {data.badges.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </Section>
    </>
  );
}
