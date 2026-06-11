import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  GraduationCap,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CoverUploader } from "@/components/CoverUploader";
import {
  listProgramas,
  listProgramaEntidades,
  listProgramaParticipantes,
  setProgramaEnrollmentOpen,
  listClustersWithProgramas,
  upsertClusterAdmin,
  deleteClusterAdmin,
  createPrograma,
  bulkCreateClusters,
  bulkCreateProgramas,
  updateProgramaAdmin,
} from "@/lib/admin-programas.functions";
import { RouteGate } from "@/components/RouteGate";
import { slugifyCluster } from "@/lib/cluster-utils";

export const Route = createFileRoute("/admin/programas")({
  head: () => ({ meta: [{ title: "Gestão de Programas — Admin" }] }),
  component: () => (
    <RouteGate path="/admin/programas">
      <AdminProgramasPage />
    </RouteGate>
  ),
});

function currentAcademicYear(): string {
  const d = new Date();
  const m = d.getMonth() + 1; // 1-12
  const y = d.getFullYear();
  const start = m >= 8 ? y : y - 1;
  const end = start + 1;
  return `${String(start).slice(-2)}/${String(end).slice(-2)}`;
}

function AdminProgramasPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão de Programas</h1>
          <p className="text-sm text-muted-foreground">
            Visão centralizada de instituições, participantes e clusters.
          </p>
        </div>
      </div>

      <Tabs defaultValue="programas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="programas">
            <GraduationCap className="mr-2 h-4 w-4" />
            Programas
          </TabsTrigger>
          <TabsTrigger value="clusters">
            <Layers className="mr-2 h-4 w-4" />
            Clusters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="programas">
          <ProgramasSection />
        </TabsContent>
        <TabsContent value="clusters">
          <ClustersSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ================== Tab 1: Programas (existing UI) ==================

function ProgramasSection() {
  const fetchProgramas = useServerFn(listProgramas);
  const { data: programasRaw, isLoading: loadingProgramas, error: programasError } = useQuery({
    queryKey: ["admin-programas"],
    queryFn: () => fetchProgramas(),
    retry: false,
  });
  const programas = Array.isArray(programasRaw) ? programasRaw : [];

  const fetchClusters = useServerFn(listClustersWithProgramas);
  const { data: clustersRaw } = useQuery({
    queryKey: ["admin-programas-clusters"],
    queryFn: () => fetchClusters(),
    retry: false,
  });
  const clusters = useMemo(
    () => (Array.isArray(clustersRaw) ? clustersRaw.map((c) => ({ id: c.id, name: c.name })) : []),
    [clustersRaw],
  );

  const [programId, setProgramId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!programId && programas.length > 0) setProgramId(programas[0].id);
  }, [programas, programId]);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Programas</p>
            <p className="text-xs text-muted-foreground">Lista completa de programas registados.</p>
          </div>
          <Badge variant="secondary">{programas.length}</Badge>
        </div>
        {loadingProgramas ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <Tabs defaultValue="ativos">
            <TabsList>
              <TabsTrigger value="ativos">
                Ativos
                <Badge variant="secondary" className="ml-2">
                  {programas.filter((p) => p.is_active).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="geral">
                Geral
                <Badge variant="secondary" className="ml-2">{programas.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ativos">
              <ProgramasTable
                rows={programas.filter((p) => p.is_active)}
                clusters={clusters}
                selectedId={programId}
                onSelect={setProgramId}
              />
            </TabsContent>
            <TabsContent value="geral">
              <ProgramasTable
                rows={programas}
                clusters={clusters}
                selectedId={programId}
                onSelect={setProgramId}
              />
            </TabsContent>
          </Tabs>
        )}
      </Card>

      <Card className="p-4">
        <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Programa
        </Label>
        {loadingProgramas ? (
          <Skeleton className="h-10 max-w-md" />
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <Select value={programId ?? ""} onValueChange={(v) => setProgramId(v)}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Selecionar programa…" />
              </SelectTrigger>
              <SelectContent>
                {programas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title ?? "(sem título)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {programId && (
              <EnrollmentToggle
                programId={programId}
                open={!!programas.find((p) => p.id === programId)?.enrollment_open}
              />
            )}
          </div>
        )}
        {programasError && (
          <p className="mt-2 text-xs text-destructive">
            Não foi possível carregar programas ({(programasError as Error).message}).
          </p>
        )}
      </Card>

      {!programId ? (
        <EmptyState />
      ) : (
        <Tabs defaultValue="instituicoes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="instituicoes">
              <Building2 className="mr-2 h-4 w-4" />
              Instituições
            </TabsTrigger>
            <TabsTrigger value="participantes">
              <Users className="mr-2 h-4 w-4" />
              Participantes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instituicoes">
            <InstituicoesTab programId={programId} />
          </TabsContent>
          <TabsContent value="participantes">
            <ParticipantesTab programId={programId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ProgramasTable({
  rows,
  clusters,
  selectedId,
  onSelect,
}: {
  rows: Array<{ id: string; title: string | null; is_active: boolean | null; enrollment_open?: boolean | null; cluster_id?: string | null }>;
  clusters: Array<{ id: string; name: string }>;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum programa encontrado.
      </p>
    );
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px]">Título</TableHead>
            <TableHead className="min-w-[180px]">Cluster</TableHead>
            <TableHead className="w-40">Inscrições abertas</TableHead>
            <TableHead className="w-32">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <ProgramaRow
              key={p.id}
              p={p}
              clusters={clusters}
              selected={selectedId === p.id}
              onSelect={onSelect}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ProgramaRow({
  p,
  clusters,
  selected,
  onSelect,
}: {
  p: { id: string; title: string | null; is_active: boolean | null; enrollment_open?: boolean | null; cluster_id?: string | null };
  clusters: Array<{ id: string; name: string }>;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const qc = useQueryClient();
  const toggleFn = useServerFn(setProgramaEnrollmentOpen);
  const updateFn = useServerFn(updateProgramaAdmin);
  const [title, setTitle] = useState(p.title ?? "");
  useEffect(() => setTitle(p.title ?? ""), [p.title]);

  const patchLocal = (patch: Partial<typeof p>) => {
    qc.setQueryData<any[]>(["admin-programas"], (old) =>
      (old ?? []).map((r) => (r.id === p.id ? { ...r, ...patch } : r)),
    );
  };
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-programas"] });
    qc.invalidateQueries({ queryKey: ["admin-programas-clusters"] });
  };

  const toggle = useMutation({
    mutationFn: (open: boolean) => toggleFn({ data: { programId: p.id, open } }),
    onMutate: (open) => patchLocal({ enrollment_open: open }),
    onError: (e: Error) => {
      toast.error(e.message);
      invalidate();
    },
    onSettled: invalidate,
  });
  const update = useMutation({
    mutationFn: (vars: { title?: string; cluster_id?: string | null; is_active?: boolean }) =>
      updateFn({ data: { id: p.id, ...vars } }),
    onMutate: (vars) => patchLocal(vars),
    onError: (e: Error) => {
      toast.error(e.message);
      invalidate();
    },
    onSettled: invalidate,
  });

  return (
    <TableRow
      onClick={() => onSelect(p.id)}
      data-state={selected ? "selected" : undefined}
      className="cursor-pointer"
    >
      <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const t = title.trim();
            if (t && t !== (p.title ?? "")) update.mutate({ title: t });
          }}
          className="h-8"
        />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select
          value={p.cluster_id ?? "__none__"}
          onValueChange={(v) => update.mutate({ cluster_id: v === "__none__" ? null : v })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Selecionar cluster…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Nenhum</SelectItem>
            {clusters.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={!!p.enrollment_open}
          onCheckedChange={(v) => toggle.mutate(v === true)}
          aria-label="Inscrições abertas"
        />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select
          value={p.is_active ? "ativo" : "inativo"}
          onValueChange={(v) => update.mutate({ is_active: v === "ativo" })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}

function EnrollmentToggle({ programId, open }: { programId: string; open: boolean }) {
  const qc = useQueryClient();
  const toggleFn = useServerFn(setProgramaEnrollmentOpen);
  const m = useMutation({
    mutationFn: (vars: { programId: string; open: boolean }) => toggleFn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["admin-programas"] });
      const prev = qc.getQueryData<any[]>(["admin-programas"]);
      qc.setQueryData<any[]>(["admin-programas"], (old) =>
        (old ?? []).map((p) => (p.id === vars.programId ? { ...p, enrollment_open: vars.open } : p)),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-programas"], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-programas"] }),
  });
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
      <Switch
        checked={open}
        onCheckedChange={(v) => m.mutate({ programId, open: v })}
        aria-label="Inscrições abertas"
      />
      <span className="text-sm">
        Inscrições {open ? "abertas" : "fechadas"}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <GraduationCap className="h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm font-medium">Selecione um programa</p>
        <p className="text-xs text-muted-foreground">
          Escolha um programa no seletor acima para ver as instituições inscritas e os
          respetivos participantes.
        </p>
      </CardContent>
    </Card>
  );
}

function InstituicoesTab({ programId }: { programId: string }) {
  const fn = useServerFn(listProgramaEntidades);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-programa-entidades", programId],
    queryFn: () => fn({ data: { programId } }),
    retry: false,
  });
  const rows = Array.isArray(data) ? data : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Instituições inscritas</CardTitle>
            <CardDescription>Entidades associadas ao programa selecionado.</CardDescription>
          </div>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 text-sm text-destructive">
            Erro: {(error as Error).message}
          </p>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instituição</TableHead>
                <TableHead>Localidade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma instituição inscrita neste programa.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.cohort_id}>
                  <TableCell className="font-medium">{r.entity_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.entity_locality ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.is_active ? "default" : "outline"}>
                      {r.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ParticipantesTab({ programId }: { programId: string }) {
  const fn = useServerFn(listProgramaParticipantes);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-programa-participantes", programId],
    queryFn: () => fn({ data: { programId } }),
    retry: false,
  });
  const rows = Array.isArray(data) ? data : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Participantes</CardTitle>
            <CardDescription>
              Formandos inscritos em qualquer instituição deste programa.
            </CardDescription>
          </div>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 text-sm text-destructive">
            Erro: {(error as Error).message}
          </p>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Completo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Instituição</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Sem participantes inscritos neste programa.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.entity_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.status ?? "—"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ================== Tab 2: Clusters ==================

type ClusterRow = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  cover_position: string | null;
  cover_scale: number | null;
  sort_order: number | null;
  programs: Array<{
    id: string;
    title: string | null;
    is_active: boolean | null;
    enrollment_open: boolean | null;
    cluster_id: string | null;
  }>;
};

function ClustersSection() {
  const fetchFn = useServerFn(listClustersWithProgramas);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-programas-clusters"],
    queryFn: () => fetchFn(),
    retry: false,
  });
  const rows: ClusterRow[] = Array.isArray(data) ? (data as ClusterRow[]) : [];

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Clusters de programas</p>
          <p className="text-xs text-muted-foreground">
            Edita o nome, descrição e capa. Expande para ver e criar programas do cluster.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{rows.length}</Badge>
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            Adicionar em massa
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar cluster
          </Button>
        </div>
      </div>

      {error && (
        <p className="mb-2 text-sm text-destructive">Erro: {(error as Error).message}</p>
      )}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum cluster registado.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="min-w-[200px]">Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24">Capa</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <ClusterTableRow key={c.id} cluster={c} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddClusterDialog open={addOpen} onOpenChange={setAddOpen} />
      <BulkClustersDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </Card>
  );
}

function ClusterTableRow({ cluster }: { cluster: ClusterRow }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(cluster.name);
  const [description, setDescription] = useState(cluster.description ?? "");

  useEffect(() => {
    setName(cluster.name);
    setDescription(cluster.description ?? "");
  }, [cluster.name, cluster.description]);

  const upsertFn = useServerFn(upsertClusterAdmin);
  const deleteFn = useServerFn(deleteClusterAdmin);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-programas-clusters"] });
    qc.invalidateQueries({ queryKey: ["admin-programas"] });
  };

  const saveName = useMutation({
    mutationFn: () => upsertFn({ data: { id: cluster.id, name: name.trim() || cluster.name } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const saveDescription = useMutation({
    mutationFn: () =>
      upsertFn({
        data: { id: cluster.id, name: cluster.name, description: description.trim() || null },
      }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const saveCover = useMutation({
    mutationFn: (vars: { cover_url?: string | null; cover_position?: string; cover_scale?: number }) =>
      upsertFn({ data: { id: cluster.id, name: cluster.name, ...vars } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const removeCluster = useMutation({
    mutationFn: () => deleteFn({ data: { id: cluster.id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <TableRow>
        <TableCell>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-1 hover:bg-muted"
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </TableCell>
        <TableCell className="min-w-[200px]">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim() && name.trim() !== cluster.name) saveName.mutate();
            }}
            className="h-8 w-full"
          />
        </TableCell>
        <TableCell>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if ((description.trim() || null) !== (cluster.description ?? null)) {
                saveDescription.mutate();
              }
            }}
            placeholder="Sem descrição"
            className="h-8"
          />
        </TableCell>
        <TableCell className="w-24">
          <CoverUploader
            folder="clusters"
            id={slugifyCluster(cluster.name) || cluster.id}
            currentUrl={cluster.cover_url}
            variant="inline"
            position={cluster.cover_position}
            scale={cluster.cover_scale ?? undefined}
            onUploaded={async (url) => {
              await saveCover.mutateAsync({ cover_url: url });
            }}
            onCleared={async () => {
              await saveCover.mutateAsync({ cover_url: null });
            }}
            onAdjusted={async (pos, sc) => {
              await saveCover.mutateAsync({ cover_position: pos, cover_scale: sc });
            }}
            aspectRatio={16 / 9}
          />
        </TableCell>
        <TableCell>
          <button
            type="button"
            onClick={() => {
              if (cluster.programs.length > 0) {
                toast.error("Remove primeiro os programas deste cluster.");
                return;
              }
              if (confirm(`Eliminar o cluster "${cluster.name}"?`)) removeCluster.mutate();
            }}
            className="rounded p-1 text-destructive hover:bg-destructive/10"
            aria-label="Eliminar cluster"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30">
            <ClusterProgramsPanel cluster={cluster} onChanged={invalidate} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ClusterProgramsPanel({
  cluster,
  onChanged,
}: {
  cluster: ClusterRow;
  onChanged: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  return (
    <div className="space-y-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Programas do cluster</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            Adicionar em massa
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Criar programa
          </Button>
        </div>
      </div>

      {cluster.programs.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sem programas neste cluster.
        </p>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-40">Inscrições</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cluster.programs.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title ?? "(sem título)"}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "outline"}>
                      {p.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.enrollment_open ? "default" : "outline"}>
                      {p.enrollment_open ? "Abertas" : "Fechadas"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddProgramaDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        clusterId={cluster.id}
        defaultTitle={`${cluster.name} ${currentAcademicYear()}`}
        onCreated={onChanged}
      />
      <BulkProgramasDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        clusterId={cluster.id}
        clusterName={cluster.name}
        onCreated={onChanged}
      />
    </div>
  );
}

// ================== Dialogs ==================

function AddClusterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const upsertFn = useServerFn(upsertClusterAdmin);
  const m = useMutation({
    mutationFn: () =>
      upsertFn({ data: { name: name.trim(), description: description.trim() || null } }),
    onSuccess: () => {
      toast.success("Cluster criado.");
      qc.invalidateQueries({ queryKey: ["admin-programas-clusters"] });
      setName("");
      setDescription("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar cluster</DialogTitle>
          <DialogDescription>Cria um novo cluster de programas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cl-name">Nome</Label>
            <Input id="cl-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cl-desc">Descrição</Label>
            <Textarea
              id="cl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!name.trim() || m.isPending} onClick={() => m.mutate()}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkClustersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bulkFn = useServerFn(bulkCreateClusters);
  const names = useMemo(
    () =>
      text
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [text],
  );
  const m = useMutation({
    mutationFn: () => bulkFn({ data: { names } }),
    onSuccess: (r) => {
      toast.success(`${r.inserted} clusters criados.`);
      qc.invalidateQueries({ queryKey: ["admin-programas-clusters"] });
      setText("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar clusters em massa</DialogTitle>
          <DialogDescription>
            Um nome por linha. {names.length} será(ão) criado(s).
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"Cluster A\nCluster B\nCluster C"}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={names.length === 0 || m.isPending} onClick={() => m.mutate()}>
            Criar {names.length || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddProgramaDialog({
  open,
  onOpenChange,
  clusterId,
  defaultTitle,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clusterId: string;
  defaultTitle: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  useEffect(() => {
    if (open) setTitle(defaultTitle);
  }, [open, defaultTitle]);
  const createFn = useServerFn(createPrograma);
  const m = useMutation({
    mutationFn: () => createFn({ data: { title: title.trim(), cluster_id: clusterId } }),
    onSuccess: () => {
      toast.success("Programa criado.");
      onCreated();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar programa</DialogTitle>
          <DialogDescription>O programa fica ativo por defeito.</DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="pg-title">Título</Label>
          <Input id="pg-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!title.trim() || m.isPending} onClick={() => m.mutate()}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkProgramasDialog({
  open,
  onOpenChange,
  clusterId,
  clusterName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clusterId: string;
  clusterName: string;
  onCreated: () => void;
}) {
  const ay = currentAcademicYear();
  const [text, setText] = useState("");
  const bulkFn = useServerFn(bulkCreateProgramas);
  const titles = useMemo(
    () =>
      text
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [text],
  );
  const m = useMutation({
    mutationFn: () => bulkFn({ data: { cluster_id: clusterId, titles } }),
    onSuccess: (r) => {
      toast.success(`${r.inserted} programas criados.`);
      onCreated();
      setText("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar programas em massa</DialogTitle>
          <DialogDescription>
            Um título por linha. Sugestão por defeito: <code>{clusterName} {ay}</code>.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={`${clusterName} ${ay}\n${clusterName} ${ay} — turma B`}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={titles.length === 0 || m.isPending} onClick={() => m.mutate()}>
            Criar {titles.length || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
