import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getRecursoSignedUrl } from "@/lib/recursos.functions";
import { useResourceTypeMap } from "@/hooks/use-resource-types";
import { useResourceCategoryMap } from "@/hooks/use-resource-categories";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import {
  Loader2,
  FileText,
  Video,
  GripVertical,
  Save,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Clock,
  Search,
  Package,
  Printer,
  BookOpen,
  CalendarDays,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoverImage } from "@/components/CoverImage";
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
import {
  PLANO_BLOCO_COLUMNS,
  TIPOS_MOMENTO,
  formatDuracao,
  isPausa,
  materiaisDaSessao,
  parseHorario,
  resumoSessao,
  separarMateriais,
  type PlanoBloco,
  type RecursoRow,
} from "@/lib/plano-sessao";
import { linhas } from "@/lib/recursos-ui";
import { RecursosViews } from "@/components/recursos/RecursosViews";
import { PlanoSessaoImpressao } from "@/components/recursos/PlanoSessaoImpressao";
import { cn } from "@/lib/utils";
import {
  TEMA_FORMATOS,
  TEMA_FORMATO_ORDEM,
  comFormato,
  temaFormato,
  type TemaFormato,
} from "@/lib/tema-formatos";
import { seo, titulo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/recursos/$cluster/$temaId")({
  head: () => ({
    meta: seo({
      title: titulo("Tema", "Centro de recursos"),
      description: "Plano de sessão, momentos e materiais de um tema do Centro de recursos.",
      privada: true,
    }),
  }),
  component: TemaDetail,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl py-16 text-center text-destructive">
      {error instanceof Error ? error.message : "Não foi possível carregar o tema."}
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl py-16 text-center text-muted-foreground">
      Tema não encontrado.
    </div>
  ),
});

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
  pilares: string | null;
  ter_em_atencao: string | null;
  orientacoes: string | null;
  local: string | null;
  cover_url: string | null;
  cover_position: string | null;
  cover_scale: number | null;
  hidden_sections: string[] | null;
  tema_recursos: { sort_order: number; recursos: RecursoRow | null }[];
}

interface TemaIrmao {
  id: string;
  title: string;
  bloco: string | null;
}

type EditableField =
  | "intro"
  | "description"
  | "processo_u"
  | "context"
  | "objectives"
  | "pilares"
  | "ter_em_atencao"
  | "orientacoes"
  | "local";

function TemaDetail() {
  const { cluster: clusterSlug, temaId } = Route.useParams();
  const { isAdmin } = useApp();
  const { map: typeMap } = useResourceTypeMap();
  const { map: categoryMap } = useResourceCategoryMap();
  const fetchSignedUrl = useServerFn(getRecursoSignedUrl);
  const qc = useQueryClient();

  const temaQuery = useQuery({
    queryKey: ["tema-detail", temaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos")
        .select(
          "id, cluster, bloco, title, intro, description, processo_u, context, objectives, pilares, ter_em_atencao, orientacoes, local, cover_url, cover_position, cover_scale, hidden_sections, tema_recursos(sort_order, recursos(id, title, resource_type, file_url, cover_url, cover_position, cover_scale, category_key))",
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

  const blocosQuery = useQuery({
    queryKey: ["plano-sessao", temaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano_sessao_blocos")
        .select(PLANO_BLOCO_COLUMNS)
        .eq("tema_id", temaId)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PlanoBloco[];
    },
  });
  const blocos = blocosQuery.data ?? [];

  // Temas da mesma formação, para "anterior / seguinte" e "Dia X de N".
  const irmaosQuery = useQuery({
    queryKey: ["tema-irmaos", tema?.cluster],
    enabled: !!tema?.cluster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos")
        .select("id, title, bloco")
        .eq("cluster", tema!.cluster)
        .order("bloco_order", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as TemaIrmao[];
    },
  });

  const [tab, setTab] = useState<string>("sobre");
  const [imprimir, setImprimir] = useState(false);

  useEffect(() => {
    if (!imprimir) return;
    const fim = () => setImprimir(false);
    window.addEventListener("afterprint", fim);
    const t = window.setTimeout(() => window.print(), 150);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", fim);
    };
  }, [imprimir]);

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
  const formato = temaFormato(tema.hidden_sections);
  const partes = TEMA_FORMATOS[formato].partes;

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

  const setFormato = async (next: TemaFormato) => {
    if (next === formato) return;
    const { error } = await supabase
      .from("temas_momentos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ hidden_sections: comFormato(tema.hidden_sections, next) } as any)
      .eq("id", tema.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Formato: ${TEMA_FORMATOS[next].label}`);
    qc.invalidateQueries({ queryKey: ["temas", tema.cluster] });
    temaQuery.refetch();
  };

  const irmaos = irmaosQuery.data ?? [];
  const pos = irmaos.findIndex((t) => t.id === tema.id);
  const anterior = pos > 0 ? irmaos[pos - 1] : null;
  const seguinte = pos >= 0 && pos < irmaos.length - 1 ? irmaos[pos + 1] : null;
  const doBloco = tema.bloco ? irmaos.filter((t) => t.bloco === tema.bloco) : [];
  const posBloco = doBloco.findIndex((t) => t.id === tema.id);
  const eyebrow = [
    tema.bloco,
    posBloco >= 0 && doBloco.length > 1 ? `${posBloco + 1} de ${doBloco.length}` : null,
    formato !== "sessao" ? TEMA_FORMATOS[formato].label : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const temPlano = partes.includes("plano");
  const tabs = partes.map((p) => ({
    value: p,
    label: p === "sobre" ? "Sobre" : p === "plano" ? "Plano de sessão" : "Recursos",
    count: p === "plano" ? blocos.filter((b) => !isPausa(b)).length : p === "recursos" ? recursos.length : 0,
  }));
  const tabAtivo = partes.includes(tab as (typeof partes)[number]) ? tab : partes[0];

  const sobre = (
    <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-4">
        <SobreSections
          tema={tema}
          isAdmin={isAdmin}
          hiddenSet={hiddenSet}
          onToggleHidden={toggleHidden}
          onSaved={() => temaQuery.refetch()}
        />
      </div>
      {temPlano && blocos.length > 0 && (
        <ResumoSessao
          blocos={blocos}
          nRecursos={recursos.length}
          onVerPlano={() => setTab("plano")}
        />
      )}
    </div>
  );

  const recursosView = (
    <RecursosViews
      temaId={tema.id}
      recursos={recursos}
      blocos={blocos}
      isAdmin={isAdmin}
      typeMap={typeMap}
      categoryMap={categoryMap}
      onOpen={openRecurso}
      onSaved={() => temaQuery.refetch()}
    />
  );

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6">
      <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground [&>svg]:shrink-0 [&>a]:break-words [&>span]:break-words">
        <Link to="/recursos" className="hover:text-secondary">
          Centro de recursos
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          to="/recursos/$cluster"
          params={{ cluster: effectiveClusterSlug }}
          className="hover:text-secondary"
        >
          {clusterTitle}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-secondary">{tema.title}</span>
      </nav>

      <header className="flex min-w-0 flex-col gap-6 md:flex-row md:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
          )}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-secondary sm:text-4xl">{tema.title}</h1>
            {isAdmin && <FormatoPicker value={formato} onChange={setFormato} />}
          </div>
          <div className="border-l-[3px] border-border pl-4">
            <EditableField
              temaId={tema.id}
              field="intro"
              value={tema.intro}
              isAdmin={isAdmin}
              placeholder="Introdução"
              readClassName="text-base leading-relaxed text-muted-foreground"
              onSaved={() => temaQuery.refetch()}
            />
          </div>
        </div>
        {(tema.cover_url || anterior || seguinte) && (
          <div className="flex w-full shrink-0 flex-col gap-2.5 md:w-72">
            {tema.cover_url && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                <CoverImage src={tema.cover_url} position={tema.cover_position} scale={tema.cover_scale} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {anterior ? (
                <Link
                  to="/recursos/$cluster/$temaId"
                  params={{ cluster: effectiveClusterSlug, temaId: anterior.id }}
                  className="flex min-w-0 flex-col rounded-xl border bg-card px-3 py-2 text-xs transition hover:bg-muted/50"
                  title={anterior.title}
                >
                  <span className="text-muted-foreground">← Anterior</span>
                  <span className="truncate font-medium text-secondary">{anterior.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {seguinte ? (
                <Link
                  to="/recursos/$cluster/$temaId"
                  params={{ cluster: effectiveClusterSlug, temaId: seguinte.id }}
                  className="flex min-w-0 flex-col rounded-xl border bg-card px-3 py-2 text-right text-xs transition hover:bg-muted/50"
                  title={seguinte.title}
                >
                  <span className="text-muted-foreground">Seguinte →</span>
                  <span className="truncate font-medium text-secondary">{seguinte.title}</span>
                </Link>
              ) : (
                <span />
              )}
            </div>
          </div>
        )}
      </header>

      {tabs.length > 1 ? (
        <Tabs value={tabAtivo} onValueChange={setTab} className="space-y-6 border-t pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-full overflow-x-auto">
              <TabsList>
                {tabs.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                    {t.count > 0 && <span className="ml-1.5 text-xs opacity-70">{t.count}</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {temPlano && blocos.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setImprimir(true)}>
                <Printer className="mr-1.5 h-4 w-4" />
                Imprimir plano
              </Button>
            )}
          </div>

          <TabsContent value="sobre">{sobre}</TabsContent>
          {temPlano && (
            <TabsContent value="plano">
              <PlanoSessao
                temaId={tema.id}
                temaRecursos={recursos}
                typeMap={typeMap}
                categoryMap={categoryMap}
                isAdmin={isAdmin}
                onOpen={openRecurso}
                onImprimir={() => setImprimir(true)}
              />
            </TabsContent>
          )}
          <TabsContent value="recursos">{recursosView}</TabsContent>
        </Tabs>
      ) : (
        <div className="border-t pt-6">{recursosView}</div>
      )}

      {imprimir && (
        <PlanoSessaoImpressao tema={tema} blocos={blocos} recursos={recursos} />
      )}
    </div>
  );
}

/** Resumo lateral do separador "Sobre". */
function ResumoSessao({
  blocos,
  nRecursos,
  onVerPlano,
}: {
  blocos: PlanoBloco[];
  nRecursos: number;
  onVerPlano: () => void;
}) {
  const r = resumoSessao(blocos);
  const materiais = materiaisDaSessao(blocos);
  const linha = (label: string, valor: string | number | null) =>
    valor ? (
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-semibold text-secondary">{valor}</dd>
      </div>
    ) : null;
  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-80" aria-label="Resumo da sessão">
      <div className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo da sessão</h2>
        <dl className="space-y-2.5 text-sm">
          {linha("Início", r.inicio)}
          {linha("Fim", r.fim)}
          {linha("Duração total", formatDuracao(r.duracao))}
          {linha("Momentos", r.momentos)}
          {linha("Recursos", nRecursos)}
        </dl>
        <Button type="button" className="w-full" onClick={onVerPlano}>
          Ver plano de sessão
        </Button>
      </div>
      {materiais.length > 0 && (
        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Materiais a preparar
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Juntados de todos os blocos do plano.</p>
          </div>
          <ul className="space-y-1.5 text-sm">
            {materiais.map((m) => (
              <li key={m} className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

// --- Formato do tema ---

function FormatoPicker({
  value,
  onChange,
}: {
  value: TemaFormato;
  onChange: (f: TemaFormato) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div
        role="radiogroup"
        aria-label="Formato do tema"
        className="flex items-center gap-0.5 rounded-md border bg-card p-0.5"
      >
        {TEMA_FORMATO_ORDEM.map((f) => {
          const Icon = FORMATO_ICON[f];
          const active = value === f;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={active}
              title={TEMA_FORMATOS[f].description}
              onClick={() => onChange(f)}
              className={cn(
                "flex h-7 items-center gap-1 rounded px-2 text-xs transition",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {TEMA_FORMATOS[f].label}
            </button>
          );
        })}
      </div>
      <span className="text-[11px] text-muted-foreground">Formato (só visível para admin)</span>
    </div>
  );
}

const FORMATO_ICON: Record<TemaFormato, typeof CalendarDays> = {
  sessao: CalendarDays,
  conteudo: BookOpen,
  documentos: FolderOpen,
};

// --- Secções "Sobre" ---

const SOBRE_SECTIONS: { title: string; field: EditableField }[] = [
  { title: "Enquadramento", field: "description" },
  { title: "Objetivos", field: "objectives" },
  { title: "Pilares", field: "pilares" },
  { title: "Processo U", field: "processo_u" },
  { title: "Ter em atenção", field: "ter_em_atencao" },
  { title: "Contexto", field: "context" },
  { title: "Local", field: "local" },
  { title: "Orientações e condições", field: "orientacoes" },
];

/**
 * Mostra só as secções com conteúdo. As vazias não ocupam espaço: o admin
 * acrescenta-as quando precisa, através de "Adicionar secção".
 */
function SobreSections({
  tema,
  isAdmin,
  hiddenSet,
  onToggleHidden,
  onSaved,
}: {
  tema: TemaDetailRow;
  isAdmin: boolean;
  hiddenSet: Set<string>;
  onToggleHidden: (field: EditableField, hide: boolean) => void;
  onSaved: () => void;
}) {
  const [adding, setAdding] = useState<Set<EditableField>>(new Set());

  const visible = SOBRE_SECTIONS.filter((s) => {
    const value = tema[s.field];
    const hidden = hiddenSet.has(s.field);
    if (!isAdmin) return !hidden && !!value;
    return !!value || adding.has(s.field);
  });
  const empty = isAdmin
    ? SOBRE_SECTIONS.filter((s) => !tema[s.field] && !adding.has(s.field))
    : [];

  if (visible.length === 0 && empty.length === 0) return null;

  return (
    <>
      {visible.map((s) => {
        const value = tema[s.field];
        const hidden = hiddenSet.has(s.field);
        return (
          <section
            key={s.field}
            className={cn(
              "rounded-2xl border bg-card p-6 shadow-sm transition",
              hidden && "opacity-60",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-bold text-secondary">
                {s.title}
                {hidden && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">(oculto)</span>
                )}
              </h2>
              {isAdmin && value && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onToggleHidden(s.field, !hidden)}
                  title={hidden ? "Mostrar" : "Ocultar"}
                >
                  {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
            <EditableField
              temaId={tema.id}
              field={s.field}
              value={value}
              isAdmin={isAdmin}
              startEditing={!value}
              placeholder={`Adicionar ${s.title.toLowerCase()}…`}
              readClassName="text-[15px] leading-relaxed text-foreground/90"
              onSaved={() => {
                setAdding((prev) => {
                  const next = new Set(prev);
                  next.delete(s.field);
                  return next;
                });
                onSaved();
              }}
              onCancel={() =>
                setAdding((prev) => {
                  const next = new Set(prev);
                  next.delete(s.field);
                  return next;
                })
              }
            />
          </section>
        );
      })}
      {empty.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3">
          <span className="text-xs text-muted-foreground">Adicionar secção:</span>
          {empty.map((s) => (
            <Button
              key={s.field}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setAdding((prev) => new Set(prev).add(s.field))}
            >
              <Plus className="mr-1 h-3 w-3" />
              {s.title}
            </Button>
          ))}
        </div>
      )}
    </>
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
  startEditing?: boolean;
  onSaved: () => void;
  onCancel?: () => void;
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
  startEditing = false,
  onSaved,
  onCancel,
}: EditableFieldProps) {
  const initial = value ?? "";
  const normalized = initial && !isHtml(initial)
    ? `<p>${initial.replace(/\n+/g, "</p><p>")}</p>`
    : initial;

  const [draft, setDraft] = useState(normalized);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(startEditing);
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
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(normalized) }}
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
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(normalized) }}
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
              onCancel?.();
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

function PlanoSessao({
  temaId,
  temaRecursos,
  typeMap,
  categoryMap,
  isAdmin,
  onOpen,
  onImprimir,
}: {
  temaId: string;
  temaRecursos: RecursoRow[];
  typeMap: Map<string, { label: string; color: string }>;
  categoryMap: Map<string, { label: string; color: string }>;
  isAdmin: boolean;
  onOpen: (fileUrl: string) => void;
  onImprimir: () => void;
}) {
  const blocosQuery = useQuery({
    queryKey: ["plano-sessao", temaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano_sessao_blocos")
        .select(PLANO_BLOCO_COLUMNS)
        .eq("tema_id", temaId)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PlanoBloco[];
    },
  });

  const [orderedBlocos, setOrderedBlocos] = useState<PlanoBloco[]>([]);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const iniciou = useRef(false);

  useEffect(() => {
    const data = blocosQuery.data ?? [];
    setOrderedBlocos(data);
    // Primeira visita: abre o primeiro momento.
    if (!iniciou.current && data.length > 0) {
      iniciou.current = true;
      const primeiro = data.find((b) => !isPausa(b));
      if (primeiro) setAbertos(new Set([primeiro.id]));
    }
  }, [blocosQuery.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addBloco = async () => {
    const last = orderedBlocos[orderedBlocos.length - 1];
    const nextOrder = (last?.sort_order ?? 0) + 10;
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedBlocos.findIndex((b) => b.id === active.id);
    const newIndex = orderedBlocos.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(orderedBlocos, oldIndex, newIndex).map((b, i) => ({
      ...b,
      sort_order: (i + 1) * 10,
    }));
    setOrderedBlocos(reordered);
    try {
      await Promise.all(
        reordered.map((b) =>
          supabase
            .from("plano_sessao_blocos")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ sort_order: b.sort_order } as any)
            .eq("id", b.id),
        ),
      );
      blocosQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reordenar blocos");
      blocosQuery.refetch();
    }
  };

  if (blocosQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const blocos = orderedBlocos;
  // Número de cada momento (as pausas não contam).
  const numeros = new Map<string, number>();
  let n = 0;
  for (const b of blocos) if (!isPausa(b)) numeros.set(b.id, ++n);
  const todosAbertos = blocos.filter((b) => !isPausa(b)).every((b) => abertos.has(b.id));

  const toggle = (id: string) =>
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const irPara = (id: string) => {
    setAbertos((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      document.getElementById(`bloco-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
      {blocos.length > 0 && (
        <aside
          aria-label="Linha do tempo"
          className="w-full shrink-0 rounded-2xl border bg-card p-4 lg:sticky lg:top-4 lg:w-64"
        >
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Linha do tempo
          </p>
          <ol className="max-h-[70vh] space-y-0.5 overflow-y-auto">
            {blocos.map((b) => {
              const h = parseHorario(b.schedule);
              const pausa = isPausa(b);
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => (pausa ? undefined : irPara(b.id))}
                    disabled={pausa}
                    className={cn(
                      "flex w-full items-baseline gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition",
                      pausa
                        ? "cursor-default text-muted-foreground"
                        : abertos.has(b.id)
                          ? "bg-primary/10 text-secondary"
                          : "text-foreground/80 hover:bg-muted",
                    )}
                  >
                    <span className="w-11 shrink-0 font-semibold tabular-nums">{h.inicio ?? ""}</span>
                    <span className={cn("min-w-0 leading-snug", pausa && "italic")}>
                      {b.title || b.tipo || "Sem título"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      )}

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {blocos.length > 0 && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setAbertos(todosAbertos ? new Set<string>() : new Set<string>(blocos.filter((b) => !isPausa(b)).map((b) => b.id)))
                }
              >
                {todosAbertos ? "Recolher todos" : "Expandir todos"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onImprimir}>
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Imprimir plano
              </Button>
            </>
          )}
          {isAdmin && (
            <Button type="button" size="sm" onClick={addBloco}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Adicionar bloco
            </Button>
          )}
        </div>

        {blocos.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            {isAdmin
              ? "Sem blocos. Clica em “Adicionar bloco” para começar."
              : "Plano de sessão ainda não disponível."}
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocos.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {blocos.map((b) => (
                  <BlocoCard
                    key={b.id}
                    bloco={b}
                    numero={numeros.get(b.id) ?? null}
                    aberto={abertos.has(b.id)}
                    onToggle={() => toggle(b.id)}
                    temaRecursos={temaRecursos}
                    typeMap={typeMap}
                    categoryMap={categoryMap}
                    isAdmin={isAdmin}
                    onOpen={onOpen}
                    onChanged={() => blocosQuery.refetch()}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function BlocoCard({
  bloco,
  numero,
  aberto,
  onToggle,
  temaRecursos,
  typeMap,
  categoryMap,
  isAdmin,
  onOpen,
  onChanged,
}: {
  bloco: PlanoBloco;
  numero: number | null;
  aberto: boolean;
  onToggle: () => void;
  temaRecursos: RecursoRow[];
  typeMap: Map<string, { label: string; color: string }>;
  categoryMap: Map<string, { label: string; color: string }>;
  isAdmin: boolean;
  onOpen: (fileUrl: string) => void;
  onChanged: () => void;
}) {
  const [tipo, setTipo] = useState(bloco.tipo ?? "");
  const [title, setTitle] = useState(bloco.title ?? "");
  const [schedule, setSchedule] = useState(bloco.schedule ?? "");
  const [duration, setDuration] = useState<string>(
    bloco.duration_minutes != null ? String(bloco.duration_minutes) : "",
  );
  const [description, setDescription] = useState(bloco.description ?? "");
  const [materials, setMaterials] = useState(bloco.materials ?? "");
  const [objetivos, setObjetivos] = useState(bloco.objetivos ?? "");
  const [recursoIds, setRecursoIds] = useState<string[]>(bloco.recurso_ids ?? []);
  const [recursoSearch, setRecursoSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [feitos, setFeitos] = useState<Set<number>>(new Set());

  useEffect(() => {
    setTipo(bloco.tipo ?? "");
    setTitle(bloco.title ?? "");
    setSchedule(bloco.schedule ?? "");
    setDuration(bloco.duration_minutes != null ? String(bloco.duration_minutes) : "");
    setDescription(bloco.description ?? "");
    setMaterials(bloco.materials ?? "");
    setObjetivos(bloco.objetivos ?? "");
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
          tipo: tipo.trim() || null,
          title: title || null,
          schedule: schedule || null,
          duration_minutes: duration ? Number(duration) : null,
          description: description || null,
          materials: materials || null,
          objetivos: objetivos.trim() || null,
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
    const { error } = await supabase.from("plano_sessao_blocos").delete().eq("id", bloco.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bloco eliminado.");
    onChanged();
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bloco.id,
    disabled: !isAdmin || editing,
  });
  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const h = parseHorario(bloco.schedule);
  const pausa = isPausa(bloco);
  const { equipamento, materiais } = separarMateriais(bloco.materials);
  const objetivosLista = linhas(bloco.objetivos);

  const handle = isAdmin ? (
    <button
      type="button"
      className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
      aria-label="Reordenar bloco"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  ) : null;

  const adminActions = isAdmin ? (
    <div className="flex shrink-0 gap-0.5">
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Editar bloco">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={remove} aria-label="Eliminar bloco">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  ) : null;

  if (!isAdmin || !editing) {
    if (pausa) {
      return (
        <div
          ref={setNodeRef}
          style={sortableStyle}
          id={`bloco-${bloco.id}`}
          className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-2.5 text-sm"
        >
          {handle}
          <span className="w-28 shrink-0 font-semibold tabular-nums text-secondary">
            {h.inicio}
            {h.fim ? ` – ${h.fim}` : ""}
          </span>
          <span className="flex-1 font-medium text-secondary">{bloco.title || bloco.tipo}</span>
          {bloco.duration_minutes != null && (
            <span className="text-xs text-muted-foreground">{formatDuracao(bloco.duration_minutes)}</span>
          )}
          {adminActions}
        </div>
      );
    }
    return (
      <article
        ref={setNodeRef}
        style={sortableStyle}
        id={`bloco-${bloco.id}`}
        className="scroll-mt-4 overflow-hidden rounded-2xl border bg-card shadow-sm"
      >
        <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
          {handle}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={aberto}
            className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left"
          >
            <span className="rounded-md bg-secondary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-secondary">
              {String(numero ?? 0).padStart(2, "0")}
            </span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {h.inicio ?? bloco.schedule ?? ""}
              {h.fim ? ` – ${h.fim}` : ""}
            </span>
            {bloco.duration_minutes != null && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {bloco.duration_minutes} min
              </span>
            )}
            {bloco.tipo && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                {bloco.tipo}
              </span>
            )}
            <span className="basis-full text-base font-semibold leading-snug text-secondary sm:text-lg">
              {bloco.title || "Sem título"}
            </span>
          </button>
          {adminActions}
          <button
            type="button"
            onClick={onToggle}
            aria-label={aberto ? "Recolher bloco" : "Expandir bloco"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition hover:text-foreground"
          >
            {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {aberto && (
          <div className="space-y-5 border-t px-4 py-5 sm:px-5">
            <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-4">
                {bloco.description && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Descrição
                    </p>
                    <div
                      className="rich-text text-[15px] leading-relaxed text-foreground/90"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(bloco.description) }}
                    />
                  </div>
                )}
                {objetivosLista.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Objetivos
                    </p>
                    <ul className="space-y-1 text-sm">
                      {objetivosLista.map((o, i) => (
                        <li key={i} className="flex gap-2.5">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!bloco.description && objetivosLista.length === 0 && (
                  <p className="text-sm italic text-muted-foreground">Sem descrição.</p>
                )}
              </div>
              {(equipamento.length > 0 || materiais.length > 0) && (
                <div className="space-y-2 self-start rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-secondary">
                    <Package className="h-3.5 w-3.5" />
                    Materiais necessários
                  </p>
                  {equipamento.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {equipamento.map((e) => (
                        <span key={e} className="rounded-md bg-background px-1.5 py-0.5 text-[11px] font-semibold text-secondary">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                  {materiais.map((m, i) => (
                    <label key={i} className="flex cursor-pointer items-start gap-2.5 text-sm">
                      <Checkbox
                        className="mt-0.5"
                        checked={feitos.has(i)}
                        onCheckedChange={(v) =>
                          setFeitos((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(i);
                            else next.delete(i);
                            return next;
                          })
                        }
                      />
                      <span className={cn(feitos.has(i) && "text-muted-foreground line-through")}>{m}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {selectedRecursos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recursos deste bloco
                </p>
                <div className="space-y-1.5">
                  {selectedRecursos.map((r) => {
                    const Icon = r.resource_type === "video" ? Video : FileText;
                    const typeMeta = typeMap.get(r.resource_type);
                    const color = typeMeta?.color ?? "#64748b";
                    const cat = r.category_key ? categoryMap.get(r.category_key) : undefined;
                    return (
                      <div
                        key={r.id}
                        className="flex min-w-0 items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2"
                      >
                        <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                        <span className="min-w-0 flex-1 truncate text-sm">{r.title}</span>
                        {cat && (
                          <span
                            style={{ borderColor: cat.color, color: cat.color }}
                            className="hidden shrink-0 rounded-full border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:inline"
                          >
                            {cat.label}
                          </span>
                        )}
                        <span
                          style={{ backgroundColor: color }}
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                        >
                          {typeMeta?.label ?? r.resource_type}
                        </span>
                        <Button type="button" size="sm" className="h-8 shrink-0" onClick={() => onOpen(r.file_url)}>
                          {r.resource_type === "video" ? "Ver vídeo" : "Abrir"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {numero ? `Bloco ${String(numero).padStart(2, "0")}` : "Pausa"}
        </span>
        <Button type="button" size="sm" variant="ghost" onClick={remove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`tipo-${bloco.id}`}>
            Tipo de momento
          </label>
          <Input
            id={`tipo-${bloco.id}`}
            list="tipos-momento"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Dinâmica, Filme, Intervalo…"
          />
          <datalist id="tipos-momento">
            {TIPOS_MOMENTO.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Título</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do bloco" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:w-80">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Horário</label>
          <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="09:00–09:10" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Duração (min)</label>
          <Input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="10"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Os tipos «Intervalo» e «Almoço» aparecem como uma faixa simples, sem número.
      </p>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Descrição breve</label>
        <RichTextEditor value={description} onChange={setDescription} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Material necessário (um por linha)</label>
          <Textarea
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
            placeholder={"Computador\nProjetor\nFolhas de flipchart"}
            rows={4}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Objetivos (um por linha)</label>
          <Textarea
            value={objetivos}
            onChange={(e) => setObjetivos(e.target.value)}
            placeholder={"Apresentar os participantes\nPromover a coesão grupal"}
            rows={4}
          />
        </div>
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
          <div className="rounded-md border bg-background">
            <div className="relative border-b">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recursoSearch}
                onChange={(e) => setRecursoSearch(e.target.value)}
                placeholder="Pesquisar recursos…"
                className="h-8 border-0 pl-8 text-sm focus-visible:ring-0"
              />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto p-2">
              {(() => {
                const q = recursoSearch.trim().toLowerCase();
                const filtered = q
                  ? temaRecursos.filter((r) => r.title.toLowerCase().includes(q))
                  : temaRecursos;
                if (filtered.length === 0) {
                  return (
                    <p className="px-2 py-1 text-xs italic text-muted-foreground">
                      Nenhum recurso encontrado.
                    </p>
                  );
                }
                return filtered.map((r) => {
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
                });
              })()}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
