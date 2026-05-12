import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const KPIS = [
  { label: "Formandos ativos", value: "1.284" },
  { label: "Formadores", value: "62" },
  { label: "Ações em curso", value: "47" },
  { label: "Taxa de conclusão", value: "87%" },
];

export function WidgetAdminStats() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicadores Globais</CardTitle>
        <CardDescription>Visão geral da plataforma</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border bg-muted/30 p-4">
            <p className="text-2xl font-semibold tracking-tight">{k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
