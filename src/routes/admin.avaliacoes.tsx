import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RouteGate } from "@/components/RouteGate";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { FormField } from "@/components/shell/FormField";
import { StatusChip } from "@/components/shell/StatusChip";
import { PerguntasListEditor } from "@/components/avaliacao/PerguntasListEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createModelo,
  deleteModelo,
  listModelosGestao,
  updateModelo,
  type ModeloGestao,
} from "@/lib/avaliacao-modelos.functions";
import { listProdutos, type ProdutoRow } from "@/lib/produtos.functions";
import {
  TIPOS_AVALIACAO,
  TIPO_AVALIACAO_LABEL,
  type Pergunta,
  type TipoAvaliacao,
} from "@/lib/avaliacao-acoes-types";

export const Route = createFileRoute("/admin/avaliacoes")({
  head: () => ({ meta: [{ title: "Modelos de avaliação | Gestão" }] }),
  component: () => (
    <RouteGate path="/admin/avaliacoes">
      <AdminAvaliacoesPage />
    </RouteGate>
  ),
});

const MODELOS_KEY = ["avaliacao-modelos-gestao"] as const;

/** Modelo em edição; `id` vazio = modelo novo. */
type Rascunho = {
  id: string | null;
  nome: string;
  tipo: TipoAvaliacao;
  descricao: string;
  perguntas: Pergunta[];
  produtoIds: string[];
  emUso: number;
};

const RASCUNHO_NOVO: Rascunho = {
  id: null,
  nome: "",
  tipo: "satisfacao",
  descricao: "",
  perguntas: [],
  produtoIds: [],
  emUso: 0,
};

function deModelo(m: ModeloGestao): Rascunho {
  return {
    id: m.id,
    nome: m.nome,
    tipo: m.tipo,
    descricao: m.descricao ?? "",
    perguntas: m.perguntas,
    produtoIds: m.produto_ids,
    emUso: m.em_uso,
  };
}

function AdminAvaliacoesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listModelosGestao);
  const produtosFn = useServerFn(listProdutos);
  const deleteFn = useServerFn(deleteModelo);

  const { data: modelos, isLoading } = useQuery({
    queryKey: MODELOS_KEY,
    queryFn: () => listFn(),
  });
  const { data: produtos } = useQuery({
    queryKey: ["produtos-catalogo"],
    queryFn: () => produtosFn(),
    retry: false,
  });

  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<TipoAvaliacao | "todos">("todos");
  const [pesquisa, setPesquisa] = useState("");
  const visiveis = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    return (modelos ?? []).filter(
      (m) => (filtroTipo === "todos" || m.tipo === filtroTipo) && (!q || m.nome.toLowerCase().includes(q)),
    );
  }, [modelos, filtroTipo, pesquisa]);
  const [aApagar, setAApagar] = useState<ModeloGestao | null>(null);

  const nomeProduto = useMemo(
    () => new Map((produtos ?? []).map((p) => [p.id, p.name])),
    [produtos],
  );

  const apagarMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Modelo apagado.");
      qc.invalidateQueries({ queryKey: MODELOS_KEY });
      setAApagar(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao apagar"),
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Programas e ações"
        title="Modelos de avaliação"
        description="Os modelos são o ponto de partida das avaliações de cada ação. Liga um modelo a produtos do catálogo para que seja sugerido nas ações desses produtos."
        actions={
          <Button onClick={() => setRascunho({ ...RASCUNHO_NOVO })}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo modelo
          </Button>
        }
      />

      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-[1_1_300px] space-y-3 lg:max-w-sm">
          <Input
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Pesquisar modelos"
            aria-label="Pesquisar modelos"
          />
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as TipoAvaliacao | "todos")}>
            <SelectTrigger aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS_AVALIACAO.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_AVALIACAO_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : visiveis.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {(modelos ?? []).length === 0 ? "Ainda não há modelos. Cria o primeiro." : "Nenhum modelo encontrado."}
            </p>
          ) : (
            <ul className="space-y-2">
              {visiveis.map((m) => {
                const ativo = rascunho?.id === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setRascunho(deModelo(m))}
                      aria-current={ativo ? "true" : undefined}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        ativo ? "border-primary bg-primary/5" : "bg-card hover:border-secondary/40"
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 break-words text-sm font-medium text-secondary">{m.nome}</span>
                        <StatusChip tone="tag">{TIPO_AVALIACAO_LABEL[m.tipo]}</StatusChip>
                      </span>
                      <span className="mt-1.5 block text-xs text-muted-foreground">
                        {m.perguntas.length} {m.perguntas.length === 1 ? "pergunta" : "perguntas"} · usado em{" "}
                        {m.em_uso} {m.em_uso === 1 ? "avaliação" : "avaliações"}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {m.produto_ids.length === 0
                          ? "Sem produtos ligados"
                          : m.produto_ids.map((id) => nomeProduto.get(id) ?? "Produto removido").join(", ")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <section className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-xl border bg-card">
          {rascunho ? (
            <ModeloEditor
              key={rascunho.id ?? `novo-${rascunho.nome}`}
              inicial={rascunho}
              produtos={produtos ?? []}
              onGuardado={(novo) => {
                qc.invalidateQueries({ queryKey: MODELOS_KEY });
                // Um modelo novo fecha o editor, para não ser criado duas vezes.
                if (novo) setRascunho(null);
              }}
              onDuplicar={() =>
                setRascunho({
                  ...rascunho,
                  id: null,
                  nome: `${rascunho.nome} (cópia)`,
                  // Uma cópia começa sem produtos, para não duplicar sugestões.
                  produtoIds: [],
                  emUso: 0,
                })
              }
              onApagar={() => {
                const m = (modelos ?? []).find((x) => x.id === rascunho.id);
                if (m) setAApagar(m);
              }}
            />
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-muted-foreground">Escolhe um modelo da lista para o ver e editar.</p>
              <Button variant="outline" onClick={() => setRascunho({ ...RASCUNHO_NOVO })}>
                <Plus className="mr-1.5 h-4 w-4" />
                Criar modelo novo
              </Button>
            </div>
          )}
        </section>
      </div>

      <AlertDialog open={aApagar !== null} onOpenChange={(v) => !v && setAApagar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar “{aApagar?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              As avaliações já criadas a partir deste modelo mantêm as suas perguntas e respostas.
              Deixa de poder ser escolhido em novas avaliações e perdem-se as ligações a produtos.
              Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => aApagar && apagarMut.mutate(aApagar.id)}>
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function ModeloEditor({
  inicial,
  produtos,
  onGuardado,
  onDuplicar,
  onApagar,
}: {
  inicial: Rascunho;
  produtos: ProdutoRow[];
  onGuardado: (novo: boolean) => void;
  onDuplicar: () => void;
  onApagar: () => void;
}) {
  const createFn = useServerFn(createModelo);
  const updateFn = useServerFn(updateModelo);
  const [nome, setNome] = useState(inicial.nome);
  const [tipo, setTipo] = useState<TipoAvaliacao>(inicial.tipo);
  const [descricao, setDescricao] = useState(inicial.descricao);
  const [perguntas, setPerguntas] = useState<Pergunta[]>(inicial.perguntas);
  const [produtoIds, setProdutoIds] = useState<string[]>(inicial.produtoIds);
  const [filtro, setFiltro] = useState("");

  const visiveis = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return f ? produtos.filter((p) => p.name.toLowerCase().includes(f)) : produtos;
  }, [produtos, filtro]);

  const mut = useMutation({
    mutationFn: async () => {
      const dados = {
        nome,
        tipo,
        descricao: descricao.trim() || null,
        perguntas: perguntas.map((p) => ({ ...p, texto: p.texto.trim() })),
        produtoIds,
      };
      if (inicial.id) {
        await updateFn({ data: { id: inicial.id, ...dados } });
      } else {
        await createFn({ data: dados });
      }
    },
    onSuccess: () => {
      toast.success(inicial.id ? "Modelo guardado." : "Modelo criado.");
      onGuardado(!inicial.id);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao guardar"),
  });

  const alternarProduto = (id: string, on: boolean) =>
    setProdutoIds((l) => (on ? [...l, id] : l.filter((x) => x !== id)));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="break-words text-base font-semibold text-secondary">
            {inicial.id ? inicial.nome || "Modelo sem nome" : "Novo modelo"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Alterar um modelo só afeta as avaliações criadas a partir de agora. As avaliações
            existentes têm a sua própria cópia das perguntas.
          </p>
        </div>
        {inicial.id && (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onDuplicar}>
              <Copy className="mr-1.5 h-4 w-4" />
              Duplicar
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Apagar modelo" onClick={onApagar}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-6 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <FormField id="modelo-nome" label="Nome" required>
            <Input id="modelo-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </FormField>
          <div className="space-y-1.5">
            <Label htmlFor="modelo-tipo" className="text-[13px] font-medium text-secondary">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAvaliacao)}>
              <SelectTrigger id="modelo-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_AVALIACAO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_AVALIACAO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="modelo-descricao" className="text-[13px] font-medium text-secondary">Descrição</Label>
          <Textarea
            id="modelo-descricao"
            rows={2}
            value={descricao}
            placeholder="Para que serve este modelo (opcional)"
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[13px] font-medium text-secondary">Produtos ligados</span>
            <span className="text-xs text-muted-foreground">
              {produtoIds.length} {produtoIds.length === 1 ? "selecionado" : "selecionados"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Nas ações destes produtos, este modelo aparece como sugerido.
          </p>
          {produtos.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Não há produtos no catálogo.
            </p>
          ) : (
            <div className="space-y-2 rounded-md border p-3">
              {produtos.length > 8 && (
                <Input
                  value={filtro}
                  placeholder="Pesquisar produtos"
                  onChange={(e) => setFiltro(e.target.value)}
                />
              )}
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {visiveis.map((p) => (
                  <Label key={p.id} className="flex items-center gap-2 py-1 text-sm font-normal">
                    <Checkbox
                      checked={produtoIds.includes(p.id)}
                      onCheckedChange={(v) => alternarProduto(p.id, v === true)}
                    />
                    <span className="min-w-0 break-words">{p.name}</span>
                    {p.tipo && <span className="text-xs text-muted-foreground">{p.tipo}</span>}
                  </Label>
                ))}
                {visiveis.length === 0 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    Nenhum produto encontrado.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span className="text-[13px] font-medium text-secondary">Perguntas ({perguntas.length})</span>
          {perguntas.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Ainda sem perguntas. Podes ter perguntas de escala, antes e depois, texto ou escolha.
            </p>
          )}
          <PerguntasListEditor perguntas={perguntas} onChange={setPerguntas} />
        </div>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-card px-4 py-3 sm:px-6">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || !nome.trim()}>
          <Save className="mr-1.5 h-4 w-4" />
          {inicial.id ? "Guardar modelo" : "Criar modelo"}
        </Button>
      </div>
    </>
  );
}
