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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
          "id, cluster, bloco, title, intro, description, processo_u, context, objectives, tema_recursos(sort_order, recursos(id, title, resource_type, file_url, cover_url, category_key))",
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

  const sections: { title: string; field: EditableField }[] = [
    { title: "Enquadramento", field: "description" },
    { title: "Processo U", field: "processo_u" },
    { title: "Contexto", field: "context" },
    { title: "Objetivos", field: "objectives" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
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

      <div className="space-y-4">
        {sections.map((s) => {
          const value = tema[s.field];
          if (!isAdmin && !value) return null;
          return (
            <section
              key={s.field}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <h2 className="mb-2 text-lg font-semibold text-secondary">{s.title}</h2>
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
      </div>

      <section className="space-y-3 border-t pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Recursos
        </h2>
        <RecursosList
          temaId={tema.id}
          recursos={recursos}
          isAdmin={isAdmin}
          typeMap={typeMap}
          categoryMap={categoryMap}
          onOpen={openRecurso}
          onSaved={() => temaQuery.refetch()}
        />
      </section>
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
  // Convert legacy plain text (no tags) to paragraph HTML so the editor doesn't strip line breaks
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
              <RecursoButton key={r.id} recurso={r} typeMap={typeMap} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <RecursosGallery items={items} typeMap={typeMap} onOpen={onOpen} isAdmin={false} onSaved={onSaved} />
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
                <SortableRecurso key={r.id} recurso={r} typeMap={typeMap} onOpen={onOpen} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <RecursosGallery items={items} typeMap={typeMap} onOpen={onOpen} isAdmin={isAdmin} onSaved={onSaved} />
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
  onOpen,
  isAdmin,
  onSaved,
}: {
  items: RecursoRow[];
  typeMap: Map<string, { label: string; color: string }>;
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
              <span
                style={{ backgroundColor: color }}
                className="w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
              >
                {label}
              </span>
              <p className="line-clamp-2 text-sm font-medium">{r.title}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
