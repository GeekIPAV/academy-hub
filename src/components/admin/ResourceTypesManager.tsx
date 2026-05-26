import { useState } from "react";
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

export function ResourceTypesManager() {
  const qc = useQueryClient();
  const { data: types = [], isLoading } = useQuery({
    queryKey: ["resource-types"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any }).from("resource_types")
        .select("key, label, color, sort_order")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#64748b");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["resource-types"] });
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const key = newKey.trim().toLowerCase();
      const label = newLabel.trim();
      if (!key || !label) throw new Error("Chave e etiqueta são obrigatórias.");
      if (!/^[a-z0-9_-]+$/.test(key))
        throw new Error("Chave só pode ter letras minúsculas, números, _ ou -.");
      const nextOrder = (types.at(-1)?.sort_order ?? 0) + 10;
      const { error } = await (supabase as unknown as { from: (t: string) => any }).from("resource_types")
        .insert({ key, label, color: newColor, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipo adicionado.");
      setNewKey("");
      setNewLabel("");
      setNewColor("#64748b");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await (supabase as unknown as { from: (t: string) => any }).from("resource_types")
        .update({ label: row.label, color: row.color, sort_order: row.sort_order })
        .eq("key", row.key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipo atualizado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (key: string) => {
      const { count, error: cErr } = await supabase
        .from("recursos")
        .select("id", { count: "exact", head: true })
        .eq("resource_type", key);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error(
          `Este tipo está em uso por ${count} recurso(s). Muda-os primeiro.`,
        );
      }
      const { error } = await (supabase as unknown as { from: (t: string) => any }).from("resource_types")
        .delete()
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipo apagado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo tipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end"
          >
            <div className="space-y-1">
              <Label>Chave</Label>
              <Input
                placeholder="ex: ebook"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Etiqueta</Label>
              <Input
                placeholder="ex: eBook"
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
            A chave é guardada na base de dados (sem espaços). A etiqueta é o que
            aparece aos utilizadores.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipos existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : types.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sem tipos configurados.
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
                {types.map((t) => (
                  <EditableRow
                    key={t.key}
                    row={t}
                    onSave={(r) => updateMut.mutate(r)}
                    onDelete={() => deleteMut.mutate(t.key)}
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
                <AlertDialogTitle>Apagar tipo "{row.label}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Só vai funcionar se nenhum recurso usar este tipo.
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
