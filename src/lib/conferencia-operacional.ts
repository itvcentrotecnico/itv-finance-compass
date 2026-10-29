import type { Role } from './auth/permissions';
import { centavos } from './tesouraria';
export type AcaoConferencia = 'salvar' | 'divergir' | 'encaminhar' | 'aprovar' | 'devolver' | 'autorizar';
export interface DadosConferencia { forma: string; descricao: string; data_ocorrencia: string; valor_bruto: string; valor_liquido: string | null; data_liquidacao: string | null; boleto_vencimento: string | null; boleto_pagamento: string | null; boleto_status: string | null; conta_financeira_id: string | null; plano_conta_id: string | null; centro_custo_id: string | null; observacao: string | null }
export interface ComponenteConferencia extends DadosConferencia { id: string }
export interface RevisaoConferencia { id: string; versao: string; estado: string; fonte_hash: string; dados: DadosConferencia; componentes: ComponenteConferencia[]; controle: { preparado_por: string | null; aprovado_por: string | null; aprovado_em: string | null; autorizado_por: string | null; autorizado_em: string | null } | null }
export interface OpcoesConferencia { contas: string[]; regras: { plano_conta_id: string; centro_obrigatorio: boolean; centros_permitidos: string[] }[]; operacao_liberada: boolean; corte: string | null }
export interface EventoConferencia { numero: string; acao: string; acao_fluxo: string | null; estado_anterior: string | null; estado_posterior: string | null; usuario_id: string | null; responsavel: string | null; ocorrido_em: string; justificativa: string | null }
export const ESTADOS_CONFERENCIA: Record<string,string> = { pendente:'Pendente',em_conferencia:'Em conferência',encaminhado:'Aguardando aprovação',conciliado:'Aprovado',divergente:'Divergente',devolvido:'Devolvido',autorizado:'Lançamento autorizado',lancado:'Lançado' };
export const podePrepararConferencia = (r: Role | null) => r === 'analista_financeiro' || r === 'admin_financeiro' || r === 'admin_geral';
export const podeAprovarConferencia = (r: Role | null) => r === 'admin_financeiro' || r === 'admin_geral';
export function permiteAcaoConferencia(role: Role | null, acao: AcaoConferencia, estado: string, sujo: boolean, ocupado: boolean): boolean {
 if (ocupado || estado === 'lancado') return false;
 if (acao === 'salvar' || acao === 'divergir') return podePrepararConferencia(role);
 if (sujo) return false;
 if (acao === 'encaminhar') return podePrepararConferencia(role) && ['em_conferencia','divergente','devolvido'].includes(estado);
 if (!podeAprovarConferencia(role)) return false;
 if (acao === 'aprovar') return estado === 'encaminhado';
 if (acao === 'autorizar') return estado === 'conciliado';
 return ['encaminhado','conciliado','autorizado'].includes(estado);
}
export function podeLancarConferencia(role: Role | null, estado: string, sujo: boolean, ocupado: boolean, liberada: boolean): boolean {
 return podeAprovarConferencia(role) && estado === 'autorizado' && !sujo && !ocupado && liberada;
}
export function conferirTotalReal(total: string, partes: ComponenteConferencia[]): boolean {
 try { return partes.length >= 2 && partes.every(p => centavos(p.valor_bruto) > 0n) && new Set(partes.map(p=>p.id)).size === partes.length && partes.reduce((s,p)=>s+centavos(p.valor_bruto),0n) === centavos(total); } catch { return false; }
}
export function erroConferencia(e: unknown): string {
 const msg=(e as {message?:string})?.message ?? '';
 const erros: Record<string,string>={ CONF_PERMISSAO:'Seu perfil não permite esta ação.',CONF_CONFLITO:'Outra pessoa alterou este registro. Atualize e revise antes de salvar.',CONF_REVISOR_DISTINTO:'A aprovação exige um revisor diferente de quem preparou.',CONF_CATEGORIA_OFICIAL:'A categoria ainda não foi autorizada para a operação oficial.',CONF_CATEGORIA:'Selecione uma categoria compatível com receita ou despesa.',CONF_CONTA_OFICIAL:'Selecione uma conta oficial habilitada.',CONF_CENTRO:'Informe um centro de custo autorizado para esta categoria.',CONF_CARTAO:'Confira o líquido e a data comprovada de liquidação.',CONF_BOLETO:'Informe o pagamento confirmado e sua data.',CONF_RATEIO:'Informe componentes reais cuja soma corresponda ao total.',CONF_DUPLICIDADE:'Há conflito de origem ou duplicidade. Encaminhe para revisão.',CONF_FONTE_IMUTAVEL:'O total e a data histórica da origem devem ser preservados.',CONF_DATA_ABERTURA:'A data não pode anteceder a abertura da conta.',CONF_JUSTIFICATIVA:'Informe justificativa de 5 a 500 caracteres.',CONF_APROVACAO:'O lançamento exige a versão aprovada e autorizada.',CONF_OPERACAO_BLOQUEADA:'A operação financeira real ainda não foi liberada pela direção.',CONF_HISTORICO:'Registro anterior ao corte autorizado; manter para tratamento histórico.',CONF_FLUXO_OBRIGATORIO:'Use a conferência com aprovação formal; lançamento avulso indisponível.',CONF_IMUTAVEL:'Registro lançado é imutável.',CONF_ESTADO:'Esta ação não está disponível para a situação atual.',CONF_VALOR:'Informe um valor real positivo com até duas casas decimais.',CONF_DADOS:'Confira os campos obrigatórios.' };
 for(const [k,v] of Object.entries(erros)) if(msg.includes(k)) return v;
 if (/permission|42501|unauthorized/i.test(msg)) return 'Acesso não autorizado.';
 if (/function.*not|PGRST202|schema cache/i.test(msg)) return 'Os controles operacionais aguardam aplicação autorizada no HML.';
 return 'Não foi possível confirmar a ação. Atualize o registro e consulte o histórico antes de repetir.';
}
