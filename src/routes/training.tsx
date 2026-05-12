import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_TRAINING_ACTIONS } from "@/lib/mock-data";

export const Route = createFileRoute("/training")({
  head: () => ({ meta: [{ title: "Formações — Academia Ubuntu" }] }),
  component: TrainingPage,
});

function TrainingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Formações</h1>
        <p className="text-sm text-muted-foreground">Ações de formação disponíveis.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {MOCK_TRAINING_ACTIONS.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{a.category}</Badge>
                <Badge variant={a.status === "open" ? "default" : "secondary"}>
                  {a.status}
                </Badge>
              </div>
              <CardTitle className="mt-2 text-base">{a.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Ação de formação Ubuntu.
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
