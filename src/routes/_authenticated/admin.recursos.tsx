import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClusterTemasManager } from "@/components/admin/ClusterTemasManager";
import { Loader2, Pencil, Trash2, Upload } from "lucide-react";

type Phase = "FTC" | "FTP" | "SU" | "SF";
type ResourceType = "pdf" | "video";

interface ProgramRow {
  id: string;
  title: string | null;
}
interface ResourceRow {
  id: string;
  program_id: string | null;
  phase: Phase;
  title: string;
  resource_type: string;
  file_url: string;
  created_at: string | null;
}

export const Route = createFileRoute("/_authenticated/admin/recursos")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role_name")
      .eq("user_id", u.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role_name === "Admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Gestor de Recursos — Admin" }] }),
  component: AdminResourcesPage,
});

function pathFromUrl(url: string): string | null {
  const marker = "/object/public/resources/";
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : null;
}

function AdminResourcesPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [programId, setProgramId] = useState<string>("");
  const [phase, setPhase] = useState<Phase | "">("");
  const [title, setTitle] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [editing, setEditing] = useState<ResourceRow | null>(null);
  const [eProgramId, setEProgramId] = useState<string>("");
  const [ePhase, setEPhase] = useState<Phase | "">("");
  const [eTitle, setETitle] = useState("");
  const [eResourceType, setEResourceType] = useState<ResourceType | "">("");
  const [eFile, setEFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Bulk upload state (cluster-based)
  const [clusters, setClusters] = useState<string[]>([]);
  const [bCluster, setBCluster] = useState<string>("");
  const [bPhase, setBPhase] = useState<Phase | "">("");
  const [bResourceType, setBResourceType] = useState<ResourceType | "">("");
  const [bFiles, setBFiles] = useState<File[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const loadResources = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("recursos" as never)
      .select("id, program_id, phase, title, resource_type, file_url, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setResources((data as ResourceRow[]) ?? []);
    setLoadingList(false);
  };

  useEffect(() => {
    supabase
      .from("programas")
      .select("id, title, cluster")
      .order("title")
      .then(({ data }) => {
        const rows = (data as Array<{ id: string; title: string | null; cluster: string | null }>) ?? [];
        setPrograms(rows.map((r) => ({ id: r.id, title: r.title })));
        const uniq = Array.from(new Set(rows.map((r) => r.cluster).filter((c): c is string => !!c && c.trim() !== "")));
        uniq.sort((a, b) => a.localeCompare(b));
        setClusters(uniq);
      });
    loadResources();
  }, []);

  const reset = () => {
    setProgramId("");
    setPhase("");
    setTitle("");
    setResourceType("");
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId || !phase || !title.trim() || !resourceType || !file) {
      toast.error("Preenche todos os campos e seleciona um ficheiro.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${programId}/${phase}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("resources")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("resources").getPublicUrl(path);

      const { error: insErr } = await supabase.from("recursos" as never).insert({
        program_id: programId,
        phase,
        title: title.trim(),
        resource_type: resourceType,
        file_url: urlData.publicUrl,
      } as never);
      if (insErr) {
        await supabase.storage.from("resources").remove([path]);
        throw insErr;
      }

      toast.success("Recurso carregado com sucesso.");
      reset();
      loadResources();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bCluster || !bPhase || !bResourceType || bFiles.length === 0) {
      toast.error("Seleciona cluster, fase, tipo e pelo menos um ficheiro.");
      return;
    }
    setBulkUploading(true);
    setBulkProgress({ done: 0, total: bFiles.length });
    let successCount = 0;
    const errors: string[] = [];
    const clusterSlug = bCluster.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "cluster";
    for (const f of bFiles) {
      try {
        const ext = f.name.split(".").pop() ?? "bin";
        const baseName = f.name.replace(/\.[^.]+$/, "").trim() || f.name;
        const path = `${clusterSlug}/${bPhase}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("resources")
          .upload(path, f, { contentType: f.type, upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("resources").getPublicUrl(path);
        const { error: insErr } = await supabase.from("recursos" as never).insert({
          program_id: null,
          phase: bPhase,
          title: baseName,
          resource_type: bResourceType,
          file_url: urlData.publicUrl,
        } as never);
        if (insErr) {
          await supabase.storage.from("resources").remove([path]);
          throw insErr;
        }
        successCount += 1;
      } catch (err) {
        errors.push(`${f.name}: ${(err as Error).message}`);
      } finally {
        setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    }
    setBulkUploading(false);
    if (successCount > 0) toast.success(`${successCount} recurso(s) carregado(s).`);
    if (errors.length > 0) toast.error(`Falharam ${errors.length}: ${errors[0]}`);
    setBFiles([]);
    loadResources();
  };



  const handleDelete = async (r: ResourceRow) => {
    if (!confirm(`Apagar "${r.title}"?`)) return;
    try {
      const path = pathFromUrl(r.file_url);

      const { error: dbErr } = await supabase
        .from("recursos" as never)
        .delete()
        .eq("id", r.id);
      if (dbErr) throw dbErr;

      if (path) await supabase.storage.from("resources").remove([path]);

      toast.success("Recurso removido.");
      loadResources();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const openEdit = (r: ResourceRow) => {
    setEditing(r);
    setEProgramId(r.program_id ?? "");
    setEPhase(r.phase);
    setETitle(r.title);
    setEResourceType(r.resource_type as ResourceType);
    setEFile(null);
  };

  const closeEdit = () => {
    if (saving) return;
    setEditing(null);
    setEFile(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!eProgramId || !ePhase || !eTitle.trim() || !eResourceType) {
      toast.error("Preenche todos os campos.");
      return;
    }
    setSaving(true);
    try {
      let newFileUrl: string | null = null;
      let newPath: string | null = null;

      if (eFile) {
        const ext = eFile.name.split(".").pop() ?? "bin";
        newPath = `${eProgramId}/${ePhase}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("resources")
          .upload(newPath, eFile, { contentType: eFile.type, upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("resources").getPublicUrl(newPath);
        newFileUrl = urlData.publicUrl;
      }

      const updatePayload: Record<string, unknown> = {
        program_id: eProgramId,
        phase: ePhase,
        title: eTitle.trim(),
        resource_type: eResourceType,
      };
      if (newFileUrl) updatePayload.file_url = newFileUrl;

      const { error: updErr } = await supabase
        .from("recursos" as never)
        .update(updatePayload as never)
        .eq("id", editing.id);

      if (updErr) {
        if (newPath) await supabase.storage.from("resources").remove([newPath]);
        throw updErr;
      }

      // Remove old file if it was replaced
      if (newFileUrl) {
        const oldPath = pathFromUrl(editing.file_url);
        if (oldPath) await supabase.storage.from("resources").remove([oldPath]);
      }

      toast.success("Recurso atualizado.");
      setEditing(null);
      setEFile(null);
      loadResources();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gestor de Recursos</h1>
        <p className="text-sm text-muted-foreground">
          Biblioteca central de recursos e organização por cluster.
        </p>
      </div>

      {/* defined later as handleBulkSubmit */}

      <Tabs defaultValue="biblioteca">
        <TabsList>
          <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
          <TabsTrigger value="clusters">Temas por Cluster</TabsTrigger>
        </TabsList>

        <TabsContent value="clusters" className="mt-4">
          <ClusterTemasManager />
        </TabsContent>

        <TabsContent value="biblioteca" className="mt-4 space-y-6">


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo recurso</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Programa</Label>
              <Select value={programId} onValueChange={setProgramId} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar programa" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title ?? p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fase</Label>
              <Select
                value={phase}
                onValueChange={(v) => setPhase(v as Phase)}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FTC">FTC — Formação Teórico-Conceptual</SelectItem>
                  <SelectItem value="FTP">FTP — Formação Teórico-Prática</SelectItem>
                  <SelectItem value="SU">Semana Ubuntu</SelectItem>
                  <SelectItem value="SF">Sessão Final</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading}
                placeholder="Ex: Guião do Formando"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={resourceType}
                onValueChange={(v) => setResourceType(v as ResourceType)}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ficheiro</Label>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={uploading}
                accept={resourceType === "video" ? "video/*" : ".pdf,application/pdf"}
              />
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />A carregar…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Carregar recurso
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carregamento em massa</CardTitle>
          <p className="text-xs text-muted-foreground">
            Escolhe cluster, fase e tipo uma vez e seleciona vários ficheiros. O título de cada recurso será o nome do ficheiro (sem extensão).
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBulkSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cluster</Label>
              <Select value={bCluster} onValueChange={setBCluster} disabled={bulkUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cluster" />
                </SelectTrigger>
                <SelectContent>
                  {clusters.length === 0 ? (
                    <SelectItem value="__none__" disabled>Sem clusters definidos</SelectItem>
                  ) : (
                    clusters.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fase</Label>
              <Select
                value={bPhase}
                onValueChange={(v) => setBPhase(v as Phase)}
                disabled={bulkUploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FTC">FTC — Formação Teórico-Conceptual</SelectItem>
                  <SelectItem value="FTP">FTP — Formação Teórico-Prática</SelectItem>
                  <SelectItem value="SU">Semana Ubuntu</SelectItem>
                  <SelectItem value="SF">Sessão Final</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={bResourceType}
                onValueChange={(v) => setBResourceType(v as ResourceType)}
                disabled={bulkUploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ficheiros (vários)</Label>
              <Input
                type="file"
                multiple
                onChange={(e) => setBFiles(Array.from(e.target.files ?? []))}
                disabled={bulkUploading}
                accept={bResourceType === "video" ? "video/*" : ".pdf,application/pdf"}
              />
              {bFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {bFiles.length} ficheiro(s) selecionado(s)
                </p>
              )}
            </div>

            {bFiles.length > 0 && (
              <div className="sm:col-span-2 max-h-40 overflow-auto rounded border p-2 text-xs text-muted-foreground">
                <ul className="space-y-1">
                  {bFiles.map((f, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{f.name.replace(/\.[^.]+$/, "")}</span>
                      <span className="shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={bulkUploading} className="w-full sm:w-auto">
                {bulkUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A carregar {bulkProgress.done}/{bulkProgress.total}…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Carregar {bFiles.length > 0 ? `${bFiles.length} ficheiro(s)` : "em massa"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>



      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recursos carregados</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : resources.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ainda não existem recursos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[140px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {r.title}
                      </a>
                    </TableCell>
                    <TableCell>{r.phase}</TableCell>
                    <TableCell className="uppercase">{r.resource_type}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(r)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(r)}
                          title="Apagar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editing !== null} onOpenChange={(o) => (!o ? closeEdit() : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar recurso</DialogTitle>
            <DialogDescription>
              Atualizar propriedades do recurso. Substituir o ficheiro é opcional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Programa</Label>
              <Select value={eProgramId} onValueChange={setEProgramId} disabled={saving}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar programa" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title ?? p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fase</Label>
              <Select
                value={ePhase}
                onValueChange={(v) => setEPhase(v as Phase)}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FTC">FTC — Formação Teórico-Conceptual</SelectItem>
                  <SelectItem value="FTP">FTP — Formação Teórico-Prática</SelectItem>
                  <SelectItem value="SU">Semana Ubuntu</SelectItem>
                  <SelectItem value="SF">Sessão Final</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={eResourceType}
                onValueChange={(v) => setEResourceType(v as ResourceType)}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Título</Label>
              <Input
                value={eTitle}
                onChange={(e) => setETitle(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Substituir ficheiro (opcional)</Label>
              <Input
                type="file"
                onChange={(e) => setEFile(e.target.files?.[0] ?? null)}
                disabled={saving}
                accept={eResourceType === "video" ? "video/*" : ".pdf,application/pdf"}
              />
              {!eFile && editing && (
                <p className="text-xs text-muted-foreground truncate">
                  Atual: {editing.file_url.split("/").pop()}
                </p>
              )}
            </div>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="ghost" onClick={closeEdit} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />A guardar…
                  </>
                ) : (
                  "Guardar alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
