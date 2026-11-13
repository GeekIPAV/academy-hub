import { useEffect, useState, type ReactNode } from "react";
import { Copy, Check, ChevronDown, ExternalLink, LinkIcon, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EstadoSelect, FormatoSelect, PaisSelect } from "@/components/admin/acoes/AcaoCampos";
import { INSCRICOES_ABERTAS, INSCRICOES_FECHADAS } from "@/lib/acoes-opcoes";
import { CoverUploader } from "@/components/CoverUploader";
import { CoverImage } from "@/components/CoverImage";
import {
  listProjetos,
  getAcaoVisibilidade,
  saveAcaoVisibilidade,
} from "@/lib/projetos.functions";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  patchAcao,
  listInscritosAcao,
  getAcaoResultados,
  savePaginaInscricao,
  type AcaoRow,
  type AcaoResultados,
  type Contagem,
  type RequiredFieldDef,
} from "@/lib/admin-acoes-gestao.functions";
import { listProdutos } from "@/lib/produtos.functions";
import { listAvaliacoesAcao } from "@/lib/avaliacao-acoes.functions";
import { AcaoAvaliacoesTab } from "@/components/admin/acoes/AcaoAvaliacoesTab";
import { StatusChip, type ChipTone } from "@/components/shell/StatusChip";

function inscritoTone(status: string | null | undefined): ChipTone {
  const s = (status ?? "").toLowerCase();
  if (s.includes("espera") || s.includes("suplente")) return "yellow";
  if (s.includes("cancel") || s.includes("desist") || s.includes("rejeit")) return "red";
  if (s.includes("conclu") || s.includes("presen")) return "green";
  return "navy";
}
import { avaliacoesQueryKey, copiarLinkAvaliacao } from "@/lib/avaliacao-acoes-link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  PaginaInscricaoEditor,
  loadDoc,
  type PageDoc,
} from "./PaginaInscricaoEditor";

export function CopiarLinkAvaliacaoButton({
  actionId,
  onIrParaAvaliacoes,
}: {
  actionId: string;
  onIrParaAvaliacoes: () => void;
}) {
  const listFn = useServerFn(listAvaliacoesAcao);
  const { data } = useQuery({
    queryKey: avaliacoesQueryKey(actionId),
    queryFn: () => listFn({ data: { actionId } }),
  });
  const avaliacoes = data ?? [];

  if (avaliacoes.length === 0) {
    return (
      <Button size="sm" variant="outline" onClick={onIrParaAvaliacoes}>
        <LinkIcon className="mr-1.5 h-4 w-4" />
        Criar avaliação
      </Button>
    );
  }
  if (avaliacoes.length === 1) {
    return (
      <Button size="sm" variant="outline" onClick={() => copiarLinkAvaliacao(avaliacoes[0].token)}>
        <Copy className="mr-1.5 h-4 w-4" />
        Copiar link de avaliação
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Copy className="mr-1.5 h-4 w-4" />
          Copiar link de avaliação
          <ChevronDown className="ml-1.5 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {avaliacoes.map((a) => (
          <DropdownMenuItem key={a.id} onClick={() => copiarLinkAvaliacao(a.token)}>
            {a.titulo}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InscritosTab({ actionId }: { actionId: string }) {
  const fn = useServerFn(listInscritosAcao);
  const { data, isLoading } = useQuery({
    queryKey: ["inscritos-acao", actionId],
    queryFn: () => fn({ data: { actionId } }),
  });
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Sem inscritos.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
    <Table className="min-w-[560px]">
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Inscrito em</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.full_name ?? "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{r.email ?? "—"}</TableCell>
            <TableCell>
              <StatusChip tone={inscritoTone(r.status)}>{r.status ?? "Sem estado"}</StatusChip>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("pt-PT") : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}

export function PaginaTab({ acao }: { acao: AcaoRow }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(savePaginaInscricao);
  const [doc, setDoc] = useState<PageDoc>(() => loadDoc(acao.conteudo_pagina_inscricao));

  // reset when acao changes
  useEffect(() => {
    setDoc(loadDoc(acao.conteudo_pagina_inscricao));
  }, [acao.id, acao.conteudo_pagina_inscricao]);

  const mut = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          actionId: acao.id,
          conteudo: doc as never,
        },
      }),
    onSuccess: () => {
      toast.success("Página guardada.");
      qc.invalidateQueries({ queryKey: ["admin-acoes-full"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao guardar"),
  });

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/evento/${acao.id}`
      : `/evento/${acao.id}`;

  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/40 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <LinkIcon className="h-3.5 w-3.5" /> Link de inscrição na ação
        </div>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={publicUrl}
            className="h-9 flex-1 font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="mr-1 h-4 w-4" /> Copiado
              </>
            ) : (
              <>
                <Copy className="mr-1 h-4 w-4" /> Copiar
              </>
            )}
          </Button>
          <Button type="button" size="sm" variant="outline" asChild className="shrink-0">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" /> Abrir
            </a>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Constrói a página pública que os inscritos vão ver. Arrasta blocos para reordenar.
        </p>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "A guardar…" : "Guardar página"}
        </Button>
      </div>
      <PaginaInscricaoEditor value={doc} onChange={setDoc} defaultTitle={acao.title ?? undefined} acaoId={acao.id} />
    </div>
  );
}

export function ResultadosTab({ actionId }: { actionId: string }) {
  const fn = useServerFn(getAcaoResultados);
  const { data, isLoading } = useQuery({
    queryKey: ["acao-resultados", actionId],
    queryFn: () => fn({ data: { actionId } }),
  });
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const r = data as AcaoResultados | undefined;
  if (!r || r.total === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Ainda não há inscrições para mostrar estatísticas.
      </p>
    );
  }
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ResumoCard label="Total de inscritos" value={String(r.total)} />
        <ResumoCard label="Certificados emitidos" value={String(r.certificados)} />
        <ResumoCard label="1.ª inscrição" value={fmt(r.primeiraInscricao)} small />
        <ResumoCard label="Última inscrição" value={fmt(r.ultimaInscricao)} small />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Painel titulo="Organizações" descricao="Pessoas inscritas por entidade">
          <BarList items={r.organizacoes} total={r.total} />
        </Painel>
        <Painel titulo="Cidades" descricao="Pessoas inscritas por localidade">
          <BarList items={r.cidades} total={r.total} />
        </Painel>
        <Painel titulo="Estado das inscrições">
          <Chips items={r.porEstado} />
        </Painel>
        <Painel titulo="Tamanhos de t-shirt">
          <Chips items={r.tamanhos} />
        </Painel>
      </div>
    </div>
  );
}

function ResumoCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold text-secondary ${small ? "text-base" : "text-2xl"}`}>{value}</p>
    </div>
  );
}

function Painel({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold text-secondary">{titulo}</h3>
      {descricao && <p className="mb-2 text-xs text-muted-foreground">{descricao}</p>}
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function BarList({ items, total }: { items: Contagem[]; total: number }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  }
  const max = items[0].count || 1;
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.name}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{it.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {it.count} ({total > 0 ? Math.round((it.count / total) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-secondary/70"
              style={{ width: `${Math.max((it.count / max) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Chips({ items }: { items: Contagem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <Badge key={it.name} variant="secondary" className="text-xs">
          {it.name}: {it.count}
        </Badge>
      ))}
    </div>
  );
}
