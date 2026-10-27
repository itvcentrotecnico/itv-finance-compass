# Implementação da Integração — GESTÃO ITV → ITV FINANCEIRO HML

Data: 26/10/2026. Escopo: exclusivamente o ITV FINANCEIRO HML. O GESTÃO ITV não foi alterado.

## 1. Estrutura implementada

**Banco HML (migração M4, aditiva — nada existente foi modificado):**
- `financeiro_hml.integracao_sincronizacoes`: histórico das sincronizações (data, responsável, situação, contadores, erros).
- `financeiro_hml.integracao_itens`: um registro por recebimento/título da origem, com referência única `gestao_itv:<tabela>:<uuid>`, resumo e situação (novo, existente, divergente, enviado à conferência, possível duplicidade).
- RPC `integracao_iniciar` e RPC `integracao_concluir`: único caminho de escrita, com verificação de perfil no banco (Administrador Geral / Administrador Financeiro), transacionais e idempotentes.
- Auditoria automática nas duas tabelas (mesmo padrão da Tesouraria).
- Leitura das duas tabelas para todos os perfis financeiros; nenhuma escrita direta por nenhum perfil.

**Aplicativo:**
- `src/lib/integracao.ts`: normalização pura (formas de pagamento, referências, texto canônico, montagem dos itens).
- `src/lib/integracao.functions.ts`: leitura da origem no servidor e registro no HML.
- `src/components/integracao/IntegracaoPanel.tsx`: tela "Integrações" com estado da conexão, última sincronização, contadores, erros e lista de itens.
- Matriz de permissões da interface: Administrador Financeiro passa a poder acionar a sincronização (espelhando a RPC).

## 2. Mecanismo de autenticação escolhido

Identidade dedicada de leitura no GESTÃO ITV (usuário próprio da integração), autenticada no
servidor do HML. As regras de acesso da origem (RLS) continuam valendo — nenhuma política foi
enfraquecida. URL e chave pública da origem ficam no código do servidor (são públicas por
definição); usuário e senha da identidade ficam em segredos de servidor, nunca no navegador.
Nenhuma credencial administrativa ou service_role é usada.

## 3. Situação da credencial de leitura

**Não configurada.** A identidade de leitura ainda não existe no GESTÃO ITV. Por decisão da
autorização, a integração foi preparada e permanece **desabilitada**: a tela mostra
"Desabilitada" e o botão de sincronização fica indisponível até que os segredos
`GESTAO_ITV_USUARIO` e `GESTAO_ITV_SENHA` sejam configurados.

**Pendência de configuração (responsável pelo GESTÃO ITV):** criar um usuário dedicado à
integração com perfil de consulta e informar suas credenciais para registro como segredos do
servidor do HML.

## 4. Testes realizados

- **21/21 testes de banco locais** (PostgreSQL descartável): permissões por perfil, pagamento
  simples, pagamento misto (um item por forma), cartão com taxa e valor líquido, boleto pago,
  título em aberto informativo, idempotência de sincronização repetida, conclusão repetida,
  divergência por alteração na origem (sem tocar na conferência já criada), cruzamento com a
  planilha (mesma data+valor+forma retido para revisão; forma diferente não é duplicidade),
  registro de falha, isolamento de escrita, leitura por perfil, bloqueio de anon e auditoria.
- **15/15 testes unitários** da normalização (formas, referências, texto canônico, montagem).
- **74/74 testes do aplicativo** e compilação sem erros.
- Verificação pós-migração no HML: 2 funções criadas; 0 sincronizações, 0 itens, 0 conferências,
  0 movimentações — nada foi escrito.

**Não realizado (depende da credencial):** leitura com amostra real, prova de que a credencial
não escreve, e sincronização real. O teste de isolamento entre os bancos foi comprovado por
construção: o código da origem só executa consultas de leitura.

## 5. Registros efetivamente sincronizados

**Zero.** Nenhuma sincronização real foi executada — a credencial de leitura não existe ainda.

## 6. Pendências de configuração

1. Criar a identidade de leitura no GESTÃO ITV (responsável pelo sistema de origem).
2. Registrar `GESTAO_ITV_USUARIO` e `GESTAO_ITV_SENHA` como segredos do servidor do HML.
3. Executar a primeira sincronização manual e revisar os itens na tela Integrações.
4. Conciliar as conferências criadas (aba Conferência da Tesouraria) antes de qualquer lançamento.

## 7. Confirmação sobre o GESTÃO ITV

O GESTÃO ITV permaneceu **integralmente inalterado**: nenhuma migração, alteração de dados,
permissão ou configuração foi feita em seu projeto ou banco. Toda a leitura foi do código-fonte
(snapshot) e, no HML, apenas estruturas novas foram criadas.

## Observação do verificador de segurança

O linter do Supabase sinalizou as duas novas funções SECURITY DEFINER executáveis por usuários
autenticados. É o padrão já adotado pela Tesouraria (8 ocorrências pré-existentes): a execução é
revogada de público/anon e cada função verifica o perfil do chamador no banco antes de agir.
Nenhuma ação corretiva é necessária; o aviso foi revisado e aceito por ser intencional.
