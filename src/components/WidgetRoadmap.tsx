import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Briefcase, Sparkles, HeartHandshake, Loader2 } from "lucide-react";
import { getRoadmap, type RoadmapItem, type RoadmapPhase } from "@/lib/roadmap.functions";

const ICONS: Record<RoadmapPhase, React.ComponentType<{ className?: string }>> = {
  FTC: GraduationCap,
  FTP: Briefcase,
  SU: Sparkles,
  SF: HeartHandshake,
};

function statusBadge(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("aberto")) return { label: "Aberto", variant: "default" as const };
  if (s.includes("agendad")) return { label: "Agendado", variant: "secondary" as const };
  if (s.includes("fechad")) return { label: "Fechado", variant: "outline" as const };
  return { label: status ?? "—", variant: "secondary" as const };
}

export function WidgetRoadmap() {
  const fetchRoadmap = useServerFn(getRoadmap);
  const [items, setItems] = useState<RoadmapItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchRoadmap()
      .then((r: RoadmapItem[]) => mounted && setItems(r))
      .catch((e: Error) => mounted && setError(e.message));
    return () => {
      mounted = false;
    };
  }, [fetchRoadmap]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">O Meu Percurso</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <p className="px-6 pb-6 text-sm text-destructive">{error}</p>
        ) : !items ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((item) => {
              const Icon = ICONS[item.phase];
              const disabled = !item.action;
              const badge = disabled
                ? { label: "A aguardar agendamento", variant: "outline" as const }
                : statusBadge(item.action!.registration_status);

              const row = (
                <div
                  className={`flex items-center gap-3 px-6 py-3 ${
                    disabled ? "opacity-50" : "transition-colors hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    {item.action?.title && (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.action.title}
                      </p>
                    )}
                  </div>
                  <Badge variant={badge.variant} className="shrink-0 text-xs">
                    {badge.label}
                  </Badge>
                </div>
              );

              return (
                <li key={item.phase}>
                  {disabled ? (
                    row
                  ) : (
                    <Link
                      to="/actions/$id"
                      params={{ id: item.action!.id }}
                      className="block"
                    >
                      {row}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
