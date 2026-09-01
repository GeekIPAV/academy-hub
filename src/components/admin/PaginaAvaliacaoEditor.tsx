import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bold, GripVertical, Italic, List, ListOrdered, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { newRichTextBlock, newTableBlock, type PageBlock, type PageDoc, type RichTextContent } from "@/lib/avaliacao-types";

export function PaginaAvaliacaoEditor({ value, onChange }: { value: PageDoc; onChange: (value: PageDoc) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const update = (blocks: PageBlock[]) => onChange({ ...value, blocks });
  const add = (block: PageBlock) => update([...value.blocks, block]);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = value.blocks.findIndex((block) => block.id === active.id);
    const newIndex = value.blocks.findIndex((block) => block.id === over.id);
    if (oldIndex >= 0 && newIndex >= 0) update(arrayMove(value.blocks, oldIndex, newIndex));
  };
  const patch = (id: string, changes: Partial<PageBlock>) => update(value.blocks.map((block) => block.id === id ? { ...block, ...changes } : block));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => add(newRichTextBlock())}><Plus className="mr-1 h-4 w-4" /> Bloco de texto</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => add(newTableBlock())}><Plus className="mr-1 h-4 w-4" /> Tabela</Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value.blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {value.blocks.map((block) => <SortableBlock key={block.id} block={block} onPatch={(changes) => patch(block.id, changes)} onRemove={() => update(value.blocks.filter((item) => item.id !== block.id))} />)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableBlock({ block, onPatch, onRemove }: { block: PageBlock; onPatch: (changes: Partial<PageBlock>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className="group flex gap-2 rounded-md border bg-background p-3">
      <button type="button" {...attributes} {...listeners} className="mt-1 cursor-grab text-muted-foreground hover:text-foreground" aria-label="Arrastar bloco"><GripVertical className="h-4 w-4" /></button>
      <div className="min-w-0 flex-1">
        {block.type === "table" ? <TableEditor block={block} onPatch={onPatch} /> : <RichTextEditor value={block.content} onChange={(content) => onPatch({ content })} />}
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 opacity-0 group-hover:opacity-100" aria-label="Remover bloco"><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );
}

function TableEditor({ block, onPatch }: { block: PageBlock; onPatch: (changes: Partial<PageBlock>) => void }) {
  const headers = block.headers ?? ["Cabeçalho 1", "Cabeçalho 2"];
  const rows = block.rows ?? [["", ""]];
  const patchCell = (row: number, col: number, value: string) => {
    if (row === -1) onPatch({ headers: headers.map((cell, index) => index === col ? value : cell) });
    else onPatch({ rows: rows.map((line, lineIndex) => lineIndex === row ? line.map((cell, index) => index === col ? value : cell) : line) });
  };
  const addColumn = () => onPatch({ headers: [...headers, `Coluna ${headers.length + 1}`], rows: rows.map((row) => [...row, ""]) });
  const addRow = () => onPatch({ rows: [...rows, headers.map(() => "")] });
  return (
    <div className="space-y-2 overflow-x-auto">
      <p className="text-xs font-semibold text-muted-foreground">Tabela-resumo</p>
      <table className="w-full min-w-[520px] border-collapse text-sm"><thead><tr>{headers.map((cell, index) => <th key={index} className="border bg-muted p-1"><Input value={cell} onChange={(event) => patchCell(-1, index, event.target.value)} /></th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, colIndex) => <td key={colIndex} className="border p-1"><Input value={row[colIndex] ?? ""} onChange={(event) => patchCell(rowIndex, colIndex, event.target.value)} /></td>)}</tr>)}</tbody></table>
      <div className="flex gap-2"><Button type="button" size="sm" variant="ghost" onClick={addRow}>+ Linha</Button><Button type="button" size="sm" variant="ghost" onClick={addColumn}>+ Coluna</Button></div>
    </div>
  );
}

function RichTextEditor({ value, onChange }: { value: RichTextContent | undefined; onChange: (value: RichTextContent) => void }) {
  const editor = useEditor({ extensions: [StarterKit], content: value ?? { type: "doc", content: [{ type: "paragraph" }] }, onUpdate: ({ editor: current }) => onChange(current.getJSON() as RichTextContent) });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!editor) return null;
  return <div className="space-y-1"><div className="flex flex-wrap gap-1 border-b pb-1"><Button type="button" size="sm" variant={editor.isActive("bold") ? "default" : "ghost"} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Negrito" className="h-7 w-7 p-0"><Bold className="h-3.5 w-3.5" /></Button><Button type="button" size="sm" variant={editor.isActive("italic") ? "default" : "ghost"} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Itálico" className="h-7 w-7 p-0"><Italic className="h-3.5 w-3.5" /></Button><Button type="button" size="sm" variant={editor.isActive("bulletList") ? "default" : "ghost"} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Lista" className="h-7 w-7 p-0"><List className="h-3.5 w-3.5" /></Button><Button type="button" size="sm" variant={editor.isActive("orderedList") ? "default" : "ghost"} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Lista numerada" className="h-7 w-7 p-0"><ListOrdered className="h-3.5 w-3.5" /></Button><span className="ml-auto text-[10px] text-muted-foreground">{mounted ? "Texto rico" : ""}</span></div><EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:outline-none" /></div>;
}

export function renderRichText(content: unknown) {
  try { return generateHTML(content as Parameters<typeof generateHTML>[0], [StarterKit]); } catch { return ""; }
}

export function blockClassName(type: PageBlock["type"]) { return cn(type === "table" && "overflow-x-auto"); }
