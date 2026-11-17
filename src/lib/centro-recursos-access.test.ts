import { describe, expect, it } from "vitest";
import { hasCentroRecursosAccess } from "./centro-recursos-access";

describe("acesso ao Centro de recursos", () => {
  it.each(["Utilizador", "Entidade", "Admin", "Equipa IPAV", "Teste"])("%s tem acesso", (role) => {
    expect(hasCentroRecursosAccess([role])).toBe(true);
  });
  it("sem tipo não tem acesso", () => {
    expect(hasCentroRecursosAccess([])).toBe(false);
  });
  it("outro tipo não tem acesso", () => {
    expect(hasCentroRecursosAccess(["Formador"])).toBe(false);
  });
});
