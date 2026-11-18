import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  GripVertical,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Save,
  Search,
  Table as TableIcon,
  Video,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CoverImage } from "@/components/CoverImage";
import { CoverUploader } from "@/components/CoverUploader";
import { cn } from "@/lib/utils";
import { isPausa, type PlanoBloco, type RecursoRow } from "@/lib/plano-sessao";

type Meta = Map<string, { label: string; color: string }>;
type Vista = "lista" | "tabela" | "galeria";
type Agrupar = "nenhum" | "categoria" | "formato" | "bloco";
type Ordem = { col: "n" | "nome" | "categoria"; dir: "asc" | "desc" };

const VISTAS: { key: Vista; label: string; icon: typeof ListIcon }[] = [
  { key: "lista", label: "Lista", icon: ListIcon },
  { key: "tabela", label: "Tabela", icon: TableIcon },
  { key: "galeria", label: "Galeria", icon: LayoutGrid },
];
const AGRUPAR: { key: Agrupar; label: string }[] = [
  { key: "nenhum", label: "Nenhum" },
  { key: "categoria", label: "Categoria" },
  { key: "formato", label: "Formato" },
  { key: "bloco", label: "Bloco do plano" },
];
const SEM_BLOCO = "__sem_bloco__";

function lerPreferencia<T extends string>(key: string, validos: readonly T[], fallback: T): T {
  try {
    const v = window.localStorage.getItem(key) as T | null;
    return v && validos.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function guardarPreferencia(key: string, v: string) {
  try {
    window.localStorage.setItem(key, v);
  } catch {
    // armazenamento indisponível: fica só nesta visita
  }
}

interface Item {
  r: RecursoRow;
  n: number;
  bloco: { key: string; label: string } | null;
}

export interface RecursosViewsProps {
  temaId: string;
  recursos: RecursoRow[];
  blocos: PlanoBloco[];
  isAdmin: boolean;
  typeMap: Meta;
  categoryMap: Meta;
  onOpen: (fileUrl: string) => void;
  onSaved: () => void;
}

export function RecursosViews({
  temaId,
  recursos,
  blocos,
  isAdmin,
  typeMap,
  categoryMap,
  onOpen,
  onSaved,
}: RecursosViewsProps) {
  const [vista, setVista] = useState<Vista>("lista");
  const [agrupar, setAgrupar] = useState<Agrupar>("categoria");
  const [pesquisa, setPesquisa] = useState("");
  const [categoria, setCategoria] = useState<string>("__all");
  const [fechados, setFechados] = useState<Set<string>>(new Set());
  const [ordem, setOrdem] = useState<Ordem>({ col: "n", dir: "asc" });

  useEffect(() => {
    setVista(lerPreferencia("recursos.vista", ["lista", "tabela", "galeria"] as const, "lista"));
    setAgrupar(
      lerPreferencia("recursos.agrupar", ["nenhum", "categoria", "formato", "bloco"] as const, "categoria"),
    );
  }, []);

  const mudarVista = (v: Vista) => {
    setVista(v);
    guardarPreferencia("recursos.vista", v);
  };
  const mudarAgrupar = (a: Agrupar) => {
    setAgrupar(a);
    setFechados(new Set());
    guardarPreferencia("recursos.agrupar", a);
  };

  // Primeiro bloco do plano onde cada recurso é usado.
  const blocoDoRecurso = useMemo(() => {
    const map = new Map<string, { key: string; label: string }>();
    let n = 0;
    for (const b of blocos) {
      if (!isPausa(b)) n += 1;
      for (const id of b.recurso_ids ?? []) {
        if (!map.has(id)) {
          map.set(id, {
            key: b.id,
            label: `Bloco ${String(n).padStart(2, "0")}${b.title ? ` · ${b.title}` : ""}`,
          });
        }
      }
    }
    return map;
  }, [blocos]);

  const todos: Item[] = useMemo(
    () => recursos.map((r, i) => ({ r, n: i + 1, bloco: blocoDoRecurso.get(r.id) ?? null })),
    [recursos, blocoDoRecurso],
  );

  const categoriasPresentes = useMemo(() => {
    const keys: string[] = [];
    for (const r of recursos) if (r.category_key && !keys.includes(r.category_key)) keys.push(r.category_key);
    return keys;
  }, [recursos]);

  const catLabel = (k: string | null) =>
    k ? categoryMap.get(k)?.label ?? k : "Sem categoria";
  const tipoLabel = (k: string) => typeMap.get(k)?.label ?? k.toUpperCase();

  const filtrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    let list = todos.filter(
      (it) =>
        (categoria === "__all" || it.r.category_key === categoria) &&
        (!q || it.r.title.toLowerCase().includes(q)),
    );
    if (vista === "tabela" && ordem.col !== "n") {
      const val = (it: Item) => (ordem.col === "nome" ? it.r.title : catLabel(it.r.category_key));
      list = [...list].sort((a, b) => val(a).localeCompare(val(b), "pt"));
    }
    if (vista === "tabela" && ordem.dir === "desc") list = [...list].reverse();
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, pesquisa, categoria, vista, ordem, categoryMap]);

  const grupos = useMemo(() => {
    if (agrupar === "nenhum") return [{ key: "__all", label: "", color: "", items: filtrados }];
    const map = new Map<string, { key: string; label: string; color: string; items: Item[] }>();
    for (const it of filtrados) {
      let key: string;
      let label: string;
      let color: string;
      if (agrupar === "categoria") {
        key = it.r.category_key ?? "__none__";
        label = catLabel(it.r.category_key);
        color = (it.r.category_key && categoryMap.get(it.r.category_key)?.color) || "#94a3b8";
      } else if (agrupar === "formato") {
        key = it.r.resource_type;
        label = tipoLabel(it.r.resource_type);
        color = typeMap.get(it.r.resource_type)?.color ?? "#94a3b8";
      } else {
        key = it.bloco?.key ?? SEM_BLOCO;
        label = it.bloco?.label ?? "Sem bloco no plano";
        color = it.bloco ? "#193B69" : "#94a3b8";
      }
      if (!map.has(key)) map.set(key, { key, label, color, items: [] });
      map.get(key)!.items.push(it);
    }
    const list = Array.from(map.values());
    if (agrupar === "bloco") {
      const ordemBlocos = blocos.map((b) => b.id);
      list.sort((a, b) => {
        if (a.key === SEM_BLOCO) return 1;
        if (b.key === SEM_BLOCO) return -1;
        return ordemBlocos.indexOf(a.key) - ordemBlocos.indexOf(b.key);
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados, agrupar, blocos, categoryMap, typeMap]);

  const toggleGrupo = (key: string) =>
    setFechados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Reordenar (admin): só na lista sem agrupar nem filtrar, para a ordem ser clara.
  const podeReordenar =
    isAdmin && vista === "lista" && agrupar === "nenhum" && categoria === "__all" && !pesquisa.trim();

  if (recursos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Sem recursos associados.
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {/* Barra de ferramentas */}
      <div className="space-y-3 rounded-2xl border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Procurar nesta sessão"
              aria-label="Procurar nos recursos"
              className="h-9 pl-9"
            />
          </div>
          {categoriasPresentes.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoria">
              <Chip active={categoria === "__all"} onClick={() => setCategoria("__all")}>
                Todas
              </Chip>
              {categoriasPresentes.map((k) => (
                <Chip key={k} active={categoria === k} onClick={() => setCategoria(k)}>
                  {catLabel(k)}
                </Chip>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Agrupar por</span>
            <Segmented
              label="Agrupar por"
              value={agrupar}
              onChange={(v) => mudarAgrupar(v as Agrupar)}
              options={AGRUPAR.map((a) => ({ value: a.key, label: a.label }))}
            />
            <span className="text-xs text-muted-foreground">
              {filtrados.length} {filtrados.length === 1 ? "recurso" : "recursos"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Ver como</span>
            <Segmented
              label="Vista"
              value={vista}
              onChange={(v) => mudarVista(v as Vista)}
              options={VISTAS.map((v) => ({ value: v.key, label: v.label, icon: v.icon }))}
            />
          </div>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum recurso encontrado.</p>
      ) : podeReordenar ? (
        <ListaOrdenavel
          temaId={temaId}
          items={todos}
          typeMap={typeMap}
          categoryMap={categoryMap}
          onOpen={onOpen}
          onSaved={onSaved}
        />
      ) : vista === "tabela" ? (
        <Tabela
          grupos={grupos}
          agrupado={agrupar !== "nenhum"}
          fechados={fechados}
          onToggle={toggleGrupo}
          ordem={ordem}
          onOrdem={(col) =>
            setOrdem((o) => ({ col, dir: o.col === col && o.dir === "asc" ? "desc" : "asc" }))
          }
          typeMap={typeMap}
          categoryMap={categoryMap}
          onOpen={onOpen}
        />
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => {
            const aberto = !fechados.has(g.key);
            return (
              <section key={g.key} className="space-y-2.5">
                {agrupar !== "nenhum" && (
                  <GrupoHeader
                    label={g.label}
                    color={g.color}
                    count={g.items.length}
                    aberto={aberto}
                    onToggle={() => toggleGrupo(g.key)}
                  />
                )}
                {aberto &&
                  (vista === "lista" ? (
                    <ol className="overflow-hidden rounded-xl border bg-card">
                      {g.items.map((it) => (
                        <li key={it.r.id} className="border-b last:border-b-0">
                          <LinhaRecurso item={it} typeMap={typeMap} categoryMap={categoryMap} onOpen={onOpen} />
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <Galeria
                      items={g.items}
                      typeMap={typeMap}
                      categoryMap={categoryMap}
                      onOpen={onOpen}
                      isAdmin={isAdmin}
                      onSaved={onSaved}
                    />
                  ))}
              </section>
            );
          })}
        </div>
      )}

      {isAdmin && !podeReordenar && vista === "lista" && (
        <p className="text-xs text-muted-foreground">
          Para reordenar, escolhe «Agrupar por: Nenhum» e limpa a pesquisa e os filtros.
        </p>
      )}
    </div>
  );
}

// ---------- peças ----------

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-xs font-medium transition",
        active ? "border-secondary bg-secondary/5 text-secondary" : "bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: typeof ListIcon }[];
}) {
  return (
    <div role="group" aria-label={label} className="flex max-w-full flex-wrap gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((o) => {
        const Icon = o.icon;
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition",
              on ? "bg-background text-secondary shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function GrupoHeader({
  label,
  color,
  count,
  aberto,
  onToggle,
}: {
  label: string;
  color: string;
  count: number;
  aberto: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={aberto}
      className="flex w-full items-center gap-2.5 py-1 text-left"
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm font-semibold uppercase tracking-wide text-foreground/70">{label}</span>
      <span className="text-sm text-muted-foreground">({count})</span>
      <span className="h-px flex-1 bg-border" />
      {aberto ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

function TipoIcon({ r, className, style }: { r: RecursoRow; className?: string; style?: React.CSSProperties }) {
  const Icon = r.resource_type === "video" ? Video : FileText;
  return <Icon className={className} style={style} />;
}

function CategoriaBadge({ r, categoryMap }: { r: RecursoRow; categoryMap: Meta }) {
  if (!r.category_key) return null;
  const cat = categoryMap.get(r.category_key);
  if (!cat) return null;
  return (
    <span
      style={{ borderColor: cat.color, color: cat.color }}
      className="shrink-0 whitespace-nowrap rounded-full border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
    >
      {cat.label}
    </span>
  );
}

function FormatoBadge({ r, typeMap }: { r: RecursoRow; typeMap: Meta }) {
  const meta = typeMap.get(r.resource_type);
  return (
    <span
      style={{ backgroundColor: meta?.color ?? "#64748b" }}
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
    >
      {meta?.label ?? r.resource_type}
    </span>
  );
}

function acaoLabel(r: RecursoRow) {
  return r.resource_type === "video" ? "Ver vídeo" : "Abrir";
}

function LinhaRecurso({
  item,
  typeMap,
  categoryMap,
  onOpen,
  handle,
}: {
  item: Item;
  typeMap: Meta;
  categoryMap: Meta;
  onOpen: (url: string) => void;
  handle?: React.ReactNode;
}) {
  const { r } = item;
  const color = typeMap.get(r.resource_type)?.color ?? "#64748b";
  return (
    <div className="flex min-w-0 items-center gap-3 px-3 py-2.5 sm:px-4">
      {handle}
      <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
        {String(item.n).padStart(2, "0")}
      </span>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}1A`, color }}
      >
        <TipoIcon r={r} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{r.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {typeMap.get(r.resource_type)?.label ?? r.resource_type}
          {item.bloco && ` · No plano: ${item.bloco.label}`}
        </span>
      </span>
      <span className="hidden sm:inline-flex">
        <CategoriaBadge r={r} categoryMap={categoryMap} />
      </span>
      <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={() => onOpen(r.file_url)}>
        {acaoLabel(r)}
        <ExternalLink className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ListaOrdenavel({
  temaId,
  items: inicial,
  typeMap,
  categoryMap,
  onOpen,
  onSaved,
}: {
  temaId: string;
  items: Item[];
  typeMap: Meta;
  categoryMap: Meta;
  onOpen: (url: string) => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState(inicial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setItems(inicial), [inicial]);
  const dirty = items.map((i) => i.r.id).join("|") !== inicial.map((i) => i.r.id).join("|");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((curr) => {
      const a = curr.findIndex((i) => i.r.id === active.id);
      const b = curr.findIndex((i) => i.r.id === over.id);
      return a < 0 || b < 0 ? curr : arrayMove(curr, a, b);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const results = await Promise.all(
        items.map((it, idx) =>
          supabase
            .from("tema_recursos")
            .update({ sort_order: (idx + 1) * 10 })
            .eq("tema_id", temaId)
            .eq("recurso_id", it.r.id),
        ),
      );
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
      toast.success("Ordem guardada.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar a ordem");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {dirty && (
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setItems(inicial)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
            Guardar ordem
          </Button>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.r.id)} strategy={verticalListSortingStrategy}>
          <ol className="overflow-hidden rounded-xl border bg-card">
            {items.map((it, idx) => (
              <SortableLinha
                key={it.r.id}
                item={{ ...it, n: idx + 1 }}
                typeMap={typeMap}
                categoryMap={categoryMap}
                onOpen={onOpen}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableLinha({
  item,
  typeMap,
  categoryMap,
  onOpen,
}: {
  item: Item;
  typeMap: Meta;
  categoryMap: Meta;
  onOpen: (url: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.r.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="border-b bg-card last:border-b-0"
    >
      <LinhaRecurso
        item={item}
        typeMap={typeMap}
        categoryMap={categoryMap}
        onOpen={onOpen}
        handle={
          <button
            type="button"
            className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Arrastar para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </li>
  );
}

function Tabela({
  grupos,
  agrupado,
  fechados,
  onToggle,
  ordem,
  onOrdem,
  typeMap,
  categoryMap,
  onOpen,
}: {
  grupos: { key: string; label: string; color: string; items: Item[] }[];
  agrupado: boolean;
  fechados: Set<string>;
  onToggle: (key: string) => void;
  ordem: Ordem;
  onOrdem: (col: Ordem["col"]) => void;
  typeMap: Meta;
  categoryMap: Meta;
  onOpen: (url: string) => void;
}) {
  const SortIcon = ({ col }: { col: Ordem["col"] }) =>
    ordem.col !== col ? (
      <ArrowUpDown className="h-3 w-3 opacity-50" />
    ) : ordem.dir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  const th = "px-3 py-2.5 text-left text-xs font-medium text-muted-foreground";
  const sortBtn = (col: Ordem["col"], label: string) => (
    <button type="button" onClick={() => onOrdem(col)} className="inline-flex items-center gap-1 hover:text-foreground">
      {label}
      <SortIcon col={col} />
    </button>
  );
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className={cn(th, "w-14")}>{sortBtn("n", "#")}</th>
            <th className={th}>{sortBtn("nome", "Nome")}</th>
            <th className={th}>{sortBtn("categoria", "Categoria")}</th>
            <th className={th}>Formato</th>
            <th className={th}>No plano de sessão</th>
            <th className={cn(th, "text-right")}>Ações</th>
          </tr>
        </thead>
        {grupos.map((g) => {
          const aberto = !fechados.has(g.key);
          return (
            <tbody key={g.key}>
              {agrupado && (
                <tr className="border-t bg-muted/30">
                  <th colSpan={6} className="px-3 text-left">
                    <button
                      type="button"
                      onClick={() => onToggle(g.key)}
                      aria-expanded={aberto}
                      className="flex h-10 w-full items-center gap-2 text-left"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-foreground/70">{g.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">({g.items.length})</span>
                      {aberto ? (
                        <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </th>
                </tr>
              )}
              {aberto &&
                g.items.map((it) => {
                  const color = typeMap.get(it.r.resource_type)?.color ?? "#64748b";
                  return (
                    <tr key={it.r.id} className="border-t">
                      <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                        {String(it.n).padStart(2, "0")}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <TipoIcon r={it.r} className="h-4 w-4 shrink-0" style={{ color }} />
                          <span className="font-medium">{it.r.title}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <CategoriaBadge r={it.r} categoryMap={categoryMap} />
                      </td>
                      <td className="px-3 py-2.5">
                        <FormatoBadge r={it.r} typeMap={typeMap} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{it.bloco?.label ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => onOpen(it.r.file_url)}>
                          {acaoLabel(it.r)}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

function Galeria({
  items,
  typeMap,
  categoryMap,
  onOpen,
  isAdmin,
  onSaved,
}: {
  items: Item[];
  typeMap: Meta;
  categoryMap: Meta;
  onOpen: (url: string) => void;
  isAdmin: boolean;
  onSaved: () => void;
}) {
  const setCover = async (id: string, patch: { cover_url?: string | null; cover_position?: string; cover_scale?: number }) => {
    const { error } = await supabase.from("recursos").update(patch).eq("id", id);
    if (error) throw error;
    onSaved();
  };
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((it) => {
        const { r } = it;
        const color = typeMap.get(r.resource_type)?.color ?? "#64748b";
        const catColor = (r.category_key && categoryMap.get(r.category_key)?.color) || color;
        return (
          <article key={r.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div
              className="relative flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden"
              style={{ backgroundColor: `${catColor}14` }}
            >
              {r.cover_url ? (
                <CoverImage src={r.cover_url} position={r.cover_position} scale={r.cover_scale} />
              ) : (
                <>
                  <span
                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background shadow-sm"
                    style={{ color }}
                  >
                    <TipoIcon r={r} className="h-7 w-7" />
                  </span>
                  <span className="text-xs text-muted-foreground">{typeMap.get(r.resource_type)?.label ?? r.resource_type}</span>
                </>
              )}
              <span className="absolute left-2.5 top-2.5">
                <FormatoBadge r={r} typeMap={typeMap} />
              </span>
              <span className="absolute right-2.5 top-2.5 rounded-full bg-background/90 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {String(it.n).padStart(2, "0")}
              </span>
              {isAdmin && (
                <CoverUploader
                  folder="recursos"
                  id={r.id}
                  currentUrl={r.cover_url}
                  position={r.cover_position}
                  scale={r.cover_scale}
                  aspectRatio={4 / 3}
                  onUploaded={(url: string) => setCover(r.id, { cover_url: url })}
                  onCleared={() => setCover(r.id, { cover_url: null })}
                  onAdjusted={(p, s) => setCover(r.id, { cover_position: p, cover_scale: s })}
                />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div>
                <CategoriaBadge r={r} categoryMap={categoryMap} />
              </div>
              <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-secondary">{r.title}</h4>
              {it.bloco && <p className="line-clamp-1 text-xs text-muted-foreground">No plano: {it.bloco.label}</p>}
              <Button type="button" size="sm" className="mt-auto h-8 w-full" onClick={() => onOpen(r.file_url)}>
                {acaoLabel(r)}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
