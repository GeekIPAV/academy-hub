import { createFileRoute } from "@tanstack/react-router";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useApp, useResolvedWidgets } from "@/lib/app-context";
import { WIDGET_REGISTRY } from "@/lib/widget-registry";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Academia Ubuntu" }],
  }),
  component: DashboardPage,
});

function SortableWidget({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const Component = WIDGET_REGISTRY[id];
  if (!Component) return null;
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        {...attributes}
        {...listeners}
        aria-label="Arrastar widget"
        className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 hover:text-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Component />
    </div>
  );
}

function DashboardPage() {
  const { setUserWidgetOrder, activeRoles } = useApp();
  const widgets = useResolvedWidgets();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = widgets.indexOf(String(active.id));
    const newIdx = widgets.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    setUserWidgetOrder(arrayMove(widgets, oldIdx, newIdx));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A visualizar como{" "}
          <span className="font-medium text-foreground">{activeRoles.join(" + ")}</span>.
          Arraste os blocos para reorganizar.
        </p>
      </div>

      {widgets.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum widget atribuído aos seus papéis. Configure no Backoffice.
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={widgets} strategy={rectSortingStrategy}>
            <div className="grid gap-4 md:grid-cols-2">
              {widgets.map((id) => (
                <SortableWidget key={id} id={id} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
