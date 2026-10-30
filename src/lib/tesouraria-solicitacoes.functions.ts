import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { erroTesouraria, resultadoErro, type ResultadoEnvio } from './tesouraria';
import { erroSolicitacao, type SolicitacaoTesouraria } from './tesouraria-solicitacoes';

export const listarSolicitacoes = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
 .inputValidator((v:unknown)=>z.object({pagina:z.number().int().min(0).max(100000),estado:z.enum(['pendente','executada','devolvida']).optional()}).parse(v))
 .handler(async({data,context})=>{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db=(context.supabase as any).schema('financeiro_hml');
  let q=db.from('tesouraria_solicitacoes').select('*',{count:'exact'}).order('criado_em',{ascending:false}).order('id',{ascending:false}).range(data.pagina*50,data.pagina*50+49);
  if(data.estado) q=q.eq('estado',data.estado);
  const r=await q; if(r.error) throw new Error(erroTesouraria(r.error));
  return {total:r.count ?? 0,solicitacoes:(r.data ?? []).map((s:SolicitacaoTesouraria)=>({...s,versao:String(s.versao)})) as SolicitacaoTesouraria[]};
 });
export const decidirSolicitacao = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
 .inputValidator((v:unknown)=>z.object({id:z.string().uuid(),versao:z.string().regex(/^\d+$/),acao:z.enum(['executar','devolver']),justificativa:z.string().max(500)}).parse(v))
 .handler(async({data,context})=>{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db=(context.supabase as any).schema('financeiro_hml');
  const r=await db.rpc('tesouraria_decidir',{p:data});
  if(r.error) return {...resultadoErro(r.error),mensagem:erroSolicitacao(r.error) ?? erroTesouraria(r.error)} as ResultadoEnvio;
  return {estado:'confirmada',id:r.data.id} as ResultadoEnvio;
 });