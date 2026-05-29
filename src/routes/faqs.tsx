import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { GripVertical, Plus, Pencil, Trash2, Save, Loader2, X } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

export const Route = createFileRoute("/faqs")({
  head: () => ({ meta: [{ title: "FAQs — Academia Ubuntu" }] }),
  component: FaqsPage,
});

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

function FaqsPage() {
  const { isAdmin } = useApp();
  const [items, setItems] = useState<FaqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<FaqRow | null>(null);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("faqs")
      .select("id, question, answer, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
    } else {
      setItems((data ?? []) as FaqRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const originalOrder = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.id).join(","),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading],
  );
  const currentOrder = items.map((i) => i.id).join(",");
  const dirty = isAdmin && currentOrder !== originalOrder;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setItems((prev) => arrayMove(prev, oldIdx, newIdx));
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      for (let i = 0; i < items.length; i++) {
        const { error } = await supabase
          .from("faqs")
          .update({ sort_order: i * 10 })
          .eq("id", items[i].id);
        if (error) throw error;
      }
      toast.success("Ordem guardada");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSavingOrder(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ question: "", answer: "" });
    setEditOpen(true);
  };

  const openEdit = (f: FaqRow) => {
    setEditing(f);
    setForm({ question: f.question, answer: f.answer });
    setEditOpen(true);
  };

  const saveFaq = async () => {
    if (!form.question.trim() || !stripHtml(form.answer)) {
      toast.error("Preenche pergunta e resposta");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("faqs")
          .update({ question: form.question.trim(), answer: form.answer })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("FAQ atualizada");
      } else {
        const nextOrder = items.length ? Math.max(...items.map((i) => i.sort_order)) + 10 : 0;
        const { error } = await supabase.from("faqs").insert({
          question: form.question.trim(),
          answer: form.answer,
          sort_order: nextOrder,
        });
        if (error) throw error;
        toast.success("FAQ criada");
      }
      setEditOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const removeFaq = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("faqs").delete().eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("FAQ eliminada");
      setDeleteId(null);
      await load();
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">FAQs</h1>
          <p className="text-muted-foreground text-sm">Perguntas frequentes.</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" />
            Nova FAQ
          </Button>
        )}
      </div>

      {dirty && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={savingOrder}>
            Cancelar
          </Button>
          <Button size="sm" onClick={saveOrder} disabled={savingOrder}>
            {savingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar ordem
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Ainda não existem FAQs.</p>
      ) : isAdmin ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((f) => (
                <SortableFaq key={f.id} faq={f} onEdit={() => openEdit(f)} onDelete={() => setDeleteId(f.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {items.map((f) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
              <AccordionContent className="whitespace-pre-wrap text-muted-foreground">
                {f.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar FAQ" : "Nova FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Pergunta</label>
              <Input
                value={form.question}
                onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
                placeholder="Qual é a tua pergunta?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Resposta</label>
              <Textarea
                value={form.answer}
                onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
                rows={6}
                placeholder="Resposta detalhada"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={saveFaq} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar FAQ?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removeFaq}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableFaq({
  faq,
  onEdit,
  onDelete,
}: {
  faq: FaqRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: faq.id,
  });
  const [open, setOpen] = useState(false);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-md bg-card">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          aria-label="Arrastar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 text-left font-medium hover:underline"
        >
          {faq.question}
        </button>
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Eliminar">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {open && (
        <div className="px-3 pb-3 pl-10 whitespace-pre-wrap text-sm text-muted-foreground">
          {faq.answer}
        </div>
      )}
    </div>
  );
}
