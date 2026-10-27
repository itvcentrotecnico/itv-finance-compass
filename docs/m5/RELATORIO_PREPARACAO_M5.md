# M5 — Sincronização automática diária (preparação, NÃO aplicada ao HML)

- SQL: `docs/m5/M5_SINCRONIZACAO_AUTOMATICA.sql` · Reversão: `docs/m5/M5_REVERSAO.sql`
- Testes locais (banco descartável com todas as migrações oficiais + M4): `docs/m5/testar_m5_local.sql` — 21/21 aprovados.
- Suíte do aplicativo: 83/83; compilação sem erros.

## Impactos
- `integracao_sincronizacoes` ganha `modo` (manual/automatica), `janela_inicio`, `janela_fim` (registros existentes ficam "manual").
- Execuções em andamento há mais de 15 min passam a falha "tempo_esgotado" (hoje há 1 travada desde 26/10 21:46 Manaus).
- Passa a existir no máximo uma sincronização em andamento (manual ou automática).
- `integracao_iniciar` (manual) mantém a regra de perfil e passa a recusar execução simultânea.
- Nova `integracao_iniciar_automatica`: só identidade de servidor; 1 conclusão automática/dia; até 6 tentativas/dia; janela ≤ 31 dias.
- `integracao_concluir`: corpo idêntico à M4; execuções automáticas só podem ser concluídas pelo servidor e as manuais só por administradores.
- Sem alteração em movimentos, saldos, contas, conferências existentes, perfis ou RLS.

## Riscos
- O servidor usa a chave de serviço do HML para chamar apenas as duas funções; perfis humanos não ganham acesso.
- Se o GESTÃO ITV estiver fora do ar, a execução registra falha e o próximo horário de reserva tenta de novo.
