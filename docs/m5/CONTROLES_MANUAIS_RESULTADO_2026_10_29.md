# ITV FINANCEIRO — Controles manuais finais

## Escopo e situação

Controles aplicados exclusivamente no Supabase HML ayjppexbzpgdkzbehvzw, schema financeiro_hml. Interface preparada no preview; nenhuma publicação realizada. Não houve sincronização real, consulta ao GESTÃO ITV, mudança de agendamento, segredo ou dado financeiro.

## Solução

- `integracao_estado_manual()` usa relógio do banco e America/Manaus; sem parâmetros de data, identidade ou horário. Leitura com SECURITY INVOKER e RLS existente, após verificação de administrador ativo.
- `integracao_iniciar()` consulta a mesma decisão sob lock físico SHARE ROW EXCLUSIVE NOWAIT, serializando com inícios e conclusões de outras conexões. Rejeita antes de 18h30 ou após sucesso manual no dia; índice global de andamento e expiração de 15 minutos preservados.
- Dia de sucesso: data de `coalesce(concluido_em,iniciado_em)` em Manaus, somente modo manual/status concluída, para toda a operação (não por usuário). Histórico anterior e zero novos contam; falhas não contam. Conclusão cruzando meia-noite conta no dia da conclusão.
- Botão bloqueado até confirmação do servidor e em caso de erro de consulta; atualização a cada 15 segundos sem executar sincronização. A decisão do botão é apenas indicativa; toda chamada direta é revalidada no banco.
- Último sucesso e próxima liberação aparecem com data/hora de Manaus; mensagens específicas de horário, sucesso diário e concorrência.

## Arquivos afetados

- `src/lib/integracao.functions.ts` — estado da disponibilidade e tradução das recusas.
- `src/components/integracao/IntegracaoPanel.tsx` — bloqueio do botão e mensagem.
- `src/lib/integracao-manual.ts` — contrato da decisão e formatação dos horários recebidos.
- `src/lib/integracao-manual.test.ts` — seis testes de recusa direta, ausência de leitura e independência do relógio do cliente.
- `docs/m5/M5_CONTROLES_MANUAIS_PROPOSTO.sql` — SQL integral aplicado.
- `docs/m5/M5_ESTADO_MANUAL_PERMISSOES.sql` — consulta read-only sob permissões normais, removendo o aviso novo de SECURITY DEFINER.
- `docs/m5/testar_controles_manuais_local.py` — 31 testes PostgreSQL isolados.
- Migrações oficiais `20261029231959_15e6b835-6d30-4bd4-8e3d-70f734406ea0.sql` e segunda migração de SECURITY INVOKER gerada pelo mecanismo oficial.
- `AGENTS.md`, `roadmap.md` e este relatório — documentação da decisão/resultado.

## Verificações

183 testes da aplicação aprovados (177 existentes + seis novos); 31 testes PostgreSQL isolados aprovados antes e depois do ajuste SECURITY INVOKER. Regressão focal posterior: 23/23. Compilação automática OK em 29/10 23h22 UTC.

Testes concretos incluem 18h29, 18h29min59s, 18h30, 23h59min59s, meia-noite, liberação amanhã, histórico, zero novos, falha, perfil não administrador, anônimo, service_role, ausência de identidade, UTC/Manaus, concorrência com início/conclusão e expiração existente. Relógio simulado somente no banco descartável por substituição de clock_timestamp; nenhuma função de produção aceita relógio de teste.

HML antes/depois: 49 itens, 49 conferências, 19 sincronizações, 271 auditorias, zero movimentos, três operações preexistentes com total 0.00; aberturas das contas zero. Hashes integrais idênticos: itens `0464e51e52cc246c9350ccb2db338da4`, conferências `4273a9cc9d1009288132577faaf70c05`.

## Restrições

- Sessão real indisponível no executor (`external_unmanaged`); teste autenticado ponta a ponta não realizado. Não solicitar credenciais nem contornar autenticação; confirmar no navegador existente sem clicar em sincronizar.
- Migrações entram no HML imediatamente, mesmo sem publicar. Mensagens/botão novos só entram no site publicado após autorização final.
- Disputa breve de gravações pode resultar em recusa por concorrência; nenhuma retentativa automática adicionada.
- HTTP 503 permanece pendência; Dashboard gerencial fora do escopo.
- Aviso novo de privilégios elevados da consulta foi removido; 11 avisos preexistentes de funções protegidas e aviso de proteção contra senhas vazadas permanecem, sem mudança de autenticação nesta correção.

ITV FINANCEIRO — CONTROLES MANUAIS IMPLEMENTADOS E PRONTO PARA APROVAÇÃO FINAL DE PUBLICAÇÃO, com a limitação de acesso autenticado acima explicitada. Aguarda autorização final; não publicar automaticamente.