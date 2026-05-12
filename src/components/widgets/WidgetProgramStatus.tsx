import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_ENROLLMENTS, MOCK_TRAINING_ACTIONS } from "@/lib/mock-data";
import { useApp } from "@/lib/app-context";
import { Check, Clock, ArrowRight } from "lucide-react";
import type { TrainingCategory } from "@/lib/types";

const PHASES: { key: TrainingCategory; label: string }[] = [
  { key: "FTC", label: "Formação Teórica Comum" },
  { key: "FTP", label: "Formação Teórico-Prática" },
  { key: "SU", label: "Semana Ubuntu" },
  { key: "SF", label: "Serviço Final" },
];

export function WidgetProgramStatus() {
  const { profile } = useApp();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ponto de Situação</CardTitle>
        <CardDescription>O seu percurso no programa Ubuntu</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {PHASES.map((phase) => {
          const action = MOCK_TRAINING_ACTIONS.find((a) => a.category === phase.key);
          const enrollment = action
            ? MOCK_ENROLLMENTS.find(
                (e) => e.user_id === profile.id && e.action_id === action.id,
              )
            : undefined;

          let state: "done" | "open" | "scheduled" | "closed" = "closed";
          if (enrollment?.status === "completed") state = "done";
          else if (action?.status === "open") state = "open";
          else if (action?.status === "scheduled") state = "scheduled";

          return (
            <div
              key={phase.key}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="outline" className="mb-2">
                    {phase.key}
                  </Badge>
                  <p className="text-sm font-medium leading-tight">{phase.label}</p>
                </div>
              </div>
              {state === "done" && (
                <Button size="sm" variant="secondary" disabled className="gap-2">
                  <Check className="h-4 w-4" /> Concluído
                </Button>
              )}
              {state === "open" && (
                <Button size="sm" className="gap-2">
                  Inscrever <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {state === "scheduled" && (
                <Button size="sm" variant="outline" disabled className="gap-2">
                  <Clock className="h-4 w-4" /> A aguardar abertura
                </Button>
              )}
              {state === "closed" && (
                <Button size="sm" variant="ghost" disabled>
                  Indisponível
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
