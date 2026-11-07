import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RouteGate } from "@/components/RouteGate";
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
  head: () => ({ meta: [{ title: "Modelos de Avaliação — Admin" }] }),
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
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-secondary">Modelos de avaliação</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Os modelos são o ponto de partida das avaliações de cada ação. Ligar um modelo a
            produtos faz com que seja sugerido, e pré-selecionado, nas ações desse produto.
          </p>
        </div>
        <Button onClick={() => setRascunho({ ...RASCUNHO_NOVO })}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo modelo
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !modelos || modelos.length === 0 ? (
        <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          Ainda não há modelos. Cria o primeiro.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {modelos.map((m) => (
            <div key={m.id} className="min-w-0 space-y-3 rounded-xl border bg-card p-4 shadow-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-medium">{m.nome}</p>
                  <Badge variant="outline">{TIPO_AVALIACAO_LABEL[m.tipo]}</Badge>
                </div>
                {m.descricao && <p className="mt-1 text-sm text-muted-foreground">{m.descricao}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.perguntas.length} {m.perguntas.length === 1 ? "pergunta" : "perguntas"} ·{" "}
                  {m.em_uso} {m.em_uso === 1 ? "avaliação criada" : "avaliações criadas"}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {m.produto_ids.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Sem produtos ligados</span>
                ) : (
                  m.produto_ids.map((id) => (
                    <Badge key={id} variant="secondary">
                      {nomeProduto.get(id) ?? "Produto removido"}
                    </Badge>
                  ))
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setRascunho(deModelo(m))}>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Ver e editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setRascunho({
                      ...deModelo(m),
                      id: null,
                      nome: `${m.nome} (cópia)`,
                      // Uma cópia começa sem produtos, para não duplicar sugestões.
                      produtoIds: [],
                      emUso: 0,
                    })
                  }
                >
                  <Copy className="mr-1.5 h-4 w-4" />
                  Duplicar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Apagar ${m.nome}`}
                  onClick={() => setAApagar(m)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={rascunho !== null} onOpenChange={(v) => !v && setRascunho(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-3xl">
          {rascunho && (
            // `key` recria o editor ao abrir outro modelo.
            <ModeloEditor
              key={rascunho.id ?? `novo-${rascunho.nome}`}
              inicial={rascunho}
              produtos={produtos ?? []}
              onGuardado={() => {
                qc.invalidateQueries({ queryKey: MODELOS_KEY });
                setRascunho(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

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
    </div>
  );
}

function ModeloEditor({
  inicial,
  produtos,
  onGuardado,
}: {
  inicial: Rascunho;
  produtos: ProdutoRow[];
  onGuardado: () => void;
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
      onGuardado();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao guardar"),
  });

  const alternarProduto = (id: string, on: boolean) =>
    setProdutoIds((l) => (on ? [...l, id] : l.filter((x) => x !== id)));

  return (
    <>
      <SheetHeader className="border-b px-4 py-4 pr-12 sm:px-6 sm:pr-12">
        <SheetTitle className="text-left">
          {inicial.id ? "Editar modelo" : "Novo modelo"}
        </SheetTitle>
        <SheetDescription className="text-left">
          Alterar um modelo só afeta as avaliações que forem criadas a partir de agora. As
          avaliações existentes têm a sua própria cópia das perguntas.
        </SheetDescription>
      </SheetHeader>

      <div className="min-w-0 space-y-6 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAvaliacao)}>
              <SelectTrigger>
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
          <Label>Descrição</Label>
          <Textarea
            rows={2}
            value={descricao}
            placeholder="Para que serve este modelo (opcional)"
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label>Produtos ligados</Label>
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
          <Label>Perguntas ({perguntas.length})</Label>
          {perguntas.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Ainda sem perguntas. Podes ter perguntas de escala, antes e depois, texto ou escolha.
            </p>
          )}
          <PerguntasListEditor perguntas={perguntas} onChange={setPerguntas} />
        </div>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background px-4 py-3 sm:px-6">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          {inicial.id ? "Guardar" : "Criar modelo"}
        </Button>
      </div>
    </>
  );
}
