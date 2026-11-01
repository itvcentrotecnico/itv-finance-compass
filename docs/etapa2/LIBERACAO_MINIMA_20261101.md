# ITV — disponibilização mínima, 01/11/2026

## Resultado
Preparação de interface somente consulta; NÃO PRONTO PARA GRAVAÇÃO REAL ou publicação. Nenhuma migração, escrita financeira, alteração de permissões ou GESTÃO ITV.

## Bloqueio identificado e menor intervenção
- `src/routes/_authenticated/$modulo.tsx`: módulo despesas caía no estado provisório e outros módulos previstos eram anunciados como registros vazios. Despesas agora reaproveita o histórico existente com filtro inicial de saída; títulos/recebíveis e previsões não são apresentados como receitas/despesas realizadas.
- `src/routes/_authenticated/index.tsx`: indicadores não consolidados sem consultas. Primeiro painel agora reutiliza contas/saldos/extrato/histórico existentes da Tesouraria, sem novos cálculos ou funcionalidades.
- `src/components/layout/AppSidebar.tsx`: menu incluía módulos sem implementação. Navegação inicial limitada aos recursos existentes, com despesas em consulta; URLs antigas continuam funcionando e informam indisponibilidade quando não implementadas.
- `src/components/tesouraria/TesourariaPanel.tsx`: painel híbrido dependia de controles/solicitações da Etapa 2 ausentes no banco. Por padrão não monta conferências, contas preparadas com habilitação nem solicitações; não oferece entrada/saída/transferência/edição/estorno/reenvio. Contas, saldo registrado, extrato e histórico continuam utilizando as leituras já existentes. Mudança de interface não é revogação de acesso às RPCs legadas.

## Evidências
42 testes locais aprovados: consulta sem envio/recuperação, formulários com rejeição/perda de resposta, idempotência, validação decimal e histórico. Dados exclusivamente mockados; nenhum teste financeiro externo. Navegador real: /, /tesouraria e /despesas redirecionam a /auth sem sessão, com zero erros de execução. Screenshot do login verificado.

Sessão de teste gerenciada indisponível (Supabase externo); leitura autenticada das páginas e funcionamento ponta a ponta no banco REAL permanecem NÃO VALIDADOS. Não simulamos login como evidência de segurança real. Controles do SQL proposto não são controles instalados. Catálogos já auditados neste mesmo ciclo confirmam 13 tabelas, RPCs de leitura e seis aberturas/zero movimentos, mas não equivalem a teste pela API autenticada.

## Impedimento de gravação e publicação
Wrappers legados alcançam motor SECURITY DEFINER sem revisão por segundo usuário; DML por coluna de conferências permanece e integração aceita conteúdo administrativo direto. Ocultar controles não corrige esse risco no banco. Não habilitar gravações nem usar o caminho legado para contornar migração. Solução dos controles exige a migração pendente ou correção crítica específica, ambas fora desta autorização. Recuperação de owners/ACLs e contenção/drenagem continuam exigindo comprovação.

Receitas/despesas/transferências/estornos/aprovação/conferência: bloqueados na interface desta versão. Cadastros administrativos e integração existente não foram modificados ou acionados; preservam seus controles anteriores e não estão certificados por este teste. Publicação não executada; depende de validação autenticada e aprovação final. Operação de receitas/despesas ainda não liberada.
