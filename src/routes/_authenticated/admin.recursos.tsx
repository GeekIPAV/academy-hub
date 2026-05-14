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
import { Loader2, Trash2, Upload } from "lucide-react";

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
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", u.user.id)
      .maybeSingle();
    if (profile?.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Gestor de Recursos — Admin" }] }),
  component: AdminResourcesPage,
});

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

  const loadResources = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("learning_resources" as never)
      .select("id, program_id, phase, title, resource_type, file_url, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setResources((data as ResourceRow[]) ?? []);
    setLoadingList(false);
  };

  useEffect(() => {
    supabase
      .from("programs")
      .select("id, title")
      .order("title")
      .then(({ data }) => setPrograms((data as ProgramRow[]) ?? []));
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

      const { error: insErr } = await supabase.from("learning_resources" as never).insert({
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

  const handleDelete = async (r: ResourceRow) => {
    if (!confirm(`Apagar "${r.title}"?`)) return;
    try {
      // Extract storage path from public URL: .../object/public/resources/<path>
      const marker = "/object/public/resources/";
      const idx = r.file_url.indexOf(marker);
      const path = idx >= 0 ? r.file_url.slice(idx + marker.length) : null;

      const { error: dbErr } = await supabase
        .from("learning_resources" as never)
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gestor de Recursos</h1>
        <p className="text-sm text-muted-foreground">
          Carregar materiais para o Centro de Recursos dos formandos.
        </p>
      </div>

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
                  <TableHead className="w-[100px]" />
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(r)}
                        title="Apagar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
