# ITV FINANCEIRO — revisão da primeira etapa operacional

**02/11/2026 · Destino exclusivo: ayjppexbzpgdkzbehvzw / financeiro_hml**

## 1. Conclusão executiva

**PREPARADO PARA CONTINUAR A VALIDAÇÃO; BLOQUEADO PARA APLICAÇÃO E PRIMEIRO LANÇAMENTO REAL.**

A aba existente registra receitas/despesas no fluxo preparado, mas a V2 não comprova o bloqueio de todos os caminhos alternativos exigidos. A compatibilidade com o motor não equivale a segurança integral da implantação. Não se deve aplicar o arquivo atual como se todas as pendências estivessem resolvidas.

Nesta revisão foram executados **77 testes locais aprovados em nove arquivos**, com serviços e sessões simulados, além de análise estática da V2/reversão. Acrescentados nove casos de teste, sem alterar o comportamento da aplicação. A verificação automática registrou `build OK` em 02/11 às 18h48 UTC.

**Não houve conexão ao banco nesta revisão, execução da V2 nem da reversão, migração, gravação financeira, sincronização, publicação ou acesso ao GESTÃO ITV.** As propostas SQL permanecem inalteradas. Nenhuma tabela ou funcionalidade operacional nova foi criada.

## 2. O que está pronto e foi validado

| Item | Resultado e limite da evidência |
|---|---|
| Navegação | Lançamentos está no registro central de módulos e na rota financeira existente. |
| Administradores | A aba só admite `admin_geral`/`admin_financeiro` após contrato V2 confirmado. Dois testes novos exercitam esses perfis, com sessão simulada. |
| Perfis ativos | O acesso financeiro lê o próprio perfil e recusa `ativo=false`. O motor proposto verifica identidade e `tem_papel`; depende da definição correta dessa função no destino. |
| Analista | Consulta na aba e na Tesouraria; não habilita registro nem executa a sonda. Teste específico aprovado. Isso não significa consulta global em todos os cadastros: centros de custo têm regra legada diferente. |
| Natureza | Formulário seleciona receita/despesa compatível; V2 verifica atividade, aceite e natureza no motor. Não se apoia apenas na interface. Validação do banco nesta rodada foi estática. |
| Integração do formulário | `NovoLancamento → useEnvioSeguro → registrarTesouraria → tesouraria_lancar`. Receita e despesa testadas com `1234.56`, categoria correspondente, referência e UUID preservados no envio. |
| Contrato | Sonda envia apenas `{tipo:"sonda"}` e aceita exclusivamente `tesouraria_lancar_minima_v2`; legado, erro e resposta diversa não liberam. Sonda comprova marcador, não todas as permissões. |
| Precisão e recuperação | Valores individuais em strings e centavos bigint; persistência antes do envio, Web Lock por usuário/projeto, consulta do proprietário antes de reenvio explícito dos mesmos dados. Nenhum reenvio automático. |
| Intermediários proibidos | V2 substitui cinco intermediários por recusa incondicional; `tesouraria_lancar` admite apenas entrada/saída. Não comprova bloqueio universal — ver seção 3. |
| Preservação | Nenhuma escrita remota foi realizada nesta rodada. A proposta troca sete funções, sem DML executado no corpo da implantação; os INSERTs estão dentro do motor para chamadas futuras. Comparação atual pré/pós no HML ainda precisa ocorrer na janela autorizada. |

**Evidências históricas, não contagens atuais recertificadas:** seis contas/seis aberturas, zero movimentos e 296 auditorias após o cadastro aprovado; Plano de Contas com 18 registros, dos quais 16 oficiais (duas sintéticas e 14 analíticas), preservando os dois de homologação. Não falta cadastrar novamente as categorias oficiais. Três contas são oficiais e três de homologação; nenhuma deve ser excluída. Aberturas zeradas não confirmam saldos reais, cuja reconciliação continua separada.

Os 36 resultados PostgreSQL registrados em `RESULTADOS_TESTES_V2_LOCAIS.json` são evidência anterior, não reexecução nesta rodada. O ensaio depende de definições em `/tmp/itv-minima/definicoes-originais.sql`, indisponíveis agora, e executa V2/reversão; não foi usado devido à proibição atual. Simulação de Auth não comprova autenticação hospedada nem restauração do backup real.

## 3. Riscos e impedimentos encontrados

### R1 — conferências continuam com possibilidade de escrita direta

V2 fecha `tesouraria_lancar_conferencia`, mas não revoga INSERT/UPDATE de colunas de `tesouraria_conferencias`. O inventário anterior registra essas concessões para `authenticated`, além de ALL para `service_role`. A reversão tampouco as fecha. Portanto, o bloqueio total de conferências exigido nesta fase **não está demonstrado**. Políticas RLS permanecem, mas não substituem a retirada de um caminho de escrita permitido.

### R2 — o motor privado mantém modalidades proibidas

`tes_executar` ainda aceita abertura, transferência e estorno (V2, linhas 20 e 48–100). ACL histórica o torna privado, e o teste anterior recusa authenticated; não há exploração atual demonstrada. Porém, uma concessão divergente, outro intermediário DEFINER ou administração privilegiada pode alcançá-lo. Para defesa em profundidade, a proposta final precisa limitar também o motor a entrada/saída, mantendo-o privado. Administração com poder de alterar funções nunca é contida só pelo código: exige exclusividade operacional.

Funções de propostas maiores, como `conferencia_comandar` e `tesouraria_decidir`, devem estar ausentes ou seladas se encontradas no catálogo real. Arquivo no projeto não prova instalação. Conferir também sobrecargas, views, regras, gatilhos e referências fora do esquema.

### R3 — manutenção/retomada antigas não liberam corretamente a V2

`MANUTENCAO_PREPARADA.sql` captura e revoga permissões, marcando os seis intermediários como permanentes; `RETOMADA_SELETIVA_PREPARADA.sql` não os reabre. A V2 não contém GRANT. Resultado possível: contrato instalado, mas `tesouraria_lancar` inacessível ao usuário. Não usar a liberação estrutural da Etapa 2 nem restaurar todo o manifesto para resolver isso.

Falta fechar/revisar uma **lista positiva específica da V2**: somente EXECUTE de `tesouraria_lancar(jsonb)` para authenticated, com dono e validação internos corretos; demais caminhos financeiros proibidos e DML de conferência permanecem fechados. Esse ajuste de permissões é mudança de banco e precisa de autorização específica; não foi escrito/aplicado como liberação nesta rodada. Preservar as políticas RLS não significa reabrir permissões vulneráveis.

### R4 — referência documental não é persistida pela V2

Os formulários exigem e enviam `referencia`, mas a lista canônica da V2 (35–36) a descarta e a operação não a grava. Alterar só a referência com a mesma chave não causa conflito. A alegação da interface de que é exigida pelo banco não corresponde a essa proposta. É necessário alinhar contrato/formulário, aproveitando o campo JSON existente, com preservação e teste da referência — ou decidir formalmente não exigi-la. Não alterar silenciosamente uma proposta em auditoria.

Idempotência atual é por usuário + chave, não deduplicação documental global nem prevenção de duas pessoas registrarem o mesmo documento. Não promete exclusividade da referência.

### R5 — seleção oficial não é uniforme

NovoLancamento aceita códigos numéricos hierárquicos: isso não prova pertencimento às 14 categorias aprovadas. Tesouraria operacional tem filtro ainda menos restritivo; o banco não distingue classificações oficiais de TESTE. Ambos formulários oferecem contas ativas, não apenas as três oficiais. O histórico deve preservar todas as seis, mas o primeiro lançamento real deve utilizar somente conta/categoria oficial validada. Não excluir homologação como solução.

### R6 — indicadores exigem duas regressões adicionais

Uma consulta com erro pode deixar cartões em zero, embora a listagem mostre erro. Além disso, somar dois valores individuais máximos pode exceder 16 dígitos inteiros; o formatador usado pelos cartões rejeita esse agregado, apesar da soma bigint exata. São correções pontuais pendentes, sem necessidade de reconstruir o módulo. Não interpretar zero em erro como saldo/resultado confirmado.

### R7 — recuperação, manutenção e autenticação real não comprovadas nesta rodada

Backup de 01/11 informado com `--no-owner --no-acl` não recompõe proprietários/ACLs. Inventário de objetos e restore com Auth simplificado não certificam segurança hospedada. Não há ensaio atual de recomposição integral nem sessão real disponível neste executor externo. Não foram pedidos senhas ou arquivos sensíveis.

REVOKE não encerra chamadas já admitidas, HTTP em andamento ou trabalho privilegiado. ACCESS EXCLUSIVE NOWAIT recusa conflitos, mas não prova drenagem; durante a transação também pode bloquear consultas. Marcas `itv.minima.*` são confirmações operacionais, não mecanismos de autorização de usuário.

## 4. Arquivos candidatos — nenhum deve ser executado agora

| Arquivo | Papel |
|---|---|
| `docs/correcao-minima/CORRECAO_MINIMA_V2_PROPOSTA.sql` | Proposta existente de substituição de sete funções; precisa de revisão final para R1–R5 e pré-condições. |
| `docs/correcao-minima/REVERSAO_SEGURA_V2_PROPOSTA.sql` | Contenção das mesmas sete funções, sem apagar dados; não é restore e não fecha todo DML. |
| `docs/etapa2/INVENTARIO_SEGURANCA_SOMENTE_LEITURA.sql` | Base de inventário; não é recomposição de ACLs nem comprovação de drenagem. |
| `docs/etapa2/MANUTENCAO_PREPARADA.sql` | Base psql de barreira/manifestações; exige pré-validação e retomada específica V2. |
| Manifesto de segurança/retomada V2 revisados | Ainda precisam ser fechados para o destino e aprovados; não há arquivo final executável aprovado nesta rodada. |

**Não aplicar** ETAPA_2_MIGRACAO_DEFINITIVA, LIBERACAO_DEFINITIVA ou scripts estruturais para resolver esta etapa mínima.

Identidade conferida por leitura:

- V2 SHA-256: `fce7448b0fa42a82ca07ff7a87d6cb0a9fcdc82a3ddbd7891072350cdd3ba102`.
- Reversão SHA-256: `0e9ec47476229596347956a4713cebc6fe1a440da8ba0ad021e70f43ac91a06b`.
- Cópia entregue anteriormente em Files idêntica à proposta do projeto.
- Funções substituídas: `tes_executar`, `tesouraria_lancar`, `tesouraria_transferir`, `tesouraria_estornar`, `tesouraria_criar_conta`, `tesouraria_habilitar_conta`, `tesouraria_lancar_conferencia`, todas `(jsonb)`.
- V2 valida somente MD5 do motor atual `028954f4e03ac8a5402dde2d32f62410`; não certifica as outras assinaturas/ACLs. Todas devem existir, pois CREATE OR REPLACE também pode criar uma função ausente.

## 5. Procedimento exato condicionado — Supabase Free

**Este é um roteiro para autorização futura, não uma instrução para executar agora. Não há pacote fechado aplicável enquanto R1–R5 estiverem abertos.** Não contratar plano, não presumir PITR/backup automático/restore pelo painel nem criar projeto pago.

### A. Fechar a proposta antes da janela

1. Consolidar correções pontuais e permissões finais em versão identificada, sem sobrescrever a proposta auditada; incluir restrição do motor, conferências, referência e critérios oficiais. Revisar as sete assinaturas, owners, ACLs efetivas e todos os caminhos alternativos.
2. Ensaiar apenas em destino isolado disponível, sem acesso GESTÃO ITV: preservar seis aberturas, categorias, auditoria e políticas; testar papéis, naturezas, DML/RPC alternativos, precisão, referência, concorrência idempotente, reversão e retomada específica. Não utilizar fixture desaparecida como ensaio reproduzível.
3. Apresentar hashes, diferenças, matriz de permissões e evidência de restore. Obter aprovação expressa separada de manutenção/aplicação e publicação. Definir executor, janela, prazo de drenagem e critérios de parada. Sem esses itens, encerrar antes do SQL.

### B. Backup externo e segurança

4. Confirmar projeto pelo painel e conexão aprovada; nome `postgres` sozinho não identifica HML. Utilizar conexão direta ou session pooler validado, nunca transaction pooler para scripts com tabela temporária/mesmo backend. Credenciais ficam fora do código/chat, em meio protegido do operador.
5. Preparar manifesto integral: dono e ACL do esquema, funções, tabelas, colunas, sequências, defaults/PUBLIC, grant options/memberships; políticas RLS/FORCE, gatilhos e definições; sequência de auditoria com `last_value` e `is_called`. Não exportar hashes de senha nem recriar automaticamente papéis gerenciados do Supabase.
6. Validar cobertura de Auth: IDs de `auth.users` exigidos pelas FKs, `auth.uid()`/`auth.role()`, contexto autenticado, configurações de acesso restrito e domínio oficial. Configurações hospedadas, segredos e Storage binário, se necessários à recuperação, não se presumem incluídos no dump financeiro.
7. Conter produtores; ativar barreira aprovada e exportar manifesto protegido antes do COMMIT. Aguardar conclusão normal das chamadas existentes; monitorar transações, locks e prepared transactions, além de HTTP, filas e sincronizações. Acesso privilegiado fica sob exclusividade do executor. Sem visibilidade ou ao vencer prazo, parar — não cancelar sessões automaticamente.
8. Sob contenção e drenagem comprovadas, capturar backup consistente completo do escopo necessário e baseline final. Exemplo apenas para operador futuro, em sessão local protegida com conexão já configurada e **sem credenciais na linha de comando**:

```sh
# Não executar nesta revisão; requer autorização e conexão aprovada.
umask 077
pg_dump --format=custom --no-owner --no-acl --file="$BACKUP_DUMP"
pg_restore --list "$BACKUP_DUMP" > "$BACKUP_CATALOGO"
sha256sum "$BACKUP_DUMP" > "$BACKUP_HASH"
```

Não filtrar apenas financeiro_hml e supor que Auth está coberto. Falha/permissão insuficiente em objetos necessários implica parada. Usar versão compatível; proteger arquivos fora do repositório e em armazenamento externo controlado. Dump com essas opções exige manifesto separado de owners/ACLs; catálogo legível não basta.

9. Comprovar recuperação do backup final em destino isolado compatível; se o ensaio anterior for usado como base, verificar que o backup final não tem divergência de dados/estrutura/segurança. Restaurar dependências e proprietário controlado, dados e sequência; recompor ACLs aprovadas, retirar defaults indevidos e comparar conteúdo integral/FKs/RLS/gatilhos/owners/ACLs. Medir tempo de recuperação; não prometer RPO zero/RTO sem medida. Nunca restaurar sobre HML nesta etapa.

### C. Aplicação e validação — somente após aprovação

10. Revalidar contenção contínua, destino, backup e baseline das 13 tabelas existentes; seis aberturas intactas, nenhuma operação nova ou movimento esperado. Divergência financeira exige investigação e nova decisão, nunca apagar eventos para satisfazer pré-condição.
11. Comparar SHA-256 da **versão final aprovada**, todas as assinaturas/owners/ACLs e dependências. Aplicar uma única vez na sessão autorizada, com parada no primeiro erro e transação READ COMMITTED/locks ACCESS EXCLUSIVE NOWAIT antes das verificações. O arquivo atual usa BEGIN e depende do isolamento da sessão; configurar/confirmar explicitamente READ COMMITTED. Não confundir lock obtido com prova de drenagem.
12. Se houver erro antes do COMMIT, executar ROLLBACK na sessão e conferir estado; a barreira anterior é transação separada e permanece. Perda de resposta exige ler catálogo/dados e registro de execução antes de qualquer repetição. Nunca repetir cegamente.
13. Ainda sob barreira, comparar conteúdo integral de contas, seis aberturas, todas as operações/movimentos, categorias, perfis, integrações/conferências e auditoria. Verificar RLS/FORCE, gatilhos, sequência, constraints e owners/ACLs. Aprovar apenas diferenças explícitas da proposta; sem operações financeiras de teste no HML.
14. Aplicar somente a lista positiva V2 previamente aprovada: EXECUTE de `tesouraria_lancar(jsonb)` ao consumidor authenticated; motor privado e caminhos proibidos fechados, inclusive DML de conferências. Consultas mantidas conforme RLS. Retomar apenas privilégios previstos dos cadastros/serviços necessários; não executar manifesto inteiro nem conceder ALL para contornar erro.
15. No ambiente hospedado, validar login de administrador ativo e consulta do analista com usuários autorizados, sem compartilhar senha; sonda sem efeito, leitura de dados e bloqueio de ações. Testes negativos só após aprovação, com entrada incapaz de gerar efeito; não arriscar RPC proibida com conteúdo financeiro válido. Acesso real por perfil precisa de evidência distinta dos mocks.
16. Entregar relatório pós-aplicação. Publicar somente depois da autorização expressa e validação compatível; abrir a primeira operação real exclusivamente para o gestor com conta/categoria oficial, valor/data/documento reais. Não sincronizar ou gerar lançamento automático como teste. M5 segue manual e cron desligado; GESTÃO ITV isolado.

### D. Reversão e recuperação

17. Antes de COMMIT: ROLLBACK da correção, confirmar catálogo/dados e manter barreira até decisão. Não restaurar permissões automaticamente.
18. Depois de COMMIT: conter novamente produtores e drenar; obter baseline; com aprovação executar **versão final revisada** da reversão em transação única e locks NOWAIT. O arquivo existente fecha sete funções, incluindo motor e sonda, sem apagar histórico; precisa ser acompanhado da barreira/permissões que mantenham fechado o DML alternativo.
19. Confirmar consultas e conteúdo integral preservados; gravações permanecem bloqueadas. Marcador em cache pode habilitar botão por até 60 segundos, mas banco deve recusar qualquer escrita. Não reinstalar motor vulnerável nem reabrir wrappers antigos. Registrar incidentes e eventos posteriores.
20. Restore de dump é recuperação de desastre separada, não reversão normal. Exige autorização, destino/ponto definido, recomposição de segurança e análise de todos os eventos posteriores para não perder histórico. Não sobrescrever automaticamente HML e nunca tocar GESTÃO ITV.

## 6. O que falta para o primeiro lançamento real

1. Fechar as lacunas da proposta/retomada e critérios oficiais (R1–R5), com testes reproduzíveis; corrigir indicadores (R6).
2. Comprovar backup externo recuperável com owners/ACLs/dependências e manutenção/drenagem no destino (R7).
3. Receber autorização final para versão exata, aplicar uma vez e comprovar preservação/segurança sem movimentação de teste real.
4. Validar acesso hospedado de administradores/analista e autorizar publicação compatível.
5. Gestor informa o primeiro documento, conta/categoria oficial, data e valor reais; confirma resultado pelo histórico/saldo. Nenhuma abertura será duplicada e nenhuma reconciliação será feita implicitamente.

**Resultado desta entrega:** revisão e testes locais concluídos; implantação, publicação e primeiro lançamento continuam bloqueados por pendências identificadas, não por falta de cadastro das categorias oficiais.