import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Lock, FileText, Video, BookOpen, Download, Loader2, GraduationCap, Briefcase, Sparkles, HeartHandshake } from "lucide-react";
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

const MOCK_RESOURCES: Record<Phase, { title: string; description: string; Icon: React.ComponentType<{ className?: string }>; href: string }[]> = {
  FTC: [
    { title: "Guião do Formando — FTC", description: "Manual completo (PDF)", Icon: FileText, href: "#" },
    { title: "Vídeo da Sessão de Abertura", description: "45 min", Icon: Video, href: "#" },
    { title: "Bibliografia recomendada", description: "Lista de leituras", Icon: BookOpen, href: "#" },
  ],
  FTP: [
    { title: "Caderno de Exercícios — FTP", description: "Atividades práticas (PDF)", Icon: FileText, href: "#" },
    { title: "Templates de Projeto", description: "Modelos editáveis", Icon: Download, href: "#" },
  ],
  SU: [
    { title: "Programa da Semana Ubuntu", description: "Agenda detalhada", Icon: FileText, href: "#" },
    { title: "Vídeo de testemunhos", description: "Edições anteriores", Icon: Video, href: "#" },
  ],
  SF: [
    { title: "Guião da Sessão Final", description: "Estrutura e objetivos", Icon: FileText, href: "#" },
    { title: "Modelo de Apresentação", description: "Slides base", Icon: Download, href: "#" },
  ],
};

function ResourcesPage() {
  const fetchCtx = useServerFn(getResourcesContext);
  const [ctx, setCtx] = useState<ResourcesContext | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchCtx().then((r: ResourcesContext) => mounted && setCtx(r));
    return () => {
      mounted = false;
    };
  }, [fetchCtx]);

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Centro de Recursos</h1>
        <p className="text-sm text-muted-foreground">
          Materiais de apoio do teu percurso. Os recursos vão sendo desbloqueados à medida
          que concluis cada fase.
        </p>
      </div>

      <Tabs defaultValue="FTC">
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
                  {unlocked ? (
                    <ul className="divide-y">
                      {MOCK_RESOURCES[p].map((r) => (
                        <li key={r.title}>
                          <a
                            href={r.href}
                            className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/50 -mx-2 px-2 rounded-md"
                          >
                            <r.Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{r.title}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {r.description}
                              </p>
                            </div>
                            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <Lock className="h-6 w-6 text-muted-foreground" />
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Estes recursos ficarão disponíveis após a conclusão da {label}.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
