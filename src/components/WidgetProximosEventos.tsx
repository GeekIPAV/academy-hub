import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listProximosEventos, type ProximoEvento } from "@/lib/actions.functions";

function partesData(valor: string | null) {
  if (!valor) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  const opts = { timeZone: "Europe/Lisbon" } as const;
  return {
    dia: d.toLocaleDateString("pt-PT", { ...opts, day: "2-digit" }),
    mes: d.toLocaleDateString("pt-PT", { ...opts, month: "short" }).replace(".", ""),
  };
}

function EventoCard({ evento }: { evento: ProximoEvento }) {
  const data = partesData(evento.start_date);
  const local = [evento.formato, evento.localizacao ?? evento.pais].filter(Boolean).join(" · ");
  return (
    <Link to="/evento/$id" params={{ id: evento.id }} className="block min-w-0">
      <Card className="flex min-w-0 items-center gap-3 p-4 transition-colors hover:bg-muted/50">
        <div
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <span className="text-lg font-semibold leading-none">{data?.dia ?? "—"}</span>
          <span className="mt-0.5 text-[11px] uppercase leading-none">{data?.mes ?? ""}</span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="break-words text-sm font-medium">{evento.title ?? "(sem título)"}</p>
          {local && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{local}</span>
            </p>
          )}
        </div>
        <Badge
          variant={evento.registration_status === "Aberto" ? "default" : "secondary"}
          className="shrink-0"
        >
          {evento.registration_status === "Aberto" ? "Inscrições abertas" : "Em breve"}
        </Badge>
      </Card>
    </Link>
  );
}

export function WidgetProximosEventos() {
  const fn = useServerFn(listProximosEventos);
  const { data, isLoading } = useQuery({
    queryKey: ["proximos-eventos"],
    queryFn: () => fn(),
  });

  return (
    <section aria-labelledby="proximos-eventos-title" className="space-y-3">
      <div className="flex items-center gap-3">
        <h2
          id="proximos-eventos-title"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Próximos eventos
        </h2>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <Link
          to="/acoes"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver todos
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-[5.5rem] w-full" />
          <Skeleton className="h-[5.5rem] w-full" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <CalendarDays className="h-5 w-5 shrink-0" aria-hidden="true" />
          Não há eventos próximos para o teu perfil.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((e) => (
            <EventoCard key={e.id} evento={e} />
          ))}
        </div>
      )}
    </section>
  );
}
