import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "./AuthLayout";
import { MIN_PASSWORD, translateAuthError, validatePassword } from "@/lib/auth/session";
import { lerLink, mensagemLinkInvalido } from "@/lib/auth/recuperacao";

type Estado =
  | { s: "checking" }
  | { s: "ready" }
  | { s: "invalid"; motivo: "expirado" | "invalido" | "sem_link" }
  | { s: "done" };

/**
 * Define a senha usando a sessão temporária criada pelo link (convite ou recuperação).
 * Só libera o formulário quando o próprio link do e-mail foi validado pelo Supabase;
 * abrir a página sem link (ou com sessão comum) não permite trocar a senha.
 */
export function SetPasswordForm({ submitLabel }: { submitLabel: string }) {
  const [estado, setEstado] = useState<Estado>({ s: "checking" });
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const link = lerLink(window.location.search, window.location.hash);
    const pronto = () => {
      if (!active) return;
      // Remove o token da barra de endereço depois de validado.
      window.history.replaceState(null, "", window.location.pathname);
      setEstado({ s: "ready" });
    };
    const invalido = (motivo: "expirado" | "invalido" | "sem_link") => active && setEstado({ s: "invalid", motivo });

    if (link.tipo === "erro") {
      invalido(link.motivo);
      return;
    }
    if (link.tipo === "nenhum") {
      invalido("sem_link");
      return;
    }
    if (link.tipo === "token_hash") {
      supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.otpTipo }).then(({ data, error }) => {
        if (error || !data.session) invalido("expirado");
        else pronto();
      });
      return () => {
        active = false;
      };
    }

    // Sessão no próprio link (#access_token ou ?code): o cliente do Supabase a processa.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) pronto();
    });
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) pronto();
      else invalido("expirado");
    }, 4000);
    return () => {
      active = false;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validatePassword(pw, confirm);
    if (v) return setError(v);
    setError(null);
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setSaving(false);
      const m = error.message.toLowerCase();
      if (m.includes("session") || m.includes("jwt") || m.includes("expired"))
        return setEstado({ s: "invalid", motivo: "expirado" });
      return setError(translateAuthError(error.message));
    }
    // Encerra a sessão temporária: o usuário entra de novo com a nova senha.
    await supabase.auth.signOut();
    setSaving(false);
    setEstado({ s: "done" });
  }

  if (estado.s === "checking")
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Validando link…
      </p>
    );
  if (estado.s === "invalid")
    return (
      <div className="space-y-4">
        <FormError message={mensagemLinkInvalido(estado.motivo)} />
        <div className="flex flex-col gap-2">
          <Link to="/recuperar-senha" className="text-sm font-medium text-brand hover:underline">Solicitar novo link</Link>
          <Link to="/auth" className="text-sm text-muted-foreground hover:underline">Voltar para o login</Link>
        </div>
      </div>
    );
  if (estado.s === "done")
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-md border bg-muted px-3 py-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
          Senha alterada com sucesso. Entre com seu e-mail e a nova senha.
        </p>
        <Button asChild className="w-full">
          <Link to="/auth">Ir para o login</Link>
        </Button>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="pw">Nova senha</Label>
        <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <p className="text-xs text-muted-foreground">Mínimo de {MIN_PASSWORD} caracteres, com letras e números.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pw2">Confirmar senha</Label>
        <Input id="pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </div>
      <FormError message={error} />
      <Button type="submit" className="w-full" disabled={saving}>
        {saving && <Loader2 className="size-4 animate-spin" />} {submitLabel}
      </Button>
    </form>
  );
}
