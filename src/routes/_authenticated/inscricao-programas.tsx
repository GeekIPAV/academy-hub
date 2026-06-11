import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Lock, BellRing, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/rich-text-editor";
import { CoverImage } from "@/components/CoverImage";
import { listActiveClustersForEnrollment } from "@/lib/inscricao-programas.functions";
import { parseCluster } from "@/lib/cluster-utils";

export const Route = createFileRoute("/_authenticated/inscricao-programas")({
  head: () => ({
    meta: [
      { title: "Inscrição em Programas — IPAV" },
      {
        name: "description",
        content: "Inscreve-te nos programas de formação ativos do IPAV.",
      },
    ],
  }),
  component: InscricaoProgramasPage,
});

const SLUG = "inscricao-programas";
const DEFAULT_HTML = "";

function InscricaoProgramasPage() {
  const { isAdmin } = useApp();

  const [html, setHtml] = useState<string>(DEFAULT_HTML);
  const [loadingContent, setLoadingContent] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(DEFAULT_HTML);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("paginas_conteudo")
        .select("content")
        .eq("slug", SLUG)
        .maybeSingle();
      const content = data?.content as { html?: string } | null;
      if (content?.html) setHtml(content.html);
      setLoadingContent(false);
    })();
  }, []);

  const fetchClusters = useServerFn(listActiveClustersForEnrollment);
  const { data: clusters, isLoading: loadingClusters } = useQuery({
    queryKey: ["inscricao-programas", "clusters"],
    queryFn: () => fetchClusters(),
  });

  const openEditor = () => {
    setDraft(html);
    setEditing(true);
  };
  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("paginas_conteudo")
      .upsert(
        { slug: SLUG, content: { html: draft } as unknown as never },
        { onConflict: "slug" },
      );
    setSaving(false);
    if (error) {
      toast.error("Erro ao guardar");
      return;
    }
    setHtml(draft);
    setEditing(false);
    toast.success("Conteúdo atualizado");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Inscrição em Programas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clusters de programas atualmente ativos no IPAV.
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={openEditor} className="shrink-0">
            <Pencil className="mr-2 h-4 w-4" />
            Editar descrição
          </Button>
        )}
      </div>

      {loadingContent ? (
        <Skeleton className="h-24 w-full" />
      ) : html ? (
        <div
          className="rich-text prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : isAdmin ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Ainda não há descrição. Clica em <strong>Editar descrição</strong> para
            adicionar texto, ênfase, emojis, etc.
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Clusters ativos</h2>

        {loadingClusters ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full" />
            ))}
          </div>
        ) : !clusters || clusters.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Não há clusters de programas ativos no momento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {clusters.map((c) => (
              <ClusterCard key={c.id} cluster={c} />
            ))}
          </div>
        )}
      </section>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar descrição da página</DialogTitle>
          </DialogHeader>
          <RichTextEditor value={draft} onChange={setDraft} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ClusterRow = Awaited<ReturnType<typeof listActiveClustersForEnrollment>>[number];

function ClusterCard({ cluster }: { cluster: ClusterRow }) {
  const display = parseCluster(cluster.name);
  const open = cluster.has_open_program;

  return (
    <Card className="overflow-hidden">
      {cluster.cover_url && (
        <div className="relative h-32 w-full overflow-hidden bg-muted">
          <CoverImage
            src={cluster.cover_url}
            alt={display.title}
            position={cluster.cover_position}
            scale={cluster.cover_scale ?? undefined}
          />
        </div>
      )}
      <CardContent className="space-y-3 p-4">
        <div>
          <h3 className="font-semibold leading-tight">{display.title}</h3>
          {display.subtitle && (
            <p className="text-xs text-muted-foreground">{display.subtitle}</p>
          )}
        </div>

        {open ? (
          <div className="flex items-center justify-between gap-2">
            <Badge variant="default">Inscrições abertas</Badge>
            <Button size="sm" asChild>
              <Link
                to="/inscricao-programas/$clusterId"
                params={{ clusterId: cluster.id }}
              >
                Inscrever entidade
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              Inscrições encerradas
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() =>
                toast.info(
                  "Vais ser notificado quando as inscrições deste cluster reabrirem.",
                )
              }
            >
              <BellRing className="mr-2 h-4 w-4" />
              Notificar-me quando abrirem
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
