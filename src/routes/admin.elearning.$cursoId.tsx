import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Archive, ArrowLeft, CheckCircle2, Download, Eye, RefreshCw, Rocket, Save } from "lucide-react";
import { RouteGate } from "@/components/RouteGate";
import { CoverUploader } from "@/components/CoverUploader";
import { CoverImage } from "@/components/CoverImage";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ConteudoBuilder } from "@/components/admin/elearning/ConteudoBuilder";
import { TurmasTab } from "@/components/admin/elearning/TurmasTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCursoAdmin,
  listInscritos,
  listOpcoesElearning,
  regenerarCertificado,
  upsertCurso,
  type CursoInput,
} from "@/lib/admin-elearning.functions";

export const Route = createFileRoute("/admin/elearning/$cursoId")({
  head: () => ({
    meta: [
      { title: "Editar curso — Gestão de E-learning" },
      { name: "description", content: "Dados, conteúdos, turmas e inscritos de um curso da Escola Ubuntu Online." },
      { property: "og:title", content: "Editar curso — Gestão de E-learning" },
      { property: "og:description", content: "Dados, conteúdos, turmas e inscritos do curso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RouteGate path="/admin/elearning">
      <CursoAdminPage />
    </RouteGate>
  ),
});

function CursoAdminPage() {
  const { cursoId } = Route.useParams();
  const fn = useServerFn(getCursoAdmin);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-elearning", "curso", cursoId], queryFn: () => fn({ data: { id: cursoId } }) });
  if (isLoading) return <div className="mx-auto max-w-6xl space-y-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-12 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (error || !data) return <p className="p-6 text-sm text-destructive">{(error as Error)?.message ?? "Curso não encontrado."}</p>;
  const primeiro = data.modulos.flatMap((m) => m.passos)[0]?.id;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link to="/admin/elearning" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Todos os cursos
      </Link>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{data.curso.title}</h1>
          <Badge variant={data.curso.estado === "publicado" ? "default" : "secondary"} className="mt-2">{data.curso.estado === "publicado" ? "Publicado" : data.curso.estado === "arquivado" ? "Arquivado" : "Rascunho"}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/elearning/$cursoId" params={{ cursoId }}><Eye className="mr-1 h-4 w-4" /> Página do curso</Link>
          </Button>
          {primeiro && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: primeiro }}>Pré-visualizar</Link>
            </Button>
          )}
        </div>
      </div>
      <EstadoCurso curso={data.curso} modulos={data.modulos} turmas={data.turmas} />
      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          {data.curso.modalidade === "turma" && <TabsTrigger value="turmas">Turmas</TabsTrigger>}
          <TabsTrigger value="inscritos">Inscritos</TabsTrigger>
        </TabsList>
        <TabsContent value="dados" className="pt-4"><DadosTab curso={data.curso} /></TabsContent>
        <TabsContent value="conteudo" className="pt-4">
          <ConteudoBuilder cursoId={cursoId} clusterId={data.curso.cluster_id} modalidade={data.curso.modalidade} modulos={data.modulos} />
        </TabsContent>
        {data.curso.modalidade === "turma" && (
          <TabsContent value="turmas" className="pt-4"><TurmasTab cursoId={cursoId} turmas={data.turmas} /></TabsContent>
        )}
        <TabsContent value="inscritos" className="pt-4"><InscritosTab cursoId={cursoId} turmas={data.turmas} /></TabsContent>
      </Tabs>
    </div>
  );
}

type CursoRow = Awaited<ReturnType<typeof getCursoAdmin>>["curso"];

function EstadoCurso({ curso, modulos, turmas }: { curso: CursoRow; modulos: Awaited<ReturnType<typeof getCursoAdmin>>["modulos"]; turmas: Awaited<ReturnType<typeof getCursoAdmin>>["turmas"] }) {
  const saveFn = useServerFn(upsertCurso);
  const qc = useQueryClient();
  const passos = modulos.flatMap((m) => m.passos);
  const checks = [
    { label: "Pelo menos um módulo com passos", ok: passos.length > 0, bloqueia: true },
    { label: "Capa definida", ok: !!curso.cover_url, bloqueia: false },
    { label: "Turma com inscrições abertas", ok: curso.modalidade !== "turma" || turmas.some((t) => t.inscricoes_abertas), bloqueia: false },
    { label: "Horas definidas para o certificado", ok: !curso.tem_certificado || Number(curso.horas ?? 0) > 0, bloqueia: false },
    { label: "Badges de entrada e final definidos", ok: !!curso.badge_entrada_id && !!curso.badge_final_id, bloqueia: false },
  ];
  const change = useMutation({
    mutationFn: (estado: CursoInput["estado"]) => saveFn({ data: { ...curso, modalidade: curso.modalidade as CursoInput["modalidade"], estado, tipo: curso.tipo as CursoInput["tipo"], cover_scale: Number(curso.cover_scale), horas: curso.horas == null ? null : Number(curso.horas), nota_minima_quiz: Number(curso.nota_minima_quiz), pct_minima_video: Number(curso.pct_minima_video) } }),
    onSuccess: () => { toast.success("Estado do curso atualizado."); qc.invalidateQueries({ queryKey: ["admin-elearning"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const blocked = checks.some((c) => c.bloqueia && !c.ok);
  return <Card className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div><p className="text-sm font-semibold">Antes de publicar</p><div className="mt-2 grid gap-1 sm:grid-cols-2">{checks.map((c) => <p key={c.label} className={`flex items-center gap-2 text-xs ${c.ok ? "text-muted-foreground" : "text-destructive"}`}>{c.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4" />}{c.label}</p>)}</div></div><div className="flex gap-2">{curso.estado === "publicado" ? <Button variant="outline" disabled={change.isPending} onClick={() => change.mutate("rascunho")}>Despublicar</Button> : <Button disabled={blocked || change.isPending} onClick={() => change.mutate("publicado")}><Rocket className="mr-2 h-4 w-4" />Publicar</Button>}<Button variant="outline" disabled={change.isPending || curso.estado === "arquivado"} onClick={() => change.mutate("arquivado")}><Archive className="mr-2 h-4 w-4" />Arquivar</Button></div></Card>;
}

function NullSelect({ value, onChange, items, placeholder = "Nenhum" }: { value: string | null; onChange: (v: string | null) => void; items: { id: string; label: string }[]; placeholder?: string }) {
  return (
    <Select value={value ?? "__none__"} onValueChange={(v) => onChange(v === "__none__" ? null : v)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{placeholder}</SelectItem>
        {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function DadosTab({ curso }: { curso: CursoRow }) {
  const optFn = useServerFn(listOpcoesElearning);
  const saveFn = useServerFn(upsertCurso);
  const qc = useQueryClient();
  const { data: opts } = useQuery({ queryKey: ["admin-elearning", "opcoes"], queryFn: () => optFn() });
  const initial = (): CursoInput => ({
    id: curso.id,
    title: curso.title,
    description: curso.description,
    cover_url: curso.cover_url,
    cover_position: curso.cover_position,
    cover_scale: curso.cover_scale,
    cluster_id: curso.cluster_id,
    program_id: curso.program_id,
    modalidade: curso.modalidade as CursoInput["modalidade"],
    estado: curso.estado as CursoInput["estado"],
    tipo: curso.tipo as CursoInput["tipo"],
    horas: curso.horas,
    tem_certificado: curso.tem_certificado,
    acreditacao_ref: curso.acreditacao_ref,
    badge_entrada_id: curso.badge_entrada_id,
    badge_final_id: curso.badge_final_id,
    badge_renovado_id: curso.badge_renovado_id,
    nota_minima_quiz: curso.nota_minima_quiz,
    pct_minima_video: curso.pct_minima_video,
  });
  const [f, setF] = useState<CursoInput>(initial);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial());
  useEffect(() => setF(initial()), [curso]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof CursoInput>(k: K, v: CursoInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const save = useMutation({
    mutationFn: (d: CursoInput) => saveFn({ data: d }),
    onSuccess: () => { toast.success("Curso guardado."); qc.invalidateQueries({ queryKey: ["admin-elearning"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const badgeItems = (opts?.badges ?? []).map((b) => ({ id: b.id, label: `${b.title}${b.kind === "em_formacao" ? " (em formação)" : " (formado)"}` }));
  const onCluster = (id: string | null) => {
    const cl = opts?.clusters.find((c) => c.id === id);
    setF((p) => ({ ...p, cluster_id: id, badge_entrada_id: cl?.formando_badge_id ?? p.badge_entrada_id, badge_final_id: cl?.final_badge_id ?? p.badge_final_id }));
  };

  return (
    <div className="space-y-5">
      {dirty && <div className="sticky top-16 z-20 flex items-center justify-between border border-accent bg-accent/10 px-4 py-3 text-sm"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Tens alterações por guardar.</span><Button size="sm" onClick={() => save.mutate(f)} disabled={save.isPending || !f.title.trim()}><Save className="mr-2 h-4 w-4" />Guardar</Button></div>}
      <Card className="space-y-5 p-5">
      <div><h2 className="text-lg font-semibold">Informação</h2><p className="text-sm text-muted-foreground">Identificação e apresentação pública do curso.</p></div>
      <div className="grid gap-5 md:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="space-y-1"><Label>Título</Label><Input value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="space-y-1"><Label>Descrição</Label><RichTextEditor value={f.description ?? ""} onChange={(v) => set("description", v)} /></div>
        </div>
        <div className="space-y-2">
          <Label>Capa</Label>
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted">
            {f.cover_url && <CoverImage src={f.cover_url} position={f.cover_position} scale={f.cover_scale} className="h-full w-full" />}
            <CoverUploader
              folder="cursos"
              id={curso.id}
              currentUrl={f.cover_url ?? null}
              onUploaded={(url) => save.mutate({ ...f, cover_url: url })}
              onCleared={() => save.mutate({ ...f, cover_url: null })}
              position={f.cover_position}
              scale={f.cover_scale}
              onAdjusted={(pos, sc) => save.mutate({ ...f, cover_position: pos, cover_scale: sc })}
              aspectRatio={16 / 9}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label>Modalidade</Label>
          <Select value={f.modalidade} onValueChange={(v) => set("modalidade", v as CursoInput["modalidade"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="autonomo">Autónomo</SelectItem><SelectItem value="turma">Em turma</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Tipo de curso</Label>
          <Select value={f.tipo} onValueChange={(v) => set("tipo", v as CursoInput["tipo"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="formacao_formadores">Formação de Formadores</SelectItem>
              <SelectItem value="microcurso">Microcurso</SelectItem>
              <SelectItem value="semana_ubuntu">Preparação Semana Ubuntu</SelectItem>
              <SelectItem value="renovacao">Renovação de badge</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>Cluster</Label><NullSelect value={f.cluster_id ?? null} onChange={onCluster} items={(opts?.clusters ?? []).map((c) => ({ id: c.id, label: c.name }))} placeholder="Sem cluster" /></div>
        <div className="space-y-1"><Label>Programa</Label><NullSelect value={f.program_id ?? null} onChange={(v) => set("program_id", v)} items={(opts?.programas ?? []).map((p) => ({ id: p.id, label: p.title ?? "—" }))} placeholder="Sem programa" /></div>
      </div>
      </Card>
      <Card className="space-y-4 p-5">
        <div><h2 className="text-lg font-semibold">Modalidade e acesso</h2><p className="text-sm text-muted-foreground">Define como o curso decorre e a sua carga formativa.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1"><Label>Horas de formação</Label><Input type="number" min={0} value={f.horas ?? ""} onChange={(e) => set("horas", e.target.value === "" ? null : Number(e.target.value))} /><p className="text-xs text-muted-foreground">Usadas no certificado e na duração apresentada.</p></div>
        <div className="space-y-1"><Label>Referência de acreditação</Label><Input placeholder="ex. CCPFC/ACC-…" value={f.acreditacao_ref ?? ""} onChange={(e) => set("acreditacao_ref", e.target.value || null)} /><p className="text-xs text-muted-foreground">Referência oficial, quando aplicável.</p></div>
        </div>
      </Card>
      <Card className="space-y-4 p-5">
        <div><h2 className="text-lg font-semibold">Conclusão e certificação</h2><p className="text-sm text-muted-foreground">Regras aplicadas automaticamente ao progresso do formando.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1"><Label>Badge de entrada (em formação)</Label><NullSelect value={f.badge_entrada_id ?? null} onChange={(v) => set("badge_entrada_id", v)} items={badgeItems} /></div>
        <div className="space-y-1"><Label>Badge final (formado)</Label><NullSelect value={f.badge_final_id ?? null} onChange={(v) => set("badge_final_id", v)} items={badgeItems} /></div>
        <div className="space-y-1"><Label>Badge a renovar</Label><NullSelect value={f.badge_renovado_id ?? null} onChange={(v) => set("badge_renovado_id", v)} items={badgeItems} /></div>
        <div className="space-y-1"><Label>Nota mínima dos quizzes (%)</Label><Input type="number" min={0} max={100} value={f.nota_minima_quiz} onChange={(e) => set("nota_minima_quiz", Number(e.target.value))} /></div>
        <div className="space-y-1"><Label>% mínima de vídeo visto</Label><Input type="number" min={0} max={100} value={f.pct_minima_video} onChange={(e) => set("pct_minima_video", Number(e.target.value))} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.tem_certificado} onCheckedChange={(v) => set("tem_certificado", !!v)} /> Emite certificado ao concluir</label>
      <div className="flex justify-end"><Button onClick={() => save.mutate(f)} disabled={save.isPending || !f.title.trim() || !dirty}>Guardar alterações</Button></div>
      </Card>
    </div>
  );
}

const ESTADO_INSC: Record<string, string> = { inscrito: "Inscrito", em_curso: "Em curso", concluido: "Concluído", cancelado: "Cancelado" };

function InscritosTab({ cursoId, turmas }: { cursoId: string; turmas: { id: string; nome: string }[] }) {
  const fn = useServerFn(listInscritos);
  const regenFn = useServerFn(regenerarCertificado);
  const qc = useQueryClient();
  const [turma, setTurma] = useState("all");
  const [estado, setEstado] = useState("all");
  const { data, isLoading } = useQuery({ queryKey: ["admin-elearning", "inscritos", cursoId], queryFn: () => fn({ data: { cursoId } }) });
  const regen = useMutation({
    mutationFn: (inscricaoId: string) => regenFn({ data: { inscricaoId } }),
    onSuccess: () => { toast.success("Certificado gerado."); qc.invalidateQueries({ queryKey: ["admin-elearning", "inscritos", cursoId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = (data ?? []).filter((r) => (turma === "all" || r.turma_id === turma) && (estado === "all" || r.estado === estado));
  const turmaNome = (id: string | null) => turmas.find((t) => t.id === id)?.nome ?? "—";
  const exportCsv = () => {
    const head = ["Nome", "Email", "Turma", "Estado", "Progresso %", "Nota média", "Badge", "Certificado", "Inscrito em", "Concluído em"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [r.nome, r.email, turmaNome(r.turma_id), ESTADO_INSC[r.estado], r.pct, r.nota_media ?? "", r.badge ? "Sim" : "Não", r.codigo ?? "", r.inscrito_em?.slice(0, 10), r.concluido_em?.slice(0, 10) ?? ""].map(esc).join(";"));
    const blob = new Blob(["\ufeff" + [head.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inscritos-${cursoId}.csv`;
    a.click();
  };
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {turmas.length > 0 && (
          <Select value={turma} onValueChange={setTurma}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={estado} onValueChange={setEstado}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os estados</SelectItem>{Object.entries(ESTADO_INSC).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select>
        <span className="flex-1 text-sm text-muted-foreground">{rows.length} inscrito(s)</span>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="mr-1 h-4 w-4" /> Exportar CSV</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            {turmas.length > 0 && <TableHead>Turma</TableHead>}
            <TableHead>Estado</TableHead>
            <TableHead>Progresso</TableHead>
            <TableHead className="text-right">Nota</TableHead>
            <TableHead>Última atividade</TableHead>
            <TableHead>Badge</TableHead>
            <TableHead>Certificado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={turmas.length > 0 ? 8 : 7}><div className="space-y-2 py-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-5 w-11/12" /></div></TableCell></TableRow>}
          {!isLoading && !rows.length && <TableRow><TableCell colSpan={turmas.length > 0 ? 8 : 7} className="text-sm text-muted-foreground">Sem inscritos.</TableCell></TableRow>}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell><p className="font-medium">{r.nome}</p><p className="text-xs text-muted-foreground">{r.email}</p></TableCell>
              {turmas.length > 0 && <TableCell className="text-sm">{turmaNome(r.turma_id)}</TableCell>}
              <TableCell><Badge variant={r.estado === "concluido" ? "default" : "secondary"}>{ESTADO_INSC[r.estado]}</Badge></TableCell>
               <TableCell><div className="min-w-28"><div className="mb-1 text-right text-xs">{r.pct}%</div><Progress value={r.pct} className="h-1.5" /></div></TableCell>
              <TableCell className="text-right">{r.nota_media != null ? `${r.nota_media}%` : "—"}</TableCell>
               <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{r.ultima_atividade ? new Date(r.ultima_atividade).toLocaleDateString("pt-PT") : "—"}</TableCell>
              <TableCell>{r.badge ? "Sim" : "—"}</TableCell>
              <TableCell className="space-x-1 whitespace-nowrap">
                {r.certificado && <a href={r.certificado} target="_blank" rel="noreferrer" className="text-sm text-primary underline">PDF</a>}
                {r.estado === "concluido" && (
                  <Button size="icon" variant="ghost" aria-label="Regenerar certificado" disabled={regen.isPending} onClick={() => regen.mutate(r.id)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
