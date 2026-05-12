import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const COHORTS = [
  { name: "Turma Lisboa A", students: 18, phase: "FTC" },
  { name: "Turma Porto B", students: 22, phase: "SU" },
];

export function WidgetTrainerCohorts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>As Minhas Turmas</CardTitle>
        <CardDescription>Acompanhamento dos grupos ativos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {COHORTS.map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.students} formandos</p>
            </div>
            <Badge variant="outline">{c.phase}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
