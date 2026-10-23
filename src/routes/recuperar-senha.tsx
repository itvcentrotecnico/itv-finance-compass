import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout, FormError } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha · ITV Financeiro" },
      { name: "description", content: "Solicite o link para redefinir sua senha do ITV Financeiro." },
      { property: "og:title", content: "Recuperar senha · ITV Financeiro" },
      { property: "og:description", content: "Solicite o link para redefinir sua senha do ITV Financeiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecoverPage,
});

function RecoverPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Informe um e-mail válido.");
    setError(null);
    setLoading(true);
    // Resposta idêntica exista ou não o e-mail (não revela contas).
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <AuthLayout title="Recuperar senha" subtitle="Enviaremos um link para redefinir sua senha.">
      {sent ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-md border bg-muted px-3 py-3 text-sm">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-brand" />
            Se o e-mail estiver cadastrado, você receberá o link em instantes.
          </p>
          <Link to="/auth" className="text-sm font-medium text-brand hover:underline">Voltar para o login</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <FormError message={error} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />} Enviar link
          </Button>
          <Link to="/auth" className="block text-center text-sm text-muted-foreground hover:underline">Voltar para o login</Link>
        </form>
      )}
    </AuthLayout>
  );
}
