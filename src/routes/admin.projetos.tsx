import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, ClipboardPaste, Copy, Link2, Trash2, Upload, UserRound } from "lucide-react";
import { parseProjetosCsv } from "@/lib/projetos-import";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  importProjetos,
  listEntidadesUtilizadores,
  listProjetos,
  listProgramasComLink,
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
  possibilidade: "Possibilidade",
  em_arranque: "Em arranque",
  em_contratualizacao: "Em contratualização",
  em_progresso: "Em progresso",
  institucional: "Institucional",
  em_fecho: "Em fecho",
  terminado: "Terminado",
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
          <ImportarProjetos />
          <p className="text-xs text-muted-foreground">
            Importe por ficheiro ou colando linhas do Excel/Sheets. Colunas: Projeto, Data início, Data fim, Status. Projetos com o mesmo nome são atualizados.
          </p>
          <ul className="space-y-1">
            {projetos.length === 0 && <li className="text-sm text-muted-foreground">Sem projetos.</li>}
            {projetos.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelId(p.id)}
                  className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${p.id === selId ? "bg-muted font-semibold" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{p.title}</span>
                    {(p.data_inicio || p.data_fim) && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {p.data_inicio ?? "…"} → {p.data_fim ?? "…"}
                      </span>
                    )}
                  </span>
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

function ProjetoDetalhe({ projeto }: { projeto: { id: string; title: string; status: string; description: string | null; inscricao_token: string | null } }) {
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

      <LinkInscricao token={projeto.inscricao_token} />

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

function LinkInscricao({ token }: { token: string | null }) {
  const fetchProg = useServerFn(listProgramasComLink);
  const { data: programas = [] } = useQuery({ queryKey: ["programas-com-link"], queryFn: () => fetchProg() });
  const [progId, setProgId] = useState("");
  const prog = programas.find((p) => p.id === progId);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = prog && token ? `${origin}/inscricao-entidade/${prog.token}?p=${token}` : "";
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <h3 className="flex items-center gap-2 font-semibold"><Link2 className="h-4 w-4" /> Link de inscrição de organizações</h3>
      <p className="text-sm text-muted-foreground">
        As organizações que se inscreverem por este link ficam ligadas a este projeto, sem o verem. Os formandos que depois se inscreverem nas turmas dessas organizações herdam o projeto.
      </p>
      <Select value={progId} onValueChange={setProgId}>
        <SelectTrigger className="w-full sm:w-96"><SelectValue placeholder="Escolher programa" /></SelectTrigger>
        <SelectContent>
          {programas.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
        </SelectContent>
      </Select>
      {url && (
        <div className="flex min-w-0 items-center gap-2 rounded-md border bg-card px-2 py-1.5">
          <code className="min-w-0 flex-1 truncate text-xs">{url}</code>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0"
            onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}
          >
            <Copy className="mr-1 h-4 w-4" /> Copiar
          </Button>
        </div>
      )}
    </div>
  );
}

function ImportarProjetos() {
  const qc = useQueryClient();
  const importFn = useServerFn(importProjetos);
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  async function importar(text: string, origem: string) {
    setBusy(true);
    try {
      const { rows, errors } = parseProjetosCsv(text);
      if (errors.length) toast.warning(`${errors.length} linha(s) ignorada(s): ${errors.slice(0, 3).join(" ")}`);
      if (!rows.length) {
        toast.error(`Nenhuma linha válida ${origem}.`);
        return;
      }
      const r = await importFn({ data: { rows } });
      toast.success(`${r.criados} criado(s), ${r.atualizados} atualizado(s).`);
      qc.invalidateQueries({ queryKey: ["projetos"] });
      setPasteOpen(false);
      setPasteText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setBusy(false);
    }
  }
  async function onFile(f: File) {
    await importar(await f.text(), "no ficheiro");
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm font-medium text-secondary hover:bg-muted">
          <Upload className="h-4 w-4" /> {busy ? "A importar…" : "Importar CSV"}
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onFile(f);
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => setPasteOpen(true)}
          className="flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm font-medium text-secondary hover:bg-muted"
        >
          <ClipboardPaste className="h-4 w-4" /> Colar dados
        </button>
      </div>
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Colar projetos</DialogTitle>
            <DialogDescription>
              Copie as linhas do Excel ou Google Sheets (colunas Projeto, Data início, Data fim, Status) e cole aqui. A primeira linha pode ser o cabeçalho.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder={"Projeto;Data início;Data fim;Status\nFormação Cívica;01/01/2026;31/07/2026;Em curso"}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteOpen(false)}>Cancelar</Button>
            <Button disabled={busy || !pasteText.trim()} onClick={() => void importar(pasteText, "no texto colado")}>
              {busy ? "A importar…" : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
