# M5 — situação inicial para único teste supervisionado

Autorização recebida em 27/10/2026 às 13:46 UTC. Acionamento será feito manualmente pelo usuário no cron-job.org; agenda recorrente deve continuar desabilitada. Nenhum POST, sincronização ou leitura da origem realizado pelo assistente. Aguarda confirmação do acionamento para análise posterior.

## Baseline por SELECT em 27/10/2026 às 13:47:00 UTC (09:47:00 Manaus)

| Verificação | Situação inicial |
| --- | --- |
| Itens da integração | 16 |
| Conferências | 16, todas pendentes |
| Referências duplicadas nos itens/conferências | 0 / 0 |
| Conferências lançadas | 0 |
| Movimentos de Tesouraria | 0 |
| Operações diferentes de abertura | 0 |
| Total de aberturas | 0.00 |
| Contas com abertura não zero | 0 |
| Saldos financeiros | R$ 0,00 |
| Execuções existentes | 11 |
| Execuções sem conclusão | 0 |
| Entradas de auditoria | 110 |

Hashes de integridade dos registros, iguais ao baseline anterior: itens 01b3de508a9f7f43ea0a52d1bbad02a0; conferências e3483b93e924a9be95ec5d65df4350bb.

Última execução existente: 98d94211-1a24-4bac-a6d6-f59a4d80667c, automática, falha, iniciada 27/10 02:58:03.292092 UTC, concluída 02:58:03.506381 UTC, janela 20–26/10, zero consultados/novos/existentes/enviados. Última auditoria 02:58:03.496194 UTC. Essa ocorrência é histórica, não é o teste agora autorizado.

Versão anteriormente comprovada no publicado: m5-http-contexto-v1, revisão 95cf17c3f13734bf55260c2f5802d615d679c907ebda792be400072d7cd76389, 70 testes aprovados; nenhuma consulta HTTP adicional necessária para registrar o baseline.

## Acompanhamento após confirmação do usuário
Comparar execução nova após esse baseline, autenticação/início e resultado HTTP pelos logs; janela esperada se acionada hoje em Manaus: 21–27/10/2026. Conferir conclusão da leitura compartilhada dos cinco recursos, contagens consultadas/existentes/novas, elegibilidade e vínculo das conferências, duplicidades, preservação dos registros anteriores, movimentos/saldos e auditoria. Os logs individuais de sucesso por recurso não são registrados pelo leitor; distinguir evidência agregada de evidência HTTP individual caso não esteja disponível. Não criar instrumentação nem executar GET da origem para suprir essa lacuna durante o teste.

Falha: registrar apenas categoria/etapa/HTTP e diagnóstico seguro disponível, sem credenciais ou conteúdo financeiro. Não repetir tentativa, modificar GESTÃO ITV, habilitar agenda ou homologar antes do resultado real. Estado externo do cron não inspecionado pelo assistente.