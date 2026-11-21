import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { getBloqueioSemanaUbuntu } from "@/lib/ftp-etapas.functions";

/**
 * O bloco Semana Ubuntu de um cluster está fechado a este utilizador?
 * A mesma regra é aplicada aos recursos na base de dados
 * (recurso_bloqueado_semana_ubuntu, migração 0011).
 */
export function useBloqueioSemanaUbuntu(clusterId: string | null | undefined) {
  const fn = useServerFn(getBloqueioSemanaUbuntu);
  const { data } = useQuery({
    queryKey: ["bloqueio-semana-ubuntu", clusterId ?? null],
    enabled: !!clusterId,
    queryFn: () => fn({ data: { clusterId: clusterId ?? null } }),
  });
  return data ?? { bloqueado: false, badge: null };
}

export function BlocoSemanaUbuntuFechado({ badge, compacto }: { badge: string | null; compacto?: boolean }) {
  return (
    <div className={`flex gap-3 rounded-xl border border-dashed bg-muted/30 ${compacto ? "p-4" : "p-6"}`}>
      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-secondary">A Semana Ubuntu abre depois da FTP</p>
        <p className="text-sm text-muted-foreground">
          Estes temas ficam disponíveis quando a equipa IPAV marca a tua presença na FTP
          {badge ? ` e recebes o badge «${badge}»` : ""}.
        </p>
        <Link to="/dashboard" className="inline-block text-xs font-medium text-secondary underline-offset-4 hover:underline">
          Ver o meu percurso
        </Link>
      </div>
    </div>
  );
}
