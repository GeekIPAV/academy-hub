import { useMemo, useState } from "react";
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
import { ArrowUpDown, GripVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AcaoRow } from "@/lib/admin-acoes-gestao.functions";

interface Props {
  data: AcaoRow[];
  onOpen: (id: string) => void;
}

export function AcoesDataTable({ data, onOpen }: Props) {
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
        accessorKey: "category",
        header: "Categoria",
        size: 110,
        cell: (info) => {
          const v = info.getValue<string | null>();
          return v ? <Badge variant="outline">{v}</Badge> : "—";
        },
      },
      {
        accessorKey: "action_date",
        header: "Data",
        size: 120,
      },
      {
        accessorKey: "registration_status",
        header: "Inscrições",
        size: 120,
        cell: (info) => {
          const v = info.getValue<string | null>();
          return v ? <Badge variant="secondary">{v}</Badge> : "—";
        },
      },
      {
        accessorKey: "status",
        header: "Estado",
        size: 110,
      },
      {
        accessorKey: "max_capacity",
        header: "Capacidade",
        size: 110,
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
    [onOpen],
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
    <div className="rounded-md border bg-card overflow-auto">
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
