import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bold, GripVertical, ImagePlus, Italic, List, ListOrdered, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JsonValue } from "@/lib/admin-acoes-gestao.functions";

export interface PageBlock {
  id: string;
  type: "richtext" | "image";
  content?: unknown; // tiptap doc JSON for richtext
  url?: string; // for image
  alt?: string;
}

export interface PageDoc {
  blocks: PageBlock[];
}

function isPageDoc(v: unknown): v is PageDoc {
  return !!v && typeof v === "object" && Array.isArray((v as PageDoc).blocks);
}

export function loadDoc(value: JsonValue | null | undefined): PageDoc {
  if (isPageDoc(value)) return value;
  return {
    blocks: [
      {
        id: cryptoRandom(),
        type: "richtext",
        content: { type: "doc", content: [{ type: "paragraph" }] },
      },
    ],
  };
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}

interface Props {
  value: PageDoc;
  onChange: (v: PageDoc) => void;
}

export function PaginaInscricaoEditor({ value, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function update(blocks: PageBlock[]) {
    onChange({ ...value, blocks });
  }

  function addRichtext() {
    update([
      ...value.blocks,
      {
        id: cryptoRandom(),
        type: "richtext",
        content: { type: "doc", content: [{ type: "paragraph" }] },
      },
    ]);
  }

  function addImage() {
    const url = window.prompt("URL da imagem:");
    if (!url) return;
    update([...value.blocks, { id: cryptoRandom(), type: "image", url, alt: "" }]);
  }

  function removeBlock(id: string) {
    update(value.blocks.filter((b) => b.id !== id));
  }

  function patchBlock(id: string, patch: Partial<PageBlock>) {
    update(value.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = value.blocks.findIndex((b) => b.id === active.id);
    const newIdx = value.blocks.findIndex((b) => b.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    update(arrayMove(value.blocks, oldIdx, newIdx));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRichtext}>
          + Parágrafo
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addImage}>
          <ImagePlus className="mr-1 h-3.5 w-3.5" /> Imagem
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {value.blocks.map((b) => (
              <SortableBlock
                key={b.id}
                block={b}
                onRemove={() => removeBlock(b.id)}
                onPatch={(p) => patchBlock(b.id, p)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* CTA mockup — não removível */}
      <div className="mt-6 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center">
        <Button size="lg" disabled className="pointer-events-none cursor-not-allowed opacity-100">
          Inscrever-me
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Botão fixo — onde o utilizador preenche os dados de inscrição.
        </p>
      </div>
    </div>
  );
}

function SortableBlock({
  block,
  onRemove,
  onPatch,
}: {
  block: PageBlock;
  onRemove: () => void;
  onPatch: (p: Partial<PageBlock>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group flex gap-2 rounded-md border bg-background p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Arrastar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        {block.type === "richtext" ? (
          <RichTextEditor
            value={block.content}
            onChange={(c) => onPatch({ content: c })}
          />
        ) : (
          <div className="space-y-2">
            {block.url && (
              <img
                src={block.url}
                alt={block.alt ?? ""}
                className="max-h-72 rounded border object-contain"
              />
            )}
            <Input
              value={block.url ?? ""}
              placeholder="URL da imagem"
              onChange={(e) => onPatch({ url: e.target.value })}
            />
            <Input
              value={block.alt ?? ""}
              placeholder="Texto alternativo"
              onChange={(e) => onPatch({ alt: e.target.value })}
            />
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-8 w-8 opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

function RichTextEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: (value as object) ?? "",
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  // keep in sync if value changes externally
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!editor) return null;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1 border-b pb-1">
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("bold") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-7 w-7 p-0"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("italic") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-7 w-7 p-0"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("bulletList") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="h-7 w-7 p-0"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("orderedList") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-7 w-7 p-0"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {mounted ? "Tip: usa emojis 🎉 directamente" : ""}
        </span>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:min-h-[60px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
