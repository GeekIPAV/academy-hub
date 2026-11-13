import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AcaoDetalhePage } from "@/components/admin/acoes/AcaoDetalhe";

export const Route = createFileRoute("/admin/acoes/$id")({
  head: () => ({ meta: [{ title: "Ação | Gestão" }] }),
  component: AcaoRoute,
});

function AcaoRoute() {
  const { id } = Route.useParams();
  return (
    <RouteGate path="/admin/acoes">
      <AcaoDetalhePage actionId={id} />
    </RouteGate>
  );
}
