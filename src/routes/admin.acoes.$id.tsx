import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { AcaoDetalhePage } from "@/components/admin/acoes/AcaoDetalhe";
import { MARCA_GESTAO, seo, titulo } from "@/lib/seo";

export const Route = createFileRoute("/admin/acoes/$id")({
  head: () => ({
    meta: seo({
      title: titulo("Ação", MARCA_GESTAO),
      description: "Dados, inscrições, presenças e avaliações de uma ação.",
      privada: true,
    }),
  }),
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
