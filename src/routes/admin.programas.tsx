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
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PdfUploader } from "@/components/PdfUploader";
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
  deletePrograma,
  PROGRAMA_STATUS,
  type ProgramaAdminRow,
} from "@/lib/admin-programas.functions";
import { listProdutos } from "@/lib/produtos.functions";

import { listAllBadges } from "@/lib/badges.functions";
import { RouteGate } from "@/components/RouteGate";
import { slugifyCluster } from "@/lib/cluster-utils";

export const Route = createFileRoute("/admin/programas")({
  head: () => ({
    meta: [
      { title: "Gestão de Programas — Academia de Líderes Ubuntu" },
      {
        name: "description",
        content: "Área administrativa para editar programas, instituições inscritas e participantes.",
      },
      { property: "og:title", content: "Gestão de Programas — Academia de Líderes Ubuntu" },
      {
        property: "og:description",
        content: "Área administrativa para editar programas, instituições inscritas e participantes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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

  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={open}
          >
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
            />
            <span>
              <span className="block text-sm font-medium">Programas</span>
              <span className="block text-xs text-muted-foreground">
                Lista completa de programas registados.
              </span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{programas.length}</Badge>
            <ProgramaFormDialog mode="create" clusters={clusters} />
          </div>
        </div>

        {programasError && (
          <p className="mb-3 text-xs text-destructive">
            Não foi possível carregar programas ({(programasError as Error).message}).
          </p>
        )}

        {open &&
          (loadingProgramas ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Tabs defaultValue="ativos" className="space-y-3">
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
              />
            </TabsContent>
            <TabsContent value="geral">
              <ProgramasTable
                rows={programas}
                clusters={clusters}
              />
            </TabsContent>
          </Tabs>
          )
        )}
      </Card>
    </div>
  );
}

function ProgramasTable({
  rows,
  clusters,
}: {
  rows: ProgramaAdminRow[];
  clusters: Array<{ id: string; name: string }>;
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
            <TableHead className="w-10" />
            <TableHead className="min-w-[240px]">Programa</TableHead>
            <TableHead className="w-36">Estado</TableHead>
            <TableHead className="w-44">Datas</TableHead>
            <TableHead className="w-40">Cluster</TableHead>
            <TableHead className="w-28">Produtos</TableHead>
            <TableHead className="w-32">Inscrições abertas</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <ProgramaRow
              key={p.id}
              p={p}
              clusters={clusters}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return v.split("-").reverse().join("/");
}

function ProgramaRow({
  p,
  clusters,
}: {
  p: ProgramaAdminRow;
  clusters: Array<{ id: string; name: string }>;
}) {
  const qc = useQueryClient();
  const toggleFn = useServerFn(setProgramaEnrollmentOpen);
  const deleteFn = useServerFn(deletePrograma);
  const updateFn = useServerFn(updateProgramaAdmin);
  const [expanded, setExpanded] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-programas"] });
    qc.invalidateQueries({ queryKey: ["admin-programas-clusters"] });
  };
  const patchLocal = (patch: Partial<ProgramaAdminRow>) => {
    qc.setQueryData<ProgramaAdminRow[]>(["admin-programas"], (old) =>
      (old ?? []).map((r) => (r.id === p.id ? { ...r, ...patch } : r)),
    );
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
  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { id: p.id } }),
    onSuccess: () => {
      toast.success("Programa eliminado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const changeStatus = useMutation({
    mutationFn: (status: (typeof PROGRAMA_STATUS)[number]) =>
      updateFn({ data: { id: p.id, status } }),
    onMutate: (status) => patchLocal({ status, is_active: status === "Ativo" }),
    onError: (e: Error) => {
      toast.error(e.message);
      invalidate();
    },
    onSettled: invalidate,
  });

  const clusterName = clusters.find((c) => c.id === p.cluster_id)?.name ?? "—";

  return (
    <>
      <TableRow
        onClick={() => setExpanded((v) => !v)}
        data-state={expanded ? "selected" : undefined}
        className="cursor-pointer"
      >
        <TableCell>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            aria-label={expanded ? "Recolher programa" : "Abrir programa"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          {p.title ?? "(sem título)"}
          <div className="mt-0.5 flex flex-wrap gap-1">
            {p.certificacao && (
              <Badge variant="outline" className="text-[10px]">Certificação</Badge>
            )}
            {p.acreditacao && (
              <Badge variant="outline" className="text-[10px]">Acreditação</Badge>
            )}
          </div>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Select
            value={p.status ?? "Não começado"}
            onValueChange={(v) => changeStatus.mutate(v as (typeof PROGRAMA_STATUS)[number])}
            disabled={changeStatus.isPending}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROGRAMA_STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {fmtDate(p.date_start)} → {fmtDate(p.date_end)}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{clusterName}</TableCell>
        <TableCell>
          <Badge variant="secondary">{p.produto_ids.length}</Badge>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={!!p.enrollment_open}
            onCheckedChange={(v) => toggle.mutate(v === true)}
            aria-label="Inscrições abertas"
          />
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              if (confirm(`Eliminar o programa "${p.title ?? ""}"?`)) remove.mutate();
            }}
            aria-label="Eliminar programa"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/20 p-0">
            <div className="px-4 py-4">
              <Tabs defaultValue="editar" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="editar">
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </TabsTrigger>
                  <TabsTrigger value="instituicoes">
                    <Building2 className="mr-2 h-4 w-4" />
                    Instituições
                  </TabsTrigger>
                  <TabsTrigger value="participantes">
                    <Users className="mr-2 h-4 w-4" />
                    Participantes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="editar">
                  <ProgramaInlineEditor programa={p} clusters={clusters} />
                </TabsContent>
                <TabsContent value="instituicoes">
                  <InstituicoesTab programId={p.id} />
                </TabsContent>
                <TabsContent value="participantes">
                  <ParticipantesTab programId={p.id} />
                </TabsContent>
              </Tabs>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ProgramaInlineEditor({
  programa,
  clusters,
}: {
  programa: ProgramaAdminRow;
  clusters: Array<{ id: string; name: string }>;
}) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateProgramaAdmin);
  const fetchProdutos = useServerFn(listProdutos);
  const { data: produtos } = useQuery({
    queryKey: ["produtos-catalogo"],
    queryFn: () => fetchProdutos(),
    retry: false,
  });

  const NONE = "__none__";
  const [title, setTitle] = useState(programa.title ?? "");
  const [status, setStatus] = useState<string>(programa.status ?? "Não começado");
  const [dateStart, setDateStart] = useState(programa.date_start ?? "");
  const [dateEnd, setDateEnd] = useState(programa.date_end ?? "");
  const [certificacao, setCertificacao] = useState(!!programa.certificacao);
  const [acreditacao, setAcreditacao] = useState(!!programa.acreditacao);
  const [email, setEmail] = useState(programa.email_contacto_ipav ?? "");
  const [cluster, setCluster] = useState<string>(programa.cluster_id ?? NONE);
  const [produtoIds, setProdutoIds] = useState<string[]>(programa.produto_ids ?? []);

  useEffect(() => {
    setTitle(programa.title ?? "");
    setStatus(programa.status ?? "Não começado");
    setDateStart(programa.date_start ?? "");
    setDateEnd(programa.date_end ?? "");
    setCertificacao(!!programa.certificacao);
    setAcreditacao(!!programa.acreditacao);
    setEmail(programa.email_contacto_ipav ?? "");
    setCluster(programa.cluster_id ?? NONE);
    setProdutoIds(programa.produto_ids ?? []);
  }, [programa]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-programas"] });
    qc.invalidateQueries({ queryKey: ["admin-programas-clusters"] });
  };

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id: programa.id,
          title: title.trim(),
          status: status as (typeof PROGRAMA_STATUS)[number],
          date_start: dateStart || null,
          date_end: dateEnd || null,
          certificacao,
          acreditacao,
          email_contacto_ipav: email.trim() || null,
          cluster_id: cluster === NONE ? null : cluster,
          produto_ids: produtoIds,
        },
      }),
    onSuccess: () => {
      toast.success("Programa atualizado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleProduto = (id: string) =>
    setProdutoIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="space-y-4">
        <div>
          <Label htmlFor={`pi-title-${programa.id}`}>Título</Label>
          <Input
            id={`pi-title-${programa.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROGRAMA_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`pi-d1-${programa.id}`}>Data de início</Label>
            <Input
              id={`pi-d1-${programa.id}`}
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`pi-d2-${programa.id}`}>Data de fim</Label>
            <Input
              id={`pi-d2-${programa.id}`}
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Cluster (opcional)</Label>
            <Select value={cluster} onValueChange={setCluster}>
              <SelectTrigger>
                <SelectValue placeholder="Sem cluster" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem cluster</SelectItem>
                {clusters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`pi-email-${programa.id}`}>Email de contacto IPAV</Label>
            <Input
              id={`pi-email-${programa.id}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={certificacao}
              onCheckedChange={(v) => setCertificacao(v === true)}
            />
            Certificação
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={acreditacao}
              onCheckedChange={(v) => setAcreditacao(v === true)}
            />
            Acreditação
          </label>
        </div>

        <div>
          <Label className="mb-2 block">
            Produtos{" "}
            <span className="text-xs text-muted-foreground">
              ({produtoIds.length} selecionado(s))
            </span>
          </Label>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
            {(produtos ?? []).map((pr) => (
              <label
                key={pr.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={produtoIds.includes(pr.id)}
                  onCheckedChange={() => toggleProduto(pr.id)}
                />
                <span className="flex-1">{pr.name}</span>
                {pr.tipo && (
                  <Badge variant="outline" className="text-[10px]">
                    {pr.tipo}
                  </Badge>
                )}
              </label>
            ))}
            {(produtos ?? []).length === 0 && (
              <p className="p-2 text-xs text-muted-foreground">Catálogo vazio.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button disabled={!title.trim() || save.isPending} onClick={() => save.mutate()}>
          Guardar alterações
        </Button>
      </div>
    </div>
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
  info_pdf_url: string | null;
  formando_badge_id: string | null;
  final_badge_id: string | null;
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
                <TableHead className="w-48">PDF informativo</TableHead>
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
    mutationFn: (vars: { cover_url?: string | null; cover_position?: string; cover_scale?: number; info_pdf_url?: string | null }) =>
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
        <TableCell className="w-48">
          <PdfUploader
            folder="clusters-pdf"
            id={slugifyCluster(cluster.name) || cluster.id}
            currentUrl={cluster.info_pdf_url}
            onUploaded={async (url) => {
              await saveCover.mutateAsync({ info_pdf_url: url });
            }}
            onCleared={async () => {
              await saveCover.mutateAsync({ info_pdf_url: null });
            }}
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
          <TableCell colSpan={6} className="bg-muted/30">
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

  const fetchBadges = useServerFn(listAllBadges);
  const { data: allBadges } = useQuery({
    queryKey: ["admin-all-badges"],
    queryFn: () => fetchBadges(),
    retry: false,
  });
  const clusterBadges = useMemo(
    () => (allBadges ?? []).filter((b) => b.cluster_id === cluster.id),
    [allBadges, cluster.id],
  );

  const upsertFn = useServerFn(upsertClusterAdmin);
  const saveBadge = useMutation({
    mutationFn: (vars: { formando_badge_id?: string | null; final_badge_id?: string | null }) =>
      upsertFn({ data: { id: cluster.id, name: cluster.name, ...vars } }),
    onSuccess: () => {
      toast.success("Badge atualizado.");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const NONE = "__none__";

  return (
    <div className="space-y-3 py-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Badge de formando (em formação)</Label>
          <Select
            value={cluster.formando_badge_id ?? NONE}
            onValueChange={(v) =>
              saveBadge.mutate({ formando_badge_id: v === NONE ? null : v })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sem badge" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sem badge</SelectItem>
              {clusterBadges.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Badge final (formação concluída)</Label>
          <Select
            value={cluster.final_badge_id ?? NONE}
            onValueChange={(v) =>
              saveBadge.mutate({ final_badge_id: v === NONE ? null : v })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sem badge" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sem badge</SelectItem>
              {clusterBadges.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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

// ================== Formulário completo de programa ==================

function ProgramaFormDialog({
  mode,
  programa,
  clusters,
  clusterId,
}: {
  mode: "create" | "edit";
  programa?: ProgramaAdminRow;
  clusters: Array<{ id: string; name: string }>;
  clusterId?: string | null;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const createFn = useServerFn(createPrograma);
  const updateFn = useServerFn(updateProgramaAdmin);
  const fetchProdutos = useServerFn(listProdutos);
  const { data: produtos } = useQuery({
    queryKey: ["produtos-catalogo"],
    queryFn: () => fetchProdutos(),
    retry: false,
    enabled: open,
  });

  const NONE = "__none__";
  const [title, setTitle] = useState(programa?.title ?? "");
  const [status, setStatus] = useState<string>(programa?.status ?? "Não começado");
  const [dateStart, setDateStart] = useState(programa?.date_start ?? "");
  const [dateEnd, setDateEnd] = useState(programa?.date_end ?? "");
  const [certificacao, setCertificacao] = useState(!!programa?.certificacao);
  const [acreditacao, setAcreditacao] = useState(!!programa?.acreditacao);
  const [email, setEmail] = useState(programa?.email_contacto_ipav ?? "");
  const [cluster, setCluster] = useState<string>(programa?.cluster_id ?? clusterId ?? NONE);
  const [produtoIds, setProdutoIds] = useState<string[]>(programa?.produto_ids ?? []);

  useEffect(() => {
    if (!open) return;
    setTitle(programa?.title ?? "");
    setStatus(programa?.status ?? "Não começado");
    setDateStart(programa?.date_start ?? "");
    setDateEnd(programa?.date_end ?? "");
    setCertificacao(!!programa?.certificacao);
    setAcreditacao(!!programa?.acreditacao);
    setEmail(programa?.email_contacto_ipav ?? "");
    setCluster(programa?.cluster_id ?? clusterId ?? NONE);
    setProdutoIds(programa?.produto_ids ?? []);
  }, [open, programa, clusterId]);

  const payload = () => ({
    title: title.trim(),
    status: status as (typeof PROGRAMA_STATUS)[number],
    date_start: dateStart || null,
    date_end: dateEnd || null,
    certificacao,
    acreditacao,
    email_contacto_ipav: email.trim() || null,
    cluster_id: cluster === NONE ? null : cluster,
    produto_ids: produtoIds,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-programas"] });
    qc.invalidateQueries({ queryKey: ["admin-programas-clusters"] });
  };

  const save = useMutation({
    mutationFn: () =>
      mode === "create"
        ? createFn({ data: payload() })
        : updateFn({ data: { id: programa!.id, ...payload() } }),
    onSuccess: () => {
      toast.success(mode === "create" ? "Programa criado." : "Programa atualizado.");
      invalidate();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleProduto = (id: string) =>
    setProdutoIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Criar programa
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => setOpen(true)}
          aria-label="Editar programa"
        >
          Editar
        </Button>
      )}
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Criar programa" : "Editar programa"}</DialogTitle>
          <DialogDescription>
            O cluster é opcional. Os produtos vêm do catálogo partilhado com as ações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="pf-title">Título</Label>
            <Input id="pf-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAMA_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pf-d1">Data de início</Label>
              <Input
                id="pf-d1"
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pf-d2">Data de fim</Label>
              <Input
                id="pf-d2"
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Cluster (opcional)</Label>
              <Select value={cluster} onValueChange={setCluster}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem cluster" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem cluster</SelectItem>
                  {clusters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pf-email">Email de contacto IPAV</Label>
              <Input
                id="pf-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={certificacao}
                onCheckedChange={(v) => setCertificacao(v === true)}
              />
              Certificação
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={acreditacao}
                onCheckedChange={(v) => setAcreditacao(v === true)}
              />
              Acreditação
            </label>
          </div>

          <div>
            <Label className="mb-2 block">
              Produtos{" "}
              <span className="text-xs text-muted-foreground">
                ({produtoIds.length} selecionado(s))
              </span>
            </Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
              {(produtos ?? []).map((pr) => (
                <label
                  key={pr.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={produtoIds.includes(pr.id)}
                    onCheckedChange={() => toggleProduto(pr.id)}
                  />
                  <span className="flex-1">{pr.name}</span>
                  {pr.tipo && (
                    <Badge variant="outline" className="text-[10px]">
                      {pr.tipo}
                    </Badge>
                  )}
                </label>
              ))}
              {(produtos ?? []).length === 0 && (
                <p className="p-2 text-xs text-muted-foreground">Catálogo vazio.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={!title.trim() || save.isPending} onClick={() => save.mutate()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
