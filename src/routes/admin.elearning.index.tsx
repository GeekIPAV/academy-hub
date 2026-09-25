import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { RouteGate } from "@/components/RouteGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteCurso, listCursosAdmin, listOpcoesElearning, upsertCurso } from "@/lib/admin-elearning.functions";
import { MODALIDADE_LABEL } from "@/components/elearning/shared";

export const Route = createFileRoute("/admin/elearning/")({
  head: () => ({
    meta: [
      { title: "Gestão de E-learning — Academia Ubuntu" },
      { name: "description", content: "Criar e gerir cursos, módulos, turmas e inscritos da Escola Ubuntu Online." },
      { property: "og:title", content: "Gestão de E-learning — Academia Ubuntu" },
      { property: "og:description", content: "Criar e gerir cursos da Escola Ubuntu Online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RouteGate path="/admin/elearning">
      <AdminElearningPage />
    </RouteGate>
  ),
});

export const ESTADO_LABEL: Record<string, string> = { rascunho: "Rascunho", publicado: "Publicado", arquivado: "Arquivado" };
const TIPO_LABEL: Record<string, string> = {
  formacao_formadores: "Formação de Formadores",
  microcurso: "Microcurso",
  semana_ubuntu: "Semana Ubuntu",
  renovacao: "Renovação de badge",
};

function AdminElearningPage() {
  const listFn = useServerFn(listCursosAdmin);
  const optFn = useServerFn(listOpcoesElearning);
  const createFn = useServerFn(upsertCurso);
  const delFn = useServerFn(deleteCurso);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["admin-elearning", "cursos"], queryFn: () => listFn() });
  const { data: opts } = useQuery({ queryKey: ["admin-elearning", "opcoes"], queryFn: () => optFn() });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [modalidade, setModalidade] = useState<"autonomo" | "turma">("autonomo");
  const [cluster, setCluster] = useState("__none__");

  const create = useMutation({
    mutationFn: () => {
      const cl = opts?.clusters.find((c) => c.id === cluster);
      return createFn({
        data: {
          title,
          modalidade,
          estado: "rascunho",
          tipo: modalidade === "turma" ? "formacao_formadores" : "microcurso",
          tem_certificado: true,
          cluster_id: cl?.id ?? null,
          badge_entrada_id: cl?.formando_badge_id ?? null,
          badge_final_id: cl?.final_badge_id ?? null,
          nota_minima_quiz: 70,
          pct_minima_video: 90,
        },
      });
    },
    onSuccess: (r) => {
      toast.success("Curso criado.");
      qc.invalidateQueries({ queryKey: ["admin-elearning"] });
      navigate({ to: "/admin/elearning/$cursoId", params: { cursoId: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Curso eliminado."); qc.invalidateQueries({ queryKey: ["admin-elearning"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><GraduationCap className="h-6 w-6 text-primary" /> Gestão de E-learning</h1>
          <p className="text-sm text-muted-foreground">Cursos da Escola Ubuntu Online.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Criar curso</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Curso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Módulos</TableHead>
              <TableHead className="text-right">Inscritos</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">A carregar…</TableCell></TableRow>}
            {!isLoading && !data?.length && <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Ainda não há cursos.</TableCell></TableRow>}
            {data?.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate({ to: "/admin/elearning/$cursoId", params: { cursoId: c.id } })}>
                <TableCell>
                  <Link to="/admin/elearning/$cursoId" params={{ cursoId: c.id }} className="font-medium hover:underline">{c.title}</Link>
                  {c.cluster_name && <p className="text-xs text-muted-foreground">{c.cluster_name}</p>}
                </TableCell>
                <TableCell><Badge variant={c.estado === "publicado" ? "default" : "secondary"}>{ESTADO_LABEL[c.estado]}</Badge></TableCell>
                <TableCell>{MODALIDADE_LABEL[c.modalidade]}</TableCell>
                <TableCell className="text-sm">{TIPO_LABEL[c.tipo]}</TableCell>
                <TableCell className="text-right">{c.modulos}</TableCell>
                <TableCell className="text-right">{c.inscritos}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" aria-label="Eliminar curso" onClick={(e) => { e.stopPropagation(); if (confirm(`Eliminar "${c.title}"?`)) del.mutate(c.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar curso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-1">
              <Label>Modalidade</Label>
              <Select value={modalidade} onValueChange={(v) => setModalidade(v as "autonomo" | "turma")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="autonomo">Autónomo</SelectItem><SelectItem value="turma">Em turma</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cluster (opcional — herda os badges)</Label>
              <Select value={cluster} onValueChange={setCluster}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem cluster</SelectItem>
                  {opts?.clusters.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
