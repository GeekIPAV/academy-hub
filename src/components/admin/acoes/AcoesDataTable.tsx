import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { EstadoSelect, FormatoSelect, PaisSelect } from "@/components/admin/acoes/AcaoCampos";
import { INSCRICOES_ABERTAS, INSCRICOES_FECHADAS } from "@/lib/acoes-opcoes";
import { listProjetos } from "@/lib/projetos.functions";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnOrderState,
  type ColumnSizingState,
  type SortingState,
} from "@tanstack/react-table";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpDown, GripVertical, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { patchAcao, type AcaoRow } from "@/lib/admin-acoes-gestao.functions";

interface Props {
  data: AcaoRow[];
  onOpen: (id: string) => void;
}

export function AcoesDataTable({ data, onOpen }: Props) {
  const qc = useQueryClient();
  const patchFn = useServerFn(patchAcao);
  const fetchProj = useServerFn(listProjetos);
  const { data: projetos = [] } = useQuery({ queryKey: ["projetos"], queryFn: () => fetchProj() });
  const projNome = useMemo(
    () => new Map(projetos.map((p: { id: string; title: string }) => [p.id, p.title])),
    [projetos],
  );
  const patch = useCallback(
    async (id: string, fields: Partial<Record<"status" | "registration_status" | "formato" | "localizacao" | "pais", string | null>>) => {
      qc.setQueryData<AcaoRow[]>(["admin-acoes-full"], (old) =>
        old?.map((a) => (a.id === id ? { ...a, ...fields } : a)),
      );
      try {
        await patchFn({ data: { actionId: id, fields: fields as never } });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao guardar");
      }
      qc.invalidateQueries({ queryKey: ["admin-acoes-full"] });
    },
    [qc, patchFn],
  );
  const columns = useMemo<ColumnDef<AcaoRow>[]>(
    () => [
      {
        id: "open",
        header: "",
        size: 70,
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => onOpen(row.original.id)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" /> Abrir
          </Button>
        ),
      },
      {
        accessorKey: "title",
        header: "Título",
        size: 260,
        cell: (info) => info.getValue<string | null>() ?? "—",
      },
      {
        accessorKey: "status",
        header: "Estado",
        size: 190,
        cell: ({ row }) => (
          <EstadoSelect
            className="h-8 border-transparent bg-transparent px-1 shadow-none"
            value={row.original.status ?? ""}
            onChange={(v) => patch(row.original.id, { status: v })}
          />
        ),
      },
      {
        accessorKey: "registration_status",
        header: "Inscrições",
        size: 120,
        cell: ({ row }) => {
          const on = row.original.registration_status === INSCRICOES_ABERTAS;
          return (
            <label className="flex items-center gap-2">
              <Switch
                checked={on}
                onCheckedChange={(c) =>
                  patch(row.original.id, {
                    registration_status: c ? INSCRICOES_ABERTAS : INSCRICOES_FECHADAS,
                  })
                }
                aria-label="Inscrições abertas"
              />
              <span className="text-xs text-muted-foreground">{on ? "Abertas" : "Fechadas"}</span>
            </label>
          );
        },
      },
      {
        accessorKey: "formato",
        header: "Formato",
        size: 300,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <FormatoSelect
              className="h-8 w-[110px] shrink-0 px-2"
              value={row.original.formato ?? ""}
              onChange={(v) => patch(row.original.id, { formato: v })}
            />
            <InlineText
              key={row.original.id + (row.original.localizacao ?? "")}
              value={row.original.localizacao ?? ""}
              placeholder={row.original.formato === "Online" ? "Link…" : "Localização…"}
              onSave={(v) => patch(row.original.id, { localizacao: v || null })}
            />
          </div>
        ),
      },
      {
        accessorKey: "pais",
        header: "País",
        size: 170,
        cell: ({ row }) => (
          <PaisSelect
            className="h-8 px-2"
            value={row.original.pais ?? ""}
            onChange={(v) => patch(row.original.id, { pais: v })}
          />
        ),
      },
      {
        accessorKey: "start_date",
        header: "Data",
        size: 110,
      },
      {
        id: "projetos",
        header: "Projetos",
        size: 220,
        accessorFn: (r) => r.project_ids.map((id) => projNome.get(id) ?? "").join(", "),
        cell: ({ row }) => {
          const ids = row.original.project_ids;
          if (!ids.length) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-1 overflow-hidden" title={ids.map((i) => projNome.get(i)).join(", ")}>
              {row.original.visibilidade === "projetos" && (
                <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Só para estes projetos" />
              )}
              {ids.map((id) => (
                <Badge key={id} variant="secondary" className="max-w-[10rem] shrink-0">
                  <span className="truncate">{projNome.get(id) ?? "Projeto"}</span>
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "max_capacity",
        header: "Capacidade",
        size: 100,
      },
      {
        accessorKey: "programa_title",
        header: "Programa",
        size: 180,
      },
      {
        accessorKey: "entidade_nome",
        header: "Entidade",
        size: 180,
      },
    ],
    [onOpen, patch, projNome],
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() =>
    columns.map((c) => (c.id ?? (c as { accessorKey?: string }).accessorKey) as string),
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnSizing, columnOrder },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setColumnOrder((order) => {
      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over.id as string);
      if (oldIndex < 0 || newIndex < 0) return order;
      const next = [...order];
      next.splice(oldIndex, 1);
      next.splice(newIndex, 0, active.id as string);
      return next;
    });
  }

  return (
    <div className="min-w-0 max-w-full rounded-md border bg-card overflow-auto" tabIndex={0} role="region" aria-label="Tabela de ações">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <table className="w-full text-sm" style={{ width: table.getTotalSize() }}>
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide">
            {table.getHeaderGroups().map((hg) => (
              <SortableContext
                key={hg.id}
                items={hg.headers.map((h) => h.column.id)}
                strategy={horizontalListSortingStrategy}
              >
                <tr>
                  {hg.headers.map((header) => (
                    <DraggableHeader key={header.id} headerId={header.column.id}>
                      <div
                        className="relative flex items-center gap-1 px-2 py-2"
                        style={{ width: header.getSize() }}
                      >
                        <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground" />
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 truncate text-left"
                          disabled={!header.column.getCanSort()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-transparent hover:bg-primary/40"
                        />
                      </div>
                    </DraggableHeader>
                  ))}
                </tr>
              </SortableContext>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-muted/30">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="truncate px-2 py-1.5"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  Sem ações para os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DndContext>
    </div>
  );
}

function DraggableHeader({ headerId, children }: { headerId: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: headerId,
  });
  return (
    <th
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}
      {...listeners}
      className="border-r last:border-r-0 align-top"
    >
      {children}
    </th>
  );
}

function InlineText({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <input
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      onBlur={() => v.trim() !== value && onSave(v.trim())}
      className="h-8 min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 text-sm hover:border-input focus:border-input focus:outline-none"
    />
  );
}
