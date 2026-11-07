import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PerguntasListEditor } from "@/components/avaliacao/PerguntasListEditor";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { avaliacaoUrl, avaliacoesQueryKey, copiarLinkAvaliacao } from "@/lib/avaliacao-acoes-link";
import {
  createAvaliacao,
  deleteAvaliacao,
  deleteRespostaAvaliacao,
  getRespostasAvaliacao,
  listAvaliacoesAcao,
  listModelosAvaliacao,
  updateAvaliacao,
  type AvaliacaoAcao,
  type RespostaAvaliacao,
} from "@/lib/avaliacao-acoes.functions";
import {
  TIPOS_AVALIACAO,
  TIPOS_PERGUNTA,
  TIPO_AVALIACAO_LABEL,
  TIPO_PERGUNTA_LABEL,
  calcularEstatisticas,
  formatarNota,
  formatarPercentagem,
  novoIdPergunta,
  type Pergunta,
  type TipoAvaliacao,
  type TipoPergunta,
  type ValorResposta,
} from "@/lib/avaliacao-acoes-types";

const SEM_MODELO = "__raiz";

export function AcaoAvaliacoesTab({ actionId }: { actionId: string }) {
  const listFn = useServerFn(listAvaliacoesAcao);
  const { data, isLoading } = useQuery({
    queryKey: avaliacoesQueryKey(actionId),
    queryFn: () => listFn({ data: { actionId } }),
  });
  const [criarAberto, setCriarAberto] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-sm text-muted-foreground">
          Cada avaliação tem o seu link público e anónimo. Uma ação pode ter uma ou várias.
        </p>
        <Button size="sm" onClick={() => setCriarAberto(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nova avaliação
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Ainda não há avaliações para esta ação.
        </p>
      ) : (
        data.map((a) => <AvaliacaoCard key={a.id} avaliacao={a} actionId={actionId} />)
      )}

      <CriarAvaliacaoDialog actionId={actionId} open={criarAberto} onOpenChange={setCriarAberto} />
    </div>
  );
}

// ---------- Criar ----------

function CriarAvaliacaoDialog({
  actionId,
  open,
  onOpenChange,
}: {
  actionId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const modelosFn = useServerFn(listModelosAvaliacao);
  const createFn = useServerFn(createAvaliacao);
  const { data: modelos } = useQuery({
    queryKey: ["avaliacao-modelos", actionId],
    queryFn: () => modelosFn({ data: { actionId } }),
    enabled: open,
  });

  const [modeloId, setModeloId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoAvaliacao>("satisfacao");

  // Modelo por defeito: o sugerido para o produto da ação, se existir.
  const modeloEfetivo = modeloId ?? modelos?.find((m) => m.sugerido)?.id ?? SEM_MODELO;
  const modelo = modelos?.find((m) => m.id === modeloEfetivo);

  const mut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          actionId,
          modeloId: modelo ? modelo.id : null,
          titulo: titulo.trim() || modelo?.nome || "Avaliação",
          tipo: modelo ? modelo.tipo : tipo,
        },
      }),
    onSuccess: () => {
      toast.success("Avaliação criada.");
      qc.invalidateQueries({ queryKey: avaliacoesQueryKey(actionId) });
      setModeloId(null);
      setTitulo("");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar a avaliação"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova avaliação</DialogTitle>
          <DialogDescription>
            Parte de um modelo (que podes editar depois) ou cria um questionário de raiz.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Select value={modeloEfetivo} onValueChange={setModeloId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(modelos ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                    {m.sugerido ? " (sugerido)" : ""}
                  </SelectItem>
                ))}
                <SelectItem value={SEM_MODELO}>Criar de raiz</SelectItem>
              </SelectContent>
            </Select>
            {modelo?.descricao && (
              <p className="text-xs text-muted-foreground">{modelo.descricao}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              value={titulo}
              placeholder={modelo?.nome ?? "Ex.: Avaliação de satisfação"}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          {!modelo && (
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
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Cartão de uma avaliação ----------

function AvaliacaoCard({ avaliacao, actionId }: { avaliacao: AvaliacaoAcao; actionId: string }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateAvaliacao);
  const deleteFn = useServerFn(deleteAvaliacao);
  const [copiado, setCopiado] = useState(false);
  const [apagar, setApagar] = useState(false);

  const invalidar = () => qc.invalidateQueries({ queryKey: avaliacoesQueryKey(actionId) });

  const abertaMut = useMutation({
    mutationFn: (aberta: boolean) => updateFn({ data: { id: avaliacao.id, aberta } }),
    onSuccess: invalidar,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar"),
  });
  const apagarMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: avaliacao.id } }),
    onSuccess: () => {
      toast.success("Avaliação apagada.");
      invalidar();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao apagar"),
  });

  const copiar = async () => {
    if (await copiarLinkAvaliacao(avaliacao.token)) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="min-w-0 space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-medium">{avaliacao.titulo}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{TIPO_AVALIACAO_LABEL[avaliacao.tipo]}</Badge>
            <span>
              {avaliacao.total_respostas}{" "}
              {avaliacao.total_respostas === 1 ? "resposta" : "respostas"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="flex items-center gap-2 text-xs font-normal">
            <Switch
              checked={avaliacao.aberta}
              onCheckedChange={(v) => abertaMut.mutate(v)}
              disabled={abertaMut.isPending}
            />
            {avaliacao.aberta ? "Aberta" : "Fechada"}
          </Label>
          <Button size="sm" variant="outline" onClick={copiar}>
            {copiado ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
            Copiar link
          </Button>
          <Button size="icon" variant="ghost" asChild aria-label="Abrir avaliação">
            <a href={avaliacaoUrl(avaliacao.token)} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Apagar avaliação"
            onClick={() => setApagar(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="respostas">
        <TabsList>
          <TabsTrigger value="respostas">Respostas</TabsTrigger>
          <TabsTrigger value="perguntas">Perguntas</TabsTrigger>
        </TabsList>
        <TabsContent value="respostas" className="mt-3 min-w-0">
          <RespostasPainel avaliacao={avaliacao} actionId={actionId} />
        </TabsContent>
        <TabsContent value="perguntas" className="mt-3 min-w-0">
          <PerguntasEditor avaliacao={avaliacao} actionId={actionId} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={apagar} onOpenChange={setApagar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              O link deixa de funcionar e as {avaliacao.total_respostas} respostas são apagadas. Não
              dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => apagarMut.mutate()}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------- Respostas ----------

function textoResposta(v: ValorResposta | undefined): string {
  if (v === undefined) return "";
  if (typeof v === "object") return `${v.inicio} → ${v.fim}`;
  return String(v);
}

function csvCelula(valor: string) {
  return `"${valor.replace(/"/g, '""')}"`;
}

function exportarCsv(avaliacao: AvaliacaoAcao, respostas: RespostaAvaliacao[]) {
  const cabecalho = ["Data", ...avaliacao.perguntas.map((p) => p.texto)];
  const linhas = respostas.map((r) => [
    new Date(r.created_at).toLocaleString("pt-PT"),
    ...avaliacao.perguntas.map((p) => {
      const v = r.respostas[p.id];
      // Antes/depois em duas colunas seria mais útil no Excel, mas mantém-se uma
      // coluna por pergunta para o ficheiro bater certo com o que se vê no ecrã.
      return textoResposta(v);
    }),
  ]);
  const csv = [cabecalho, ...linhas].map((l) => l.map(csvCelula).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `avaliacao-${avaliacao.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function RespostasPainel({ avaliacao, actionId }: { avaliacao: AvaliacaoAcao; actionId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(getRespostasAvaliacao);
  const delFn = useServerFn(deleteRespostaAvaliacao);
  const { data, isLoading } = useQuery({
    queryKey: ["avaliacao-respostas", avaliacao.id],
    queryFn: () => fn({ data: { id: avaliacao.id } }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Resposta apagada.");
      qc.invalidateQueries({ queryKey: ["avaliacao-respostas", avaliacao.id] });
      qc.invalidateQueries({ queryKey: avaliacoesQueryKey(actionId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao apagar"),
  });

  const stats = useMemo(
    () =>
      calcularEstatisticas(
        avaliacao.perguntas,
        (data ?? []).map((r) => r.respostas),
      ),
    [avaliacao.perguntas, data],
  );

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Ainda não há respostas. Partilha o link para começar a recolher.
      </p>
    );
  }

  const temAntesDepois = stats.porPergunta.some((s) => s.tipo === "escala_antes_depois");
  const temEscala = stats.porPergunta.some((s) => s.tipo === "escala");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {data.length} {data.length === 1 ? "resposta" : "respostas"}
        </p>
        <Button size="sm" variant="outline" onClick={() => exportarCsv(avaliacao, data)}>
          <Download className="mr-1.5 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {stats.porPergunta.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Resumo</h4>
          <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Pergunta</TableHead>
                  {temAntesDepois && (
                    <>
                      <TableHead className="text-right">Início</TableHead>
                      <TableHead className="text-right">Fim</TableHead>
                      <TableHead className="text-right">Incremento</TableHead>
                    </>
                  )}
                  {temEscala && <TableHead className="text-right">Média</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.porGrupo.map((g) => (
                  <GrupoLinhas
                    key={g.grupo}
                    grupo={g}
                    itens={stats.porPergunta.filter((s) => s.grupo === g.grupo)}
                    temAntesDepois={temAntesDepois}
                    temEscala={temEscala}
                  />
                ))}
                {stats.porPergunta
                  .filter((s) => !s.grupo)
                  .map((s) => (
                    <LinhaPergunta
                      key={s.id}
                      s={s}
                      temAntesDepois={temAntesDepois}
                      temEscala={temEscala}
                    />
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Todas as respostas</h4>
        <div className="max-h-[28rem] overflow-auto rounded-md border">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Data</TableHead>
                {avaliacao.perguntas.map((p) => (
                  <TableHead key={p.id} className="min-w-[10rem] align-bottom">
                    {p.texto}
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data].reverse().map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-PT", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  {avaliacao.perguntas.map((p) => (
                    <TableCell
                      key={p.id}
                      className="max-w-[18rem] whitespace-pre-wrap break-words text-sm"
                    >
                      {textoResposta(r.respostas[p.id])}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Apagar resposta"
                      onClick={() => {
                        if (window.confirm("Apagar esta resposta?")) delMut.mutate(r.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

type Stat = ReturnType<typeof calcularEstatisticas>["porPergunta"][number];
type StatGrupo = ReturnType<typeof calcularEstatisticas>["porGrupo"][number];

function GrupoLinhas({
  grupo,
  itens,
  temAntesDepois,
  temEscala,
}: {
  grupo: StatGrupo;
  itens: Stat[];
  temAntesDepois: boolean;
  temEscala: boolean;
}) {
  return (
    <>
      <TableRow className="bg-muted/50">
        <TableCell className="text-xs font-semibold uppercase tracking-wide">
          {grupo.grupo}
        </TableCell>
        {temAntesDepois && (
          <>
            <TableCell className="text-right font-semibold">
              {formatarNota(grupo.mediaInicio)}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {formatarNota(grupo.mediaFim)}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {formatarPercentagem(grupo.incremento)}
            </TableCell>
          </>
        )}
        {temEscala && (
          <TableCell className="text-right font-semibold">{formatarNota(grupo.media)}</TableCell>
        )}
      </TableRow>
      {itens.map((s) => (
        <LinhaPergunta key={s.id} s={s} temAntesDepois={temAntesDepois} temEscala={temEscala} />
      ))}
    </>
  );
}

function LinhaPergunta({
  s,
  temAntesDepois,
  temEscala,
}: {
  s: Stat;
  temAntesDepois: boolean;
  temEscala: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="whitespace-normal break-words text-sm">{s.texto}</TableCell>
      {temAntesDepois && (
        <>
          <TableCell className="text-right">{formatarNota(s.mediaInicio)}</TableCell>
          <TableCell className="text-right">{formatarNota(s.mediaFim)}</TableCell>
          <TableCell className="text-right">{formatarPercentagem(s.incremento)}</TableCell>
        </>
      )}
      {temEscala && <TableCell className="text-right">{formatarNota(s.media)}</TableCell>}
    </TableRow>
  );
}

// ---------- Editor de perguntas ----------

function PerguntasEditor({ avaliacao, actionId }: { avaliacao: AvaliacaoAcao; actionId: string }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateAvaliacao);
  const [titulo, setTitulo] = useState(avaliacao.titulo);
  const [tipo, setTipo] = useState<TipoAvaliacao>(avaliacao.tipo);
  const [perguntas, setPerguntas] = useState<Pergunta[]>(avaliacao.perguntas);

  const mut = useMutation({
    mutationFn: () => updateFn({ data: { id: avaliacao.id, titulo, tipo, perguntas } }),
    onSuccess: () => {
      toast.success("Avaliação guardada.");
      qc.invalidateQueries({ queryKey: avaliacoesQueryKey(actionId) });
      // As tabelas de respostas dependem das perguntas.
      qc.invalidateQueries({ queryKey: ["avaliacao-respostas", avaliacao.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao guardar"),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
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

      {avaliacao.total_respostas > 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          Esta avaliação já tem respostas. Mudar o texto de uma pergunta altera o que se lê nos
          resultados antigos; apagar uma pergunta esconde as respostas que lhe correspondem.
        </p>
      )}

      <PerguntasListEditor perguntas={perguntas} onChange={setPerguntas} />

      <div className="flex justify-end">
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          Guardar
        </Button>
      </div>
    </div>
  );
}
