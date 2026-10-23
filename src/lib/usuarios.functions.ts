import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InviteInput = z.object({
  email: z.string().trim().email().max(254),
  papel: z.enum(["admin_geral", "admin_financeiro", "analista_financeiro", "consulta_gerencial"]),
  redirectTo: z.string().url().max(500),
});

/** Convite de usuário: somente Administrador Geral ativo (verificado no banco, como o próprio usuário). */
export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InviteInput.parse(input))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fin = (context.supabase as any).schema("financeiro_hml");
    const { data: isAdmin, error: roleErr } = await fin.rpc("tem_papel", { p: ["admin_geral"] });
    if (roleErr || isAdmin !== true) throw new Error("Acesso negado.");

    const redirect = new URL(data.redirectTo);
    if (redirect.pathname !== "/definir-senha") throw new Error("Endereço de retorno inválido.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: redirect.toString(),
    });
    if (error || !invited?.user) throw new Error("Não foi possível enviar o convite. Verifique se o e-mail já está cadastrado.");

    // Perfil criado como o próprio administrador: o RLS confirma a permissão.
    const { error: perfilErr } = await fin.from("perfis").insert({ usuario_id: invited.user.id, papel: data.papel });
    if (perfilErr) throw new Error("Convite enviado, mas o perfil não foi criado. Revise em Usuários.");
    return { ok: true };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fin = (context.supabase as any).schema("financeiro_hml");
    const { data: isAdmin } = await fin.rpc("tem_papel", { p: ["admin_geral"] });
    if (isAdmin !== true) throw new Error("Acesso negado.");
    const { data: perfis, error } = await fin.from("perfis").select("usuario_id, papel, ativo, criado_em").order("criado_em");
    if (error) throw new Error("Falha ao carregar perfis.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const emails = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    return (perfis as { usuario_id: string; papel: string; ativo: boolean; criado_em: string }[]).map((p) => ({
      ...p,
      email: emails.get(p.usuario_id) ?? "",
    }));
  });

const UpdateInput = z.object({
  usuario_id: z.string().uuid(),
  papel: z.enum(["admin_geral", "admin_financeiro", "analista_financeiro", "consulta_gerencial"]),
  ativo: z.boolean(),
});

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fin = (context.supabase as any).schema("financeiro_hml");
    const { data: rows, error } = await fin
      .from("perfis")
      .update({ papel: data.papel, ativo: data.ativo })
      .eq("usuario_id", data.usuario_id)
      .select("usuario_id");
    if (error) throw new Error(error.message.includes("último") ? "Não é permitido remover o último Administrador Geral ativo." : "Alteração não permitida.");
    if (!rows?.length) throw new Error("Alteração não permitida.");
    return { ok: true };
  });
