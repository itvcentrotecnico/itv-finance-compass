# Homologação final M5 — Etapa 1, 27/10/2026

## Verificações concluídas
- 39/39 testes de integração, leitura, execução e agendamento aprovados às 02:54 UTC.
- SELECT no HML: 16 itens e 16 conferências, todas pendentes; zero referências duplicadas e zero vínculos de conferência inexistentes.
- Zero movimentos da Tesouraria; três operações preexistentes do tipo abertura, todas 0.00. Nenhuma conferência lançada. Saldos iniciais e efeitos agregados de movimentos zero nas três contas existentes.
- Última sincronização permanece a automática de 02:41:48 UTC, falha leitura_origem, zero novos; nenhuma sincronização foi iniciada nesta verificação.
- Página oficial respondeu HTTP 200 às 02:54:57 UTC, título ITV Financeiro. Assets públicos identificados: index-CewKhskV.js e styles-SUMq9tOL.css.

## Publicação: limite da prova
A resposta HTTP 200 comprova disponibilidade da página, mas não a versão do código do servidor. O módulo server-only não consta do bundle de cliente, o que é esperado e não prova sua ausência no servidor. Nenhum novo evento integracao_leitura_falhou foi encontrado nos logs publicados consultados. Não foi provocado erro nem acionado POST.

GET ao endereço /api/public/integracao/sincronizacao-diaria retornou HTTP 200 e text/html. A rotina local é POST; esse GET não comprova que o handler publicado inclua o novo leitor. Não interpretar HTML como êxito de sincronização ou confirmação do diagnóstico.

Não há evidência acessível que associe a implantação servida ao módulo seguro específico. Publicação anteriormente agendada não equivale à confirmação da versão. A Etapa 1 permanece parcial; não liberar o teste real antes da comprovação exigida pelo usuário.

## Restrições preservadas
Nenhuma sincronização manual/automática, escrita no HML, alteração da origem, credencial exposta ou configuração de cron realizada. A tarefa externa deve continuar desabilitada; seu estado não foi verificado diretamente. Etapas 2 e 3 aguardam a confirmação da versão e posterior ação explícita do usuário.