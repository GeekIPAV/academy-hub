import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { CertificacaoForm } from "@/components/CertificacaoForm";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/dados-certificacao")({
  head: () => ({ meta: [{ title: "Dados de certificação | Academia de Líderes Ubuntu" }] }),
  component: CertificationPage,
});

function CertificationPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return (
    <PageShell>
      <PageHeader
        eyebrow="O meu perfil"
        title="Dados de certificação"
        description="Usados para emitir os teus certificados de formação. Preenches uma vez e servem para todas as inscrições. Tens de os completar para continuar a usar a plataforma."
      />
      <CertificacaoForm
        comIndice
        onSaved={async () => {
          await qc.invalidateQueries({ queryKey: ["cert-gate-status"] });
          navigate({ to: "/dashboard" });
        }}
      />
    </PageShell>
  );
}
