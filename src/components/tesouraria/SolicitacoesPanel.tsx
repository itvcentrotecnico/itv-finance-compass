import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useRouteContext } from '@tanstack/react-router';
import { ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/finance';
import { Carregando, ErroCarga } from '@/components/cadastros/comum';
import { listarSolicitacoes, decidirSolicitacao } from '@/lib/tesouraria-solicitacoes.functions';
import { podeDecidirSolicitacao, type SolicitacaoTesouraria } from '@/lib/tesouraria-solicitacoes';
import { dinheiro, TIPOS } from '@/lib/tesouraria';

export function SolicitacoesPanel({nomeConta}:{nomeConta:(id:string|null)=>string}) {
 const {role,user}=useRouteContext({from:'/_authenticated'});
 const qc=useQueryClient(); const listar=useServerFn(listarSolicitacoes); const decidir=useServerFn(decidirSolicitacao);
 const [pagina,setPagina]=useState(0); const [estado,setEstado]=useState<'pendente'|'executada'|'devolvida'>('pendente');
 const [alvo,setAlvo]=useState<SolicitacaoTesouraria|null>(null); const [motivo,setMotivo]=useState('');
 const [erro,setErro]=useState<string|null>(null);
 const q=useQuery({queryKey:['tesouraria','solicitacoes',pagina,estado],queryFn:()=>listar({data:{pagina,estado}})});
 const m=useMutation({mutationFn:async(acao:'executar'|'devolver')=>{
  if(!alvo) return; const r=await decidir({data:{id:alvo.id,versao:alvo.versao,acao,justificativa:motivo}});
  if(r.estado!=='confirmada') throw new Error(r.mensagem);
 },onSuccess:()=>{setAlvo(null);setMotivo('');setErro(null);qc.invalidateQueries({queryKey:['tesouraria']});},onError:(e:Error)=>{setErro(e.message);qc.invalidateQueries({queryKey:['tesouraria','solicitacoes']});}});
 return <section className="space-y-4">
  <Select value={estado} onValueChange={(v)=>{if(v==='pendente'||v==='executada'||v==='devolvida'){setEstado(v);setPagina(0);}}}><SelectTrigger aria-label="Situação das solicitações" className="w-52"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="pendente">Pendentes</SelectItem><SelectItem value="executada">Executadas</SelectItem><SelectItem value="devolvida">Devolvidas</SelectItem></SelectContent></Select>
  {q.isLoading?<Carregando/>:q.isError?<ErroCarga erro={q.error} onRetry={()=>q.refetch()}/>:!q.data?.solicitacoes.length?<EmptyState icon={ClipboardCheck} title="Nenhuma solicitação" description="Sem registros na situação selecionada"/>:
   <ul className="divide-y">{q.data.solicitacoes.map(s=><li key={s.id} className="space-y-2 py-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-medium">{TIPOS[s.pedido.tipo]} · {s.pedido.descricao}</h3><p className="text-sm text-muted-foreground">{s.pedido.data} · {s.pedido.valor?dinheiro(s.pedido.valor):'Reversão dos efeitos originais'}</p></div>{podeDecidirSolicitacao(role,user.id,s)&&<Button variant="outline" onClick={()=>{setAlvo(s);setErro(null);setMotivo('');}}>Revisar</Button>}</div><dl className="grid gap-1 text-xs text-muted-foreground"><div>Origem: {nomeConta(s.pedido.origem??null)} · Destino: {nomeConta(s.pedido.destino??null)}</div><div>Referência: {s.pedido.referencia??s.pedido.original??s.id}</div><div>Preparado por: {s.criado_por} · Aprovado por: {s.aprovado_por??'Pendente'}</div><div>Operação: {s.operacao_id??'Não lançada'} · {s.estado}</div>{s.justificativa&&<div>Justificativa: {s.justificativa}</div>}</dl></li>)}</ul>}
  {alvo&&<div className="space-y-3 border-y py-4"><h3 className="font-semibold">Revisão · {alvo.pedido.descricao}</h3><p className="text-sm">{alvo.pedido.valor?dinheiro(alvo.pedido.valor):'Estorno'} · {alvo.pedido.data}</p>{alvo.original_detalhes&&<dl className="space-y-2 text-sm"><div>Valor revertido: {dinheiro(alvo.original_detalhes.valor)}</div><div>Débito: {nomeConta(alvo.original_detalhes.destino)} · Crédito: {nomeConta(alvo.original_detalhes.origem)}</div><div>Classificação original: {alvo.original_detalhes.classificacao?.descricao??'Não aplicável'} · Centro: {alvo.original_detalhes.centro??'Não informado'}</div><div>{alvo.original_detalhes.descricao}</div></dl>}<p className="break-words text-xs text-muted-foreground">Categoria: {alvo.pedido.plano??'Não aplicável'} · Centro: {alvo.pedido.centro??'Não informado'} · {alvo.pedido.justificativa}</p><Input aria-label="Justificativa da decisão" value={motivo} onChange={e=>setMotivo(e.target.value)} maxLength={500}/>{erro&&<p role="alert" className="text-sm text-destructive">{erro}</p>}<div className="flex flex-wrap gap-2"><Button disabled={m.isPending||(alvo.pedido.tipo==='estorno'&&!alvo.original_detalhes)} onClick={()=>m.mutate('executar')}>Autorizar e executar</Button><Button variant="outline" disabled={m.isPending||motivo.trim().length<5} onClick={()=>m.mutate('devolver')}>Devolver</Button><Button variant="ghost" disabled={m.isPending} onClick={()=>setAlvo(null)}>Cancelar</Button></div></div>}
  <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{q.data?.total??0} registros · Página {pagina+1}</span><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Solicitações anteriores" disabled={!pagina||q.isFetching} onClick={()=>setPagina(p=>p-1)}><ChevronLeft/></Button><Button variant="outline" size="icon" aria-label="Próximas solicitações" disabled={(pagina+1)*50>=(q.data?.total??0)||q.isFetching} onClick={()=>setPagina(p=>p+1)}><ChevronRight/></Button></div></div>
 </section>;
}