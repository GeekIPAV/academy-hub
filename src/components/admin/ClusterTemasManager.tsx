import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  Pencil,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Link2,
} from "lucide-react";

interface RecursoRow {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  file_url: string;
}

interface TemaRow {
  id: string;
  cluster: string;
  title: string;
  description: string | null;
  context: string | null;
  objectives: string | null;
  order_index: number;
  tema_recursos: Array<{ recurso_id: string; recursos: RecursoRow | null }>;
}

interface TemaForm {
  title: string;
  description: string;
  context: string;
  objectives: string;
}

const EMPTY_FORM: TemaForm = { title: "", description: "", context: "", objectives: "" };

export function ClusterTemasManager() {
  const queryClient = useQueryClient();
  const [cluster, setCluster] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TemaRow | null>(null);
  const [form, setForm] = useState<TemaForm>(EMPTY_FORM);
  const [assocTema, setAssocTema] = useState<TemaRow | null>(null);

  // Clusters
  const clustersQuery = useQuery({
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

  const clusters = clustersQuery.data ?? [];
  const activeCluster = cluster || clusters[0] || "";

  // Temas
  const temasQuery = useQuery({
    queryKey: ["admin-temas", activeCluster],
    enabled: !!activeCluster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos" as never)
        .select("*, tema_recursos(recurso_id, recursos(*))")
        .eq("cluster", activeCluster)
        .order("order_index");
      if (error) throw error;
      return (data as unknown as TemaRow[]) ?? [];
    },
  });

  const temas = temasQuery.data ?? [];

  // Biblioteca completa de recursos
  const recursosQuery = useQuery({
    queryKey: ["recursos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recursos" as never)
        .select("id, title, description, resource_type, file_url")
        .order("title");
      if (error) throw error;
      return (data as unknown as RecursoRow[]) ?? [];
    },
  });

  const invalidateTemas = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-temas", activeCluster] });

  // Upsert tema
  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!activeCluster) throw new Error("Seleciona um cluster");
      if (!form.title.trim()) throw new Error("O título é obrigatório");
      if (editing) {
        const { error } = await supabase
          .from("temas_momentos" as never)
          .update({
            title: form.title.trim(),
            description: form.description.trim() || null,
            context: form.context.trim() || null,
            objectives: form.objectives.trim() || null,
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
          order_index: maxOrder + 1,
        } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Tema atualizado." : "Tema criado.");
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      invalidateTemas();
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
      invalidateTemas();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: "up" | "down" }) => {
      const idx = temas.findIndex((t) => t.id === id);
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= temas.length) return;
      const a = temas[idx];
      const b = temas[swapIdx];
      // Swap order_index via two updates
      const { error: e1 } = await supabase
        .from("temas_momentos" as never)
        .update({ order_index: b.order_index } as never)
        .eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("temas_momentos" as never)
        .update({ order_index: a.order_index } as never)
        .eq("id", b.id);
      if (e2) throw e2;
    },
    onSuccess: () => invalidateTemas(),
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: TemaRow) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description ?? "",
      context: t.context ?? "",
      objectives: t.objectives ?? "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cluster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {clustersQuery.isLoading ? (
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
                <Plus className="h-4 w-4" /> Novo tema
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
              <Accordion type="multiple" className="w-full">
                {temas.map((t, i) => {
                  const linked = (t.tema_recursos ?? [])
                    .map((r) => r.recursos)
                    .filter((r): r is RecursoRow => !!r);
                  return (
                    <AccordionItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <AccordionTrigger className="flex-1">{t.title}</AccordionTrigger>
                        <div className="flex shrink-0 items-center gap-1 pr-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={i === 0 || reorderMutation.isPending}
                            onClick={() => reorderMutation.mutate({ id: t.id, dir: "up" })}
                            title="Subir"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={i === temas.length - 1 || reorderMutation.isPending}
                            onClick={() =>
                              reorderMutation.mutate({ id: t.id, dir: "down" })
                            }
                            title="Descer"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <AccordionContent className="space-y-3">
                        {t.description && (
                          <p className="text-sm whitespace-pre-wrap">{t.description}</p>
                        )}
                        {t.context && (
                          <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground">
                              Contexto
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{t.context}</p>
                          </div>
                        )}
                        {t.objectives && (
                          <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground">
                              Objetivos
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{t.objectives}</p>
                          </div>
                        )}
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                            Recursos associados ({linked.length})
                          </p>
                          {linked.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhum.</p>
                          ) : (
                            <ul className="list-disc pl-5 text-sm">
                              {linked.map((r) => (
                                <li key={r.id}>{r.title}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                            <Pencil className="h-4 w-4" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAssocTema(t)}
                          >
                            <Link2 className="h-4 w-4" /> Associar recursos
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Apagar tema "${t.title}"?`)) {
                                deleteMutation.mutate(t.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" /> Apagar
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog Criar/Editar tema */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !upsertMutation.isPending && setDialogOpen(o)}>
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

      {/* Dialog associar recursos */}
      <AssociacoesDialog
        tema={assocTema}
        recursos={recursosQuery.data ?? []}
        onClose={() => setAssocTema(null)}
        onSaved={invalidateTemas}
      />
    </div>
  );
}

function AssociacoesDialog({
  tema,
  recursos,
  onClose,
  onSaved,
}: {
  tema: TemaRow | null;
  recursos: RecursoRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Reset selection whenever the target tema changes
  useEffect(() => {
    setSelected(new Set((tema?.tema_recursos ?? []).map((r) => r.recurso_id)));
  }, [tema]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const save = async () => {
    if (!tema) return;
    setSaving(true);
    try {
      const current = new Set((tema.tema_recursos ?? []).map((r) => r.recurso_id));
      const toAdd = [...selected].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !selected.has(id));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("tema_recursos" as never)
          .delete()
          .eq("tema_id", tema.id)
          .in("recurso_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase.from("tema_recursos" as never).insert(
          toAdd.map((rid) => ({ tema_id: tema.id, recurso_id: rid })) as never,
        );
        if (error) throw error;
      }
      toast.success("Associações atualizadas.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!tema} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[80vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Associar recursos</DialogTitle>
          <DialogDescription>
            Tema: {tema?.title}. Seleciona os recursos da biblioteca a ligar a este tema.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {recursos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Biblioteca vazia.</p>
          ) : (
            recursos.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-start gap-2 rounded-md border p-2 hover:bg-muted/40"
              >
                <Checkbox
                  checked={selected.has(r.id)}
                  onCheckedChange={() => toggle(r.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs uppercase text-muted-foreground">
                    {r.resource_type}
                  </p>
                </div>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
