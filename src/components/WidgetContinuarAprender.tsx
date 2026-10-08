import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PlayCircle, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatarDuracao } from "@/components/elearning/shared";
import { listCatalogo } from "@/lib/elearning.functions";

export function WidgetContinuarAprender() {
  const fn = useServerFn(listCatalogo);
  const { data } = useQuery({ queryKey: ["elearning", "catalogo"], queryFn: () => fn() });
  const ativos = (data ?? []).filter((c) => c.inscricao && c.inscricao.estado !== "concluido" && c.inscricao.proximo_passo_id && c.total_passos > 0);
  const emCurso = ativos.filter((c) => c.inscricao?.iniciado);
  const porComecar = ativos.filter((c) => !c.inscricao?.iniciado);
  if (!ativos.length) return null;
  return (
    <section aria-labelledby="continuar-title" className="space-y-5">
      {emCurso.length > 0 && <div>
        <div className="mb-3 flex items-center gap-3">
          <h2 id="continuar-title" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Continuar a aprender</h2>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {emCurso.slice(0, 4).map((c) => (
            <Link key={c.id} to="/elearning/$cursoId/passo/$passoId" params={{ cursoId: c.id, passoId: c.inscricao?.proximo_passo_id ?? "" }}>
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                <PlayCircle className="h-8 w-8 shrink-0 text-accent" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <Progress value={c.inscricao?.pct ?? 0} className="h-1.5" />
                </div>
                <span className="text-xs text-muted-foreground">{c.inscricao?.pct ?? 0}%</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>}
      {porComecar.length > 0 && <div>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{porComecar.length === 1 ? "Tens um curso à tua espera" : "Tens cursos à tua espera"}</h2>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {porComecar.slice(0, 4).map((c) => (
            <Card key={c.id} className="flex items-center gap-3 p-4">
              <Rocket className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatarDuracao(c.total_minutos)} · {c.total_passos} {c.total_passos === 1 ? "momento" : "momentos"}</p>
              </div>
              <Button asChild size="sm" className="min-h-10 shrink-0">
                <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId: c.id, passoId: c.inscricao?.proximo_passo_id ?? "" }}>Começar</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>}
    </section>
  );
}
