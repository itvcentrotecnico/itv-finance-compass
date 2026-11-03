# ITV FINANCEIRO V2.2.1 — RELATÓRIO FINAL DE HOMOLOGAÇÃO

**03/11/2026 — conclusão às 21h16 UTC (17h16 Manaus).**

## 1. Parecer executivo

**Classificação: BLOQUEADA para implantação, por evidências críticas externas pendentes.** A revisão técnica autorizada foi concluída e a proposta corrigida passou nos testes locais. Não foi instalada, publicada ou integralmente homologada no ambiente hospedado.

**PODE SER AUTORIZADA A IMPLANTAÇÃO? NÃO, neste momento.** Falta comprovar recuperação atual com segurança/owners/ACLs, controle contínuo dos produtores de escrita e janela, manifesto final aprovado e validação do acesso real à primeira aba pelo analista. Não há necessidade de reiniciar funcionalidades ou repetir as consultas 01–05 já verificadas nesta revisão; revalidar snapshot somente na futura janela, pois o estado pode mudar.

## 2. Integridade hospedada — leituras efetivamente executadas

Destino conferido pela configuração do projeto: Supabase ayjppexbzpgdkzbehvzw, schema financeiro_hml. `current_database()=postgres` isoladamente não identifica projeto. SELECTs realizados em 03/11/2026, 21h10min36–21h12min41 UTC. Hashes coletados às 21h11min14; integridade às 21h11min15; usuários às 21h11min16; categorias às 21h11min17; catálogo/dependências entre 21h11min40–44. Consultas separadas são snapshots próximos, não uma fotografia transacional conjunta nem prova de manutenção.

| Tabela | Linhas | MD5 de referência |
|---|---:|---|
| perfis | 2 | `58b75c7a7ead925a1d4fb7a327b7265e` |
| plano_contas | 18 | `cd3c4d6f8a44b1db5a0cf43f2fa7cac1` |
| centros_custo | 1 | `2709c560755c8e0a4b65c0e409797d95` |
| contas_financeiras | 6 | `3ab4a7018d6f9c00bdee80f7795afb79` |
| contas_preparadas | 3 | `76a14ceb792b90bee9900627384524e2` |
| tesouraria_conferencias | 49 | `c74025f99a1384ec9666c8f7e4218ea9` |
| tesouraria_operacoes | 6 | `809afc571260b8dc1699e13267723d7b` |
| tesouraria_movimentos | 0 | `d751713988987e9331980363e24189ce` |
| auditoria | 296 | `2c5991da5e600bf0e098f79ce4f998a7` |
| integracao_itens | 49 | `70b3da40fb4fb2d34f0e297a5d5447df` |
| integracao_sincronizacoes | 19 | `c81f8986a70b874ec3df8f9a8804bff7` |
| diagnostico_autorizacoes | 2 | `de8ebbdf023c4087c9d067217d419ef9` |
| diagnostico_tentativas | 11 | `ad9b10aa9c4ab7170082dfa74924f109` |

Hash calculado sobre representação JSONB integral das linhas, ordenada deterministicamente. MD5 serve para comparar integridade, não assinatura criptográfica de backup. Baseline JSON acompanha o pacote.

**Aprovado por leitura:** seis contas e seis operações, todas aberturas; uma abertura coerente por conta (6/6), zero outras operações e zero movimentos, zero controles internos, zero chaves idempotentes duplicadas, zero referências de origem duplicadas e zero movimentos órfãos. Nenhum saldo inicial foi corrigido ou confirmado como saldo bancário real. Há três contas oficiais e três HML TESTE; todas preservadas. As 14 categorias oficiais estão ativas, analíticas e conformes; o plano tem 18 registros porque inclui duas categorias-pai e dois registros anteriores. Não repetir cadastro.

Preservação pós-instalação foi provada exclusivamente com dados sintéticos locais: comparação integral das 13 tabelas exclui apenas a conta técnica, abertura e dois eventos técnicos novos. Como não houve instalação hospedada, não existe pós-migração real para apresentar.

## 3. Segurança: hospedado versus proposta

**Hospedado, somente metadados:** 13 tabelas com RLS; 31 funções (contagem completa confirmada; a indicação intermediária de 29 não era a contagem final), 23 políticas, 22 gatilhos e 107 constraints. Owners das tabelas/funções inspecionadas: postgres. Estrutura base MD5 `910691611965f25f41f922fa1e4b29f7`. RLS/FORCE e políticas não foram desligadas ou alteradas.

O banco atual ainda é legado, não V2.2.1: grants autenticados permitem RPCs antigos de escrita, incluindo criação de conta, transferência, estorno e conferência; contas têm privilégios por coluna e conferências têm escrita direta disponível. A política de Centros de Custo ainda inclui o analista; existe EXECUTE anon em autoria_cadastro. Não alegar que só o par pode lançar no banco atual nem que ocultar controles na tela fecha esses caminhos. Não foram feitas chamadas de exploração ou gravações para comprovar risco: ACLs/definições bastaram.

**Proposta local revisada e testada:** somente admin_geral e analista_financeiro do manifesto, cada UUID vinculado ao seu papel exato. Troca entre esses dois papéis, desativação ou terceiro administrador bloqueia lançamento/sonda. Motor privado, caminhos financeiros alternativos selados e grants de tabela/coluna/sequência revogados fora da lista positiva. Admin mantém inclusão/alteração de perfis/categorias/centros sob RLS; analista consulta e registra, sem administração. Centros somente admin_geral; nenhum DELETE de cadastro. Permissões dependem do banco, não do navegador.

M5 conserva início/conclusão manual, leitura e estado, sem agenda automática nem conciliação. As funções M5 não foram reconstruídas nem houve consulta à origem. O ensaio local de lote não comprova transporte externo ou elimina o risco preexistente de vinculação do iniciador da integração; não é homologação nova do M5.

## 4. Autenticação

Leitura mais recente confirma dois perfis ativos com Auth existente e **ambos os e-mails confirmados**. O analista tem último acesso registrado em 03/11 às 21h02 UTC. Assim, o e-mail pendente informado anteriormente já foi superado; não é necessário novo convite ou exigir nova confirmação.

Isso comprova confirmação e registro de login, não o fluxo completo da aba Lançamentos V2.2.1. Supabase externo não fornece sessão autenticada gerenciada para o executor; não pedir senha ou token. Falta confirmação do analista na versão a utilizar e, depois de futura instalação, leitura autenticada da sonda/histórico por ambos. Nenhuma operação financeira hospedada foi testada. Configurações atuais de cadastro público/provedores não foram relidas nesta etapa: evidência histórica não equivale a verificação atual.

## 5. Correções mínimas concluídas

1. Real `perfis` contém usuario_id, papel, ativo e criado_em; não possui nome/preferencias. Consulta 01 deixou de usar p.nome. O histórico agora acessa nome opcional via JSON da linha sob RLS, retornando NULL quando ausente; mantém criado_por/UUID, sem inventar nome ou consultar Auth privilegiado. Exibição de nome civil não está comprovada; autoria por ID permanece rastreável.
2. A constraint real permite apenas banco/caixa. A proposta passa a ampliar explicitamente essa regra para banco/caixa/interno, sob a mesma trava/transação. Não disfarça o controle como banco ou caixa, nem altera as seis contas. Essa alteração proposta requer aprovação expressa; nada foi executado no HML.
3. Fixture isolada removida das duas colunas sintéticas e acrescida dos sete checks reais faltantes; tabelas/owners/RLS/políticas/constraints/gatilhos reproduzem o hash real, zero diferenças nessa comparação.
4. Motor e sonda fixam UUID→papel aprovado, derivado dos perfis na instalação, não de mapa fornecido pelo cliente.
5. Hashes pré/pós/contenção corrigidos a partir da estrutura real: pré `910691611965f25f41f922fa1e4b29f7`; pós completo `82b4c16eea8075c0895152b317bbd9b7`; pós filtrado sem políticas de centro `17946ebf077db6324fd6d86017816156`; histórico instalado local `c51c744ec3084077d8e3cd7cb86471d2`. Não são autorização para contornar divergência futura.
6. Procedimento exclusivo V2.2.1 separa aprovação, admissão/drenagem, instalação, verificações e contenção; não manda executar o instalador V2.2. V2.1 e proposta V2.2 originais preservadas. Consulta 01 complementar foi corrigida separadamente.

## 6. Testes efetivamente executados

- **130/130 PostgreSQL 17.11 local descartável**, finalizados às 21h15:31 UTC: receitas/despesas exatas, primeira despesa sem receita de cobertura, resultado negativo, idempotência/concorrência, rejeição de vínculo fornecido pelo cliente, categorias/referência obrigatórias, imutabilidade, preservação integral, acesso dos dois responsáveis, terceiro administrador recusado, troca de papel/sonda recusadas, anti-autoelevação, administração preservada, M5 local, contenção e dump/restore sintético com grants fechados. Sete verificações adicionais à base anterior de 123.
- **249/249 testes do aplicativo**, 27 arquivos, finalizados às 21h15:47 UTC.
- Último registro automático de compilação às 21h15:47 UTC: **build OK**. Não houve mudança de interface nesta revisão.
- Bancos locais encerrados e removidos pelo harness. Auth local é simplificado; testes não equivalem a sessão hospedada nem recuperação real do Supabase.

## 7. Dependências, implantação e contingência

Seis FKs dependem de auth.users. auth.uid, auth.role e gen_random_uuid existem. Zero constraints não validadas, transações preparadas ou sincronizações em andamento visíveis no snapshot. Essa ausência pontual não demonstra drenagem ou suspensão de produtores.

Proposta altera somente financeiro_hml; referências a Auth são dependências de leitura/identidade, não alteração do schema reservado. Nenhum objeto public ou banco GESTÃO ITV foi alterado ou acessado.

SQL final revisado, contenção, manifesto vazio, fixture real isolada, resultados e procedimento acompanham o pacote. Transação/locks/checks abortam divergências; a conta interna e sua abertura zero só serão criadas na execução futura aprovada. Depois de COMMIT, a contenção preserva histórico e fecha mutadores; não restaura o motor vulnerável nem apaga dados. É contenção, não desfazer financeiro. Rotinas administrativas também ficam temporariamente fechadas em contingência.

## 8. Backup Free e recuperação

Procedimento gratuito no arquivo de implantação: pg_dump custom, catálogo legível, SHA-256, inventário protegido de owners/ACLs/dependências e restore isolado sem rede, comparação das 13 tabelas e controles. Não precisa plano Pro, mas não oferece PITR; o ponto de recuperação é o dump.

O backup informado de 01/11 foi gerado com --no-owner --no-acl: sem recomposição testada, não comprova segurança recuperável. Nesta etapa não houve acesso ao archive real nem restore real; somente restore sintético local passou. Snapshot JSON/hashes não substitui dump. Auth hospedado, configuração, secrets e objetos Storage exigem cobertura separada. Não solicitar credenciais no chat.

## 9. Pendências externas — somente ações do responsável

1. Confirmar que o analista acessa a primeira aba na versão a ser utilizada; e-mail já confirmado, sem repetir convite. Após futura aplicação, confirmar sessão/leitura/sonda do par sem lançamentos reais de teste.
2. Disponibilizar evidência protegida de backup atual e recuperação isolada, incluindo owners/ACLs e dependências omitidos no archive anterior; não enviar senha, token ou dump sensível pelo chat.
3. Aprovar manifesto final (par real, 14 UUIDs oficiais e três UUIDs técnicos novos) e alteração explícita da regra de tipo para interno. Identidades/categorias já foram lidas; não executar novamente consultas incompatíveis.
4. Informar executor e janela, conter todos os produtores de escrita e comprovar drenagem continuamente; fechar interface por si só não basta.
5. Somente depois desses itens, autorização expressa específica para aplicar a versão identificada, com publicação coordenada separadamente autorizada. Esta solicitação atual proíbe ambos.

**Conclusão:** revisão e testes locais concluídos; dados hospedados íntegros por leitura, sem criação de controle, abertura, lançamento, migração, mudança de permissões, publicação ou acesso ao GESTÃO ITV. **PODE SER AUTORIZADA A IMPLANTAÇÃO? NÃO**, até que as evidências críticas externas acima sejam concluídas.
