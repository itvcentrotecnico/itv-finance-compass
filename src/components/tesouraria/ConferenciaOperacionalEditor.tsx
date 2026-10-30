import { useState } from 'react';
import { useQuery,useMutation,useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { History,Loader2,Plus,Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@/components/ui/select';
import type { Role } from '@/lib/auth/permissions';
import type { Conta,Centro } from '@/lib/cadastros';
import { decimal,type ContaFinanceira } from '@/lib/tesouraria';
import { lancarConferencia } from '@/lib/tesouraria.functions';
import { consultarConferencia,comandarConferencia,historicoConferencia,opcoesConferencia } from '@/lib/conferencia-operacional.functions';
import { ESTADOS_CONFERENCIA,permiteAcaoConferencia,podeLancarConferencia,podePrepararConferencia,type AcaoConferencia,type RevisaoConferencia,type DadosConferencia,type ComponenteConferencia,type OpcoesConferencia } from '@/lib/conferencia-operacional';
const FORMAS:Record<string,string>={dinheiro:'Dinheiro',pix:'Pix',credito:'Crédito',debito:'Débito',parcelado:'Parcelado',boleto:'Boleto',misto:'Misto',indefinida:'Não definida'};
function Escolher({label,value,onChange,items}:{label:string;value:string|null;onChange:(v:string|null)=>void;items:{id:string;nome:string}[]}){
 return <div className="space-y-2"><Label>{label}</Label><Select value={value||'nenhum'} onValueChange={v=>onChange(v==='nenhum'?null:v)}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="nenhum">Não definido</SelectItem>{items.map(i=><SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent></Select></div>;
}
export function ConferenciaOperacionalEditor({id,role,contas,planos,centros,onDone}:{id:string;role:Role|null;contas:ContaFinanceira[];planos:Conta[];centros:Centro[];onDone:()=>void}){
 const consultar=useServerFn(consultarConferencia); const opcoes=useServerFn(opcoesConferencia);
 const q=useQuery({queryKey:['conferencia-operacional',id],queryFn:()=>consultar({data:{id}}),refetchOnWindowFocus:false,refetchOnReconnect:false,staleTime:Infinity});
 const o=useQuery({queryKey:['conferencia-operacional','opcoes'],queryFn:()=>opcoes()});
 if(q.isLoading||o.isLoading) return <p className="mt-6 flex gap-2"><Loader2 className="size-4 animate-spin"/>Carregando conferência…</p>;
 if(q.isError||o.isError) return <div className="mt-6 space-y-3"><p role="alert" className="text-sm text-destructive">{q.error?.message||o.error?.message}</p><Button variant="outline" onClick={()=>{q.refetch();o.refetch();}}>Atualizar</Button></div>;
 if(!q.data||!o.data) return null;
 return <Editor key={id} revisao={q.data} opcoes={o.data} role={role} contas={contas} planos={planos} centros={centros} onDone={onDone}/>;
}
function Campos({d,onChange,contas,planos,centros,opcoes,parte=false,natureza}:{natureza: string;d:DadosConferencia;onChange:(d:DadosConferencia)=>void;contas:ContaFinanceira[];planos:Conta[];centros:Centro[];opcoes:OpcoesConferencia;parte?:boolean}){
 const set=(k:keyof DadosConferencia,v:string|null)=>onChange({...d,[k]:v});
 const regra=opcoes.regras.find(r=>r.plano_conta_id===d.plano_conta_id);
 const campo=(label:string,k:keyof DadosConferencia,type='text',disabled=false)=><div className="space-y-2"><Label>{label}</Label><Input aria-label={label} type={type} disabled={disabled} value={d[k]||''} onChange={e=>set(k,e.target.value||null)}/></div>;
 return <>
 <Escolher label="Forma de pagamento" value={d.forma} onChange={v=>set('forma',v||'indefinida')} items={Object.entries(FORMAS).filter(([k])=>!parte||!['misto','indefinida'].includes(k)).map(([id,nome])=>({id,nome}))}/>
 {campo('Descrição','descricao')}{campo('Data da origem','data_ocorrencia','date',!parte)}{campo(parte?'Valor real do componente (R$)':'Total da origem (R$)','valor_bruto','text',!parte)}
 {['credito','debito','parcelado'].includes(d.forma)&&<>{campo('Valor líquido recebido (R$)','valor_liquido')}{campo('Data de liquidação comprovada','data_liquidacao','date')}</>}
 {d.forma==='boleto'&&<>{campo('Vencimento','boleto_vencimento','date')}{campo('Data de pagamento','boleto_pagamento','date')}<Escolher label="Situação do boleto" value={d.boleto_status} onChange={v=>set('boleto_status',v)} items={[{id:'pendente',nome:'Pendente'},{id:'pago',nome:'Pago'},{id:'vencido',nome:'Vencido'}]}/></>}
 <Escolher label="Conta oficial" value={d.conta_financeira_id} onChange={v=>set('conta_financeira_id',v)} items={contas.filter(c=>opcoes.contas.includes(c.id)&&c.ativo)}/>
 <Escolher label="Categoria autorizada" value={d.plano_conta_id} onChange={v=>onChange({...d,plano_conta_id:v,centro_custo_id:null})} items={planos.filter(p=>p.ativo&&p.aceita_lancamentos&&p.natureza===(natureza==='entrada'?'receita':'despesa')&&opcoes.regras.some(r=>r.plano_conta_id===p.id)).map(p=>({id:p.id,nome:`${p.codigo} · ${p.descricao}`}))}/>
 <Escolher label={regra?.centro_obrigatorio?'Centro de custo obrigatório':'Centro de custo'} value={d.centro_custo_id} onChange={v=>set('centro_custo_id',v)} items={centros.filter(c=>c.ativo&&regra?.centros_permitidos.includes(c.id)).map(c=>({id:c.id,nome:`${c.codigo} · ${c.descricao}`}))}/>
 {campo('Observação','observacao')}
 </>;
}
function normalizar(d:DadosConferencia):DadosConferencia { return {...d,valor_bruto:decimal(d.valor_bruto),valor_liquido:d.valor_liquido?decimal(d.valor_liquido):null}; }
function Editor({revisao,opcoes,role,contas,planos,centros,onDone}:{revisao:RevisaoConferencia;opcoes:OpcoesConferencia;role:Role|null;contas:ContaFinanceira[];planos:Conta[];centros:Centro[];onDone:()=>void}){
 const [dados,setDados]=useState<DadosConferencia>(()=>{const d=revisao.dados;return {forma:d.forma,descricao:d.descricao,data_ocorrencia:d.data_ocorrencia,valor_bruto:d.valor_bruto,valor_liquido:d.valor_liquido,data_liquidacao:d.data_liquidacao,boleto_vencimento:d.boleto_vencimento,boleto_pagamento:d.boleto_pagamento,boleto_status:d.boleto_status,conta_financeira_id:d.conta_financeira_id,plano_conta_id:d.plano_conta_id,centro_custo_id:d.centro_custo_id,observacao:d.observacao};});
 const [base]=useState(()=>JSON.stringify(dados));
 const [partes,setPartes]=useState(revisao.componentes);
 const [justificativa,setJustificativa]=useState('');const [erro,setErro]=useState<string|null>(null);const [mostrarHistorico,setMostrarHistorico]=useState(false);
 const qc=useQueryClient();const comandar=useServerFn(comandarConferencia);const lancar=useServerFn(lancarConferencia);
 const sujo=JSON.stringify(dados)!==base||JSON.stringify(partes)!==JSON.stringify(revisao.componentes);
 const concluir=()=>{qc.invalidateQueries({queryKey:['tesouraria']});qc.invalidateQueries({queryKey:['conferencia-operacional']});onDone();};
 const m=useMutation({mutationFn:async(acao:AcaoConferencia)=>comandar({data:{id:revisao.id,versao:revisao.versao,fonte_hash:revisao.fonte_hash,acao,justificativa,...(['salvar','divergir'].includes(acao)?{dados:normalizar(dados),componentes:partes.map(p=>({...normalizar(p),id:p.id}))}:{})}}),onSuccess:concluir,onError:(e:Error)=>setErro(e.message)});
 const l=useMutation({mutationFn:async()=>{const r=await lancar({data:{id:revisao.id,versao:revisao.versao}});if(r.estado!=='confirmada')throw new Error(r.mensagem);},onSuccess:concluir,onError:(e:Error)=>setErro(e.message)});
 const ocupado=m.isPending||l.isPending; const bloqueado=ocupado||!podePrepararConferencia(role)||revisao.estado==='lancado';
 const adicionar=()=>{setPartes(ps=>[...ps,{...dados,id:crypto.randomUUID(),forma:'dinheiro',valor_bruto:'',valor_liquido:null,data_liquidacao:null,conta_financeira_id:null,plano_conta_id:null,centro_custo_id:null}]);};
 const acao=(a:AcaoConferencia,label:string)=><Button variant={a==='salvar'?'default':'outline'} disabled={!permiteAcaoConferencia(role,a,revisao.estado,sujo,ocupado)} onClick={()=>{setErro(null);m.mutate(a);}}>{label}</Button>;
 return <div className="mt-6 space-y-5">
 <p className="text-sm font-medium">{ESTADOS_CONFERENCIA[revisao.estado]||revisao.estado} · Revisão {revisao.versao}</p>
 {!opcoes.operacao_liberada&&<p className="text-sm text-muted-foreground">Operação financeira real não liberada pela direção.</p>}
 <fieldset disabled={bloqueado} className="space-y-4"><Campos natureza={revisao.natureza} d={dados} onChange={d=>{setDados(d);if(d.forma!=='misto')setPartes([]);}} contas={contas} planos={planos} centros={centros} opcoes={opcoes}/>
 {dados.forma==='misto'&&<section className="space-y-4 border-y py-4"><h3 className="font-medium">Componentes do pagamento</h3>{partes.map((p,i)=><div key={p.id} className="space-y-3 border-b pb-4"><div className="flex justify-between"><h4>Componente {i+1}</h4><Button variant="ghost" size="icon" aria-label={`Remover componente ${i+1}`} onClick={()=>setPartes(ps=>ps.filter(x=>x.id!==p.id))}><Trash2 className="size-4"/></Button></div><Campos natureza={revisao.natureza} d={p} parte onChange={d=>setPartes(ps=>ps.map(x=>x.id===p.id?{...d,id:p.id}:x))} contas={contas} planos={planos} centros={centros} opcoes={opcoes}/></div>)}<Button variant="outline" disabled={partes.length>=50} onClick={adicionar}><Plus className="size-4"/>Adicionar componente</Button></section>}
 </fieldset>
 <div className="space-y-2"><Label>Justificativa da ação</Label><Input aria-label="Justificativa da ação" maxLength={500} disabled={ocupado||revisao.estado==='lancado'} value={justificativa} onChange={e=>setJustificativa(e.target.value)}/></div>
 {erro&&<p role="alert" className="text-sm text-destructive">{erro}</p>}
 <div className="flex flex-wrap gap-2">{acao('salvar','Salvar preparação')}{acao('divergir','Registrar divergência')}{acao('encaminhar','Encaminhar para aprovação')}{acao('aprovar','Aprovar conferência')}{acao('devolver','Devolver para correção')}{acao('autorizar','Autorizar lançamento')}<Button variant="outline" disabled={!podeLancarConferencia(role,revisao.estado,sujo,ocupado,opcoes.operacao_liberada)} onClick={()=>l.mutate()}>Lançar na Tesouraria</Button></div>
 <Button variant="ghost" onClick={()=>setMostrarHistorico(!mostrarHistorico)}><History className="size-4"/>Histórico individual</Button>
 {mostrarHistorico&&<HistoricoIndividual id={revisao.id}/>}
 </div>;
}
function HistoricoIndividual({id}:{id:string}){
 const fn=useServerFn(historicoConferencia);const [antes,setAntes]=useState<string|undefined>();
 const q=useQuery({queryKey:['conferencia-operacional','historico',id,antes],queryFn:()=>fn({data:{id,antes}})});
 if(q.isLoading)return <Loader2 className="size-4 animate-spin"/>;
 if(q.isError)return <p role="alert" className="text-sm text-destructive">{q.error.message}</p>;
 return <div className="space-y-3"><ol className="divide-y">{q.data?.map(e=><li key={e.numero} className="space-y-1 py-3 text-sm"><p className="font-medium">{e.acao_fluxo||e.acao}</p><p>{ESTADOS_CONFERENCIA[e.estado_anterior||'']||e.estado_anterior||'—'} → {ESTADOS_CONFERENCIA[e.estado_posterior||'']||e.estado_posterior||'—'}</p><p className="text-xs text-muted-foreground">{e.responsavel||e.usuario_id||'Responsável não identificado'} · {new Date(e.ocorrido_em).toLocaleString('pt-BR',{timeZone:'America/Manaus'})}</p>{e.justificativa&&<p>{e.justificativa}</p>}</li>)}</ol>{q.data?.length===50&&<Button variant="outline" onClick={()=>setAntes(q.data?.at(-1)?.numero)}>Eventos anteriores</Button>}{antes&&<Button variant="ghost" onClick={()=>setAntes(undefined)}>Eventos recentes</Button>}</div>;
}
