import { useEffect, useMemo, useState } from "react";
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
  savePaginaInscricao,
  type AcaoRow,
  type RequiredFieldDef,
} from "@/lib/admin-acoes-gestao.functions";
import {
  PaginaInscricaoEditor,
  loadDoc,
  type PageDoc,
} from "./PaginaInscricaoEditor";

interface Props {
  acao: AcaoRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AcaoDetailDrawer({ acao, open, onOpenChange }: Props) {
  if (!acao) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-3xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            {acao.title ?? "(sem título)"}
            {acao.formato && <Badge variant="outline">{acao.formato}</Badge>}
          </SheetTitle>
        </SheetHeader>
        <div className="p-6">
          <Tabs defaultValue="dados">
            <TabsList>
              <TabsTrigger value="dados">Dados da ação</TabsTrigger>
              <TabsTrigger value="inscritos">Inscritos</TabsTrigger>
              <TabsTrigger value="pagina">Página de inscrição</TabsTrigger>
            </TabsList>
            <TabsContent value="dados" className="mt-4">
              <DadosTab acao={acao} />
            </TabsContent>
            <TabsContent value="inscritos" className="mt-4">
              <InscritosTab actionId={acao.id} />
            </TabsContent>
            <TabsContent value="pagina" className="mt-4">
              <PaginaTab acao={acao} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DadosTab({ acao }: { acao: AcaoRow }) {
  const qc = useQueryClient();
  const patchFn = useServerFn(patchAcao);
  const [form, setForm] = useState(() => ({
    title: acao.title ?? "",
    description: acao.description ?? "",
    formato: acao.formato ?? "",
    localizacao: acao.localizacao ?? "",
    pais: acao.pais ?? "",
    produto: acao.produto ?? "",
    projeto: acao.projeto ?? "",
    email_responsavel: acao.email_responsavel ?? "",
    start_date: acao.start_date ?? "",
    end_date: acao.end_date ?? "",
    registration_status: acao.registration_status ?? "",
    status: acao.status ?? "",
    action_type: acao.action_type ?? "",
    max_capacity: acao.max_capacity?.toString() ?? "",
    fotos_link: acao.fotos_link ?? "",
    avaliacao_satisfacao: acao.avaliacao_satisfacao?.toString() ?? "",
    avaliacao_satisfacao_link: acao.avaliacao_satisfacao_link ?? "",
    avaliacao_impacto: acao.avaliacao_impacto?.toString() ?? "",
    avaliacao_impacto_link: acao.avaliacao_impacto_link ?? "",
  }));

  const mut = useMutation({
    mutationFn: () =>
      patchFn({
        data: {
          actionId: acao.id,
          fields: {
            title: form.title || null,
            description: form.description || null,
            formato: form.formato || null,
            localizacao: form.localizacao || null,
            pais: form.pais || null,
            produto: form.produto || null,
            projeto: form.projeto || null,
            email_responsavel: form.email_responsavel || null,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            registration_status: form.registration_status || null,
            status: form.status || undefined,
            action_type: form.action_type || null,
            max_capacity: form.max_capacity === "" ? null : Number(form.max_capacity),
            fotos_link: form.fotos_link || null,
            avaliacao_satisfacao:
              form.avaliacao_satisfacao === "" ? null : Number(form.avaliacao_satisfacao),
            avaliacao_satisfacao_link: form.avaliacao_satisfacao_link || null,
            avaliacao_impacto:
              form.avaliacao_impacto === "" ? null : Number(form.avaliacao_impacto),
            avaliacao_impacto_link: form.avaliacao_impacto_link || null,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Ação atualizada.");
      qc.invalidateQueries({ queryKey: ["admin-acoes-full"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao guardar"),
  });

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate();
      }}
    >
      <Field label="Título" className="sm:col-span-2">
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <Field label="Descrição" className="sm:col-span-2">
        <Textarea
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      <Field label="Formato">
        <Input value={form.formato} onChange={(e) => set("formato", e.target.value)} />
      </Field>
      <Field label="Tipo">
        <Input value={form.action_type} onChange={(e) => set("action_type", e.target.value)} />
      </Field>
      <Field label="Produto">
        <Input value={form.produto} onChange={(e) => set("produto", e.target.value)} />
      </Field>
      <Field label="Projeto">
        <Input value={form.projeto} onChange={(e) => set("projeto", e.target.value)} />
      </Field>
      <Field label="Localização">
        <Input value={form.localizacao} onChange={(e) => set("localizacao", e.target.value)} />
      </Field>
      <Field label="País">
        <Input value={form.pais} onChange={(e) => set("pais", e.target.value)} />
      </Field>
      <Field label="Email responsável">
        <Input
          type="email"
          value={form.email_responsavel}
          onChange={(e) => set("email_responsavel", e.target.value)}
        />
      </Field>
      <Field label="Capacidade máxima">
        <Input
          type="number"
          value={form.max_capacity}
          onChange={(e) => set("max_capacity", e.target.value)}
        />
      </Field>
      <Field label="Início">
        <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
      </Field>
      <Field label="Fim">
        <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
      </Field>
      <Field label="Inscrições">
        <Input
          value={form.registration_status}
          onChange={(e) => set("registration_status", e.target.value)}
          placeholder="Aberto / Fechado"
        />
      </Field>
      <Field label="Estado">
        <Input value={form.status} onChange={(e) => set("status", e.target.value)} />
      </Field>

      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? "A guardar…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function InscritosTab({ actionId }: { actionId: string }) {
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
    <Table>
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
              <Badge variant="secondary">{r.status ?? "—"}</Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("pt-PT") : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PaginaTab({ acao }: { acao: AcaoRow }) {
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
