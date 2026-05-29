import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getRecursoSignedUrl } from "@/lib/recursos.functions";
import { useResourceTypeMap } from "@/hooks/use-resource-types";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  FileText,
  Video,
  ExternalLink,
  Layers,
  GripVertical,
  Save,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/_authenticated/recursos")({
  head: () => ({ meta: [{ title: "Centro de Recursos — Academia Ubuntu" }] }),
  component: ResourcesPage,
});

interface RecursoRow {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  file_url: string;
}

interface TemaRecursoRow {
  sort_order: number;
  recursos: RecursoRow | null;
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
  tema_recursos: TemaRecursoRow[];
}

function ResourcesPage() {
  const { isComponentVisible, isAdmin } = useApp();
  const visible = (id: string) => isComponentVisible("/recursos", id);
  const [selectedCluster, setSelectedCluster] = useState<string>("");
  const fetchSignedUrl = useServerFn(getRecursoSignedUrl);
  const { map: typeMap } = useResourceTypeMap();

  const openRecurso = async (fileUrl: string) => {
    try {
      const isExternal = /^https?:\/\//i.test(fileUrl);
      const target = isExternal
        ? fileUrl
        : (await fetchSignedUrl({ data: { path: fileUrl } })).url;
      window.open(target, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir recurso");
    }
  };

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
  const activeCluster = selectedCluster || clusters[0] || "";

  const temasQuery = useQuery({
    queryKey: ["temas", activeCluster],
    enabled: !!activeCluster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos")
        .select("*, tema_recursos(sort_order, recursos(*))")
        .eq("cluster", activeCluster)
        .order("bloco_order", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as unknown as TemaRow[]) ?? [];
    },
  });

  const temas = useMemo(() => temasQuery.data ?? [], [temasQuery.data]);

  const groupedTemas = useMemo(() => {
    const hasAnyBloco = temas.some((t) => t.bloco && t.bloco.trim());
    if (!hasAnyBloco) {
      return [{ bloco: null as string | null, temas }];
    }
    const map = new Map<string, TemaRow[]>();
    const order: string[] = [];
    const unassigned: TemaRow[] = [];
    for (const t of temas) {
      const key = t.bloco?.trim();
      if (!key) {
        unassigned.push(t);
        continue;
      }
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(t);
    }
    const groups: Array<{ bloco: string | null; temas: TemaRow[] }> = order.map((b) => ({
      bloco: b,
      temas: map.get(b)!,
    }));
    if (unassigned.length) groups.push({ bloco: null, temas: unassigned });
    return groups;
  }, [temas]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ComponentAccessMatrix pagePath="/recursos" />

      {visible("header") && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Centro de Recursos</h1>
          <p className="text-sm text-muted-foreground">
            Materiais pedagógicos organizados por cluster. Seleciona um cluster para
            explorares os temas e respetivos recursos.
          </p>
        </div>
      )}

      {visible("cluster-selector") && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Cluster</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {clustersQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> A carregar clusters…
              </div>
            ) : clusters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não existem clusters configurados nos programas.
              </p>
            ) : (
              <Select value={activeCluster} onValueChange={setSelectedCluster}>
                <SelectTrigger className="max-w-md">
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
            )}
          </CardContent>
        </Card>
      )}

      {visible("temas-list") && activeCluster && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Temas e momentos</CardTitle>
          </CardHeader>
          <CardContent>
            {temasQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : temas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Ainda não há temas configurados para este cluster.
              </p>
            ) : (
              <div className="space-y-6">
                {groupedTemas.map((group, gi) => (
                  <section key={group.bloco ?? `__none-${gi}`} className="space-y-2">
                    <div className="flex items-center gap-2 border-b pb-1">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.bloco ?? "Outros"}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        ({group.temas.length})
                      </span>
                    </div>
                    <Accordion type="multiple" className="w-full">
                      {group.temas.map((t) => {
                        const recs = (t.tema_recursos ?? [])
                          .filter((tr) => !!tr.recursos)
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((tr) => ({
                            ...(tr.recursos as RecursoRow),
                          }));
                        return (
                          <AccordionItem key={t.id} value={t.id}>
                            <AccordionTrigger>{t.title}</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                              {t.description && (
                                <div>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                                    Descrição
                                  </p>
                                  <p className="mt-1 text-sm whitespace-pre-wrap">
                                    {t.description}
                                  </p>
                                </div>
                              )}
                              {t.context && (
                                <div>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                                    Contexto
                                  </p>
                                  <p className="mt-1 text-sm whitespace-pre-wrap">
                                    {t.context}
                                  </p>
                                </div>
                              )}
                              {t.objectives && (
                                <div>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                                    Objetivos
                                  </p>
                                  <p className="mt-1 text-sm whitespace-pre-wrap">
                                    {t.objectives}
                                  </p>
                                </div>
                              )}

                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                  Recursos
                                </p>
                                <RecursosList
                                  temaId={t.id}
                                  recursos={recs}
                                  isAdmin={isAdmin}
                                  typeMap={typeMap}
                                  onOpen={openRecurso}
                                  onSaved={() => temasQuery.refetch()}
                                />
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface RecursosListProps {
  temaId: string;
  recursos: RecursoRow[];
  isAdmin: boolean;
  typeMap: Map<string, { label: string; color: string }>;
  onOpen: (fileUrl: string) => void;
  onSaved: () => void;
}

function RecursosList({
  temaId,
  recursos,
  isAdmin,
  typeMap,
  onOpen,
  onSaved,
}: RecursosListProps) {
  const [items, setItems] = useState<RecursoRow[]>(recursos);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(recursos);
  }, [recursos]);

  const initialIds = useMemo(() => recursos.map((r) => r.id).join("|"), [recursos]);
  const currentIds = useMemo(() => items.map((r) => r.id).join("|"), [items]);
  const dirty = initialIds !== currentIds;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((curr) => {
      const oldIdx = curr.findIndex((r) => r.id === active.id);
      const newIdx = curr.findIndex((r) => r.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return curr;
      return arrayMove(curr, oldIdx, newIdx);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const updates = items.map((r, idx) =>
        supabase
          .from("tema_recursos")
          .update({ sort_order: idx * 10 })
          .eq("tema_id", temaId)
          .eq("recurso_id", r.id),
      );
      const results = await Promise.all(updates);
      const firstErr = results.find((r) => r.error);
      if (firstErr?.error) throw firstErr.error;
      toast.success("Ordem guardada.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar a ordem");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => setItems(recursos);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem recursos associados.</p>;
  }

  if (!isAdmin) {
    return (
      <div className="space-y-1">
        {items.map((r) => (
          <RecursoButton key={r.id} recurso={r} typeMap={typeMap} onOpen={onOpen} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {items.map((r) => (
              <SortableRecurso
                key={r.id}
                recurso={r}
                typeMap={typeMap}
                onOpen={onOpen}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {dirty && (
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" size="sm" variant="ghost" onClick={reset} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            Guardar ordem
          </Button>
        </div>
      )}
    </div>
  );
}

interface RecursoItemProps {
  recurso: RecursoRow;
  typeMap: Map<string, { label: string; color: string }>;
  onOpen: (fileUrl: string) => void;
}

function RecursoButton({ recurso, typeMap, onOpen }: RecursoItemProps) {
  const isVideo = recurso.resource_type === "video";
  const Icon = isVideo ? Video : FileText;
  const typeMeta = typeMap.get(recurso.resource_type);
  const label = typeMeta?.label ?? recurso.resource_type.toUpperCase();
  const color = typeMeta?.color ?? "#64748b";
  return (
    <button
      type="button"
      onClick={() => onOpen(recurso.file_url)}
      className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition hover:bg-muted/50"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{recurso.title}</p>
      </div>
      <span
        style={{ backgroundColor: color }}
        className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
      >
        {label}
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function SortableRecurso({ recurso, typeMap, onOpen }: RecursoItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: recurso.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const isVideo = recurso.resource_type === "video";
  const Icon = isVideo ? Video : FileText;
  const typeMeta = typeMap.get(recurso.resource_type);
  const label = typeMeta?.label ?? recurso.resource_type.toUpperCase();
  const color = typeMeta?.color ?? "#64748b";
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-full items-center gap-2 rounded-md border bg-background px-2 py-2"
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onOpen(recurso.file_url)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 text-left transition hover:bg-muted/50"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{recurso.title}</p>
        </div>
        <span
          style={{ backgroundColor: color }}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
        >
          {label}
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}
