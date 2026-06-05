import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { RouteGate } from "@/components/RouteGate";
import { CoverUploader } from "@/components/CoverUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approvePublicacao,
  bulkCreatePublicacoes,
  bulkDeletePublicacoes,
  bulkUpdatePublicacoes,
  deleteCategoria,
  deletePublicacao,
  listAllApprovedPublicacoes,
  listCategorias,
  listPendingPublicacoes,
  rejectPublicacao,
  upsertCategoria,
  upsertPublicacao,
  type Publicacao,
} from "@/lib/biblioteca.functions";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/admin/biblioteca")({
  head: () => ({ meta: [{ title: "Gestão da Biblioteca" }] }),
  component: () => (
    <RouteGate path="/admin/biblioteca">
      <AdminBibliotecaPage />
    </RouteGate>
  ),
});

function AdminBibliotecaPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Gestão da Biblioteca</h1>
        <p className="text-sm text-muted-foreground">
          Administra o catálogo, categorias e propostas pendentes.
        </p>
      </header>

      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo Geral</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="pendentes">Propostas Pendentes</TabsTrigger>
        </TabsList>
        <TabsContent value="catalogo" className="mt-4">
          <CatalogoTab />
        </TabsContent>
        <TabsContent value="categorias" className="mt-4">
          <CategoriasTab />
        </TabsContent>
        <TabsContent value="pendentes" className="mt-4">
          <PendentesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Catalogo ----------------

const emptyForm = {
  id: null as string | null,
  title: "",
  author: "",
  summary: "",
  year: "",
  link: "",
  image_url: "",
  categoria_id: "",
  is_ipav: false,
};

function CatalogoTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllApprovedPublicacoes);
  const categoriasFn = useServerFn(listCategorias);
  const upsertFn = useServerFn(upsertPublicacao);
  const deleteFn = useServerFn(deletePublicacao);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-publicacoes-aprovadas"],
    queryFn: () => listFn(),
  });
  const { data: categorias = [] } = useQuery({
    queryKey: ["biblioteca-categorias"],
    queryFn: () => categoriasFn(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyForm });
  const [tempCreateId] = useState(() => crypto.randomUUID());

  const [editing, setEditing] = useState<typeof emptyForm | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkCategoria, setBulkCategoria] = useState<string>("");
  const [bulkIpavMode, setBulkIpavMode] = useState<"keep" | "yes" | "no">("keep");

  const bulkDeleteFn = useServerFn(bulkDeletePublicacoes);
  const bulkUpdateFn = useServerFn(bulkUpdatePublicacoes);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteFn({ data: { ids } }),
    onSuccess: (res) => {
      toast.success(`${res.deleted} publicação(ões) removida(s).`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-publicacoes-aprovadas"] });
      qc.invalidateQueries({ queryKey: ["publicacoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkUpdate = useMutation({
    mutationFn: () =>
      bulkUpdateFn({
        data: {
          ids: Array.from(selected),
          ...(bulkCategoria ? { categoria_id: bulkCategoria === "__clear__" ? null : bulkCategoria } : {}),
          ...(bulkIpavMode !== "keep" ? { is_ipav: bulkIpavMode === "yes" } : {}),
        },
      }),
    onSuccess: (res) => {
      toast.success(`${res.updated} publicação(ões) atualizada(s).`);
      setBulkEditOpen(false);
      setBulkCategoria("");
      setBulkIpavMode("keep");
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-publicacoes-aprovadas"] });
      qc.invalidateQueries({ queryKey: ["publicacoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const save = useMutation({
    mutationFn: (form: typeof emptyForm) =>
      upsertFn({
        data: {
          id: form.id,
          title: form.title,
          author: form.author || null,
          summary: form.summary || null,
          year: form.year ? Number(form.year) : null,
          link: form.link || null,
          image_url: form.image_url || null,
          categoria_id: form.categoria_id || null,
          is_ipav: form.is_ipav,
        },
      }),
    onSuccess: () => {
      toast.success("Publicação guardada.");
      qc.invalidateQueries({ queryKey: ["admin-publicacoes-aprovadas"] });
      qc.invalidateQueries({ queryKey: ["publicacoes"] });
      setCreateForm({ ...emptyForm });
      setCreateOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Publicação removida.");
      qc.invalidateQueries({ queryKey: ["admin-publicacoes-aprovadas"] });
      qc.invalidateQueries({ queryKey: ["publicacoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Collapsible open={createOpen} onOpenChange={setCreateOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova publicação
            </span>
            {createOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 rounded-lg border border-border bg-card p-4">
          <Tabs defaultValue="individual">
            <TabsList>
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="bulk">Em massa</TabsTrigger>
            </TabsList>
            <TabsContent value="individual" className="mt-4">
              <PublicacaoForm
                form={createForm}
                setForm={setCreateForm}
                categorias={categorias}
                tempId={tempCreateId}
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateForm({ ...emptyForm })}>
                  Limpar
                </Button>
                <Button
                  onClick={() => {
                    if (!createForm.title.trim()) {
                      toast.error("Título obrigatório.");
                      return;
                    }
                    save.mutate(createForm);
                  }}
                  disabled={save.isPending}
                >
                  Criar
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="bulk" className="mt-4">
              <BulkAddPanel
                onDone={() => {
                  qc.invalidateQueries({ queryKey: ["admin-publicacoes-aprovadas"] });
                  qc.invalidateQueries({ queryKey: ["publicacoes"] });
                  qc.invalidateQueries({ queryKey: ["biblioteca-categorias"] });
                  setCreateOpen(false);
                }}
              />
            </TabsContent>
          </Tabs>
        </CollapsibleContent>
      </Collapsible>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>IPAV</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">A carregar…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Sem publicações.</TableCell></TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground">{p.author || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.categoria?.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.year || "—"}</TableCell>
                  <TableCell>{p.is_ipav ? "Sim" : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setEditing({
                            id: p.id,
                            title: p.title,
                            author: p.author || "",
                            summary: p.summary || "",
                            year: p.year ? String(p.year) : "",
                            link: p.link || "",
                            image_url: p.image_url || "",
                            categoria_id: p.categoria_id || "",
                            is_ipav: p.is_ipav,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Eliminar "${p.title}"?`)) remove.mutate(p.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar publicação</DialogTitle>
          </DialogHeader>
          {editing && (
            <PublicacaoForm
              form={editing}
              setForm={(f) => setEditing(typeof f === "function" ? (f as any)(editing) : f)}
              categorias={categorias}
              tempId={editing.id ?? "edit"}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              onClick={() => editing && save.mutate(editing)}
              disabled={save.isPending}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PublicacaoForm({
  form,
  setForm,
  categorias,
  tempId,
}: {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm | ((prev: typeof emptyForm) => typeof emptyForm)) => void;
  categorias: { id: string; name: string }[];
  tempId: string;
}) {
  const update = (patch: Partial<typeof emptyForm>) =>
    setForm((prev: typeof emptyForm) => ({ ...prev, ...patch }));

  return (
    <div className="grid gap-3">
      <div className="space-y-1.5">
        <Label>Título *</Label>
        <Input value={form.title} onChange={(e) => update({ title: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Autor</Label>
          <Input value={form.author} onChange={(e) => update({ author: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Ano</Label>
          <Input
            type="number"
            value={form.year}
            onChange={(e) => update({ year: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select
            value={form.categoria_id || undefined}
            onValueChange={(v) => update({ categoria_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar…" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Switch
            id="is_ipav"
            checked={form.is_ipav}
            onCheckedChange={(v) => update({ is_ipav: v })}
          />
          <Label htmlFor="is_ipav">Publicação IPAV</Label>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Link</Label>
        <Input value={form.link} onChange={(e) => update({ link: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Resumo</Label>
        <Textarea rows={3} value={form.summary} onChange={(e) => update({ summary: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Capa</Label>
        <div className="flex items-center gap-3">
          {form.image_url && (
            <img src={form.image_url} alt="" className="h-20 w-14 rounded object-cover" />
          )}
          <CoverUploader
            folder="publicacoes"
            id={form.id ?? tempId}
            currentUrl={form.image_url || null}
            variant="inline"
            onUploaded={(url) => update({ image_url: url })}
            onCleared={() => update({ image_url: "" })}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------- Bulk Add ----------------

function BulkAddPanel({ onDone }: { onDone: () => void }) {
  const bulkFn = useServerFn(bulkCreatePublicacoes);
  const [text, setText] = useState("");
  const [isIpav, setIsIpav] = useState(false);
  const [createMissing, setCreateMissing] = useState(true);

  const parseRows = () => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    return lines.map((line, idx) => {
      const parts = line.split("|").map((p) => p.trim());
      const [title, author, year, categoria_name, link, summary] = parts;
      if (!title) throw new Error(`Linha ${idx + 1}: título em falta.`);
      const yr = year ? Number(year) : null;
      if (year && (isNaN(yr!) || yr! < 1800 || yr! > 3000)) {
        throw new Error(`Linha ${idx + 1}: ano inválido "${year}".`);
      }
      return {
        title,
        author: author || null,
        year: yr,
        categoria_name: categoria_name || null,
        link: link || null,
        summary: summary || null,
        is_ipav: isIpav,
      };
    });
  };

  const mut = useMutation({
    mutationFn: async () => {
      const rows = parseRows();
      if (rows.length === 0) throw new Error("Nenhuma linha válida.");
      return bulkFn({ data: { rows, createMissingCategorias: createMissing } });
    },
    onSuccess: (res) => {
      toast.success(`${res.inserted} publicação(ões) criada(s).`);
      setText("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">Formato: uma publicação por linha</div>
        <div className="mt-1">
          Campos separados por <code className="rounded bg-background px-1">|</code>:{" "}
          <code>título | autor | ano | categoria | link | resumo</code>
        </div>
        <div className="mt-1">Apenas o título é obrigatório. Linhas iniciadas por <code>#</code> são ignoradas.</div>
      </div>
      <Textarea
        rows={10}
        placeholder={`Marketing 4.0 | Philip Kotler | 2017 | Marketing | https://… | Resumo curto\nOutro Livro | Autor X | 2020 | Gestão`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="font-mono text-xs"
      />
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="bulk-ipav" checked={isIpav} onCheckedChange={setIsIpav} />
          <Label htmlFor="bulk-ipav">Marcar todas como IPAV</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="bulk-cats" checked={createMissing} onCheckedChange={setCreateMissing} />
          <Label htmlFor="bulk-cats">Criar categorias em falta</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setText("")}>Limpar</Button>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || !text.trim()}>
          {mut.isPending ? "A importar…" : "Importar"}
        </Button>
      </div>
    </div>
  );
}



// ---------------- Categorias ----------------

function CategoriasTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCategorias);
  const upsertFn = useServerFn(upsertCategoria);
  const deleteFn = useServerFn(deleteCategoria);

  const { data: rows = [] } = useQuery({
    queryKey: ["biblioteca-categorias"],
    queryFn: () => listFn(),
  });

  const [newName, setNewName] = useState("");
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null);

  const save = useMutation({
    mutationFn: (input: { id?: string | null; name: string }) =>
      upsertFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["biblioteca-categorias"] });
      setNewName("");
      setEdit(null);
      toast.success("Guardado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["biblioteca-categorias"] });
      toast.success("Eliminada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Nova categoria…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button
          onClick={() => {
            if (!newName.trim()) return;
            save.mutate({ name: newName.trim() });
          }}
          disabled={save.isPending}
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center text-sm text-muted-foreground">Sem categorias.</TableCell></TableRow>
            ) : (
              rows.map((c) =>
                edit?.id === c.id ? (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
                      <Button size="sm" onClick={() => save.mutate({ id: edit.id, name: edit.name.trim() })}>Guardar</Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEdit({ id: c.id, name: c.name })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Eliminar "${c.name}"?`)) remove.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ),
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------- Pendentes ----------------

function PendentesTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingPublicacoes);
  const approveFn = useServerFn(approvePublicacao);
  const rejectFn = useServerFn(rejectPublicacao);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-publicacoes-pendentes"],
    queryFn: () => listFn(),
  });

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      action === "approve" ? approveFn({ data: { id } }) : rejectFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-publicacoes-pendentes"] });
      qc.invalidateQueries({ queryKey: ["admin-publicacoes-aprovadas"] });
      qc.invalidateQueries({ queryKey: ["publicacoes"] });
      toast.success("Atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Capa</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Autor</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Proposto por</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">A carregar…</TableCell></TableRow>
          ) : rows.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Sem propostas pendentes.</TableCell></TableRow>
          ) : (
            rows.map((p: Publicacao) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="h-12 w-9 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-9 rounded bg-muted" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell className="text-muted-foreground">{p.author || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.categoria?.name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.proposed_by_name || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 text-white hover:bg-green-700"
                      onClick={() => decide.mutate({ id: p.id, action: "approve" })}
                    >
                      <Check className="h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => decide.mutate({ id: p.id, action: "reject" })}
                    >
                      <X className="h-4 w-4" />
                      Rejeitar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
