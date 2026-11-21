import { describe, expect, it } from "vitest";
import { badgeValido, expiraAntes, validadeTexto } from "./badges-etapas";

describe("badges das etapas", () => {
  it("descreve a validade", () => {
    expect(validadeTexto({ validity_type: "forever", validity_years: null, validity_fixed_date: null })).toBe("Permanente");
    expect(validadeTexto({ validity_type: "relative_years", validity_years: 2, validity_fixed_date: null })).toBe("2 anos a partir da atribuição");
    expect(validadeTexto(null, "presenca_ftp")).toBe("Até ao fim do ano letivo da FTP");
    expect(validadeTexto(null)).toBe("—");
  });

  it("deteta badges que acabam antes do fim do percurso", () => {
    expect(expiraAntes("2027-07-31T23:59:59Z", "2027-08-31")).toBe("2027-07-31");
    expect(expiraAntes("2027-08-31T23:59:59Z", "2027-08-31")).toBeNull();
    expect(expiraAntes(null, "2027-08-31")).toBeNull();
  });

  it("valida pela data de fim", () => {
    expect(badgeValido(null)).toBe(true);
    expect(badgeValido("2000-01-01T00:00:00Z")).toBe(false);
  });
});
