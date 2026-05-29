import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getRecursoSignedUrl } from "@/lib/recursos.functions";
import { useResourceTypeMap } from "@/hooks/use-resource-types";
import { useResourceCategoryMap } from "@/hooks/use-resource-categories";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";
import {
  Loader2,
  FileText,
  Video,
  ExternalLink,
  GripVertical,
  Save,
  ChevronRight,
  LayoutGrid,
  List as ListIcon,
  Pencil,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoverUploader } from "@/components/CoverUploader";
import { RichTextEditor } from "@/components/rich-text-editor";
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
import { parseCluster, slugifyCluster } from "@/lib/cluster-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/recursos/$cluster/$temaId")({
  head: () => ({ meta: [{ title: "Tema — Centro de Recursos" }] }),
  component: TemaDetail,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl py-16 text-center text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl py-16 text-center text-muted-foreground">
      Tema não encontrado.
    </div>
  ),
});

interface RecursoRow {
  id: string;
  title: string;
  resource_type: string;
  file_url: string;
  cover_url: string | null;
  category_key: string | null;
}

interface TemaDetailRow {
  id: string;
  cluster: string;
  bloco: string | null;
  title: string;
  intro: string | null;
  description: string | null;
  processo_u: string | null;
  context: string | null;
  objectives: string | null;
  hidden_sections: string[] | null;
  tema_recursos: { sort_order: number; recursos: RecursoRow | null }[];
}

type EditableField = "intro" | "description" | "processo_u" | "context" | "objectives";

function TemaDetail() {
  const { cluster: clusterSlug, temaId } = Route.useParams();
  const { isAdmin } = useApp();
  const { map: typeMap } = useResourceTypeMap();
  const { map: categoryMap } = useResourceCategoryMap();
  const fetchSignedUrl = useServerFn(getRecursoSignedUrl);

  const temaQuery = useQuery({
    queryKey: ["tema-detail", temaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos")
        .select(
          "id, cluster, bloco, title, intro, description, processo_u, context, objectives, hidden_sections, tema_recursos(sort_order, recursos(id, title, resource_type, file_url, cover_url, category_key))",
        )
        .eq("id", temaId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Tema não encontrado");
      return data as unknown as TemaDetailRow;
    },
  });

  const tema = temaQuery.data;

  const recursos = useMemo(() => {
    if (!tema) return [];
    return (tema.tema_recursos ?? [])
      .filter((tr) => !!tr.recursos)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((tr) => tr.recursos as RecursoRow);
  }, [tema]);

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

  if (temaQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!tema) return null;

  const clusterTitle = parseCluster(tema.cluster).title;
  const effectiveClusterSlug = slugifyCluster(tema.cluster) || clusterSlug;
  const hiddenSet = new Set(tema.hidden_sections ?? []);

  const toggleHidden = async (field: EditableField, hide: boolean) => {
    const next = new Set(hiddenSet);
    if (hide) next.add(field);
    else next.delete(field);
    const { error } = await supabase
      .from("temas_momentos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ hidden_sections: Array.from(next) } as any)
      .eq("id", tema.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    temaQuery.refetch();
  };

  const sections: { title: string; field: EditableField }[] = [
    { title: "Enquadramento", field: "description" },
    { title: "Processo U", field: "processo_u" },
    { title: "Contexto", field: "context" },
    { title: "Objetivos", field: "objectives" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/recursos" className="hover:text-secondary">
          Centro de Recursos
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          to="/recursos/$cluster"
          params={{ cluster: effectiveClusterSlug }}
          className="hover:text-secondary"
        >
          {tema.bloco ?? clusterTitle}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-secondary">{tema.title}</span>
      </nav>

      <header className="space-y-3 border-b pb-6">
        <h1 className="text-3xl font-semibold text-secondary">{tema.title}</h1>
        <EditableField
          temaId={tema.id}
          field="intro"
          value={tema.intro}
          isAdmin={isAdmin}
          placeholder="Introdução"
          readClassName="text-sm leading-relaxed text-muted-foreground"
          onSaved={() => temaQuery.refetch()}
        />
      </header>

      <Tabs defaultValue="sobre" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sobre">Sobre</TabsTrigger>
          <TabsTrigger value="plano">Plano de Sessão</TabsTrigger>
          <TabsTrigger value="recursos">Recursos</TabsTrigger>
        </TabsList>

        <TabsContent value="sobre" className="space-y-4">
          {sections.map((s) => {
            const value = tema[s.field];
            const hidden = hiddenSet.has(s.field);
            if (!isAdmin && (hidden || !value)) return null;
            return (
              <section
                key={s.field}
                className={cn(
                  "rounded-xl border bg-card p-5 shadow-sm transition",
                  hidden && "opacity-60",
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-secondary">
                    {s.title}
                    {hidden && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (oculto)
                      </span>
                    )}
                  </h2>
                  {isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleHidden(s.field, !hidden)}
                      title={hidden ? "Mostrar" : "Ocultar"}
                    >
                      {hidden ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
                <EditableField
                  temaId={tema.id}
                  field={s.field}
                  value={value}
                  isAdmin={isAdmin}
                  placeholder={`Adicionar ${s.title.toLowerCase()}…`}
                  readClassName="text-sm leading-relaxed text-foreground/90"
                  onSaved={() => temaQuery.refetch()}
                />
              </section>
            );
          })}
        </TabsContent>

        <TabsContent value="plano">
          <PlanoSessao
            temaId={tema.id}
            temaRecursos={recursos}
            typeMap={typeMap}
            isAdmin={isAdmin}
            onOpen={openRecurso}
          />
        </TabsContent>

        <TabsContent value="recursos" className="space-y-3">
          <RecursosList
            temaId={tema.id}
            recursos={recursos}
            isAdmin={isAdmin}
            typeMap={typeMap}
            categoryMap={categoryMap}
            onOpen={openRecurso}
            onSaved={() => temaQuery.refetch()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Editable field (rich text) ---

interface EditableFieldProps {
  temaId: string;
  field: EditableField;
  value: string | null;
  isAdmin: boolean;
  placeholder: string;
  readClassName?: string;
  onSaved: () => void;
}

function isHtml(s: string) {
  return /<[a-z][\s\S]*>/i.test(s);
}

function EditableField({
  temaId,
  field,
  value,
  isAdmin,
  placeholder,
  readClassName,
  onSaved,
}: EditableFieldProps) {
  const initial = value ?? "";
  const normalized = initial && !isHtml(initial)
    ? `<p>${initial.replace(/\n+/g, "</p><p>")}</p>`
    : initial;

  const [draft, setDraft] = useState(normalized);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const lastSavedRef = useRef(normalized);

  useEffect(() => {
    setDraft(normalized);
    lastSavedRef.current = normalized;
  }, [normalized]);

  if (!isAdmin) {
    if (!initial) return null;
    return (
      <div
        className={cn("rich-text", readClassName)}
        dangerouslySetInnerHTML={{ __html: normalized }}
      />
    );
  }

  const dirty = draft !== lastSavedRef.current;

  const save = async () => {
    setSaving(true);
    try {
      const toSave = draft === "<p></p>" ? "" : draft;
      const patch = { [field]: toSave || null } as Record<string, string | null>;
      const { error } = await supabase
        .from("temas_momentos")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(patch as any)
        .eq("id", temaId);
      if (error) throw error;
      lastSavedRef.current = draft;
      toast.success("Guardado.");
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        {initial ? (
          <div
            className={cn("rich-text", readClassName)}
            dangerouslySetInnerHTML={{ __html: normalized }}
          />
        ) : (
          <p className="text-sm italic text-muted-foreground">{placeholder}</p>
        )}
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <RichTextEditor value={draft} onChange={setDraft} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{dirty ? "Alterações por guardar" : placeholder}</span>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(lastSavedRef.current);
              setEditing(false);
            }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={saving || !dirty}
          >
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Plano de Sessão ---

interface PlanoBloco {
  id: string;
  tema_id: string;
  sort_order: number;
  title: string | null;
  description: string | null;
  duration_minutes: number | null;
  schedule: string | null;
  materials: string | null;
  recurso_ids: string[];
}

function PlanoSessao({
  temaId,
  temaRecursos,
  typeMap,
  isAdmin,
  onOpen,
}: {
  temaId: string;
  temaRecursos: RecursoRow[];
  typeMap: Map<string, { label: string; color: string }>;
  isAdmin: boolean;
  onOpen: (fileUrl: string) => void;
}) {
  const blocosQuery = useQuery({
    queryKey: ["plano-sessao", temaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano_sessao_blocos")
        .select("id, tema_id, sort_order, title, description, duration_minutes, schedule, recurso_ids")
        .eq("tema_id", temaId)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PlanoBloco[];
    },
  });

  const addBloco = async () => {
    const nextOrder = (blocosQuery.data?.length ?? 0) * 10;
    const { error } = await supabase
      .from("plano_sessao_blocos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ tema_id: temaId, sort_order: nextOrder, title: "Novo bloco" } as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    blocosQuery.refetch();
  };

  if (blocosQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const blocos = blocosQuery.data ?? [];

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={addBloco}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Adicionar bloco
          </Button>
        </div>
      )}

      {blocos.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          {isAdmin
            ? "Sem blocos. Clica em “Adicionar bloco” para começar."
            : "Plano de sessão ainda não disponível."}
        </p>
      ) : (
        <div className="space-y-3">
          {blocos.map((b, idx) => (
            <BlocoCard
              key={b.id}
              bloco={b}
              index={idx}
              temaRecursos={temaRecursos}
              typeMap={typeMap}
              isAdmin={isAdmin}
              onOpen={onOpen}
              onChanged={() => blocosQuery.refetch()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlocoCard({
  bloco,
  index,
  temaRecursos,
  typeMap,
  isAdmin,
  onOpen,
  onChanged,
}: {
  bloco: PlanoBloco;
  index: number;
  temaRecursos: RecursoRow[];
  typeMap: Map<string, { label: string; color: string }>;
  isAdmin: boolean;
  onOpen: (fileUrl: string) => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(bloco.title ?? "");
  const [schedule, setSchedule] = useState(bloco.schedule ?? "");
  const [duration, setDuration] = useState<string>(
    bloco.duration_minutes != null ? String(bloco.duration_minutes) : "",
  );
  const [description, setDescription] = useState(bloco.description ?? "");
  const [recursoIds, setRecursoIds] = useState<string[]>(bloco.recurso_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setTitle(bloco.title ?? "");
    setSchedule(bloco.schedule ?? "");
    setDuration(bloco.duration_minutes != null ? String(bloco.duration_minutes) : "");
    setDescription(bloco.description ?? "");
    setRecursoIds(bloco.recurso_ids ?? []);
  }, [bloco]);

  const selectedRecursos = useMemo(
    () => temaRecursos.filter((r) => recursoIds.includes(r.id)),
    [temaRecursos, recursoIds],
  );

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("plano_sessao_blocos")
        .update({
          title: title || null,
          schedule: schedule || null,
          duration_minutes: duration ? Number(duration) : null,
          description: description || null,
          recurso_ids: recursoIds,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .eq("id", bloco.id);
      if (error) throw error;
      toast.success("Bloco guardado.");
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar bloco");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Eliminar este bloco?")) return;
    const { error } = await supabase
      .from("plano_sessao_blocos")
      .delete()
      .eq("id", bloco.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bloco eliminado.");
    onChanged();
  };

  if (!isAdmin || !editing) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded bg-muted px-1.5 py-0.5 font-semibold">
                {String(index + 1).padStart(2, "0")}
              </span>
              {bloco.schedule && <span>{bloco.schedule}</span>}
              {bloco.duration_minutes != null && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {bloco.duration_minutes} min
                </span>
              )}
            </div>
            <h3 className="mt-1 text-base font-semibold text-secondary">
              {bloco.title || "Sem título"}
            </h3>
          </div>
          {isAdmin && (
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={remove}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        {bloco.description && (
          <div
            className="rich-text mt-2 text-sm leading-relaxed text-foreground/90"
            dangerouslySetInnerHTML={{ __html: bloco.description }}
          />
        )}
        {selectedRecursos.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recursos
            </p>
            <div className="space-y-1">
              {selectedRecursos.map((r) => {
                const Icon = r.resource_type === "video" ? Video : FileText;
                const typeMeta = typeMap.get(r.resource_type);
                const color = typeMeta?.color ?? "#64748b";
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onOpen(r.file_url)}
                    className="flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs transition hover:bg-muted/50"
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {r.title}
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bloco {String(index + 1).padStart(2, "0")}
        </span>
        <Button type="button" size="sm" variant="ghost" onClick={remove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_120px]">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Título</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do bloco" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Horário</label>
          <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="10:00–11:30" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Duração (min)</label>
          <Input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="60"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Descrição</label>
        <RichTextEditor value={description} onChange={setDescription} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Recursos ({recursoIds.length} selecionado{recursoIds.length === 1 ? "" : "s"})
        </label>
        {temaRecursos.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">
            Este tema ainda não tem recursos associados. Adiciona na tab “Recursos”.
          </p>
        ) : (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border bg-background p-2">
            {temaRecursos.map((r) => {
              const checked = recursoIds.includes(r.id);
              return (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      setRecursoIds((curr) =>
                        v ? [...curr, r.id] : curr.filter((id) => id !== r.id),
                      );
                    }}
                  />
                  <span className="truncate text-sm">{r.title}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1 h-3.5 w-3.5" />
          )}
          Guardar
        </Button>
      </div>
    </div>
  );
}

// --- Recursos list / gallery ---

interface RecursosListProps {
  temaId: string;
  recursos: RecursoRow[];
  isAdmin: boolean;
  typeMap: Map<string, { label: string; color: string }>;
  categoryMap: Map<string, { label: string; color: string }>;
  onOpen: (fileUrl: string) => void;
  onSaved: () => void;
}

type ViewMode = "list" | "gallery";

function RecursosList({
  temaId,
  recursos,
  isAdmin,
  typeMap,
  categoryMap,
  onOpen,
  onSaved,
}: RecursosListProps) {
  const [items, setItems] = useState<RecursoRow[]>(recursos);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<ViewMode>("list");

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
      const results = await Promise.all(
        items.map((r, idx) =>
          supabase
            .from("tema_recursos")
            .update({ sort_order: idx * 10 })
            .eq("tema_id", temaId)
            .eq("recurso_id", r.id),
        ),
      );
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

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem recursos associados.</p>;
  }

  const Toggle = (
    <div className="flex items-center gap-1 rounded-md border bg-card p-0.5">
      <button
        type="button"
        onClick={() => setView("list")}
        className={cn(
          "flex h-7 items-center gap-1 rounded px-2 text-xs transition",
          view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Vista de lista"
      >
        <ListIcon className="h-3.5 w-3.5" /> Lista
      </button>
      <button
        type="button"
        onClick={() => setView("gallery")}
        className={cn(
          "flex h-7 items-center gap-1 rounded px-2 text-xs transition",
          view === "gallery" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Vista de galeria"
      >
        <LayoutGrid className="h-3.5 w-3.5" /> Galeria
      </button>
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">{Toggle}</div>
        {view === "list" ? (
          <div className="space-y-1.5">
            {items.map((r) => (
              <RecursoButton key={r.id} recurso={r} typeMap={typeMap} categoryMap={categoryMap} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <RecursosGallery items={items} typeMap={typeMap} categoryMap={categoryMap} onOpen={onOpen} isAdmin={false} onSaved={onSaved} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {dirty ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setItems(recursos)}
              disabled={saving}
            >
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
        ) : (
          <span />
        )}
        {Toggle}
      </div>

      {view === "list" ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {items.map((r) => (
                <SortableRecurso key={r.id} recurso={r} typeMap={typeMap} categoryMap={categoryMap} onOpen={onOpen} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <RecursosGallery items={items} typeMap={typeMap} categoryMap={categoryMap} onOpen={onOpen} isAdmin={isAdmin} onSaved={onSaved} />
      )}
    </div>
  );
}

interface RecursoItemProps {
  recurso: RecursoRow;
  typeMap: Map<string, { label: string; color: string }>;
  categoryMap: Map<string, { label: string; color: string }>;
  onOpen: (fileUrl: string) => void;
}

function CategoryBadge({
  recurso,
  categoryMap,
}: {
  recurso: RecursoRow;
  categoryMap: Map<string, { label: string; color: string }>;
}) {
  if (!recurso.category_key) return null;
  const cat = categoryMap.get(recurso.category_key);
  if (!cat) return null;
  return (
    <span
      style={{ borderColor: cat.color, color: cat.color }}
      className="shrink-0 rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
    >
      {cat.label}
    </span>
  );
}

function RecursoButton({ recurso, typeMap, categoryMap, onOpen }: RecursoItemProps) {
  const Icon = recurso.resource_type === "video" ? Video : FileText;
  const typeMeta = typeMap.get(recurso.resource_type);
  const label = typeMeta?.label ?? recurso.resource_type.toUpperCase();
  const color = typeMeta?.color ?? "#64748b";
  return (
    <button
      type="button"
      onClick={() => onOpen(recurso.file_url)}
      className="flex w-full items-center gap-3 rounded-md border bg-card px-3 py-2.5 text-left transition hover:bg-muted/50"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{recurso.title}</p>
      </div>
      <CategoryBadge recurso={recurso} categoryMap={categoryMap} />
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

function SortableRecurso({ recurso, typeMap, categoryMap, onOpen }: RecursoItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: recurso.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const Icon = recurso.resource_type === "video" ? Video : FileText;
  const typeMeta = typeMap.get(recurso.resource_type);
  const label = typeMeta?.label ?? recurso.resource_type.toUpperCase();
  const color = typeMeta?.color ?? "#64748b";
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-card px-2 py-2"
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
        <CategoryBadge recurso={recurso} categoryMap={categoryMap} />
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

function RecursosGallery({
  items,
  typeMap,
  categoryMap,
  onOpen,
  isAdmin,
  onSaved,
}: {
  items: RecursoRow[];
  typeMap: Map<string, { label: string; color: string }>;
  categoryMap: Map<string, { label: string; color: string }>;
  onOpen: (fileUrl: string) => void;
  isAdmin: boolean;
  onSaved: () => void;
}) {
  const setCover = async (id: string, url: string | null) => {
    const { error } = await supabase
      .from("recursos")
      .update({ cover_url: url })
      .eq("id", id);
    if (error) throw error;
    onSaved();
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((r) => {
        const Icon = r.resource_type === "video" ? Video : FileText;
        const typeMeta = typeMap.get(r.resource_type);
        const label = typeMeta?.label ?? r.resource_type.toUpperCase();
        const color = typeMeta?.color ?? "#64748b";
        return (
          <div
            key={r.id}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("button, input, a, label")) return;
              onOpen(r.file_url);
            }}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(r.file_url);
              }
            }}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-left transition hover:shadow-md"
          >
            <div
              className="relative flex aspect-[4/3] items-center justify-center overflow-hidden"
              style={{ backgroundColor: `${color}1A` }}
            >
              {r.cover_url ? (
                <img
                  src={r.cover_url}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  loading="lazy"
                />
              ) : (
                <Icon className="h-12 w-12" style={{ color }} />
              )}
              {isAdmin && (
                <CoverUploader
                  folder="recursos"
                  id={r.id}
                  currentUrl={r.cover_url}
                  onUploaded={(url: string) => setCover(r.id, url)}
                  onCleared={() => setCover(r.id, null)}
                />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <div className="flex flex-wrap items-center gap-1">
                <span
                  style={{ backgroundColor: color }}
                  className="w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                >
                  {label}
                </span>
                <CategoryBadge recurso={r} categoryMap={categoryMap} />
              </div>
              <p className="line-clamp-2 text-sm font-medium">{r.title}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
