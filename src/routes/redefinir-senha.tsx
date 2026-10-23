import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha · ITV Financeiro" },
      { name: "description", content: "Defina uma nova senha de acesso ao ITV Financeiro." },
      { property: "og:title", content: "Redefinir senha · ITV Financeiro" },
      { property: "og:description", content: "Defina uma nova senha de acesso ao ITV Financeiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthLayout title="Redefinir senha" subtitle="Escolha uma nova senha de acesso.">
      <SetPasswordForm submitLabel="Salvar nova senha" />
    </AuthLayout>
  ),
});
