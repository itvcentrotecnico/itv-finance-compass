import { describe,it,expect } from 'vitest';
import { podeDecidirSolicitacao, type SolicitacaoTesouraria } from './tesouraria-solicitacoes';
const s:SolicitacaoTesouraria={id:'s',pedido:{tipo:'transferencia',chave:'k',data:'2026-10-30',descricao:'Teste isolado'},criado_por:'preparador',criado_em:'',estado:'pendente',versao:'0',operacao_id:null,aprovado_por:null,justificativa:null};
describe('segregação das solicitações financeiras',()=>{
 it('administrador não autoriza sua própria preparação',()=>expect(podeDecidirSolicitacao('admin_geral','preparador',s)).toBe(false));
 it('administrador diferente pode decidir pendente',()=>expect(podeDecidirSolicitacao('admin_financeiro','revisor',s)).toBe(true));
 it('analista não decide',()=>expect(podeDecidirSolicitacao('analista_financeiro','revisor',s)).toBe(false));
 it('consulta gerencial não decide',()=>expect(podeDecidirSolicitacao('consulta_gerencial','revisor',s)).toBe(false));
 it('operação executada não aceita nova decisão',()=>expect(podeDecidirSolicitacao('admin_geral','revisor',{...s,estado:'executada'})).toBe(false));
});