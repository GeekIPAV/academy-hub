import { createFileRoute } from "@tanstack/react-router";
import { RouteGate } from "@/components/RouteGate";
import { ProgramaDetalhePage, SEPARADORES_PROGRAMA, type SeparadorPrograma } from "@/components/admin/programas/ProgramaPartes";
import { MARCA_GESTAO, seo, titulo } from "@/lib/seo";

export const Route = createFileRoute("/admin/programas/$id")({
  validateSearch: (s: Record<string, unknown>): { sep?: SeparadorPrograma } =>
    typeof s.sep === "string" && (SEPARADORES_PROGRAMA as readonly string[]).includes(s.sep)
      ? { sep: s.sep as SeparadorPrograma }
      : {},
  head: () => ({
    meta: seo({
      title: titulo("Programa", MARCA_GESTAO),
      description: "Dados, organizações, participantes, etapas e badges e calendário FTP de um programa.",
      privada: true,
    }),
  }),
  component: ProgramaRoute,
});

function ProgramaRoute() {
  const { id } = Route.useParams();
  const { sep } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <RouteGate path="/admin/programas">
      <ProgramaDetalhePage
        programId={id}
        separador={sep ?? "dados"}
        onSeparador={(s) => navigate({ search: s === "dados" ? {} : { sep: s }, replace: true })}
      />
    </RouteGate>
  );
}
