import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteItem, listOpcoesElearning, upsertTurma } from "@/lib/admin-elearning.functions";

type Turma = {
  id: string;
  nome: string;
  data_inicio: string | null;
  data_fim: string | null;
  vagas: number | null;
  formador_id: string | null;
  inscricoes_abertas: boolean;
};

export function TurmasTab({ cursoId, turmas }: { cursoId: string; turmas: Turma[] }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertTurma);
  const delFn = useServerFn(deleteItem);
  const optFn = useServerFn(listOpcoesElearning);
  const { data: opts } = useQuery({ queryKey: ["admin-elearning", "opcoes"], queryFn: () => optFn() });
  const [edit, setEdit] = useState<Partial<Turma> | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-elearning", "curso", cursoId] });
  const save = useMutation({
    mutationFn: (t: Partial<Turma>) =>
      saveFn({
        data: {
          id: t.id,
          curso_id: cursoId,
          nome: t.nome ?? "",
          data_inicio: t.data_inicio || null,
          data_fim: t.data_fim || null,
          vagas: t.vagas ?? null,
          formador_id: t.formador_id ?? null,
          inscricoes_abertas: !!t.inscricoes_abertas,
        },
      }),
    onSuccess: () => { toast.success("Turma guardada."); setEdit(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { tabela: "cursos_turmas", id } }),
    onSuccess: () => { toast.success("Turma eliminada."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const formadorNome = (id: string | null) => opts?.formadores.find((f) => f.id === id)?.nome ?? "—";

  return (
    <Card className="space-y-3 p-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">Os módulos abrem por data a partir do início de cada turma.</p>
        <Button size="sm" onClick={() => setEdit({ inscricoes_abertas: false })}><Plus className="mr-1 h-4 w-4" /> Nova turma</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Turma</TableHead><TableHead>Datas</TableHead><TableHead>Vagas</TableHead><TableHead>Formador</TableHead><TableHead>Inscrições</TableHead><TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {!turmas.length && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Sem turmas.</TableCell></TableRow>}
          {turmas.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.nome}</TableCell>
              <TableCell className="text-sm">{t.data_inicio ?? "—"} → {t.data_fim ?? "—"}</TableCell>
              <TableCell>{t.vagas ?? "∞"}</TableCell>
              <TableCell className="text-sm">{formadorNome(t.formador_id)}</TableCell>
              <TableCell><Badge variant={t.inscricoes_abertas ? "default" : "secondary"}>{t.inscricoes_abertas ? "Abertas" : "Fechadas"}</Badge></TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" aria-label="Editar turma" onClick={() => setEdit(t)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Eliminar turma" onClick={() => confirm("Eliminar turma?") && del.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar turma" : "Nova turma"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>Nome</Label><Input value={edit.nome ?? ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Início</Label><Input type="date" value={edit.data_inicio ?? ""} onChange={(e) => setEdit({ ...edit, data_inicio: e.target.value })} /></div>
                <div className="space-y-1"><Label>Fim</Label><Input type="date" value={edit.data_fim ?? ""} onChange={(e) => setEdit({ ...edit, data_fim: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>Vagas (vazio = sem limite)</Label><Input type="number" min={1} value={edit.vagas ?? ""} onChange={(e) => setEdit({ ...edit, vagas: e.target.value ? Number(e.target.value) : null })} /></div>
              <div className="space-y-1">
                <Label>Formador responsável</Label>
                <Select value={edit.formador_id ?? "__none__"} onValueChange={(v) => setEdit({ ...edit, formador_id: v === "__none__" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem formador</SelectItem>
                    {opts?.formadores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!edit.inscricoes_abertas} onCheckedChange={(v) => setEdit({ ...edit, inscricoes_abertas: !!v })} /> Inscrições abertas</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button disabled={!edit?.nome?.trim() || save.isPending} onClick={() => edit && save.mutate(edit)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
