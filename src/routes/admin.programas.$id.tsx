import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { ProgramaDetalhePage } from "@/components/admin/programas/ProgramaPartes";

export const Route = createFileRoute("/admin/programas/$id")({
  head: () => ({ meta: [{ title: "Programa | Gestão" }] }),
  component: ProgramaRoute,
});

function ProgramaRoute() {
  const { id } = Route.useParams();
  return (
    <RouteGate path="/admin/programas">
      <ProgramaDetalhePage programId={id} />
    </RouteGate>
  );
}
