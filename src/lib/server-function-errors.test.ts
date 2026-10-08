import { describe, expect, it } from "vitest";
import { normalizeServerFunctionError } from "./server-function-errors";

describe("erros de funções autenticadas", () => {
  it("converte sessão expirada numa mensagem legível", () => {
    const error = normalizeServerFunctionError(new Response("Unauthorized", { status: 401 }));
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("sessão terminou");
  });
  it("não expõe o corpo das respostas internas", () => {
    const error = normalizeServerFunctionError(new Response("Internal configuration", { status: 500 }));
    expect((error as Error).message).not.toContain("Internal configuration");
  });
  it("preserva erros normais e redirecionamentos", () => {
    const error = new Error("Momento bloqueado");
    const redirect = { isRedirect: true, to: "/auth" };
    expect(normalizeServerFunctionError(error)).toBe(error);
    expect(normalizeServerFunctionError(redirect)).toBe(redirect);
  });
});