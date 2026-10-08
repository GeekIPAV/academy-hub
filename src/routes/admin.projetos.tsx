import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { RouteGate } from "@/components/RouteGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addEntidadeProjeto,
  getProjetoMembros,
  listEntidadesUtilizadores,
  listProjetos,
  removeEntidadeProjeto,
  saveProjeto,
  setUtilizadorProjeto,
} from "@/lib/projetos.functions";

export const Route = createFileRoute("/admin/projetos")({
  head: () => ({
    meta: [
      { title: "Gestão de Projetos — Admin" },
      { name: "description", content: "Projetos, entidades e participantes com acesso a ações reservadas." },
      { property: "og:title", content: "Gestão de Projetos — Admin" },
      { property: "og:description", content: "Projetos, entidades e participantes com acesso a ações reservadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RouteGate path="/admin/projetos">
      <ProjetosPage />
    </RouteGate>
  ),
});

const STATUS: Record<string, string> = {
  planeado: "Planeado",
  em_curso: "Em curso",
  concluido: "Concluído",
  suspenso: "Suspenso",
};

function ProjetosPage() {
  const qc = useQueryClient();
  const fetchProj = useServerFn(listProjetos);
  const saveFn = useServerFn(saveProjeto);
  const { data: projetos = [] } = useQuery({ queryKey: ["projetos"], queryFn: () => fetchProj() });
  const [selId, setSelId] = useState<string | null>(null);
  const [novo, setNovo] = useState("");
  const criar = useMutation({
    mutationFn: () => saveFn({ data: { title: novo, status: "em_curso" } }),
    onSuccess: () => {
      setNovo("");
      qc.invalidateQueries({ queryKey: ["projetos"] });
      toast.success("Projeto criado.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const sel = projetos.find((p) => p.id === selId) ?? null;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Gestão de Projetos</h1>
        <p className="text-sm text-muted-foreground">
          Associa entidades e pessoas a projetos. Quem pertence a uma entidade do projeto tem acesso
          enquanto a entidade lá estiver.
        </p>
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="min-w-0 space-y-3 rounded-xl border bg-card p-5 shadow-sm">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (novo.trim()) criar.mutate();
            }}
          >
            <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Novo projeto" />
            <Button type="submit" disabled={criar.isPending}>Criar</Button>
          </form>
          <ul className="space-y-1">
            {projetos.length === 0 && <li className="text-sm text-muted-foreground">Sem projetos.</li>}
            {projetos.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelId(p.id)}
                  className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${p.id === selId ? "bg-muted font-semibold" : ""}`}
                >
                  <span className="truncate">{p.title}</span>
                  <Badge variant="outline" className="shrink-0">{STATUS[p.status] ?? p.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {sel ? (
          <ProjetoDetalhe key={sel.id} projeto={sel} />
        ) : (
          <section className="rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            Escolhe um projeto para gerir entidades e participantes.
          </section>
        )}
      </div>
    </div>
  );
}

function ProjetoDetalhe({ projeto }: { projeto: { id: string; title: string; status: string; description: string | null } }) {
  const qc = useQueryClient();
  const fetchM = useServerFn(getProjetoMembros);
  const fetchOpts = useServerFn(listEntidadesUtilizadores);
  const addEnt = useServerFn(addEntidadeProjeto);
  const rmEnt = useServerFn(removeEntidadeProjeto);
  const setUser = useServerFn(setUtilizadorProjeto);
  const saveFn = useServerFn(saveProjeto);
  const key = ["projeto-membros", projeto.id];
  const { data } = useQuery({ queryKey: key, queryFn: () => fetchM({ data: { projectId: projeto.id } }) });
  const { data: opts } = useQuery({ queryKey: ["projetos-opcoes"], queryFn: () => fetchOpts() });
  const [entSel, setEntSel] = useState("");
  const [q, setQ] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const run = (p: Promise<unknown>, msg: string) =>
    p.then(() => { toast.success(msg); refresh(); }).catch((e) => toast.error(e instanceof Error ? e.message : "Erro"));

  const diretosIds = new Set((data?.diretos ?? []).map((u) => u.id));
  const sugestoes = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return (opts?.utilizadores ?? [])
      .filter((u) => !diretosIds.has(u.id) && `${u.full_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(t))
      .slice(0, 8);
  }, [q, opts, diretosIds]);
  const entNames = new Map((data?.entidades ?? []).map((e) => [e.entity_id, e.name]));

  return (
    <section className="min-w-0 space-y-6 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 break-words text-xl font-bold text-secondary">{projeto.title}</h2>
        <Select
          value={projeto.status}
          onValueChange={(v) =>
            saveFn({ data: { id: projeto.id, title: projeto.title, description: projeto.description, status: v as "em_curso" } })
              .then(() => qc.invalidateQueries({ queryKey: ["projetos"] }))
          }
        >
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" /> Entidades</h3>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <Select value={entSel} onValueChange={setEntSel}>
            <SelectTrigger className="w-full sm:w-80"><SelectValue placeholder="Escolher entidade" /></SelectTrigger>
            <SelectContent>
              {(opts?.entidades ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            disabled={!entSel}
            onClick={() => run(addEnt({ data: { projectId: projeto.id, entityId: entSel } }), "Entidade adicionada.")}
          >
            Adicionar
          </Button>
        </div>
        <ul className="divide-y rounded-md border">
          {(data?.entidades ?? []).length === 0 && <li className="p-3 text-sm text-muted-foreground">Nenhuma entidade.</li>}
          {(data?.entidades ?? []).map((e) => (
            <li key={e.id} className="flex min-w-0 items-center justify-between gap-2 p-3 text-sm">
              <span className="truncate">{e.name}</span>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remover ${e.name}`}
                onClick={() => run(rmEnt({ data: { id: e.id } }), "Entidade removida; os seus utilizadores perderam o acesso.")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4" /> Pessoas com acesso direto</h3>
        <div className="relative">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar por nome ou email" />
          {sugestoes.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
              {sugestoes.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="w-full truncate px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setQ("");
                      run(setUser({ data: { projectId: projeto.id, userId: u.id, on: true } }), "Pessoa adicionada.");
                    }}
                  >
                    {u.full_name ?? "—"} <span className="text-muted-foreground">{u.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ul className="divide-y rounded-md border">
          {(data?.diretos ?? []).length === 0 && <li className="p-3 text-sm text-muted-foreground">Ninguém com acesso direto.</li>}
          {(data?.diretos ?? []).map((u) => (
            <li key={u.id} className="flex min-w-0 items-center justify-between gap-2 p-3 text-sm">
              <span className="min-w-0 truncate">{u.full_name ?? "—"} <span className="text-muted-foreground">{u.email}</span></span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remover acesso direto"
                onClick={() => run(setUser({ data: { projectId: projeto.id, userId: u.id, on: false } }), "Acesso direto removido.")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Pessoas com acesso pela entidade ({data?.herdados.length ?? 0})</h3>
        <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
          {(data?.herdados ?? []).map((u) => (
            <li key={u.id} className="flex min-w-0 items-center justify-between gap-2 p-3 text-sm">
              <span className="min-w-0 truncate">{u.full_name ?? u.email ?? "—"}</span>
              <Badge variant="outline" className="max-w-[45%] shrink-0 truncate">
                <Building2 className="mr-1 h-3 w-3" />{entNames.get(u.entity_id ?? "") ?? "Entidade"}
              </Badge>
            </li>
          ))}
          {(data?.herdados ?? []).length === 0 && <li className="p-3 text-sm text-muted-foreground">Ninguém por via de entidade.</li>}
        </ul>
      </div>
    </section>
  );
}
