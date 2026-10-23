import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout, FormError } from "@/components/auth/AuthLayout";
import { translateAuthError } from "@/lib/auth/session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · ITV Financeiro" },
      { name: "description", content: "Acesso restrito à plataforma financeira da ITV Centro Técnico." },
      { property: "og:title", content: "Entrar · ITV Financeiro" },
      { property: "og:description", content: "Acesso restrito à plataforma financeira da ITV Centro Técnico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Informe e-mail e senha.");
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return setError(translateAuthError(error.message));
    navigate({ to: "/", replace: true });
  }

  return (
    <AuthLayout title="Entrar" subtitle="Acesso exclusivo para usuários convidados.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link to="/recuperar-senha" className="text-xs font-medium text-brand hover:underline">Esqueci a senha</Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />} Entrar
        </Button>
        <p className="text-center text-xs text-muted-foreground">Não há cadastro público. Solicite acesso ao Administrador Geral.</p>
      </form>
    </AuthLayout>
  );
}
