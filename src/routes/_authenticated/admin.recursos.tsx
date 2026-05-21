import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Pencil, Plus, Trash2, Save, ListPlus, ArrowUp, ArrowDown } from "lucide-react";

type ResourceType = "pdf" | "video";

interface ResourceRow {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  file_url: string;
  created_at: string | null;
}

interface TemaRow {
  id: string;
  cluster: string;
  bloco: string | null;
  title: string;
  description: string | null;
  context: string | null;
  objectives: string | null;
  order_index: number;
}

const BLOCO_SUGGESTIONS = ["FTC", "FTP", "SU", "SF"];

export const Route = createFileRoute("/_authenticated/admin/recursos")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role_name")
      .eq("user_id", u.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role_name === "Admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Gestor de Recursos — Admin" }] }),
  component: AdminResourcesPage,
});

function AdminResourcesPage() {
  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Centro de Recursos</h1>
        <p className="text-sm text-muted-foreground">
          Gere a Biblioteca, os Temas dos clusters e as suas associações.
        </p>
      </header>

      <Tabs defaultValue="biblioteca" className="w-full">
        <TabsList>
          <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
          <TabsTrigger value="temas">Gestão de Temas</TabsTrigger>
          <TabsTrigger value="assoc">Associações</TabsTrigger>
        </TabsList>

        <TabsContent value="biblioteca" className="mt-4">
          <BibliotecaTab />
        </TabsContent>
        <TabsContent value="temas" className="mt-4">
          <TemasTab />
        </TabsContent>
        <TabsContent value="assoc" className="mt-4">
          <AssociacoesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useRecursos() {
  return useQuery({
    queryKey: ["recursos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recursos")
        .select("id, title, description, resource_type, file_url, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ResourceRow[];
    },
  });
}

function BibliotecaTab() {
  const qc = useQueryClient();
  const { data: resources = [], isLoading } = useRecursos();

  const [editing, setEditing] = useState<ResourceRow | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (row: ResourceRow) => {
      const { error } = await supabase.from("recursos").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recurso apagado.");
      qc.invalidateQueries({ queryKey: ["recursos-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="single" className="w-full">
        <TabsList>
          <TabsTrigger value="single">
            <Plus className="mr-1 h-4 w-4" /> Novo recurso
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <ListPlus className="mr-1 h-4 w-4" /> Adicionar em massa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-4">
          <SingleResourceForm />
        </TabsContent>
        <TabsContent value="bulk" className="mt-4">
          <BulkAddForm />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recursos carregados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : resources.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ainda não existem recursos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="uppercase">{r.resource_type}</TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">
                      {r.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(r)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Apagar "${r.title}"?`))
                            deleteMutation.mutate(r);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditRecursoDialog
        recurso={editing}
        onClose={() => setEditing(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["recursos-all"] })}
      />
    </div>
  );
}

const EMBED_HINT =
  "Para os PDFs abrirem dentro da plataforma, gere um link de 'Incorporar/Embed' no OneDrive.";

function SingleResourceForm() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("pdf");
  const [fileUrl, setFileUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setResourceType("pdf");
    setFileUrl("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Indica um título.");
    if (!fileUrl.trim()) return toast.error("Cola o link do recurso.");
    setSaving(true);
    try {
      const { error } = await supabase.from("recursos").insert({
        title: title.trim(),
        description: description.trim() || null,
        resource_type: resourceType,
        file_url: fileUrl.trim(),
      } as never);
      if (error) throw error;
      toast.success("Recurso adicionado.");
      reset();
      qc.invalidateQueries({ queryKey: ["recursos-all"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={resourceType}
              onValueChange={(v) => setResourceType(v as ResourceType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Link (URL)</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{EMBED_HINT}</p>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar recurso
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BulkAddForm() {
  const qc = useQueryClient();
  const [raw, setRaw] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("pdf");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rows = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        const [title, url, description] = parts;
        return { title, url, description: description || null };
      })
      .filter((r) => r.title && r.url);

    if (rows.length === 0) {
      toast.error("Nenhuma linha válida. Usa o formato: Título | URL | Descrição");
      return;
    }

    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        title: r.title,
        description: r.description,
        resource_type: resourceType,
        file_url: r.url,
      }));
      const { error } = await supabase.from("recursos").insert(payload as never);
      if (error) throw error;
      toast.success(`${rows.length} recurso(s) adicionado(s).`);
      setRaw("");
      qc.invalidateQueries({ queryKey: ["recursos-all"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label>Tipo (aplicado a todas as linhas)</Label>
            <Select
              value={resourceType}
              onValueChange={(v) => setResourceType(v as ResourceType)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Linhas (uma por recurso)</Label>
            <Textarea
              rows={10}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={`Manual do Formando | https://onedrive... | Versão 2025\nVídeo de Boas-vindas | https://youtube.com/watch?v=...`}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Formato por linha: <code>Título | URL | Descrição (opcional)</code>. {EMBED_HINT}
            </p>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ListPlus className="h-4 w-4" />
            )}
            Importar em massa
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EditRecursoDialog({
  recurso,
  onClose,
  onSaved,
}: {
  recurso: ResourceRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("pdf");
  const [fileUrl, setFileUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (recurso) {
      setTitle(recurso.title);
      setDescription(recurso.description ?? "");
      setResourceType((recurso.resource_type as ResourceType) ?? "pdf");
      setFileUrl(recurso.file_url ?? "");
    }
  }, [recurso]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurso) return;
    if (!fileUrl.trim()) return toast.error("O link é obrigatório.");
    setSaving(true);
    try {
      const { error } = await supabase
        .from("recursos")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          resource_type: resourceType,
          file_url: fileUrl.trim(),
        } as never)
        .eq("id", recurso.id);
      if (error) throw error;
      toast.success("Recurso atualizado.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!recurso} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar recurso</DialogTitle>
          <DialogDescription>Atualiza os campos do recurso.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={resourceType}
              onValueChange={(v) => setResourceType(v as ResourceType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Link (URL)</Label>
            <Input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{EMBED_HINT}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



/* ─────────────────────── Shared — Clusters ─────────────────────── */

function useClusters() {
  return useQuery({
    queryKey: ["clusters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programas")
        .select("cluster")
        .not("cluster", "is", null);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r) => {
        const c = (r as { cluster: string | null }).cluster;
        if (c && c.trim()) set.add(c.trim());
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b, "pt"));
    },
  });
}

/* ─────────────────────── Tab 2 — Gestão de Temas ─────────────────────── */

interface TemaForm {
  title: string;
  description: string;
  context: string;
  objectives: string;
  bloco: string;
}
const EMPTY_TEMA: TemaForm = {
  title: "",
  description: "",
  context: "",
  objectives: "",
  bloco: "",
};

function TemasTab() {
  const qc = useQueryClient();
  const { data: clusters = [], isLoading: loadingClusters } = useClusters();
  const [cluster, setCluster] = useState<string>("");
  const activeCluster = cluster || clusters[0] || "";

  const temasQuery = useQuery({
    queryKey: ["admin-temas", activeCluster],
    enabled: !!activeCluster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos" as never)
        .select("id, cluster, bloco, title, description, context, objectives, order_index")
        .eq("cluster", activeCluster)
        .order("order_index");
      if (error) throw error;
      return (data as unknown as TemaRow[]) ?? [];
    },
  });
  const temas = temasQuery.data ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TemaRow | null>(null);
  const [form, setForm] = useState<TemaForm>(EMPTY_TEMA);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_TEMA);
    setDialogOpen(true);
  };
  const openEdit = (t: TemaRow) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description ?? "",
      context: t.context ?? "",
      objectives: t.objectives ?? "",
      bloco: t.bloco ?? "",
    });
    setDialogOpen(true);
  };

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!activeCluster) throw new Error("Seleciona um cluster.");
      if (!form.title.trim()) throw new Error("O título é obrigatório.");
      if (editing) {
        const { error } = await supabase
          .from("temas_momentos" as never)
          .update({
            title: form.title.trim(),
            description: form.description.trim() || null,
            context: form.context.trim() || null,
            objectives: form.objectives.trim() || null,
            bloco: form.bloco.trim() || null,
          } as never)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const maxOrder = temas.reduce((m, t) => Math.max(m, t.order_index), -1);
        const { error } = await supabase.from("temas_momentos" as never).insert({
          cluster: activeCluster,
          title: form.title.trim(),
          description: form.description.trim() || null,
          context: form.context.trim() || null,
          objectives: form.objectives.trim() || null,
          bloco: form.bloco.trim() || null,
          order_index: maxOrder + 1,
        } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Tema atualizado." : "Tema criado.");
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_TEMA);
      qc.invalidateQueries({ queryKey: ["admin-temas", activeCluster] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("temas_momentos" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tema removido.");
      qc.invalidateQueries({ queryKey: ["admin-temas", activeCluster] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cluster</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingClusters ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : clusters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Não existem clusters definidos nos programas.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Select value={activeCluster} onValueChange={setCluster}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Selecionar cluster" />
                </SelectTrigger>
                <SelectContent>
                  {clusters.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={openCreate} disabled={!activeCluster} size="sm">
                <Plus className="h-4 w-4" /> Adicionar Tema
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {activeCluster && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Temas — {activeCluster}</CardTitle>
          </CardHeader>
          <CardContent>
            {temasQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : temas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sem temas. Cria o primeiro.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Bloco</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-32 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {temas.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        {t.bloco ? (
                          <Badge variant="secondary">{t.bloco}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {t.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Apagar tema "${t.title}"?`))
                              deleteMutation.mutate(t.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => !upsertMutation.isPending && setDialogOpen(o)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tema" : "Novo tema"}</DialogTitle>
            <DialogDescription>Cluster: {activeCluster}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              upsertMutation.mutate();
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Bloco (opcional)</Label>
              <Input
                value={form.bloco}
                list="bloco-suggestions"
                placeholder="Ex: FTC, FTP, SU, SF"
                onChange={(e) => setForm({ ...form, bloco: e.target.value })}
              />
              <datalist id="bloco-suggestions">
                {BLOCO_SUGGESTIONS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Contexto</Label>
              <Textarea
                rows={3}
                value={form.context}
                onChange={(e) => setForm({ ...form, context: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Objetivos</Label>
              <Textarea
                rows={3}
                value={form.objectives}
                onChange={(e) => setForm({ ...form, objectives: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                disabled={upsertMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────── Tab 3 — Associações ─────────────────────── */

function AssociacoesTab() {
  const qc = useQueryClient();
  const { data: clusters = [] } = useClusters();
  const { data: recursos = [] } = useRecursos();

  const [cluster, setCluster] = useState<string>("");
  const activeCluster = cluster || clusters[0] || "";

  const temasQuery = useQuery({
    queryKey: ["assoc-temas", activeCluster],
    enabled: !!activeCluster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos" as never)
        .select("id, cluster, title, description, context, objectives, order_index")
        .eq("cluster", activeCluster)
        .order("order_index");
      if (error) throw error;
      return (data as unknown as TemaRow[]) ?? [];
    },
  });
  const temas = temasQuery.data ?? [];

  const [temaId, setTemaId] = useState<string>("");
  useEffect(() => {
    setTemaId("");
  }, [activeCluster]);

  const existingQuery = useQuery({
    queryKey: ["tema-recursos", temaId],
    enabled: !!temaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tema_recursos" as never)
        .select("recurso_id")
        .eq("tema_id", temaId);
      if (error) throw error;
      return ((data ?? []) as Array<{ recurso_id: string }>).map((r) => r.recurso_id);
    },
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSelected(new Set(existingQuery.data ?? []));
  }, [existingQuery.data, temaId]);

  const sortedRecursos = useMemo(
    () => [...recursos].sort((a, b) => a.title.localeCompare(b.title, "pt")),
    [recursos],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!temaId) throw new Error("Seleciona um tema.");
      const { error: delErr } = await supabase
        .from("tema_recursos" as never)
        .delete()
        .eq("tema_id", temaId);
      if (delErr) throw delErr;
      const ids = [...selected];
      if (ids.length > 0) {
        const { error } = await supabase
          .from("tema_recursos" as never)
          .insert(ids.map((rid) => ({ tema_id: temaId, recurso_id: rid })) as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Associações guardadas.");
      qc.invalidateQueries({ queryKey: ["tema-recursos", temaId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selecionar tema</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Cluster</Label>
            <Select value={activeCluster} onValueChange={setCluster}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cluster" />
              </SelectTrigger>
              <SelectContent>
                {clusters.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tema</Label>
            <Select value={temaId} onValueChange={setTemaId} disabled={!activeCluster}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar tema" />
              </SelectTrigger>
              <SelectContent>
                {temas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {temaId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Recursos associados ({selected.size})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedRecursos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                A Biblioteca está vazia.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {sortedRecursos.map((r) => {
                  const checked = selected.has(r.id);
                  return (
                    <li
                      key={r.id}
                      className="flex items-start gap-3 px-3 py-2 hover:bg-muted/40"
                    >
                      <Checkbox
                        id={`r-${r.id}`}
                        checked={checked}
                        onCheckedChange={() => toggle(r.id)}
                        className="mt-1"
                      />
                      <label htmlFor={`r-${r.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs uppercase text-muted-foreground">
                          {r.resource_type}
                          {r.description ? ` · ${r.description}` : ""}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex justify-end">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Guardar Associações
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
