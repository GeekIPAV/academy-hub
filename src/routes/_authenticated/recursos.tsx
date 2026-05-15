import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Lock,
  FileText,
  Video,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Briefcase,
  Sparkles,
  HeartHandshake,
} from "lucide-react";
import { getResourcesContext, type Phase, type ResourcesContext } from "@/lib/resources.functions";
import { useApp } from "@/lib/app-context";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";

export const Route = createFileRoute("/_authenticated/recursos")({
  head: () => ({ meta: [{ title: "Centro de Recursos — Academia Ubuntu" }] }),
  component: ResourcesPage,
});

const PHASE_META: Record<Phase, { label: string; short: string; Icon: React.ComponentType<{ className?: string }> }> = {
  FTC: { label: "Formação Teórico-Conceptual", short: "FTC", Icon: GraduationCap },
  FTP: { label: "Formação Teórico-Prática", short: "FTP", Icon: Briefcase },
  SU: { label: "Semana Ubuntu", short: "SU", Icon: Sparkles },
  SF: { label: "Sessão Final", short: "SF", Icon: HeartHandshake },
};

function toProxyUrl(fileUrl: string): string {
  const marker = "/storage/v1/object/public/resources/";
  const idx = fileUrl.indexOf(marker);
  if (idx < 0) return fileUrl;
  return `/api/public/recursos/${fileUrl.slice(idx + marker.length)}`;
}

interface ResourceRow {
  id: string;
  phase: Phase;
  title: string;
  resource_type: string;
  file_url: string;
  description: string | null;
}

function PdfPreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdf, setPdf] = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setPdf(null);
    setPageNumber(1);

    import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url,
      ).toString();
      return pdfjs.getDocument(url).promise;
    }).then((document) => {
      if (!cancelled) setPdf(document);
    }).catch(() => {
      if (!cancelled) setError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    pdf.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const containerWidth = canvasRef.current.parentElement?.clientWidth ?? 900;
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.6, Math.max(0.8, (containerWidth - 32) / baseViewport.width));
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      page.render({ canvas, canvasContext: context, viewport }).promise.catch(() => setError(true));
    });

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !pdf) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Não foi possível carregar a pré-visualização.</div>;
  }

  return (
    <div className="grid h-full grid-rows-[1fr_auto] bg-muted/30">
      <div className="min-h-0 overflow-auto p-4">
        <canvas ref={canvasRef} className="mx-auto block max-w-full rounded-md bg-background shadow-sm" />
      </div>
      <div className="flex items-center justify-center gap-3 border-t bg-background p-3">
        <Button variant="outline" size="sm" onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Página {pageNumber} de {pdf.numPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPageNumber((p) => Math.min(pdf.numPages, p + 1))} disabled={pageNumber >= pdf.numPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ResourcesPage() {
  const fetchCtx = useServerFn(getResourcesContext);
  const [ctx, setCtx] = useState<ResourcesContext | null>(null);
  const [activePhase, setActivePhase] = useState<Phase>("FTC");
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loadingRes, setLoadingRes] = useState(false);
  const [preview, setPreview] = useState<ResourceRow | null>(null);
  const { isComponentVisible } = useApp();
  const visible = (id: string) => isComponentVisible("/recursos", id);

  useEffect(() => {
    let mounted = true;
    fetchCtx()
      .then((r: ResourcesContext) => mounted && setCtx(r))
      .catch(() => {
        if (mounted) {
          setCtx({ isFormando: false, isAdmin: false, completed: { FTC: false, FTP: false, SU: false, SF: false } });
        }
      });
    return () => {
      mounted = false;
    };
  }, [fetchCtx]);

  useEffect(() => {
    if (!ctx?.completed[activePhase]) {
      setResources([]);
      return;
    }
    setLoadingRes(true);
    supabase
      .from("recursos" as never)
      .select("id, phase, title, resource_type, file_url, description")
      .eq("phase", activePhase)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setResources((data as ResourceRow[]) ?? []);
        setLoadingRes(false);
      });
  }, [ctx, activePhase]);

  if (!ctx) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ctx.isFormando) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Lock className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O Centro de Recursos é exclusivo para formandos.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/dashboard">Voltar ao Dashboard</Link>
        </Button>
      </div>
    );
  }

  const phases: Phase[] = ["FTC", "FTP", "SU", "SF"];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ComponentAccessMatrix pagePath="/recursos" />
      {visible("header") && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Centro de Recursos</h1>
          <p className="text-sm text-muted-foreground">
            Materiais de apoio do teu percurso. Os recursos vão sendo desbloqueados à medida
            que concluis cada fase.
          </p>
        </div>
      )}

      {visible("tabs") && (
      <Tabs value={activePhase} onValueChange={(v) => setActivePhase(v as Phase)}>
        <TabsList className="grid w-full grid-cols-4">
          {phases.map((p) => (
            <TabsTrigger key={p} value={p}>
              {PHASE_META[p].short}
            </TabsTrigger>
          ))}
        </TabsList>

        {phases.map((p) => {
          const { label, Icon } = PHASE_META[p];
          const unlocked = ctx.completed[p];
          return (
            <TabsContent key={p} value={p} className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {!unlocked ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <Lock className="h-6 w-6 text-muted-foreground" />
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Estes recursos ficarão disponíveis após a conclusão da {label}.
                      </p>
                    </div>
                  ) : loadingRes ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : resources.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Ainda não há recursos disponíveis para esta fase.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {resources.map((r) => {
                        const TypeIcon = r.resource_type === "video" ? Video : FileText;
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => setPreview(r)}
                              className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted/50"
                            >
                              <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{r.title}</p>
                                {r.description && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {r.description}
                                  </p>
                                )}
                              </div>
                              <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="h-[88vh] max-w-5xl grid-rows-[auto_1fr] p-0">
          <DialogHeader className="space-y-1 px-6 pt-6">
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>
              {preview?.resource_type === "video" ? "Pré-visualização do vídeo" : "Pré-visualização do documento"}
            </DialogDescription>
          </DialogHeader>
          {preview && (
            preview.resource_type === "video" ? (
              <video src={toProxyUrl(preview.file_url)} controls className="h-full w-full bg-muted" />
            ) : (
              <PdfPreview url={toProxyUrl(preview.file_url)} />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
