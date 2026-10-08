import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurso } from "@/lib/elearning.functions";

export function CatalogModuleList({ cursoId }: { cursoId: string }) {
  const fetchCurso = useServerFn(getCurso);
  const { data, isPending, error } = useQuery({
    queryKey: ["elearning", "curso", cursoId],
    queryFn: () => fetchCurso({ data: { cursoId } }),
  });
  if (isPending) return <div className="space-y-3 py-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  if (!data) return <p className="text-xs text-destructive">{error instanceof Error ? error.message : "Não foi possível carregar os módulos."}</p>;
  const currentId = data.curso.inscricao?.proximo_passo_id;

  return <ol aria-label="Percurso dos módulos" className="space-y-0">
    {data.modulos.map((modulo, index) => {
      const required = modulo.passos.filter((p) => p.obrigatorio);
      const done = modulo.passos.length > 0 && (required.length ? required : modulo.passos).every((p) => p.estado === "concluido");
      const next = modulo.passos.find((p) => p.id === currentId) ?? modulo.passos.find((p) => p.estado !== "bloqueado" && p.estado !== "concluido") ?? modulo.passos.find((p) => p.estado !== "bloqueado");
      const empty = modulo.passos.length === 0;
      const locked = empty || !next;
      const current = modulo.passos.some((p) => p.id === currentId);
      const status = empty ? "Em breve" : done ? "Concluído" : locked ? modulo.passos[0]?.bloqueio_motivo ?? "Bloqueado" : current && data.curso.inscricao?.iniciado ? "Em curso" : "Disponível";
      const content = <>
        <span className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold ${done ? "border-notebook bg-notebook text-notebook-foreground" : current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>{done ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
        <span className="min-w-0 flex-1"><span className={`block text-sm font-semibold leading-5 ${current ? "text-secondary" : "text-foreground"}`}>Módulo {index + 1}: {modulo.title}</span><span className="mt-1 block text-xs leading-4 text-muted-foreground">{status}{!empty && !locked && !done ? ` · ${modulo.passos.length} momentos` : ""}</span></span>
        {locked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      </>;
      return <li key={modulo.id} className="relative min-w-0 py-2.5">
        {index < data.modulos.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-8 w-px bg-border" />}
        {next && !locked ? <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: next.id }} className="flex min-w-0 items-start gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:underline">{content}</Link> : <div className="flex min-w-0 items-start gap-3">{content}</div>}
      </li>;
    })}
  </ol>;
}