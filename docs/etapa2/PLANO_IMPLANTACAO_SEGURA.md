# ITV FINANCEIRO — Etapa 2: plano de implantação segura

**Preparado em 29/10/2026, após autorização das 20h11 Manaus.**

## Resultado executivo

**PLANO DE IMPLANTAÇÃO SEGURA PREPARADO PARA APROVAÇÃO.** Aplicação permanece suspensa. Não foi aplicado SQL, ativada manutenção, feita restauração, publicação, sincronização, aprovação, lançamento ou alteração cadastral. GESTÃO ITV não foi acessado.

A solução é uma única janela coordenada: **recuperação comprovada → bloqueio de escritas e drenagem → migração → publicação compatível autorizada → validação → retomada controlada.** Não ampliar funcionalidades nem reabrir caminhos antigos para contornar incompatibilidades.

Este documento é um procedimento proposto, não um pacote executável de manutenção/reversão já validado. Sua aprovação não dispensa as evidências listadas abaixo.

## 1. Situação do backup

### Confirmado nesta etapa

- Projeto externo HML: `ayjppexbzpgdkzbehvzw`. O identificador foi confirmado pela integração; o rótulo técnico do ambiente publicado não representa outro banco autorizado.
- PostgreSQL **17.11**, banco de aproximadamente **13 MB**; esquema financeiro com **13 tabelas**, todas com RLS habilitada. Tamanho pequeno não comprova tempo de restauração.
- Há pacote parcial de **23/10 às 17h57 UTC**, com sete tabelas e 18 funções daquele momento. ZIP e checksums internos íntegros; evidência histórica de **102 verificações locais aprovadas**, em PostgreSQL 17.9. Não reexecutamos a restauração.
- Esse pacote precede integração M5 e os 49 registros atuais: **não é backup atual nem recuperação certificada da Etapa 2**.

### Não comprovado

Plano contratado, backup hospedado atual/data/status, PITR ativo, retenção, disponibilidade de restauração em projeto novo e tempo de recuperação. A ferramenta disponível identifica o projeto e permite consultas, mas não oferece status administrativo de backups. Nenhuma conexão de gestão adicional vinculada foi encontrada; conexão direta de banco não está disponível no executor. Isso **não significa que o Supabase não tenha backups**.

### Cobertura mínima exigida

O artefato atual deve incluir dados exatos das 13 tabelas, sequências/identidades, índices/constraints, funções completas/assinaturas/proprietários, grants de esquema/tabela/coluna/função, políticas/RLS, gatilhos e dependências necessárias. Capturar também privilégios padrão e vínculos dos perfis. Confirmar a cobertura pelo conteúdo e pela recuperação, não pelo nome do arquivo.

Backup de banco não é cópia integral das configurações hospedadas: separar Auth/configurações de e-mail/redirecionamento, segredos, aplicação publicada e objetos do Storage. Não exportar tokens/senhas para relatórios ou código. O pacote parcial histórico não restaura Supabase Auth; dependências simuladas de Auth só servem para testes locais, nunca para HML.

## 2. Evidência de restauração e alternativa segura

**Evidência atual de recuperação: ausente. Evidência histórica: 102 verificações do pacote antigo, insuficientes para o estado atual.**

Não executar restauração nesta autorização, mesmo isolada: a restrição final do documento recebido exige nova autorização para essa ação.

**Alternativa proposta para aprovação:** administrador do Supabase verifica, sem restaurar, a página Database → Backups do projeto exato e registra método, data/hora, conclusão, retenção e possibilidade de recuperação. Depois, autorizar um ensaio separado em destino isolado:

1. Preferir restauração/clonagem para **novo projeto isolado**, se o recurso contratado permitir; nunca escolher restaurar sobre o HML atual. Não criar projeto pago automaticamente.
2. Se indisponível, aprovar exportação atual consistente e protegida do esquema/dados/roles necessários, por procedimento suportado, e ensaio em PostgreSQL isolado compatível. A alternativa de extração somente por consultas exige reconstrução completa e validação por catálogo; não tratar uma lista de registros ou migrações como backup.
3. Conferir contagens, hashes, valores, sequências, funções, ACLs por coluna, políticas e gatilhos no destino. Teste local com Auth simulado comprova somente recuperação parcial financeira; validar Auth real exige destino Supabase e procedimento específico.
4. Desabilitar previamente qualquer acionamento externo no destino de ensaio; não reutilizar credenciais de origem nem disparar sincronização durante testes.
5. Medir do início até integridade confirmada, registrar falhas, duração e cobertura. Definir a janela a partir desse resultado.

**Tempo estimado de recuperação:** ainda não estimável com confiabilidade; depende de acesso, método, provisionamento e validação. O banco de 13 MB não autoriza prometer minutos. **Perda potencial de dados:** desconhecida até comprovar horário e consistência do backup; para implantação, exigir captura final consistente depois do bloqueio/drenagem, antes da migração.

## 3. Manutenção controlada — preparada, não ativada

### Mecanismo proposto

Barreira temporária de permissões de escrita, mantendo leitura e RLS; acompanhada de suspensão voluntária de produtores privilegiados e drenagem. **Não fechar globalmente conexões do banco:** esse caminho compromete consultas e exige controles de recuperação que não estão comprovados.

Antes de executar, gerar e revisar um pacote específico de manutenção a partir dos grants reais, incluindo privilégios herdados e por coluna. O roteiro M3 antigo não cobre automaticamente M5/Etapa 2. Manutenção e migração ficam separadas e cada mudança exige autorização própria.

### Escritas a conter

- authenticated: seis RPCs financeiras legadas; INSERT/UPDATE por coluna em tesouraria_conferencias; cinco colunas editáveis em contas_financeiras; INSERT/UPDATE de plano_contas, centros_custo e perfis.
- Sincronização: integracao_iniciar, integracao_iniciar_automatica e integracao_concluir, com restrição de EXECUTE para authenticated/service_role conforme ACL real. Bloquear ambos os inícios **antes de qualquer leitura à origem**; concluir também precisa de barreira após a drenagem. Nesta inspeção: 19 execuções finalizadas (9 concluídas, 10 falhas), nenhuma em andamento.
- service_role: escritas diretas concedidas em integracao_itens, integracao_sincronizacoes, contas_preparadas, tesouraria_conferencias e auditoria. Retirar temporariamente apenas acessos externos necessários; preservar os triggers e o proprietário da migração. BYPASSRLS não substitui grants nem contém o dono do banco.
- Diagnóstico: diagnostico_reservar/diagnostico_finalizar também devem ficar indisponíveis durante a janela, sem chamadas de teste à origem.
- Novos comandos: após a instalação, conferencia_comandar e lançamento continuam bloqueados durante validação. Consultar, histórico, opções, saldos e extratos permanecem disponíveis conforme perfil.

### Procedimento operacional

1. Designar responsável, horário e limite da janela; avisar usuários: somente consulta, sem sincronizar ou salvar. Registrar início UTC/Manaus em evidência de implantação separada, **não fabricar eventos financeiros em auditoria**.
2. Pausar produtores administrativos, filas/retentativas e serviços que escrevam. Cron-job.org continua desativado. Presença de processos pg_cron/pg_net não prova tarefas ativas; verificar suas tarefas/acessos sem alterá-los nesta fase.
3. Ativar e confirmar a barreira autorizada. Verificar grants efetivos de tabela, coluna, função, PUBLIC e herança; somente esconder botões não basta.
4. Aguardar finalização das chamadas já admitidas, incluindo leituras externas em curso, transações abertas/preparadas e esperas por locks. REVOKE/CREATE OR REPLACE não cancelam funções que já começaram. Não cancelar sessões automaticamente. Se não houver visibilidade/controle contínuo, interromper.
5. Confirmar consultas permitidas e captura final consistente. Registrar responsáveis/evidências da drenagem. Observar sessões ociosas uma vez não é prova suficiente.
6. Manter a barreira até conclusão da publicação e validação. Encerrar com horário, resultado, hashes e permissões finais aprovadas. Não restaurar grants antigos das conferências nem wrappers bloqueados.

**Limite:** administradores proprietários podem escrever apesar da barreira de aplicação; dependem de controle operacional comprovado. Se não puder ser garantido, a implantação não ocorre. Não foi ativado nenhum dos bloqueios descritos.

## 4. Compatibilidade e publicação coordenada

| Superfície | Versão antiga com SQL novo | Conduta segura |
|---|---|---|
| Consultas financeiras | SELECT/RLS preservados, salvo locks breves | Verificar listagens/saldos/extratos |
| Salvar/ratear fonte antiga | Grants por coluna revogados | Não permitir gravar; usar novo editor |
| Lançar conferência | Exige versão e aprovação auxiliar | Versão antiga não tem contrato compatível |
| Avulso/transferir/abrir/habilitar/estornar | Wrappers bloqueados | Continuam indisponíveis; não reabrir |
| Novo editor | Usa quatro RPCs novas | Publicar somente depois de instaladas e verificadas |
| M5 | Não muda na proposta | Pausa apenas na janela; depois preservar contratos/horários/idempotência |

SQL identificado: SHA-256 `709db761e7de3259d2139e24d2ea44cb832686b5a95e610b8bc0b6bb8fbd324e`. Cinco tabelas auxiliares e sete funções novas; seis wrappers substituídos. Nada instalado nesta etapa.

**Plano único recomendado:** autorizar separadamente a publicação da versão já preparada **na mesma janela**. Banco primeiro, verificação estrutural, publicação, verificação de consultas e contratos; usuários não retomam ações antigas no intervalo. Abas antigas continuam sujeitas à barreira do banco, mesmo com código em cache.

Esta autorização não permite publicar agora. Novas regras e autorização operacional ficam vazias; não cadastrar categorias/centros/corte para fazer a homologação passar. Fluxo completo de aprovação usa testes isolados; comandos sobre as 49 fontes seguem proibidos. Assim, instalar controles não significa liberar operação ou comprovar aprovação real no HML.

## 5. Interrupção e reversão

**Interromper antes de aplicar:** alvo divergente, backup/restauração não comprovados, escritores não contidos, sync/chamada em curso, conflito de lock, dependência/assinatura inesperada, SQL diferente do aprovado ou incompatibilidade sem publicação autorizada.

**Erro antes de COMMIT:** confirmar ROLLBACK da transação inteira; comparar catálogo/ACLs/dados com captura imediatamente anterior. A barreira de manutenção é separada e continua ativa até decisão. Não repetir automaticamente. A proposta usa BEGIN/COMMIT, mas isso precisa ser respeitado pelo executor oficial.

**Resposta perdida:** consultar catálogo e registro oficial da migração para distinguir commit de rollback. Estado incerto não autoriza repetir ou reverter às cegas. Não há recuperação de execução em andamento só pela consulta ao histórico.

**Aparente aplicação parcial:** parar, manter bloqueios e inventariar exatamente o que persistiu. DDL transacional não deve deixar parte da mesma transação após rollback; persistência parcial indica passos separados ou execução diferente da prevista. Tratar por correção aprovada, nunca apagar automaticamente objetos.

**Falha após COMMIT:** não existe ROLLBACK daquele commit. Preferir correção progressiva compatível, mantendo operação bloqueada. Se for necessário recuperar definições antigas, preparar migração específica com as definições reais capturadas, mantendo os caminhos perigosos sem EXECUTE e preservando todas as tabelas auxiliares/vínculos/novos históricos. A interface antiga pode voltar a somente consulta; retorno não autoriza reabrir privilégios antigos.

Não remover auditoria, controles ou vínculos, não editar os 49 registros, não reverter contas/datas/saldos e não restaurar backup por cima de eventos posteriores. Restauração integral só por autorização de incidente, com análise de perda e evidência preservada. Scripts M3/M5 de reversão não são reversão pronta da Etapa 2.

**Após recuperação:** validar funções/grants/RLS/triggers e sequência de auditoria; comparar todas as fontes, contas, saldos, movimentos e histórico; conferir consultas. Retomada exige decisão explícita. A restauração de grants temporários deve ser seletiva: nunca desfazer restrições permanentes da Etapa 2.

## 6. Integridade e riscos remanescentes

Consultas desta etapa confirmam **49 itens, 49 conferências pendentes, 19 sincronizações, 280 auditorias e zero movimentos**. Três contas oficiais permanecem ativas/habilitadas, abertura 29/10 e saldos **R$ 0,00**.

- Itens MD5: `f64dc54b9b5b6821d2570a2b3c906782`.
- Conferências MD5: `93c55a20c6c20dd66b2b97204f687434`.
- Ambos iguais ao baseline; nenhuma alteração ou duplicidade adicional nesses conjuntos.

**Riscos ainda abertos:** backup atual e tempo de recuperação desconhecidos; drenagem privilegiada não certificada; publicação compatível sem autorização; pacote executável específico de manutenção/reversão ainda precisa de preparação e teste aprovados. Homologação autenticada real não está disponível neste executor de Supabase externo; não pedir senhas. Testes anteriores (201 aplicação/47 SQL isolados) não foram repetidos nem certificam a recuperação atual.

## 7. Sequência exata para execução futura

1. Aprovar método/cobertura de backup e ensaio isolado, incluindo custos se houver; obter evidência administrativa atual.
2. Preparar e testar fora do HML o pacote específico de barreira/reversão seletiva, sem alterar o SQL Etapa 2 silenciosamente.
3. Validar recuperação isolada autorizada, registrar tempo/cobertura e aprovar limitações residuais.
4. Autorizar explicitamente janela, ativação/desativação da manutenção e publicação compatível; definir responsável/executor e retorno seguro.
5. Ativar barreira; conter produtores; drenar chamadas anteriores; validar consultas.
6. Capturar backup/snapshot final consistente e baseline de dados/objetos/ACLs; comparar com os 49/49 e zero movimentos.
7. Aplicar somente migração aprovada em transação única, pelo mecanismo oficial; erro/lock/conflito: interromper sem retry.
8. Validar cinco tabelas, sete funções, seis substituições, grants/RLS/gatilhos/M5 e hashes; manter mutações bloqueadas.
9. Publicar versão compatível mediante autorização específica; verificar consultas reais com perfis autorizados e contratos. Não aprovar nem lançar as 49 conferências.
10. Comparar novamente integridade e encerrar manutenção com grants finais seletivos; liberar apenas o escopo não financeiro aprovado. Manter autorização operacional e regras oficiais vazias, sem novas sincronizações de teste.
11. Entregar relatório de execução. Só depois tratar as três decisões administrativas: início oficial, categorias/centros e saldos iniciais; publicação não libera lançamentos por si só.

## 8. Condições para autorização final

- [ ] Backup atual completo no escopo e recuperação isolada comprovada, limites aceitos e tempo medido.
- [ ] Barreira específica e reversão seletiva preparadas/testadas, com consultas preservadas.
- [ ] Controle de produtores e drenagem contínua demonstráveis, sem cancelamento automático.
- [ ] Janela/responsável/executor definidos e autorização de publicação coordenada.
- [ ] SQL exato e estado atual compatíveis; baseline atualizado imediatamente antes.
- [ ] Critérios de falha, recuperação e retomada aprovados sem apagar históricos/reabrir privilégios.

**Não solicitar novamente aprovação dos mesmos controles funcionais.** Solicitar somente as ações adicionais de recuperação/manutenção/publicação necessárias; nenhuma delas foi executada por este plano.

### Referências oficiais consultadas

- Backups, retenção e limitações: https://supabase.com/docs/guides/platform/backups
- Backup/restauração com CLI: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- Restauração/clonagem em novo projeto: https://supabase.com/docs/guides/platform/clone-project

A documentação descreve recursos possíveis; não comprova contratação ou disponibilidade no HML específico.