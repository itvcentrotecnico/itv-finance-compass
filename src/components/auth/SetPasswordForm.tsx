import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "./AuthLayout";
import { MIN_PASSWORD, translateAuthError, validatePassword } from "@/lib/auth/session";

/** Define a senha usando a sessão temporária criada pelo link (convite ou recuperação). */
export function SetPasswordForm({ submitLabel }: { submitLabel: string }) {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("error")) {
      setState("invalid");
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active && session) setState("ready");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setState("ready");
      else setTimeout(() => active && setState((s) => (s === "checking" ? "invalid" : s)), 2500);
    });
    return () => {
      active = false;
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
    setSaving(false);
    if (error) return setError(translateAuthError(error.message));
    navigate({ to: "/", replace: true });
  }

  if (state === "checking")
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Validando link…
      </p>
    );
  if (state === "invalid")
    return (
      <div className="space-y-4">
        <FormError message="Link inválido ou expirado. Solicite um novo link." />
        <Link to="/recuperar-senha" className="text-sm font-medium text-brand hover:underline">Solicitar novo link</Link>
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
