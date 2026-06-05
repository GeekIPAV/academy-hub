import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
            {acao.category && <Badge variant="outline">{acao.category}</Badge>}
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
    category: acao.category ?? "",
    action_date: acao.action_date ?? "",
    start_date: acao.start_date ?? "",
    end_date: acao.end_date ?? "",
    registration_status: acao.registration_status ?? "",
    status: acao.status ?? "",
    action_type: acao.action_type ?? "",
    max_capacity: acao.max_capacity?.toString() ?? "",
    tshirt_tracking_link: acao.tshirt_tracking_link ?? "",
    tshirt_value: acao.tshirt_value?.toString() ?? "",
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
            category: form.category || null,
            action_date: form.action_date || null,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            registration_status: form.registration_status || null,
            status: form.status || undefined,
            action_type: form.action_type || null,
            max_capacity: form.max_capacity === "" ? null : Number(form.max_capacity),
            tshirt_tracking_link: form.tshirt_tracking_link || null,
            tshirt_value: form.tshirt_value === "" ? null : Number(form.tshirt_value),
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
      <Field label="Categoria">
        <Input value={form.category} onChange={(e) => set("category", e.target.value)} />
      </Field>
      <Field label="Tipo">
        <Input value={form.action_type} onChange={(e) => set("action_type", e.target.value)} />
      </Field>
      <Field label="Data da ação">
        <Input type="date" value={form.action_date} onChange={(e) => set("action_date", e.target.value)} />
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
      <Field label="Link T-shirt tracking" className="sm:col-span-2">
        <Input
          value={form.tshirt_tracking_link}
          onChange={(e) => set("tshirt_tracking_link", e.target.value)}
        />
      </Field>
      <Field label="Valor T-shirt (€)">
        <Input
          type="number"
          step="0.01"
          value={form.tshirt_value}
          onChange={(e) => set("tshirt_value", e.target.value)}
        />
      </Field>
      <Field label="Link Fotos">
        <Input value={form.fotos_link} onChange={(e) => set("fotos_link", e.target.value)} />
      </Field>
      <Field label="Satisfação (0–10)">
        <Input
          type="number"
          step="0.1"
          value={form.avaliacao_satisfacao}
          onChange={(e) => set("avaliacao_satisfacao", e.target.value)}
        />
      </Field>
      <Field label="Link satisfação">
        <Input
          value={form.avaliacao_satisfacao_link}
          onChange={(e) => set("avaliacao_satisfacao_link", e.target.value)}
        />
      </Field>
      <Field label="Impacto (0–10)">
        <Input
          type="number"
          step="0.1"
          value={form.avaliacao_impacto}
          onChange={(e) => set("avaliacao_impacto", e.target.value)}
        />
      </Field>
      <Field label="Link impacto">
        <Input
          value={form.avaliacao_impacto_link}
          onChange={(e) => set("avaliacao_impacto_link", e.target.value)}
        />
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Constrói a página pública que os inscritos vão ver. Arrasta blocos para reordenar.
        </p>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "A guardar…" : "Guardar página"}
        </Button>
      </div>
      <PaginaInscricaoEditor value={doc} onChange={setDoc} />
    </div>
  );
}
