import { describe, it, expect } from "vitest";
import { normalizarNumeroOS, referenciaDaOS, exibirReferencia } from "./lancamentos";
describe("Número da OS", () => {
  it("1323, OS 1323 e os 1323 são a mesma OS", () => {
    for (const v of ["1323", "OS 1323", "os 1323", "  OS   1323 "]) expect(normalizarNumeroOS(v)).toBe("1323");
  });
  it("preserva zeros à esquerda", () => expect(normalizarNumeroOS("OS 001323")).toBe("001323"));
  it("recusa inválidos", () => { for (const v of ["", "OS", "abc", "13 23", "OS-1323x"]) expect(normalizarNumeroOS(v)).toBeNull(); });
  it("converte para externo:os-1323", () => expect(referenciaDaOS("1323")).toBe("externo:os-1323"));
  it("exibe OS 1323 e preserva outros tipos", () => {
    expect(exibirReferencia("externo:os-1323")).toBe("OS 1323");
    expect(exibirReferencia("externo:nf-325")).toBe("externo:nf-325");
  });
});
