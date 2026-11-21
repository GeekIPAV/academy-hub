import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, UserRound } from "lucide-react";
import { WidgetRoadmap } from "@/components/WidgetRoadmap";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listParticipantesJornada, type ParticipanteJornada } from "@/lib/roadmap.functions";

/**
 * «Ver como o utilizador»: escolhe uma pessoa (inscrita ou não) e mostra o
 * percurso tal como ela o vê, através de getRoadmap com userId. A jornada
 * abre num painel lateral, por cima da lista, para não ocupar todo o ecrã.
 */

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function VerComoUtilizador() {
  const fetchParticipantes = useServerFn(listParticipantesJornada);
  const { data: participantes = [], isLoading } = useQuery({
    queryKey: ["jornada-participantes"],
    queryFn: () => fetchParticipantes(),
  });
  const [pesquisa, setPesquisa] = useState("");
  const [selecionado, setSelecionado] = useState<ParticipanteJornada | "modelo" | null>(null);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const escolher = (p: ParticipanteJornada | "modelo" | null) => {
    setSelecionado(p);
    setCohortId(p && p !== "modelo" ? (p.inscricoes[0]?.cohortId ?? null) : null);
  };
  const pessoa = selecionado && selecionado !== "modelo" ? selecionado : null;
  const inscricao = pessoa?.inscricoes.find((i) => i.cohortId === cohortId) ?? null;

  const filtrados = useMemo(() => {
    const q = normalizar(pesquisa.trim());
    if (!q) return participantes;
    return participantes.filter((p) =>
      normalizar(
        [p.nome, p.email, p.tipo, ...p.inscricoes.flatMap((i) => [i.programa, i.entidade])]
          .filter(Boolean)
          .join(" "),
      ).includes(q),
    );
  }, [participantes, pesquisa]);

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm text-muted-foreground">
        Escolhe uma pessoa para ver o percurso tal como ela o vê na plataforma, incluindo quem ainda não está inscrito em nenhum programa. A jornada abre num painel lateral.
      </p>

      <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Procurar nome, email ou programa"
            aria-label="Procurar participante"
            className="pl-9"
          />
        </div>

        <button
          type="button"
          onClick={() => escolher("modelo")}
          className="mt-3 rounded-xl border border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50"
        >
          Ver o modelo da jornada
        </button>

        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Utilizadores {participantes.length > 0 && `(${filtrados.length})`}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="sr-only">A carregar participantes</span>
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {participantes.length === 0
              ? "Ainda não há utilizadores na plataforma."
              : "Nenhum utilizador corresponde à pesquisa."}
          </p>
        ) : (
          <ul className="grid max-h-[70vh] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((p) => {
              const sub = p.inscricoes.length
                ? p.inscricoes.map((i) => i.programa).filter(Boolean).join(" · ")
                : "Sem inscrição na jornada";
              return (
                <li key={p.userId} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => escolher(p)}
                    className="flex w-full min-w-0 items-start gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{p.nome}</span>
                      {p.email && p.email !== p.nome && (
                        <span className="block truncate text-xs text-muted-foreground">{p.email}</span>
                      )}
                      <span className="block truncate text-xs text-muted-foreground/80">{sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Sheet open={selecionado !== null} onOpenChange={(open) => !open && escolher(null)}>
        <SheetContent side="right" className="flex w-[min(100vw,30rem)] max-w-none flex-col gap-0 overflow-y-auto p-0 sm:max-w-none">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="truncate">
              {pessoa ? pessoa.nome : "Modelo da jornada"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Jornada do utilizador tal como a vê na plataforma
            </SheetDescription>
            {pessoa && (
              <div className="flex min-w-0 flex-wrap items-center gap-2 pt-1">
                {pessoa.email && (
                  <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{pessoa.email}</p>
                )}
                {pessoa.tipo && (
                  <Badge variant="secondary" className="shrink-0 text-[11px]">
                    {pessoa.tipo}
                  </Badge>
                )}
                {inscricao?.estado && (
                  <Badge variant="outline" className="shrink-0 text-[11px]">
                    Inscrição: {inscricao.estado}
                  </Badge>
                )}
              </div>
            )}
            {pessoa && pessoa.inscricoes.length > 1 && (
              <div className="flex min-w-0 flex-wrap gap-1.5 pt-2" role="group" aria-label="Programa">
                {pessoa.inscricoes.map((i) => (
                  <button
                    key={i.cohortId}
                    type="button"
                    aria-pressed={i.cohortId === cohortId}
                    onClick={() => setCohortId(i.cohortId)}
                    className={`max-w-full truncate rounded-full border px-3 py-1 text-xs transition-colors ${
                      i.cohortId === cohortId
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {[i.programa, i.entidade].filter(Boolean).join(" · ") || "Programa"}
                  </button>
                ))}
              </div>
            )}
          </SheetHeader>

          <div className="min-w-0 flex-1 overflow-x-auto px-5 py-4">
            <WidgetRoadmap
              key={pessoa ? `${pessoa.userId}:${cohortId ?? "sem"}` : "modelo"}
              userId={pessoa?.userId}
              cohortId={cohortId ?? undefined}
              title={pessoa ? "Jornada" : "Modelo da jornada"}
              compact
              programLabel={inscricao?.programa ?? null}
              previewLabel={
                pessoa ? "Sem inscrição — ainda não iniciou a jornada" : "Exemplo com um programa ativo"
              }
              emptyFallback={
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Não foi possível montar a jornada desta pessoa.
                </p>
              }
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
