import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isRole, type Role } from "./permissions";

/** Cliente apontando para o esquema financeiro_hml (não presente nos tipos gerados). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fin = () => (supabase as any).schema("financeiro_hml");

export async function fetchOwnRole(userId: string): Promise<Role | null> {
  const { data, error } = await fin()
    .from("perfis")
    .select("papel, ativo")
    .eq("usuario_id", userId)
    .maybeSingle();
  if (error || !data || !data.ativo) return null;
  return isRole(data.papel) ? data.papel : null;
}

export async function signOutClean(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
}

export function translateAuthError(message?: string): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "E-mail ou senha inválidos.";
  if (m.includes("email not confirmed")) return "Acesso ainda não confirmado. Use o link do convite.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (m.includes("same") && m.includes("password")) return "A nova senha deve ser diferente da anterior.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("password should")) return "Senha fraca. Use uma senha mais forte.";
  if (m.includes("network") || m.includes("fetch")) return "Falha de conexão. Verifique a internet e tente novamente.";
  return "Não foi possível concluir a operação. Tente novamente.";
}

export const MIN_PASSWORD = 12;

export function validatePassword(pw: string, confirm: string): string | null {
  if (pw.length < MIN_PASSWORD) return `A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "A senha deve conter letras e números.";
  if (pw !== confirm) return "As senhas não conferem.";
  return null;
}
