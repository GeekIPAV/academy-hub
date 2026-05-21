import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Video, ExternalLink, Layers } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";

export const Route = createFileRoute("/_authenticated/recursos")({
  head: () => ({ meta: [{ title: "Centro de Recursos — Academia Ubuntu" }] }),
  component: ResourcesPage,
});


interface RecursoRow {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  file_url: string;
}

interface TemaRow {
  id: string;
  cluster: string;
  bloco: string | null;
  title: string;
  description: string | null;
  context: string | null;
  objectives: string | null;
  order_index: number;
  bloco_order: number;
  tema_recursos: Array<{ recursos: RecursoRow | null }>;
}

function toProxyUrl(fileUrl: string): string {
  const marker = "/storage/v1/object/public/resources/";
  const idx = fileUrl.indexOf(marker);
  if (idx < 0) return fileUrl;
  return `/api/public/recursos/${fileUrl.slice(idx + marker.length)}`;
}

function ResourcesPage() {
  const { isComponentVisible } = useApp();
  const visible = (id: string) => isComponentVisible("/recursos", id);
  const [selectedCluster, setSelectedCluster] = useState<string>("");
  const [viewerResource, setViewerResource] = useState<RecursoRow | null>(null);


  const clustersQuery = useQuery({
    queryKey: ["clusters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programas")
        .select("cluster")
        .not("cluster", "is", null);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r) => {
        const c = (r as { cluster: string | null }).cluster;
        if (c && c.trim()) set.add(c.trim());
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b, "pt"));
    },
  });

  const clusters = clustersQuery.data ?? [];
  const activeCluster = selectedCluster || clusters[0] || "";

  const temasQuery = useQuery({
    queryKey: ["temas", activeCluster],
    enabled: !!activeCluster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos" as never)
        .select("*, tema_recursos(recursos(*))")
        .eq("cluster", activeCluster)
        .order("bloco_order", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as unknown as TemaRow[]) ?? [];
    },
  });

  const temas = useMemo(() => temasQuery.data ?? [], [temasQuery.data]);

  const groupedTemas = useMemo(() => {
    const hasAnyBloco = temas.some((t) => t.bloco && t.bloco.trim());
    if (!hasAnyBloco) {
      return [{ bloco: null as string | null, temas }];
    }
    const map = new Map<string, TemaRow[]>();
    const order: string[] = [];
    const unassigned: TemaRow[] = [];
    for (const t of temas) {
      const key = t.bloco?.trim();
      if (!key) {
        unassigned.push(t);
        continue;
      }
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(t);
    }
    const groups: Array<{ bloco: string | null; temas: TemaRow[] }> = order.map((b) => ({
      bloco: b,
      temas: map.get(b)!,
    }));
    if (unassigned.length) groups.push({ bloco: null, temas: unassigned });
    return groups;
  }, [temas]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ComponentAccessMatrix pagePath="/recursos" />

      {visible("header") && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Centro de Recursos</h1>
          <p className="text-sm text-muted-foreground">
            Materiais pedagógicos organizados por cluster. Seleciona um cluster para
            explorares os temas e respetivos recursos.
          </p>
        </div>
      )}

      {visible("cluster-selector") && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Cluster</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {clustersQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> A carregar clusters…
              </div>
            ) : clusters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não existem clusters configurados nos programas.
              </p>
            ) : (
              <Select value={activeCluster} onValueChange={setSelectedCluster}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Selecionar cluster" />
                </SelectTrigger>
                <SelectContent>
                  {clusters.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {visible("temas-list") && activeCluster && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Temas e momentos</CardTitle>
          </CardHeader>
          <CardContent>
            {temasQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : temas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Ainda não há temas configurados para este cluster.
              </p>
            ) : (
              <div className="space-y-6">
                {groupedTemas.map((group, gi) => (
                  <section key={group.bloco ?? `__none-${gi}`} className="space-y-2">
                    <div className="flex items-center gap-2 border-b pb-1">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.bloco ?? "Outros"}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        ({group.temas.length})
                      </span>
                    </div>
                    <Accordion type="multiple" className="w-full">
                      {group.temas.map((t) => {
                        const recs = (t.tema_recursos ?? [])
                          .map((tr) => tr.recursos)
                          .filter((r): r is RecursoRow => !!r);
                        return (
                          <AccordionItem key={t.id} value={t.id}>
                            <AccordionTrigger>{t.title}</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                              {t.description && (
                                <div>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                                    Descrição
                                  </p>
                                  <p className="mt-1 text-sm whitespace-pre-wrap">
                                    {t.description}
                                  </p>
                                </div>
                              )}
                              {t.context && (
                                <div>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                                    Contexto
                                  </p>
                                  <p className="mt-1 text-sm whitespace-pre-wrap">
                                    {t.context}
                                  </p>
                                </div>
                              )}
                              {t.objectives && (
                                <div>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                                    Objetivos
                                  </p>
                                  <p className="mt-1 text-sm whitespace-pre-wrap">
                                    {t.objectives}
                                  </p>
                                </div>
                              )}

                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                  Recursos
                                </p>
                                {recs.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    Sem recursos associados.
                                  </p>
                                ) : (
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {recs.map((r) => {
                                      const Icon =
                                        r.resource_type === "video" ? Video : FileText;
                                      return (
                                        <a
                                          key={r.id}
                                          href={r.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block"
                                        >
                                          <Card className="border cursor-pointer transition hover:bg-muted/50">
                                            <CardContent className="flex flex-col gap-2 p-3">
                                              <div className="flex items-start gap-2">
                                                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                                <div className="min-w-0 flex-1">
                                                  <p className="truncate text-sm font-medium">
                                                    {r.title}
                                                  </p>
                                                  {r.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                      {r.description}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="self-start pointer-events-none"
                                              >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                Abrir
                                              </Button>
                                            </CardContent>
                                          </Card>
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!viewerResource}
        onOpenChange={(o) => !o && setViewerResource(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center text-xl leading-relaxed">
              {viewerResource?.title}
            </DialogTitle>
          </DialogHeader>
          {viewerResource && (
            <div className="flex flex-col items-center space-y-6 py-2">
              {viewerResource.description && (
                <p className="text-center text-sm text-muted-foreground leading-relaxed max-w-md">
                  {viewerResource.description}
                </p>
              )}
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a
                  href={viewerResource.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-5 w-5" />
                  Abrir Recurso (Novo Separador)
                </a>
              </Button>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Este recurso abrirá numa página externa da Academia para garantir que visualizas o documento com todas as permissões necessárias.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

}
