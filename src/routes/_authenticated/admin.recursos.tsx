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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Plus, Trash2, Save, ListPlus, ArrowUp, ArrowDown, Search, ArrowUpDown, ExternalLink, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { useResourceTypes, useResourceTypeMap } from "@/hooks/use-resource-types";
import { useResourceCategories, useResourceCategoryMap } from "@/hooks/use-resource-categories";
import { ResourceTypesManager } from "@/components/admin/ResourceTypesManager";
import { ResourceCategoriesManager } from "@/components/admin/ResourceCategoriesManager";
import { CoverUploader } from "@/components/CoverUploader";

type ResourceType = string;

function CategoryOptions() {
  const { data: cats = [] } = useResourceCategories();
  return (
    <>
      {cats.map((c) => (
        <SelectItem key={c.key} value={c.key}>
          {c.label}
        </SelectItem>
      ))}
    </>
  );
}

function TypeOptions() {
  const { data: types = [] } = useResourceTypes();
  return (
    <>
      {types.map((t) => (
        <SelectItem key={t.key} value={t.key}>
          {t.label}
        </SelectItem>
      ))}
    </>
  );
}

interface ResourceRow {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  category_key: string | null;
  objectives: string | null;
  file_url: string;
  cover_url: string | null;
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
  bloco_order: number;
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
          <TabsTrigger value="tipos">Tipos</TabsTrigger>
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
        <TabsContent value="tipos" className="mt-4">
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Tipos</h2>
              <ResourceTypesManager />
            </section>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Categorias</h2>
              <ResourceCategoriesManager />
            </section>
          </div>
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
        .select("id, title, description, resource_type, category_key, objectives, file_url, cover_url, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ResourceRow[];
    },
  });
}

function useTemasOfCluster(cluster: string) {
  return useQuery({
    queryKey: ["temas-of-cluster", cluster],
    enabled: !!cluster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos")
        .select("id, title, bloco, bloco_order, order_index")
        .eq("cluster", cluster)
        .order("bloco_order", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as unknown as { id: string; title: string; bloco: string | null }[]) ?? [];
    },
  });
}

function useAllowedRecursoIds(cluster: string, temaId: string) {
  return useQuery({
    queryKey: ["allowed-recurso-ids", cluster, temaId],
    enabled: !!cluster,
    queryFn: async () => {
      let temaIds: string[];
      if (temaId) {
        temaIds = [temaId];
      } else {
        const { data: temas, error: e1 } = await supabase
          .from("temas_momentos")
          .select("id")
          .eq("cluster", cluster);
        if (e1) throw e1;
        temaIds = ((temas ?? []) as unknown as { id: string }[]).map((t) => t.id);
      }
      if (temaIds.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from("tema_recursos")
        .select("recurso_id")
        .in("tema_id", temaIds);
      if (error) throw error;
      return new Set(((data ?? []) as unknown as { recurso_id: string }[]).map((r) => r.recurso_id));
    },
  });
}

function BibliotecaTab() {
  const qc = useQueryClient();
  const { data: resources = [], isLoading } = useRecursos();
  const { data: clusters = [] } = useClusters();
  const { map: typeMap } = useResourceTypeMap();
  const { map: categoryMap } = useResourceCategoryMap();

  const [editing, setEditing] = useState<ResourceRow | null>(null);

  const [searchTitle, setSearchTitle] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCluster, setFilterCluster] = useState<string>("");
  const [filterTema, setFilterTema] = useState<string>("");
  const [sortBy, setSortBy] = useState<"title" | "resource_type" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: temasOfCluster = [] } = useTemasOfCluster(filterCluster);
  const { data: allowedIds } = useAllowedRecursoIds(filterCluster, filterTema);

  const filteredResources = useMemo(() => {
    let list = [...resources];
    if (filterCluster && allowedIds) {
      list = list.filter((r) => allowedIds.has(r.id));
    }
    if (searchTitle.trim()) {
      const q = searchTitle.trim().toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q));
    }
    if (filterType !== "all") {
      list = list.filter((r) => r.resource_type === filterType);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "title") cmp = a.title.localeCompare(b.title);
      else if (sortBy === "resource_type") cmp = a.resource_type.localeCompare(b.resource_type);
      else if (sortBy === "created_at") cmp = (a.created_at ?? "").localeCompare(b.created_at ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [resources, searchTitle, filterType, filterCluster, allowedIds, sortBy, sortDir]);

  const clearFilters = () => {
    setSearchTitle("");
    setFilterType("all");
    setFilterCluster("");
    setFilterTema("");
  };

  const toggleSort = (col: "title" | "resource_type" | "created_at") => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

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

  // ── Bulk selection ──
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTypeOpen, setBulkTypeOpen] = useState(false);
  const [bulkType, setBulkType] = useState<ResourceType>("pdf");
  const [formOpen, setFormOpen] = useState(false);

  const visibleIds = useMemo(() => filteredResources.map((r) => r.id), [filteredResources]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selectedIds.includes(id));

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id),
    );
  };
  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, ...visibleIds]));
      return prev.filter((id) => !visibleIds.includes(id));
    });
  };
  const clearSelection = () => setSelectedIds([]);

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("recursos").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      toast.success(`${ids.length} recurso(s) apagado(s).`);
      clearSelection();
      qc.invalidateQueries({ queryKey: ["recursos-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkTypeMutation = useMutation({
    mutationFn: async ({ ids, type }: { ids: string[]; type: ResourceType }) => {
      const { error } = await supabase
        .from("recursos")
        .update({ resource_type: type })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`Tipo atualizado em ${vars.ids.length} recurso(s).`);
      setBulkTypeOpen(false);
      clearSelection();
      qc.invalidateQueries({ queryKey: ["recursos-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setFormOpen((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo recurso
            </CardTitle>
            <Button variant="ghost" size="icon" asChild>
              <span>
                {formOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            </Button>
          </div>
        </CardHeader>
        {formOpen && (
          <CardContent>
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
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedIds.length} selecionado{selectedIds.length === 1 ? "" : "s"}
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Limpar seleção
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={bulkTypeOpen} onOpenChange={setBulkTypeOpen}>
                  <Button variant="outline" size="sm" onClick={() => setBulkTypeOpen(true)}>
                    <Tag className="mr-1 h-4 w-4" /> Mudar tipo
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mudar tipo em massa</DialogTitle>
                      <DialogDescription>
                        Vai alterar o tipo de {selectedIds.length} recurso(s).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label>Novo tipo</Label>
                      <Select value={bulkType} onValueChange={(v) => setBulkType(v as ResourceType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <TypeOptions />
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setBulkTypeOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={() =>
                          bulkTypeMutation.mutate({ ids: selectedIds, type: bulkType })
                        }
                        disabled={bulkTypeMutation.isPending}
                      >
                        {bulkTypeMutation.isPending && (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        )}
                        Aplicar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={bulkDeleteMutation.isPending}>
                      {bulkDeleteMutation.isPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1 h-4 w-4" />
                      )}
                      Apagar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apagar recursos selecionados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vai apagar permanentemente {selectedIds.length} recurso(s). Esta ação é
                        irreversível.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => bulkDeleteMutation.mutate(selectedIds)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Apagar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <CardTitle className="text-base">Recursos carregados</CardTitle>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[180px] flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Filtrar por título</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full space-y-1 sm:w-36">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <TypeOptions />
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1 sm:w-48">
              <Label className="text-xs text-muted-foreground">Cluster</Label>
              <Select
                value={filterCluster}
                onValueChange={(v) => {
                  setFilterCluster(v);
                  setFilterTema("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
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
            <div className="w-full space-y-1 sm:w-56">
              <Label className="text-xs text-muted-foreground">Tema</Label>
              <Select
                value={filterTema}
                onValueChange={setFilterTema}
                disabled={!filterCluster}
              >
                <SelectTrigger>
                  <SelectValue placeholder={filterCluster ? "Todos do cluster" : "Selecione um cluster"} />
                </SelectTrigger>
                <SelectContent>
                  {temasOfCluster.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.bloco ? `${t.bloco} — ${t.title}` : t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(searchTitle || filterType !== "all" || filterCluster || filterTema) && (
              <Button variant="ghost" onClick={clearFilters} className="sm:self-end">
                Limpar filtros
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredResources.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum recurso encontrado com estes filtros.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false
                      }
                      onCheckedChange={(v) => toggleSelectAllVisible(v === true)}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("title")}>
                    <span className="flex items-center gap-1">
                      Título
                      {sortBy === "title" && <ArrowUpDown className="h-3 w-3" />}
                    </span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("resource_type")}>
                    <span className="flex items-center gap-1">
                      Tipo
                      {sortBy === "resource_type" && <ArrowUpDown className="h-3 w-3" />}
                    </span>
                  </TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                    <span className="flex items-center gap-1">
                      Data
                      {sortBy === "created_at" && <ArrowUpDown className="h-3 w-3" />}
                    </span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                    <span className="flex items-center gap-1">
                      Data
                      {sortBy === "created_at" && <ArrowUpDown className="h-3 w-3" />}
                    </span>
                  </TableHead>
                  <TableHead className="w-40 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.map((r) => (
                  <TableRow key={r.id} data-state={selectedIds.includes(r.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(r.id)}
                        onCheckedChange={(v) => toggleSelect(r.id, v === true)}
                        aria-label={`Selecionar ${r.title}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{typeMap.get(r.resource_type)?.label ?? r.resource_type}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.category_key ? (categoryMap.get(r.category_key)?.label ?? r.category_key) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("pt-PT") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild title="Abrir link">
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(r)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Apagar recurso">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar recurso?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tens a certeza que queres apagar <strong>{r.title}</strong>? Esta ação
                              não pode ser revertida.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(r)}
                            >
                              Apagar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
  "O link da drive tem de estar público. Nas definições do link, seleciona essa opção.";

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
      });
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
                <TypeOptions />
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
      const { error } = await supabase.from("recursos").insert(payload);
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
                <TypeOptions />
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
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (recurso) {
      setTitle(recurso.title);
      setDescription(recurso.description ?? "");
      setResourceType((recurso.resource_type as ResourceType) ?? "pdf");
      setFileUrl(recurso.file_url ?? "");
      setCoverUrl(recurso.cover_url ?? null);
    }
  }, [recurso]);

  const persistCover = async (url: string | null) => {
    if (!recurso) return;
    const { error } = await supabase
      .from("recursos")
      .update({ cover_url: url })
      .eq("id", recurso.id);
    if (error) throw error;
    setCoverUrl(url);
    onSaved();
  };

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
        })
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
          <div className="space-y-2">
            <Label>Imagem de capa</Label>
            <div className="flex items-center gap-3">
              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md border bg-muted">
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                    Sem imagem
                  </div>
                )}
              </div>
              {recurso && (
                <CoverUploader
                  variant="inline"
                  folder="recursos"
                  id={recurso.id}
                  currentUrl={coverUrl}
                  onUploaded={(url) => persistCover(url)}
                  onCleared={() => persistCover(null)}
                />
              )}
            </div>
          </div>
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
                <TypeOptions />
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
        .from("temas_momentos")
        .select("id, cluster, bloco, title, description, context, objectives, order_index, bloco_order")
        .eq("cluster", activeCluster)
        .order("bloco_order", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as unknown as TemaRow[]) ?? [];
    },
  });
  const temas = temasQuery.data ?? [];

  // Agrupar temas por bloco, preservando a ordem (bloco_order) já vinda do servidor.
  const blocoGroups = useMemo(() => {
    const groups: Array<{ bloco: string | null; blocoOrder: number; temas: TemaRow[] }> = [];
    const idx = new Map<string, number>();
    for (const t of temas) {
      const key = t.bloco ?? "__none__";
      let pos = idx.get(key);
      if (pos === undefined) {
        pos = groups.length;
        idx.set(key, pos);
        groups.push({ bloco: t.bloco, blocoOrder: t.bloco_order ?? 0, temas: [] });
      }
      groups[pos].temas.push(t);
    }
    return groups;
  }, [temas]);

  const moveBlock = useMutation({
    mutationFn: async ({ blocoKey, dir }: { blocoKey: string | null; dir: "up" | "down" }) => {
      const i = blocoGroups.findIndex((g) => (g.bloco ?? null) === blocoKey);
      const j = dir === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= blocoGroups.length) return;
      // Reordenar e reatribuir bloco_order sequencial a TODOS os grupos.
      const next = [...blocoGroups];
      [next[i], next[j]] = [next[j], next[i]];
      for (let k = 0; k < next.length; k++) {
        const ids = next[k].temas.map((t) => t.id);
        if (ids.length === 0) continue;
        const { error } = await supabase
          .from("temas_momentos")
          .update({ bloco_order: k })
          .in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-temas", activeCluster] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const moveTheme = useMutation({
    mutationFn: async ({ themeId, dir }: { themeId: string; dir: "up" | "down" }) => {
      const group = blocoGroups.find((g) => g.temas.some((t) => t.id === themeId));
      if (!group) return;
      const i = group.temas.findIndex((t) => t.id === themeId);
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= group.temas.length) return;
      // Reordenar e reatribuir order_index sequencial dentro do grupo.
      const next = [...group.temas];
      [next[i], next[j]] = [next[j], next[i]];
      for (let k = 0; k < next.length; k++) {
        const { error } = await supabase
          .from("temas_momentos")
          .update({ order_index: k })
          .eq("id", next[k].id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-temas", activeCluster] }),
    onError: (e: Error) => toast.error(e.message),
  });

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
          .from("temas_momentos")
          .update({
            title: form.title.trim(),
            description: form.description.trim() || null,
            context: form.context.trim() || null,
            objectives: form.objectives.trim() || null,
            bloco: form.bloco.trim() || null,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const maxOrder = temas.reduce((m, t) => Math.max(m, t.order_index), -1);
        const { error } = await supabase.from("temas_momentos").insert({
          cluster: activeCluster,
          title: form.title.trim(),
          description: form.description.trim() || null,
          context: form.context.trim() || null,
          objectives: form.objectives.trim() || null,
          bloco: form.bloco.trim() || null,
          order_index: maxOrder + 1,
        });
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
        .from("temas_momentos")
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
              <div className="space-y-6">
                {blocoGroups.map((group, gi) => {
                  const blocoKey = group.bloco;
                  const blocoLabel = blocoKey ?? "Sem bloco";
                  return (
                    <div key={blocoKey ?? "__none__"} className="space-y-2">
                      <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{blocoLabel}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {group.temas.length} tema(s)
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={gi === 0 || moveBlock.isPending}
                            onClick={() =>
                              moveBlock.mutate({ blocoKey, dir: "up" })
                            }
                            title="Subir bloco"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={gi === blocoGroups.length - 1 || moveBlock.isPending}
                            onClick={() =>
                              moveBlock.mutate({ blocoKey, dir: "down" })
                            }
                            title="Descer bloco"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead className="w-44 text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.temas.map((t, ti) => (
                            <TableRow key={t.id}>
                              <TableCell className="font-medium">{t.title}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={ti === 0 || moveTheme.isPending}
                                  onClick={() =>
                                    moveTheme.mutate({ themeId: t.id, dir: "up" })
                                  }
                                  title="Subir tema"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={
                                    ti === group.temas.length - 1 || moveTheme.isPending
                                  }
                                  onClick={() =>
                                    moveTheme.mutate({ themeId: t.id, dir: "down" })
                                  }
                                  title="Descer tema"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEdit(t)}
                                >
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
                    </div>
                  );
                })}
              </div>
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
  const { map: typeMap } = useResourceTypeMap();

  const [cluster, setCluster] = useState<string>("");
  const activeCluster = cluster || clusters[0] || "";

  const temasQuery = useQuery({
    queryKey: ["assoc-temas", activeCluster],
    enabled: !!activeCluster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos")
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
        .from("tema_recursos")
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

  const [searchTitle, setSearchTitle] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredRecursos = useMemo(() => {
    let list = [...sortedRecursos];
    if (searchTitle.trim()) {
      const q = searchTitle.trim().toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q));
    }
    if (filterType !== "all") {
      list = list.filter((r) => r.resource_type === filterType);
    }
    return list;
  }, [sortedRecursos, searchTitle, filterType]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!temaId) throw new Error("Seleciona um tema.");
      const { error: delErr } = await supabase
        .from("tema_recursos")
        .delete()
        .eq("tema_id", temaId);
      if (delErr) throw delErr;
      const ids = [...selected];
      if (ids.length > 0) {
        const { error } = await supabase
          .from("tema_recursos")
          .insert(ids.map((rid) => ({ tema_id: temaId, recurso_id: rid })));
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
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[180px] flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Filtrar por nome</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar..."
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-full space-y-1 sm:w-36">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <TypeOptions />
                  </SelectContent>
                </Select>
              </div>
            </div>

            {sortedRecursos.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                A Biblioteca está vazia.
              </p>
            )}
            {filteredRecursos.length === 0 && sortedRecursos.length > 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum recurso encontrado com estes filtros.
              </p>
            )}
            {filteredRecursos.length > 0 && (
              <ul className="divide-y rounded-md border">
                {filteredRecursos.map((r) => {
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
                        <div className="text-xs text-muted-foreground">
                          {typeMap.get(r.resource_type)?.label ?? r.resource_type}
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
