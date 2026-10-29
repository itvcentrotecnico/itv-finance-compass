import { describe,it,expect } from 'vitest';
import { permiteAcaoConferencia,podeLancarConferencia,conferirTotalReal,type ComponenteConferencia } from './conferencia-operacional';
describe('responsabilidades da Etapa 2',()=>{
 it('analista prepara',()=>expect(permiteAcaoConferencia('analista_financeiro','salvar','pendente',true,false)).toBe(true));
 it('analista encaminha',()=>expect(permiteAcaoConferencia('analista_financeiro','encaminhar','em_conferencia',false,false)).toBe(true));
 it('analista não aprova',()=>expect(permiteAcaoConferencia('analista_financeiro','aprovar','encaminhado',false,false)).toBe(false));
 it('analista não autoriza',()=>expect(permiteAcaoConferencia('analista_financeiro','autorizar','conciliado',false,false)).toBe(false));
 it('analista não lança',()=>expect(podeLancarConferencia('analista_financeiro','autorizado',false,false,true)).toBe(false));
 it('administrador financeiro aprova',()=>expect(permiteAcaoConferencia('admin_financeiro','aprovar','encaminhado',false,false)).toBe(true));
 it('administrador financeiro devolve',()=>expect(permiteAcaoConferencia('admin_financeiro','devolver','encaminhado',false,false)).toBe(true));
 it('consulta não prepara',()=>expect(permiteAcaoConferencia('consulta_gerencial','salvar','pendente',false,false)).toBe(false));
 it('lançamento bloqueado com dados não salvos',()=>expect(podeLancarConferencia('admin_financeiro','autorizado',true,false,true)).toBe(false));
 it('aprovação bloqueada com dados não salvos',()=>expect(permiteAcaoConferencia('admin_financeiro','aprovar','encaminhado',true,false)).toBe(false));
 it('lançamento bloqueado sem liberação real',()=>expect(podeLancarConferencia('admin_financeiro','autorizado',false,false,false)).toBe(false));
 it('lançamento bloqueado durante outra ação',()=>expect(podeLancarConferencia('admin_financeiro','autorizado',false,true,true)).toBe(false));
 it('lançamento futuro exige estado autorizado',()=>expect(podeLancarConferencia('admin_financeiro','conciliado',false,false,true)).toBe(false));
});
const parte=(id:string,valor_bruto:string)=>({id,valor_bruto}) as ComponenteConferencia;
describe('rateio só com valores reais',()=>{
 it('soma exata',()=>expect(conferirTotalReal('100.00',[parte('a','40.00'),parte('b','60.00')])).toBe(true));
 it('rejeita componente sem valor',()=>expect(conferirTotalReal('100.00',[parte('a',''),parte('b','100.00')])).toBe(false));
 it('rejeita total diferente',()=>expect(conferirTotalReal('100.00',[parte('a','40.00'),parte('b','60.01')])).toBe(false));
 it('rejeita identificador repetido',()=>expect(conferirTotalReal('100.00',[parte('a','40.00'),parte('a','60.00')])).toBe(false));
 it('preserva precisão decimal grande',()=>expect(conferirTotalReal('9007199254740993.02',[parte('a','9007199254740993.01'),parte('b','0.01')])).toBe(true));
});
