import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

interface Row {
  key: string;
  label: string;
  color: string;
  sort_order: number;
}

function slugifyLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

export function ResourceCategoriesManager() {
  const qc = useQueryClient();
  const { data: cats = [], isLoading } = useQuery({
    queryKey: ["resource-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any })
        .from("resource_categories")
        .select("key, label, color, sort_order")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#64748b");
  const generatedKey = useMemo(() => slugifyLabel(newLabel), [newLabel]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["resource-categories"] });
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const key = generatedKey;
      const label = newLabel.trim();
      if (!key || !label) throw new Error("Etiqueta é obrigatória.");
      const nextOrder = (cats.at(-1)?.sort_order ?? 0) + 10;
      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from("resource_categories")
        .insert({ key, label, color: newColor, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria adicionada.");
      setNewLabel("");
      setNewColor("#64748b");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from("resource_categories")
        .update({ label: row.label, color: row.color, sort_order: row.sort_order })
        .eq("key", row.key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria atualizada.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (key: string) => {
      const { count, error: cErr } = await supabase
        .from("recursos")
        .select("id", { count: "exact", head: true })
        .eq("category_key" as never, key as never);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error(
          `Esta categoria está em uso por ${count} recurso(s). Muda-os primeiro.`,
        );
      }
      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from("resource_categories")
        .delete()
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria apagada.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nova categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
            className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end"
          >
            <div className="space-y-1">
              <Label>Etiqueta</Label>
              <Input
                placeholder="ex: Liderança"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Cor</Label>
              <Input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-10 p-1"
              />
            </div>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            {generatedKey ? (
              <>Chave gerada: <code className="font-mono text-xs">{generatedKey}</code></>
            ) : (
              "Escreve uma etiqueta para ver a chave gerada."
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorias existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : cats.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sem categorias configuradas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chave</TableHead>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead className="w-24">Cor</TableHead>
                  <TableHead className="w-24">Ordem</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cats.map((c) => (
                  <EditableRow
                    key={c.key}
                    row={c}
                    onSave={(r) => updateMut.mutate(r)}
                    onDelete={() => deleteMut.mutate(c.key)}
                    isSaving={updateMut.isPending}
                    isDeleting={deleteMut.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditableRow({
  row,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  row: Row;
  onSave: (r: Row) => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const [label, setLabel] = useState(row.label);
  const [color, setColor] = useState(row.color);
  const [order, setOrder] = useState(row.sort_order);
  const dirty =
    label !== row.label || color !== row.color || order !== row.sort_order;

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{row.key}</TableCell>
      <TableCell>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} />
      </TableCell>
      <TableCell>
        <Input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-16 p-1"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          className="w-20"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            disabled={!dirty || isSaving}
            onClick={() => onSave({ ...row, label, color, sort_order: order })}
            title="Guardar"
          >
            <Save className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                disabled={isDeleting}
                title="Apagar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar categoria "{row.label}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Só vai funcionar se nenhum recurso usar esta categoria.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Apagar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
