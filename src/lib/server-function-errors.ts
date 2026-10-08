/** HTTP failures must be serializable errors, not raw Response objects in RPCs. */
export function normalizeServerFunctionError(error: unknown): unknown {
  if (!(error instanceof Response)) return error;
  const message = error.status === 401
    ? "A tua sessão terminou. Inicia sessão novamente."
    : error.status === 403
      ? "Não tens permissão para aceder a este conteúdo."
      : "Não foi possível concluir o pedido. Tenta novamente.";
  return new Error(message);
}