import { describe, expect, it } from "vitest";
import { lerLink, mensagemEnvio, urlRetorno } from "./recuperacao";

describe("recuperação de senha", () => {
  it("links de e-mail usam o domínio oficial mesmo vindo de outro endereço", () => {
    expect(urlRetorno("/redefinir-senha", "https://itv-finance-compass.lovable.app")).toBe(
      "https://itv-financeiro.lovable.app/redefinir-senha",
    );
    expect(urlRetorno("/definir-senha", "https://id-preview--x.lovable.app")).toBe("https://itv-financeiro.lovable.app/definir-senha");
  });
  it("link expirado é reconhecido", () => {
    expect(lerLink("", "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired")).toEqual({
      tipo: "erro",
      motivo: "expirado",
    });
  });
  it("token de recuperação no link é reconhecido", () => {
    expect(lerLink("?token_hash=abc&type=recovery", "")).toEqual({ tipo: "token_hash", tokenHash: "abc", otpTipo: "recovery" });
    expect(lerLink("", "#access_token=x&type=recovery")).toEqual({ tipo: "sessao_no_link" });
  });
  it("página aberta sem link não libera troca", () => {
    expect(lerLink("", "")).toEqual({ tipo: "nenhum" });
  });
  it("limite de envio gera mensagem de aguardar", () => {
    expect(mensagemEnvio({ status: 429, code: "over_email_send_rate_limit" })).toMatch(/1 hora/);
    expect(mensagemEnvio({ status: 400, message: "user not found" })).toBeNull();
  });
});
