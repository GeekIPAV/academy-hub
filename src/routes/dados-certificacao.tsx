import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { CertificacaoForm } from "@/components/CertificacaoForm";

export const Route = createFileRoute("/dados-certificacao")({
  head: () => ({ meta: [{ title: "Dados de Certificação — Academia Ubuntu" }] }),
  component: CertificationPage,
});

function CertificationPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dados de Certificação</h1>
        <p className="text-sm text-muted-foreground">
          Estes dados são obrigatórios para a emissão dos certificados de participação nos
          programas em que está inscrito/a.
        </p>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Preenchimento obrigatório</AlertTitle>
        <AlertDescription>
          Tem de concluir o preenchimento destes dados para poder continuar a navegar na
          plataforma.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Os meus dados</CardTitle>
          <CardDescription>Os campos marcados com * são obrigatórios.</CardDescription>
        </CardHeader>
        <CardContent>
          <CertificacaoForm
            onSaved={async () => {
              await qc.invalidateQueries({ queryKey: ["cert-gate-status"] });
              navigate({ to: "/dashboard" });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
