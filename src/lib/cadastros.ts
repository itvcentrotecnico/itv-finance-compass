import { fin } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/permissions";

export const NATUREZAS = ["receita", "despesa", "ativo", "passivo", "patrimonio"] as const;
export type Natureza = (typeof NATUREZAS)[number];
export const NATUREZA_LABELS: Record<Natureza, string> = {
  receita: "Receita", despesa: "Despesa", ativo: "Ativo", passivo: "Passivo", patrimonio: "Patrimônio líquido",
};

export interface Conta {
  id: string; codigo: string; descricao: string; natureza: Natureza; conta_pai_id: string | null;
  aceita_lancamentos: boolean; ativo: boolean; criado_em: string; atualizado_em: string | null;
}
export interface Centro {
  id: string; codigo: string; descricao: string; responsavel: string | null; ativo: boolean;
  criado_em: string; atualizado_em: string | null;
}
export interface Evento {
  id: number; acao: "criar" | "alterar" | "inativar" | "reativar"; usuario_id: string | null; ocorrido_em: string;
  antes: Record<string, unknown> | null; depois: Record<string, unknown> | null;
}

const CODIGO_RE = /^[A-Za-z0-9._-]{1,32}$/;

/** Mesmas regras das restrições do banco (financeiro_hml). */
export function validarCadastro(v: { codigo: string; descricao: string; responsavel?: string }): Record<string, string> {
  const e: Record<string, string> = {};
  const codigo = v.codigo.trim();
  const desc = v.descricao.trim();
  if (!codigo) e.codigo = "Informe o código.";
  else if (!CODIGO_RE.test(codigo)) e.codigo = "Use até 32 caracteres: letras, números, ponto, hífen ou sublinhado, sem espaços.";
  if (desc.length < 2) e.descricao = "A descrição deve ter ao menos 2 caracteres.";
  else if (desc.length > 160) e.descricao = "A descrição deve ter no máximo 160 caracteres.";
  if (v.responsavel && v.responsavel.trim().length > 120) e.responsavel = "Máximo de 120 caracteres.";
  return e;
}

export function traduzirErro(err: unknown): string {
  const e = err as { code?: string; message?: string } | null;
  const msg = e?.message ?? "";
  if (e?.code === "23505") return "Já existe um registro com este código.";
  if (e?.code === "42501" || /row-level security|permission denied/i.test(msg)) return "Seu perfil não tem permissão para esta operação.";
  if (msg.includes("PC_CICLO")) return "A conta-pai escolhida formaria um ciclo na hierarquia.";
  if (msg.includes("PC_NATUREZA")) return msg.includes("filhas") ? "Uma conta com contas-filhas não pode mudar de natureza." : "A natureza deve ser igual à da conta-pai.";
  if (msg.includes("PC_PAI_INATIVO")) return "A conta-pai está inativa.";
  if (msg.includes("PC_PAI_INEXISTENTE")) return "A conta-pai não foi encontrada.";
  if (msg.includes("PC_FILHAS_ATIVAS")) return "Inative primeiro as contas-filhas ativas.";
  if (e?.code === "23514") return "Os dados não atendem às regras de cadastro.";
  if (/fetch|network/i.test(msg)) return "Falha de conexão. Verifique a internet e tente novamente.";
  return "Não foi possível concluir a operação.";
}

/** Inativar/reativar: banco permite a quem pode alterar (M1/M2). */
export const podeVerAuditoria = (role: Role | null) => role === "admin_geral" || role === "admin_financeiro";

async function run<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(traduzirErro(error));
  return data;
}

export const listarContas = () =>
  run<Conta[]>(fin().from("plano_contas").select("id,codigo,descricao,natureza,conta_pai_id,aceita_lancamentos,ativo,criado_em,atualizado_em").order("codigo"));
export const listarCentros = () =>
  run<Centro[]>(fin().from("centros_custo").select("id,codigo,descricao,responsavel,ativo,criado_em,atualizado_em").order("codigo"));

export function salvar(tabela: "plano_contas" | "centros_custo", id: string | null, valores: Record<string, unknown>) {
  const q = id ? fin().from(tabela).update(valores).eq("id", id) : fin().from(tabela).insert(valores);
  return run<unknown>(q.select("id").single());
}

export const historico = (tabela: string, id: string) =>
  run<Evento[]>(fin().from("auditoria").select("id,acao,usuario_id,ocorrido_em,antes,depois").eq("tabela", tabela).eq("registro_id", id).order("ocorrido_em", { ascending: false }).limit(50));

/** Ordena contas em árvore (pai antes das filhas) com nível de profundidade. */
export function montarArvore(contas: Conta[]): Array<Conta & { nivel: number }> {
  const filhos = new Map<string | null, Conta[]>();
  const ids = new Set(contas.map((c) => c.id));
  for (const c of contas) {
    const k = c.conta_pai_id && ids.has(c.conta_pai_id) ? c.conta_pai_id : null;
    filhos.set(k, [...(filhos.get(k) ?? []), c]);
  }
  const out: Array<Conta & { nivel: number }> = [];
  const visit = (k: string | null, nivel: number) => {
    for (const c of (filhos.get(k) ?? []).sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }))) {
      out.push({ ...c, nivel });
      if (nivel < 50) visit(c.id, nivel + 1);
    }
  };
  visit(null, 0);
  return out;
}

/** IDs que não podem ser pai de `id` (ele mesmo e descendentes). */
export function descendentes(contas: Conta[], id: string): Set<string> {
  const s = new Set([id]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const c of contas) if (c.conta_pai_id && s.has(c.conta_pai_id) && !s.has(c.id)) { s.add(c.id); mudou = true; }
  }
  return s;
}
