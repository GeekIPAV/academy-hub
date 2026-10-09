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

import {
  PaginaInscricaoEditor,
  loadDoc,
  type PageDoc,
} from "./PaginaInscricaoEditor";

function slugifyFieldName(label: string, idx: number): string {
  const s = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || `campo_${idx + 1}`;
}


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
        <SheetHeader className="border-b px-4 py-4 pr-12 sm:px-6 sm:pr-12">
          <SheetTitle className="flex min-w-0 flex-wrap items-center gap-2 break-words text-left">
            {acao.title ?? "(sem título)"}
            {acao.formato && <Badge variant="outline">{acao.formato}</Badge>}
          </SheetTitle>
        </SheetHeader>
        <div className="min-w-0 p-4 sm:p-6">
          <Tabs defaultValue="dados">
            <TabsList>
              <TabsTrigger value="dados">Dados da ação</TabsTrigger>
              <TabsTrigger value="inscritos">Inscritos</TabsTrigger>
              <TabsTrigger value="resultados">Resultados</TabsTrigger>
              <TabsTrigger value="pagina">Página de inscrição</TabsTrigger>
            </TabsList>
            <TabsContent value="dados" className="mt-4">
              <DadosTab acao={acao} />
            </TabsContent>
            <TabsContent value="inscritos" className="mt-4">
              <InscritosTab actionId={acao.id} />
            </TabsContent>
            <TabsContent value="resultados" className="mt-4">
              <ResultadosTab actionId={acao.id} />
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
  const fetchProdutos = useServerFn(listProdutos);
  const { data: produtos } = useQuery({
    queryKey: ["produtos-catalogo"],
    queryFn: () => fetchProdutos(),
    retry: false,
  });
  const [form, setForm] = useState(() => ({
    title: acao.title ?? "",

    description: acao.description ?? "",
    formato: acao.formato ?? "",
    localizacao: acao.localizacao ?? "",
    pais: acao.pais ?? "",
    produto_id: acao.produto_id ?? "",
    projeto: acao.projeto ?? "",
    email_responsavel: acao.email_responsavel ?? "",
    start_date: acao.start_date ?? "",
    end_date: acao.end_date ?? "",
    registration_status: acao.registration_status ?? "",
    status: acao.status ?? "",
    action_type: acao.action_type ?? "",
    max_capacity: acao.max_capacity?.toString() ?? "",
    fotos_link: acao.fotos_link ?? "",
    avaliacao_satisfacao_link: acao.avaliacao_satisfacao_link ?? "",
    avaliacao_impacto_link: acao.avaliacao_impacto_link ?? "",
  }));
  const [requiredFields, setRequiredFields] = useState<RequiredFieldDef[]>(
    () => acao.required_fields ?? [],
  );

  const inscricaoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/evento/${acao.id}`
      : `/evento/${acao.id}`;

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
            produto_id: form.produto_id || null,
            email_responsavel: form.email_responsavel || null,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            registration_status: form.registration_status || null,
            status: form.status || undefined,
            action_type: form.action_type || null,
            max_capacity: form.max_capacity === "" ? null : Number(form.max_capacity),
            fotos_link: form.fotos_link || null,
            avaliacao_satisfacao_link: form.avaliacao_satisfacao_link || null,
            avaliacao_impacto_link: form.avaliacao_impacto_link || null,
            required_fields: requiredFields.map((f, i) => ({
              ...f,
              name: (f.name && f.name.trim()) || slugifyFieldName(f.label || "", i),
            })),
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

  const updateField = (idx: number, patch: Partial<RequiredFieldDef>) =>
    setRequiredFields((arr) => arr.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const removeField = (idx: number) =>
    setRequiredFields((arr) => arr.filter((_, i) => i !== idx));
  const addField = () =>
    setRequiredFields((arr) => [
      ...arr,
      { name: "", label: "", type: "text", required: false },
    ]);

  const persistCover = async (fields: {
    cover_url?: string | null;
    cover_position?: string;
    cover_scale?: number;
  }) => {
    await patchFn({ data: { actionId: acao.id, fields } });
    qc.invalidateQueries({ queryKey: ["admin-acoes-full"] });
  };

  return (
    <div className="space-y-6">
    <VisibilidadeSection actionId={acao.id} />
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        mut.mutate();
      }}
    >
      <div className="space-y-2">
        <Label>Capa</Label>
        <div className="flex flex-col items-start gap-3 sm:flex-row">
          <div className="aspect-[4/3] w-40 shrink-0 overflow-hidden rounded-md border bg-muted">
            {acao.cover_url ? (
              <CoverImage
                src={acao.cover_url}
                position={acao.cover_position}
                scale={acao.cover_scale}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Sem capa
              </div>
            )}
          </div>
          <CoverUploader
            variant="inline"
            folder="acoes"
            id={acao.id}
            currentUrl={acao.cover_url}
            position={acao.cover_position}
            scale={acao.cover_scale}
            aspectRatio={4 / 3}
            onUploaded={(url) => persistCover({ cover_url: url })}
            onCleared={() => persistCover({ cover_url: null })}
            onAdjusted={(pos, sc) => persistCover({ cover_position: pos, cover_scale: sc })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Título" className="sm:col-span-2">
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Estado">
          <EstadoSelect value={form.status} onChange={(v) => set("status", v)} />
        </Field>
        <Field label="Inscrições">
          <div className="flex h-10 items-center gap-2">
            <Switch
              checked={form.registration_status === INSCRICOES_ABERTAS}
              onCheckedChange={(c) =>
                set("registration_status", c ? INSCRICOES_ABERTAS : INSCRICOES_FECHADAS)
              }
            />
            <span className="text-sm">
              {form.registration_status === INSCRICOES_ABERTAS ? "Abertas" : "Fechadas"}
            </span>
          </div>
        </Field>
        <Field label="Início">
          <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
        </Field>
        <Field label="Fim">
          <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Tipo">
          <Input value={form.action_type} onChange={(e) => set("action_type", e.target.value)} />
        </Field>
        <Field label="Formato">
          <FormatoSelect value={form.formato} onChange={(v) => set("formato", v)} />
        </Field>
        <Field label="Produto">
          <Select
            value={form.produto_id || "__none__"}
            onValueChange={(v) => set("produto_id", v === "__none__" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sem produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem produto</SelectItem>
              {(produtos ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.tipo ? ` — ${p.tipo}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="País">
          <PaisSelect value={form.pais} onChange={(v) => set("pais", v)} />
        </Field>
        <Field label={form.formato === "Online" ? "Link da sessão" : "Localização"}>
          <Input value={form.localizacao} onChange={(e) => set("localizacao", e.target.value)} />
        </Field>
        <Field label="Email responsável">
          <Input
            type="email"
            value={form.email_responsavel}
            onChange={(e) => set("email_responsavel", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Link de inscrição">
          <Input readOnly value={inscricaoUrl} className="font-mono text-xs" />
        </Field>
        <Field label="Link avaliação satisfação">
          <Input
            value={form.avaliacao_satisfacao_link}
            onChange={(e) => set("avaliacao_satisfacao_link", e.target.value)}
          />
        </Field>
        <Field label="Link avaliação impacto">
          <Input
            value={form.avaliacao_impacto_link}
            onChange={(e) => set("avaliacao_impacto_link", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Descrição">
        <Textarea
          rows={4}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full justify-between">
            <span>Mais opções</span>
            <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Capacidade máxima">
              <Input
                type="number"
                value={form.max_capacity}
                onChange={(e) => set("max_capacity", e.target.value)}
              />
            </Field>
            <Field label="Link fotos">
              <Input
                value={form.fotos_link}
                onChange={(e) => set("fotos_link", e.target.value)}
              />
            </Field>
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Campos do formulário de inscrição
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Configure os campos extra que os inscritos terão de preencher.
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addField}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            {requiredFields.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                Sem campos extra.
              </p>
            ) : (
              <div className="space-y-2">
                {requiredFields.map((f, i) => {
                  const needsOptions = f.type === "select" || f.type === "multiselect";
                  return (
                  <div
                    key={i}
                    className="space-y-2 rounded-md border bg-muted/30 p-2"
                  >
                    <div className="grid items-end gap-2 sm:grid-cols-[1fr_140px_90px_auto]">
                      <div>
                        <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">Etiqueta</Label>
                        <Input
                          value={f.label ?? ""}
                          onChange={(e) => updateField(i, { label: e.target.value })}
                          placeholder="ex: Telemóvel"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">Tipo</Label>
                        <Select
                          value={f.type ?? "text"}
                          onValueChange={(v) => updateField(i, { type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Texto</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="tel">Telefone</SelectItem>
                            <SelectItem value="number">Número</SelectItem>
                            <SelectItem value="date">Data</SelectItem>
                            <SelectItem value="textarea">Texto longo</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                            <SelectItem value="select">Lista (escolha única)</SelectItem>
                            <SelectItem value="multiselect">Lista (múltipla escolha)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={!!f.required}
                          onCheckedChange={(v) => updateField(i, { required: !!v })}
                        />
                        Obrigatório
                      </label>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeField(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {needsOptions && (
                      <div>
                        <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">
                          Opções (uma por linha)
                        </Label>
                        <Textarea
                          rows={3}
                          value={(f.options ?? []).join("\n")}
                          onChange={(e) =>
                            updateField(i, {
                              options: e.target.value
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder={"Opção 1\nOpção 2\nOpção 3"}
                        />
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-end">
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? "A guardar…" : "Guardar"}
        </Button>
      </div>
    </form>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
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

const STATUS_OPCOES: [string, string][] = [
  ["possibilidade", "Possibilidade"],
  ["em_arranque", "Em arranque"],
  ["em_contratualizacao", "Em contratualização"],
  ["em_progresso", "Em progresso"],
  ["institucional", "Institucional"],
  ["em_fecho", "Em fecho"],
  ["terminado", "Terminado"],
  ["em_curso", "Em curso"],
];

function normTxt(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function VisibilidadeSection({ actionId }: { actionId: string }) {
  const qc = useQueryClient();
  const fetchProj = useServerFn(listProjetos);
  const fetchVis = useServerFn(getAcaoVisibilidade);
  const saveFn = useServerFn(saveAcaoVisibilidade);
  const { data: projetos = [] } = useQuery({ queryKey: ["projetos"], queryFn: () => fetchProj() });
  const { data: vis } = useQuery({
    queryKey: ["acao-visibilidade", actionId],
    queryFn: () => fetchVis({ data: { actionId } }),
  });
  const [modo, setModo] = useState<"todos" | "projetos">("todos");
  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [statusSel, setStatusSel] = useState<string[]>(["em_progresso"]);
  const nq = normTxt(q.trim());
  const filtrados = projetos.filter(
    (p) =>
      (statusSel.length === 0 || statusSel.includes(p.status)) &&
      (!nq || normTxt(p.title).includes(nq)),
  );
  useEffect(() => {
    if (vis) {
      setModo(vis.visibilidade);
      setSel(vis.projectIds);
    }
  }, [vis]);
  const mut = useMutation({
    mutationFn: () => saveFn({ data: { actionId, visibilidade: modo, projectIds: sel } }),
    onSuccess: () => {
      toast.success("Visibilidade guardada.");
      qc.invalidateQueries({ queryKey: ["acao-visibilidade", actionId] });
      qc.invalidateQueries({ queryKey: ["admin-acoes-full"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao guardar"),
  });
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <h3 className="font-bold text-secondary">Projetos e visibilidade</h3>
        <p className="text-sm text-muted-foreground">
          Ao associar um projeto, a ação passa a ser visível só para os participantes desse projeto (pode mudar abaixo).
        </p>
      </div>
      <Label className="text-xs uppercase text-muted-foreground">Quem vê</Label>
      <Select value={modo} onValueChange={(v) => setModo(v as "todos" | "projetos")}>
        <SelectTrigger className="w-full sm:w-80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os utilizadores</SelectItem>
          <SelectItem value="projetos">Só participantes de projetos selecionados</SelectItem>
        </SelectContent>
      </Select>
      {(
        <div className="space-y-3">
          {sel.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sel.map((id) => {
                const p = projetos.find((x) => x.id === id);
                return (
                  <Badge key={id} variant="secondary" className="gap-1">
                    <span className="max-w-[16rem] truncate">{p?.title ?? "Projeto"}</span>
                    <button
                      type="button"
                      aria-label="Remover"
                      onClick={() => setSel((s) => s.filter((x) => x !== id))}

                      className="ml-0.5 opacity-70 hover:opacity-100"
                    >
                      ×
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
          <Input
            placeholder="Escreve o nome do projeto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPCOES.map(([k, label]) => {
              const on = statusSel.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() =>
                    setStatusSel((s) => (on ? s.filter((x) => x !== k) : [...s, k]))
                  }
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {projetos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há projetos. Cria-os em Gestão de Projetos.
            </p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum projeto encontrado.</p>
          ) : (
            <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {filtrados.map((p) => (
                <label key={p.id} className="flex min-w-0 items-center gap-2 text-sm">
                  <Checkbox
                    checked={sel.includes(p.id)}
                    onCheckedChange={(c) => {
                      if (c && sel.length === 0) setModo("projetos");
                      setSel((s) => (c ? [...s, p.id] : s.filter((x) => x !== p.id)));
                    }}
                  />
                  <span className="truncate">{p.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      <Button type="button" size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
        Guardar visibilidade
      </Button>
    </section>
  );
}

function ResultadosTab({ actionId }: { actionId: string }) {
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
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
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
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="font-bold text-secondary">{titulo}</h3>
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
