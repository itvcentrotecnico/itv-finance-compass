# ITV FINANCEIRO — Aba Lançamentos Financeiros (Etapa 1) — 02/11/2026

1. Reutilizado: consultas tesouraria_saldos e tesouraria_historico_operacoes (sem duplicar operações), sonda do contrato tesouraria_lancar (V2), proteção contra envio duplicado e recuperação (useEnvioSeguro + chave de idempotência), validação de valores em centavos exatos, Plano de Contas (listarContas), perfis e tela de módulos.
2. Novo: aba "Lançamentos Financeiros" no menu; 4 indicadores; filtros (período, tipo, categoria, conta, pesquisa por descrição); tabela com situação e detalhes; formulário Receita/Despesa.
3. Tabelas/funções: plano_contas, contas_financeiras (via tesouraria_saldos), tesouraria_operacoes (via tesouraria_historico_operacoes e consulta de estornos), tesouraria_lancar (somente sonda sem efeito e, quando habilitada, registro). Nenhuma tabela ou função criada.
4. Concluído: tela, indicadores (excluem saldos iniciais, transferências, estornos e operações estornadas; cada operação contada uma vez), listagem real, filtros, formulário com categorias analíticas oficiais filtradas por natureza, valor em formato brasileiro, bloqueio de duplo clique.
5. Bloqueado pelo banco: registro de lançamentos (V2 não aplicada — botão "Novo lançamento" fica desativado com aviso); forma de pagamento e observações (não existe campo no banco — exige aprovação de evolução); pesquisa por referência (consulta atual não devolve a referência). A referência documental é obrigatória no formato externo:documento por exigência do contrato atual.
6. Testes: 225/225 testes do aplicativo + 6 novos (indicadores sem abertura/transferência/estorno/duplicidade, resultado negativo exato, valor brasileiro, períodos, valor inválido e categoria obrigatória). Verificação de tipos OK. Não houve teste com usuário autenticado no Supabase remoto.
7. Preservação (leitura em 02/11): 6 aberturas, 0 outras operações, 0 movimentos, 296 auditorias — inalterados.
8. Pendências para liberar: aplicar V2 com autorização específica; validar login real de admin/analista; decidir campos de forma de pagamento/observações.
9. V2 NÃO aplicada. 10. Nada publicado.
