import { useEffect, useState } from "react";
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
  GraduationCap,
  Briefcase,
  Sparkles,
  HeartHandshake,
} from "lucide-react";
import { getResourcesContext, type Phase, type ResourcesContext } from "@/lib/resources.functions";

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

interface ResourcePreview {
  title: string;
  url: string;
  filename: string;
  blob: Blob;
  mimeType: string;
}

function isPdfPreview(preview: ResourcePreview): boolean {
  return preview.mimeType.includes("pdf") || preview.filename.toLowerCase().endsWith(".pdf");
}

function isVideoPreview(preview: ResourcePreview): boolean {
  return preview.mimeType.startsWith("video/") || /\.(mp4|webm|ogg|mov)$/i.test(preview.filename);
}

interface PdfPageLike {
  getViewport: (args: { scale: number }) => { width: number; height: number };
  render: (args: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
}

interface PdfDocumentLike {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
  destroy?: () => Promise<void> | void;
}

function filenameFromResource(resource: ResourceRow): string {
  const fromUrl = resource.file_url.split("/").pop()?.split("?")[0];
  if (fromUrl) return decodeURIComponent(fromUrl);
  return `${resource.title}.pdf`;
}

function ResourcePreviewPane({ preview }: { preview: ResourcePreview }) {
  if (isPdfPreview(preview)) return <PdfPreview preview={preview} />;

  if (isVideoPreview(preview)) {
    return (
      <video
        src={preview.url}
        controls
        className="max-h-[72vh] w-full rounded-md border bg-muted"
      />
    );
  }

  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 rounded-md border bg-muted p-6 text-center">
      <FileText className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Este tipo de ficheiro não tem pré-visualização. Usa o botão de descarregar.
      </p>
    </div>
  );
}

function PdfPreview({ preview }: { preview: ResourcePreview }) {
  const [pages, setPages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pdfDocument: PdfDocumentLike | null = null;

    async function renderPdf() {
      setPages([]);
      setError(null);

      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const data = new Uint8Array(await preview.blob.arrayBuffer());
        const task = pdfjs.getDocument({ data, disableWorker: true });
        pdfDocument = (await task.promise) as PdfDocumentLike;
        const renderedPages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.55 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Não foi possível preparar a pré-visualização.");
          await page.render({ canvasContext: context, viewport }).promise;
          renderedPages.push(canvas.toDataURL("image/png"));
          if (!cancelled) setPages([...renderedPages]);
        }
      } catch {
        if (!cancelled) setError("Não foi possível pré-visualizar este PDF. Usa o botão de descarregar.");
      }
    }

    void renderPdf();

    return () => {
      cancelled = true;
      void pdfDocument?.destroy?.();
    };
  }, [preview.blob]);

  if (error) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 rounded-md border bg-muted p-6 text-center">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center rounded-md border bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-h-[72vh] space-y-4 overflow-auto rounded-md border bg-muted p-3">
      {pages.map((page, index) => (
        <img
          key={`${preview.filename}-${index}`}
          src={page}
          alt={`${preview.title} — página ${index + 1}`}
          className="mx-auto h-auto max-w-full rounded-sm bg-background shadow-sm"
        />
      ))}
    </div>
  );
}

function ResourcesPage() {
  const fetchCtx = useServerFn(getResourcesContext);
  const [ctx, setCtx] = useState<ResourcesContext | null>(null);
  const [activePhase, setActivePhase] = useState<Phase>("FTC");
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loadingRes, setLoadingRes] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ResourcePreview | null>(null);

  async function openResource(resource: ResourceRow) {
    setOpeningId(resource.id);
    try {
      const response = await fetch(toProxyUrl(resource.file_url));
      if (!response.ok) throw new Error("Não foi possível abrir o ficheiro.");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreview({
        title: resource.title,
        url: blobUrl,
        filename: filenameFromResource(resource),
        blob,
        mimeType: blob.type,
      });
    } finally {
      setOpeningId(null);
    }
  }

  function closePreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  useEffect(() => {
    let mounted = true;
    fetchCtx().then((r: ResourcesContext) => mounted && setCtx(r));
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
      .from("learning_resources" as never)
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
    <>
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Centro de Recursos</h1>
        <p className="text-sm text-muted-foreground">
          Materiais de apoio do teu percurso. Os recursos vão sendo desbloqueados à medida
          que concluis cada fase.
        </p>
      </div>

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
                              onClick={() => void openResource(r)}
                              disabled={openingId === r.id}
                              className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-wait disabled:opacity-70"
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
                              {openingId === r.id ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                              ) : (
                                <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
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
    </div>
      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-5xl gap-4 p-4 sm:p-6">
          <DialogHeader className="space-y-3 pr-8">
            <DialogTitle className="truncate">{preview?.title}</DialogTitle>
            <DialogDescription>
              Pré-visualização do recurso sem abrir uma nova página do browser.
            </DialogDescription>
            {preview && (
              <Button asChild variant="outline" size="sm" className="w-fit">
                <a href={preview.url} download={preview.filename}>
                  <Download className="mr-2 h-4 w-4" />
                  Descarregar
                </a>
              </Button>
            )}
          </DialogHeader>
          {preview && <ResourcePreviewPane preview={preview} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
