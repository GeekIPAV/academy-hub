import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";

type RouteGateProps = {
  path: string;
  children: React.ReactNode;
};

/**
 * Bloqueia o conteúdo de uma rota com base na matriz de permissões
 * (Central de Comando). Admin vê sempre. Sem permissão, mostra um
 * cartão "Acesso restrito".
 */
export function RouteGate({ path, children }: RouteGateProps) {
  const { canAccess } = useApp();

  if (!canAccess(path)) {
    return (
      <Card className="mx-auto mt-12 max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Não tens permissão para aceder a esta página. Contacta um administrador
          se achas que isto é um engano.
        </p>
      </Card>
    );
  }

  return <>{children}</>;
}
