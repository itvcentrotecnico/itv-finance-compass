import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { erroConferencia, type RevisaoConferencia, type EventoConferencia, type OpcoesConferencia } from './conferencia-operacional';
const idSchema=z.object({id:z.string().uuid()});
const dadosSchema=z.object({forma:z.enum(['dinheiro','pix','credito','debito','parcelado','boleto','misto','indefinida']),descricao:z.string().trim().min(2).max(500),data_ocorrencia:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),valor_bruto:z.string().regex(/^\d{1,16}(\.\d{1,2})?$/),valor_liquido:z.string().nullable(),data_liquidacao:z.string().nullable(),boleto_vencimento:z.string().nullable(),boleto_pagamento:z.string().nullable(),boleto_status:z.string().nullable(),conta_financeira_id:z.string().uuid().nullable(),plano_conta_id:z.string().uuid().nullable(),centro_custo_id:z.string().uuid().nullable(),observacao:z.string().max(500).nullable()});
export const consultarConferencia=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>idSchema.parse(v)).handler(async({data,context})=>{
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const db=(context.supabase as any).schema('financeiro_hml');
 const r=await db.rpc('conferencia_consultar',{p:data}); if(r.error) throw new Error(erroConferencia(r.error)); return r.data as RevisaoConferencia;
});
export const comandarConferencia=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>idSchema.extend({versao:z.string().regex(/^\d+$/),fonte_hash:z.string().regex(/^[a-f0-9]{32}$/),acao:z.enum(['salvar','divergir','encaminhar','aprovar','devolver','autorizar']),justificativa:z.string().max(500),dados:dadosSchema.optional(),componentes:z.array(dadosSchema.extend({id:z.string().uuid()})).max(50).optional()}).parse(v)).handler(async({data,context})=>{
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const db=(context.supabase as any).schema('financeiro_hml');
 const r=await db.rpc('conferencia_comandar',{p:data}); if(r.error) throw new Error(erroConferencia(r.error)); return r.data as RevisaoConferencia;
});
export const historicoConferencia=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>idSchema.extend({antes:z.string().regex(/^\d+$/).optional()}).parse(v)).handler(async({data,context})=>{
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const db=(context.supabase as any).schema('financeiro_hml');
 const r=await db.rpc('conferencia_historico',{p:data}); if(r.error) throw new Error(erroConferencia(r.error)); return r.data as EventoConferencia[];
});
export const opcoesConferencia=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const db=(context.supabase as any).schema('financeiro_hml');
 const r=await db.rpc('conferencia_opcoes'); if(r.error) throw new Error(erroConferencia(r.error)); return r.data as OpcoesConferencia;
});
