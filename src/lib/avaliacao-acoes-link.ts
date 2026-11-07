import { toast } from "sonner";

export const avaliacoesQueryKey = (actionId: string) => ["acao-avaliacoes", actionId] as const;

export function avaliacaoUrl(token: string) {
  return typeof window !== "undefined"
    ? `${window.location.origin}/avaliar/${token}`
    : `/avaliar/${token}`;
}

export async function copiarLinkAvaliacao(token: string) {
  try {
    await navigator.clipboard.writeText(avaliacaoUrl(token));
    toast.success("Link de avaliação copiado.");
    return true;
  } catch {
    toast.error("Não foi possível copiar o link.");
    return false;
  }
}
