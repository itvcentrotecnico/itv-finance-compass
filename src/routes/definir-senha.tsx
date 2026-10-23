import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export const Route = createFileRoute("/definir-senha")({
  head: () => ({
    meta: [
      { title: "Aceitar convite · ITV Financeiro" },
      { name: "description", content: "Defina sua senha inicial para acessar o ITV Financeiro." },
      { property: "og:title", content: "Aceitar convite · ITV Financeiro" },
      { property: "og:description", content: "Defina sua senha inicial para acessar o ITV Financeiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthLayout title="Aceitar convite" subtitle="Defina sua senha inicial para concluir o acesso.">
      <SetPasswordForm submitLabel="Definir senha e entrar" />
    </AuthLayout>
  ),
});
