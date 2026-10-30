import type { Role } from './auth/permissions';
import type { Pedido } from './tesouraria';

export interface SolicitacaoTesouraria {
 id: string; pedido: Pedido & { referencia?: string }; criado_por: string; criado_em: string;
 estado: 'pendente' | 'executada' | 'devolvida'; versao: string; operacao_id: string | null;
 aprovado_por: string | null; justificativa: string | null;
}
export function podeDecidirSolicitacao(role: Role | null, usuario: string, s: SolicitacaoTesouraria) {
 return (role === 'admin_geral' || role === 'admin_financeiro') && s.criado_por !== usuario && s.estado === 'pendente';
}
export function erroSolicitacao(err: unknown) {
 const msg = (err as { message?: string })?.message ?? '';
 const regras: Record<string,string> = {
  SOL_REFERENCIA: 'Informe uma referência documental externa, começando com externo:. Recebimentos importados devem seguir a conferência.',
  SOL_DATA_FUTURA: 'A movimentação não pode ter data futura.',
  SOL_ESTORNO_INVALIDO: 'Saldos de abertura e estornos não podem ser estornados por este fluxo.',
  SOL_INEXISTENTE: 'Solicitação não encontrada.', SOL_DADOS: 'Confira os dados e os campos permitidos para esta operação.',
  CONF_REVISOR_DISTINTO: 'Outra pessoa deve revisar e autorizar a solicitação.',
  CONF_CONFLITO: 'A solicitação foi alterada. Atualize antes de decidir.',
  CONF_DUPLICIDADE: 'A referência já está reservada. Confira o registro existente.',
  CONF_OPERACAO_BLOQUEADA: 'A administração ainda não liberou a operação financeira.',
  CONF_HISTORICO: 'A data antecede o início oficial autorizado.',
 };
 return Object.entries(regras).find(([k]) => msg.includes(k))?.[1];
}