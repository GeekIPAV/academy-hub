import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { RouteGate } from "@/components/RouteGate";
import { WidgetRoadmap } from "@/components/WidgetRoadmap";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listParticipantesJornada, type ParticipanteJornada } from "@/lib/roadmap.functions";

export const Route = createFileRoute("/admin/jornada")({
  head: () => ({
    meta: [
      { title: "Jornada do utilizador | Gestão" },
      {
        name: "description",
        content: "Etapas da jornada de formação (FTC, FTP, Semana Ubuntu, Sessão Final e Formador) de cada participante.",
      },
      { property: "og:title", content: "Jornada do utilizador | Gestão" },
      {
        property: "og:description",
        content: "Etapas da jornada de formação de cada participante, para a equipa de gestão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RouteGate path="/admin/jornada">
      <JornadaPage />
    </RouteGate>
  ),
});

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function JornadaPage() {
  const fetchParticipantes = useServerFn(listParticipantesJornada);
  const { data: participantes = [], isLoading } = useQuery({
    queryKey: ["jornada-participantes"],
    queryFn: () => fetchParticipantes(),
  });
  const [pesquisa, setPesquisa] = useState("");
  const [selecionado, setSelecionado] = useState<ParticipanteJornada | null>(null);

  const filtrados = useMemo(() => {
    const q = normalizar(pesquisa.trim());
    if (!q) return participantes;
    return participantes.filter((p) =>
      normalizar([p.nome, p.email, p.programa, p.entidade].filter(Boolean).join(" ")).includes(q),
    );
  }, [participantes, pesquisa]);

  const chave = (p: ParticipanteJornada) => `${p.userId}:${p.cohortId}`;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Gestão"
        title="Jornada do utilizador"
        description="Vê em que etapa está cada participante: FTC, FTP, Semana Ubuntu, Sessão Final e Formador. Escolhe uma pessoa na lista para ver a sua jornada."
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Procurar pessoa ou programa"
              aria-label="Procurar participante"
              className="pl-9"
            />
          </div>

          <button
            type="button"
            onClick={() => setSelecionado(null)}
            className={`mt-3 w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
              selecionado === null
                ? "border-primary/60 bg-primary/5 font-medium text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Modelo da jornada
          </button>

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Participantes {participantes.length > 0 && `(${participantes.length})`}
          </p>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="sr-only">A carregar participantes</span>
            </div>
          ) : filtrados.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              {participantes.length === 0
                ? "Ainda não há participantes inscritos em programas de Formação de Educadores."
                : "Nenhum participante corresponde à pesquisa."}
            </p>
          ) : (
            <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
              {filtrados.map((p) => {
                const ativo = selecionado !== null && chave(selecionado) === chave(p);
                return (
                  <li key={chave(p)}>
                    <button
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => setSelecionado(p)}
                      className={`flex w-full min-w-0 items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                        ativo ? "border-primary/60 bg-primary/5" : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{p.nome}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[p.programa, p.entidade].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="min-w-0 space-y-4">
          {selecionado && (
            <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{selecionado.nome}</p>
                {selecionado.email && (
                  <p className="truncate text-xs text-muted-foreground">{selecionado.email}</p>
                )}
              </div>
              {selecionado.estado && (
                <Badge variant="outline" className="shrink-0 text-[11px]">
                  Inscrição: {selecionado.estado}
                </Badge>
              )}
            </div>
          )}

          <WidgetRoadmap
            key={selecionado ? chave(selecionado) : "modelo"}
            userId={selecionado?.userId}
            cohortId={selecionado?.cohortId}
            title={selecionado ? "Jornada" : "Modelo da jornada"}
            programLabel={selecionado?.programa ?? null}
            previewLabel="Exemplo com um programa ativo"
            emptyFallback={
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Não foi possível montar a jornada desta pessoa.
              </p>
            }
          />
        </section>
      </div>
    </div>
  );
}
