import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { listProgramaOrganizacoes, decidirOrganizacaoInscricao } from "@/lib/equipa-programas.functions";
import { PageHeader, PageShell, SummaryStrip } from "@/components/shell/PageHeader";
import { StatusChip } from "@/components/shell/StatusChip";
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
import { slugifyCluster } from "@/lib/cluster-utils";

export function ProgramaInlineEditor({
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

export function InstituicoesTab({ programId }: { programId: string }) {
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
            <CardTitle className="text-base text-secondary">Organizações inscritas</CardTitle>
            <CardDescription>Organizações ligadas a este programa.</CardDescription>
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
                <TableHead>Estado</TableHead>
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

export function ParticipantesTab({ programId }: { programId: string }) {
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
                <TableHead>Estado</TableHead>
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


function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return v.split("-").reverse().join("/");
}

// ================== Página do programa ==================

type SeparadorPrograma = "dados" | "organizacoes" | "participantes";

/** Página de um programa na gestão: resumo, separadores e apagar no fim dos dados. */
export function ProgramaDetalhePage({ programId }: { programId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchProgramas = useServerFn(listProgramas);
  const fetchClusters = useServerFn(listClustersWithProgramas);
  const fetchEnt = useServerFn(listProgramaEntidades);
  const fetchPart = useServerFn(listProgramaParticipantes);
  const deleteFn = useServerFn(deletePrograma);
  const [sep, setSep] = useState<SeparadorPrograma>("dados");
  const [apagar, setApagar] = useState(false);

  const { data: programasRaw, isLoading } = useQuery({
    queryKey: ["admin-programas"],
    queryFn: () => fetchProgramas(),
    retry: false,
  });
  const { data: clustersRaw } = useQuery({
    queryKey: ["admin-programas-clusters"],
    queryFn: () => fetchClusters(),
    retry: false,
  });
  const { data: entRaw } = useQuery({
    queryKey: ["admin-programa-entidades", programId],
    queryFn: () => fetchEnt({ data: { programId } }),
    retry: false,
  });
  const { data: partRaw } = useQuery({
    queryKey: ["admin-programa-participantes", programId],
    queryFn: () => fetchPart({ data: { programId } }),
    retry: false,
  });

  const programas = (Array.isArray(programasRaw) ? programasRaw : []) as ProgramaAdminRow[];
  const clusters = useMemo(
    () => (Array.isArray(clustersRaw) ? clustersRaw.map((c) => ({ id: c.id, name: c.name })) : []),
    [clustersRaw],
  );
  const p = programas.find((x) => x.id === programId) ?? null;
  const nEnt = Array.isArray(entRaw) ? entRaw.length : null;
  const nPart = Array.isArray(partRaw) ? partRaw.length : null;

  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { id: programId } }),
    onSuccess: () => {
      toast.success("Programa apagado.");
      qc.invalidateQueries({ queryKey: ["admin-programas"] });
      navigate({ to: "/admin/programas" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }
  if (!p) {
    return (
      <PageShell narrow>
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="font-medium text-secondary">Programa não encontrado</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/admin/programas">Voltar aos programas</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const clusterName = clusters.find((c) => c.id === p.cluster_id)?.name;
  const seps: { id: SeparadorPrograma; label: string; n: number | null }[] = [
    { id: "dados", label: "Dados", n: null },
    { id: "organizacoes", label: "Organizações", n: nEnt },
    { id: "participantes", label: "Participantes", n: nPart },
  ];

  return (
    <PageShell>
      <PageHeader
        crumbs={[{ label: "Programas", to: "/admin/programas" }, { label: p.title ?? "Programa" }]}
        chips={
          <>
            <StatusChip tone={p.is_active ? "green" : "grey"} dot>
              {p.status ?? (p.is_active ? "Ativo" : "Inativo")}
            </StatusChip>
            <StatusChip tone={p.enrollment_open ? "orange" : "grey"}>
              {p.enrollment_open ? "Inscrições abertas" : "Inscrições fechadas"}
            </StatusChip>
            {p.certificacao && <StatusChip tone="tag">Certificação</StatusChip>}
            {p.acreditacao && <StatusChip tone="tag">Acreditação</StatusChip>}
          </>
        }
        title={p.title ?? "(sem título)"}
        description={[clusterName ? `Cluster ${clusterName}` : null, `${fmtDate(p.date_start)} a ${fmtDate(p.date_end)}`]
          .filter(Boolean)
          .join(" · ")}
      />

      <SummaryStrip
        items={[
          { label: "Organizações", value: nEnt == null ? "…" : String(nEnt) },
          { label: "Participantes", value: nPart == null ? "…" : String(nPart) },
          { label: "Produtos", value: String(p.produto_ids.length) },
          { label: "Datas", value: `${fmtDate(p.date_start)} a ${fmtDate(p.date_end)}` },
        ]}
      />

      <div role="tablist" aria-label="Secções do programa" className="flex gap-1 overflow-x-auto border-b">
        {seps.map((s) => {
          const on = s.id === sep;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setSep(s.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-medium transition-colors ${
                on ? "border-primary text-secondary" : "border-transparent text-muted-foreground hover:text-secondary"
              }`}
            >
              {s.label}
              {s.n != null && s.n > 0 && (
                <span className="rounded-full bg-muted px-2 py-px text-xs font-medium text-secondary">{s.n}</span>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="min-w-0">
        {sep === "dados" && (
          <div className="space-y-5">
            <div className="rounded-xl border bg-card p-5 sm:p-6">
              <ProgramaInlineEditor programa={p} clusters={clusters} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F5C6C2] bg-[#FFFBFA] p-4">
              <div>
                <p className="text-sm font-semibold text-[#B42318]">Apagar programa</p>
                <p className="text-xs text-muted-foreground">Apaga o programa e as ligações a organizações. Não dá para desfazer.</p>
              </div>
              <Button variant="outline" className="border-[#B42318] text-[#B42318] hover:bg-[#FDEDEC]" onClick={() => setApagar(true)}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Apagar programa
              </Button>
            </div>
          </div>
        )}
        {sep === "organizacoes" && <OrganizacoesPrograma programId={programId} />}
        {sep === "participantes" && <ParticipantesTab programId={programId} />}
      </div>

      <AlertDialog open={apagar} onOpenChange={setApagar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar “{p.title}”?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não dá para desfazer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()} disabled={remove.isPending}>
              Apagar programa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

// ================== Organizações do programa (com aprovação) ==================

const ESTADO_ORG: Record<string, { label: string; tone: "yellow" | "green" | "red" | "grey" }> = {
  pendente: { label: "Pendente", tone: "yellow" },
  aprovada: { label: "Aprovada", tone: "green" },
  rejeitada: { label: "Rejeitada", tone: "red" },
};

/** Organizações do programa, com aprovar e rejeitar os pedidos pendentes. */
export function OrganizacoesPrograma({ programId }: { programId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(listProgramaOrganizacoes);
  const decide = useServerFn(decidirOrganizacaoInscricao);
  const [filtro, setFiltro] = useState<"todas" | "pendente" | "aprovada" | "rejeitada">("todas");
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["equipa-organizacoes", programId],
    queryFn: () => fn({ data: { programId } }),
    retry: false,
  });
  const rows = Array.isArray(data) ? data : [];
  const pendentes = rows.filter((r) => r.status === "pendente").length;
  const visiveis = rows.filter(
    (r) =>
      (filtro === "todas" || r.status === filtro) &&
      (!q.trim() || r.entity_name.toLowerCase().includes(q.trim().toLowerCase())),
  );

  const mutation = useMutation({
    mutationFn: (vars: { cohortId: string; decision: "aprovada" | "rejeitada" | "pendente" }) =>
      decide({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(
        vars.decision === "aprovada"
          ? "Organização aprovada. O convite foi enviado por email."
          : vars.decision === "pendente"
            ? "Pedido reposto como pendente."
            : "Pedido rejeitado.",
      );
      qc.invalidateQueries({ queryKey: ["equipa-organizacoes", programId] });
      qc.invalidateQueries({ queryKey: ["admin-programa-entidades", programId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {pendentes > 0 && (
        <div className="rounded-xl bg-[#FFF1CC] p-4 text-sm text-[#6B4200]">
          <strong className="font-semibold">
            {pendentes === 1 ? "1 organização à espera de aprovação." : `${pendentes} organizações à espera de aprovação.`}
          </strong>{" "}
          Ao aprovar, a pessoa de contacto recebe o convite por email.
        </div>
      )}
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar organização"
            aria-label="Pesquisar organização"
            className="min-w-[200px] flex-1 sm:max-w-sm"
          />
          <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Estado">
            {(
              [
                ["todas", "Todas"],
                ["pendente", "Pendentes"],
                ["aprovada", "Aprovadas"],
                ["rejeitada", "Rejeitadas"],
              ] as const
            ).map(([id, l]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filtro === id}
                onClick={() => setFiltro(id)}
                className={`h-8 rounded-md px-3 text-xs font-medium ${
                  filtro === id ? "bg-card text-secondary shadow-sm" : "text-muted-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="p-4 text-sm text-destructive">Erro: {(error as Error).message}</p>}
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Organização</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Participantes</TableHead>
                <TableHead className="w-52 text-right">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && visiveis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {rows.length === 0 ? "Nenhuma organização inscrita neste programa." : "Nenhuma organização com estes filtros."}
                  </TableCell>
                </TableRow>
              )}
              {visiveis.map((r) => {
                const e = ESTADO_ORG[r.status] ?? { label: r.status, tone: "grey" as const };
                return (
                  <TableRow key={r.cohort_id}>
                    <TableCell>
                      <span className="block font-medium text-secondary">{r.entity_name}</span>
                      {r.entity_locality && <span className="text-xs text-muted-foreground">{r.entity_locality}</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.contact_name && <span className="block text-foreground">{r.contact_name}</span>}
                      {r.contact_email}
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={e.tone} dot>
                        {e.label}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.participantes || "—"}</TableCell>
                    <TableCell className="text-right">
                      {r.status === "pendente" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ cohortId: r.cohort_id, decision: "rejeitada" })}
                          >
                            Rejeitar
                          </Button>
                          <Button
                            size="sm"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ cohortId: r.cohort_id, decision: "aprovada" })}
                          >
                            Aprovar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate({ cohortId: r.cohort_id, decision: "pendente" })}
                        >
                          Repor como pendente
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
