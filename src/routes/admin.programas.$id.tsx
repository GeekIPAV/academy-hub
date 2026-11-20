import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { ProgramaDetalhePage } from "@/components/admin/programas/ProgramaPartes";
import { MARCA_GESTAO, seo, titulo } from "@/lib/seo";

export const Route = createFileRoute("/admin/programas/$id")({
  head: () => ({
    meta: seo({
      title: titulo("Programa", MARCA_GESTAO),
      description: "Dados, organizações inscritas e participantes de um programa.",
      privada: true,
    }),
  }),
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
