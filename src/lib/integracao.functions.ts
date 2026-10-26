/**
 * Integração GESTÃO ITV → ITV FINANCEIRO HML (somente leitura na origem).
 * A identidade de leitura fica em segredos de servidor (GESTAO_ITV_USUARIO/SENHA);
 * sem ela a conexão permanece desabilitada. Nenhuma credencial vai ao navegador.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { montarItens, type FonteGestao } from "./integracao";

// URL e chave pública (publishable) da origem: seguras para código-fonte.
const ORIGEM_URL = "https://lyfgkhryrhytggexvjvn.supabase.co";
const ORIGEM_KEY = "sb_publishable_NUGiKn_kkYWC2bLzWrKTPg_q6qHprsq";

export interface Sincronizacao {
  id: string;
  iniciado_em: string;
  concluido_em: string | null;
  status: "em_andamento" | "concluida" | "falha";
  consultados: number;
  novos: number;
  existentes: number;
  divergentes: number;
  enviados_conferencia: number;
  erros: { etapa: string }[] | null;
}

export interface ItemIntegracaoLinha {
  id: string;
  referencia_origem: string;
  tipo: "pagamento" | "recebimento_titulo" | "titulo_aberto";
  situacao: "novo" | "existente" | "alterado" | "enviado_conferencia" | "possivel_duplicidade";
  resumo: { data?: string; valor_bruto?: string; forma?: string; descricao?: string; contexto?: string };
  criado_em: string;
}

export interface EstadoIntegracao {
  configurada: boolean;
  ultima: Sincronizacao | null;
  totais: Record<string, number>;
}

export type ResultadoSincronizacao =
  | { estado: "desabilitada"; motivo: string }
  | { estado: "falha"; etapa: string }
  | { estado: "concluida"; consultados: number; novos: number; existentes: number; divergentes: number; enviados_conferencia: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export const carregarEstadoIntegracao = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<EstadoIntegracao> => {
  const db = (context.supabase as Db).schema("financeiro_hml");
  const { data: ultima, error } = await db.from("integracao_sincronizacoes").select("id,iniciado_em,concluido_em,status,consultados,novos,existentes,divergentes,enviados_conferencia,erros").order("iniciado_em", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Falha ao consultar o estado da integração.");
  const { data: itens, error: erroItens } = await db.from("integracao_itens").select("situacao");
  if (erroItens) throw new Error("Falha ao consultar os itens da integração.");
  const totais: Record<string, number> = {};
  for (const i of itens ?? []) totais[i.situacao] = (totais[i.situacao] ?? 0) + 1;
  return { configurada: Boolean(process.env.GESTAO_ITV_USUARIO && process.env.GESTAO_ITV_SENHA), ultima: (ultima as Sincronizacao | null) ?? null, totais };
});

export const carregarItensIntegracao = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ pagina: z.number().int().min(0).max(10000).default(0) }).parse(v))
  .handler(async ({ data, context }): Promise<{ itens: ItemIntegracaoLinha[]; pagina: number }> => {
    const db = (context.supabase as Db).schema("financeiro_hml");
    const desde = data.pagina * 50;
    const { data: itens, error } = await db.from("integracao_itens").select("id,referencia_origem,tipo,situacao,resumo,criado_em").order("criado_em", { ascending: false }).range(desde, desde + 49);
    if (error) throw new Error("Falha ao consultar os itens da integração.");
    return { itens: (itens ?? []) as ItemIntegracaoLinha[], pagina: data.pagina };
  });

export const sincronizarGestaoItv = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<ResultadoSincronizacao> => {
  const db = (context.supabase as Db).schema("financeiro_hml");
  const usuario = process.env["GESTAO_ITV_USUARIO"];
  const senha = process.env["GESTAO_ITV_SENHA"];
  if (!usuario || !senha) return { estado: "desabilitada", motivo: "Credencial de leitura ainda não configurada. A integração permanece desabilitada." };

  // Permissão decidida pelo banco (admin_geral/admin_financeiro).
  const { data: syncId, error: erroInicio } = await db.rpc("integracao_iniciar");
  if (erroInicio) throw new Error(String(erroInicio.message).includes("INT_PERMISSAO") ? "Seu perfil não pode sincronizar a integração." : "Falha ao iniciar a sincronização.");

  const falhar = async (etapa: string): Promise<ResultadoSincronizacao> => {
    await db.rpc("integracao_concluir", { p: { id: syncId, status: "falha", erros: [{ etapa }] } });
    return { estado: "falha", etapa };
  };

  const origem = createClient(ORIGEM_URL, ORIGEM_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (ORIGEM_KEY.startsWith("sb_") && h.get("Authorization") === `Bearer ${ORIGEM_KEY}`) h.delete("Authorization");
        h.set("apikey", ORIGEM_KEY);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const { error: erroAuth } = await origem.auth.signInWithPassword({ email: usuario, password: senha });
  if (erroAuth) return falhar("autenticacao_origem");

  // Leitura paginada (limite padrão de 1000 linhas por consulta).
  const lerTudo = async (tabela: string, colunas: string, ordenar: string) => {
    const linhas: Record<string, unknown>[] = [];
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await origem.from(tabela).select(colunas).order(ordenar).range(desde, desde + 999);
      if (error) throw new Error(tabela);
      linhas.push(...((data ?? []) as Record<string, unknown>[]));
      if (!data || data.length < 1000) return linhas;
    }
  };

  let fonte: FonteGestao;
  try {
    const [formas, lancamentos, pagamentos, recebimentos, titulos] = await Promise.all([
      lerTudo("formas_pagamento", "id,nome", "id"),
      lerTudo("caixa_lancamentos", "id,data_lancamento,os,cliente,descricao,grupo_receita,status", "data_lancamento"),
      lerTudo("caixa_pagamentos", "id,lancamento_id,forma_pagamento_id,valor,parcelas,valor_liquido", "created_at"),
      lerTudo("contas_receber_recebimentos", "id,conta_receber_id,data_recebimento,valor,forma_pagamento_id,referencia,estorno_de_id", "data_recebimento"),
      lerTudo("contas_receber_saldos", "*", "vencimento"),
    ]);
    fonte = {
      formas: formas as FonteGestao["formas"],
      lancamentos: lancamentos as FonteGestao["lancamentos"],
      pagamentos: pagamentos as FonteGestao["pagamentos"],
      recebimentos: recebimentos as FonteGestao["recebimentos"],
      // Títulos em aberto: informativos; exigem identificador e saldo positivo.
      titulosAbertos: (titulos as { id?: string; saldo?: number | string }[]).filter((t) => t.id && Number(t.saldo) > 0) as FonteGestao["titulosAbertos"],
    };
  } catch {
    return falhar("leitura_origem");
  }

  const itens = montarItens(fonte);
  const { data: resultado, error: erroConcluir } = await db.rpc("integracao_concluir", { p: { id: syncId, status: "concluida", itens } });
  if (erroConcluir) throw new Error("Falha ao registrar a sincronização.");
  return { estado: "concluida", ...(resultado as object) } as ResultadoSincronizacao;
});
