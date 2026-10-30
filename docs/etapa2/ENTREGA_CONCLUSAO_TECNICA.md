# Etapa 2 — conclusão técnica para implantação controlada

30/10/2026. **Preparada e testada em ambiente isolado; não aplicada nem publicada.**

## 1. Funcionalidades finalizadas

- Entradas e saídas externas: solicitação imutável, categoria/centro aprovados, conta oficial, referência documental externa obrigatória e reservada uma única vez. Recebimentos importados continuam exclusivamente na conferência; nenhuma escrita direta na fonte.
- Transferências: solicitação e aprovação humana por pessoa diferente, duas contas oficiais distintas, débito/crédito vinculados e neutros para receitas/despesas.
- Estornos: solicitados com original/data/justificativa, sem valor ou contas inventados; revisor vê valor/efeitos/classificação originais. Execução inverte os efeitos e conserva original, vínculo e auditoria. Segundo estorno efetivo recusado.
- Conferências: segregação também na autorização final; preparador não pode autorizar sua conferência após revisão alheia. Rateio real, versão, trava de grupo e fonte preservada reaproveitados.
- Concorrência: decisões da mesma solicitação serializadas; validações financeiras têm trava comum para evitar upgrade simultâneo de locks nas mesmas contas. A trava é transacional e pode reduzir paralelismo; não cria fila externa ou retentativa automática.
- Interface: aba Solicitações com filtros/paginação/revisão/devolução; comandos existentes geram pedido, não movimento direto; recuperação do envio consulta também solicitações pela mesma chave. Versões retornadas como texto no SQL. Nova abertura/habilitação e estorno de abertura permanecem indisponíveis para não alterar saldos iniciais.

**Limites explícitos:** unicidade de referência impede repetição da mesma identidade, não prova que referências arbitrárias diferentes representem negócios distintos. O administrador deve conferir documentação e impedir redigitação de importações como documentos externos. Estorno não limpa nem libera o vínculo original para novo lançamento. Cadastros inativos podem bloquear o motor existente; reativação/tratamento exige administração, não contorno automático.

## 2. Testes executados e resultados

- **206/206 aplicativo**, 23 arquivos: permissões, cinco regras novas de segregação, recuperação após resposta perdida e regressões existentes M5/Tesouraria.
- **47/47 PostgreSQL existentes**: classificação, aprovação, rateio, fonte, grupo e idempotência de conferência.
- **48/48 PostgreSQL conclusão**: entradas 1000.00, saída 80.00, transferência 150.00 e estorno 80.00; saldos locais exatos 850.00/150.00 antes de outros testes; operação única entre dois revisores concorrentes; pedidos distintos sem deadlock; autoautorização recusada; falha no commit sem operação/aprovação parcial; instalação selada; reversão preservando fontes/solicitações/operações/movimentos/auditoria; consulta após reversão; reinstalação de definições e reativação testadas. O ensaio usa exatamente o SQL consolidado entregue.
- **34/34 manutenção** reexecutados: admissão por ACL, consultas preservadas, manifesto, retomada seletiva e selagem.
- Verificações automáticas do aplicativo: resultado mais recente **sem erros**.

Todos os valores e identidades dos testes são sintéticos e usados apenas em PostgreSQL descartável local 17.9, sem listener TCP, ou testes de interface com serviços simulados. Bancos de teste removidos ao final. Nenhuma operação no HML nem chamada ao GESTÃO ITV. **Esses resultados não comprovam a aplicação publicada com usuários reais nem a restauração do backup de 29/10.**

## 3. SQL definitivo

- `ETAPA_2_MIGRACAO_DEFINITIVA.sql`: instalação consolidada, transação única, locks fail-fast antes das alterações, novas estruturas auxiliares e funções; sem backfill, dados financeiros, corte ou classificações oficiais. Comandos ficam selados ao término.
- `LIBERACAO_DEFINITIVA.sql`: liberação seletiva autenticada, condicionada à confirmação administrativa de compatibilidade/recuperação. Motor privado e abertura continuam fechados.
- `REVERSAO_FUNCIONAL_DEFINITIVA.sql`: reversão limitada para consulta, com recusa no corpo dos comandos e revogação das permissões.
- `CAPTURA_FUNCIONAL_DEFINITIVA.sql`: captura protegida das quatro definições definitivas substituídas na reversão. A exportação é CSV, não executável nem backup; reconstrução/revisão local necessária antes de reinstalar.
- Scripts de manutenção, selagem e retomada existentes reaproveitados. Manifesto atualizado para reconhecer novos comandos/consulta. A retomada não libera mutadores financeiros automaticamente.

Os arquivos são propostas finais para futura migração autorizada. **Nenhum arquivo foi aplicado por ferramenta de migração nem escrito em supabase/migrations nesta execução.** SHA-256 de cada arquivo consta no pacote.

## 4. Procedimento de implantação

1. Administração comprova recuperação do backup atual, cobertura e referência de integridade; registra início oficial, categorias/centros e saldos reais. Não interpretar os zeros atuais como valores reais confirmados.
2. Obter autorização de aplicação e publicação, ainda não concedida. Conferir destino `ayjppexbzpgdkzbehvzw`/`financeiro_hml`, inventário/ACLs/hash do pacote e cópia suficiente para o estado imediatamente anterior à janela.
3. Suspender produtores privilegiados e manter cron desativado; aplicar barreira preparada, preservar consultas, exportar manifesto protegido e comprovar drenagem. A barreira não controla proprietários/credenciais administrativas por si só.
4. Aplicar somente o SQL consolidado autorizado em transação única. Se houver erro/estado incerto, interromper e consultar resultado, sem repetir automaticamente. Instalação termina selada.
5. Conferir fontes, contas, saldos, auditoria, funções, grants e RLS; capturar definições definitivas para recuperação funcional. Publicar somente a interface compatível dentro da janela, mediante autorização final.
6. Validar acesso e consultas por perfis, contratos e leitura dos pedidos. Retomar seletivamente o que for compatível e executar liberação separada somente após critérios comprovados. Configurações de início/classificação/saldos não são inseridas pela migração.
7. Conferências e primeiros lançamentos reais dependem de autorização específica; nenhum teste deste pacote os autoriza. M5 continua manual, sem teste de sincronização nesta preparação; HTTP 503 permanece limitação existente.

## 5. Procedimento de reversão

- Antes do commit: erro interrompe a transação sem alteração parcial.
- Após commit: manter contenção e drenar. Sob autorização de reversão, executar `REVERSAO_FUNCIONAL_DEFINITIVA.sql`. Preserva contratos de leitura, estruturas auxiliares e todos os eventos; bloqueia comandos por permissão **e pelo corpo da função**.
- **É reversão funcional limitada para consulta, não retorno ao código vulnerável anterior e não desfaz movimentos.** Não apagar tabelas, limpar vínculos, restaurar backup sobre eventos posteriores nem devolver DML da fonte.
- Para reativar a versão definitiva: validar assinatura/hash/origem da captura protegida, reconstruir e reinstalar as quatro definições em uma única transação mantendo REVOKEs; testar contratos e só então liberar seletivamente. Esse percurso foi ensaiado em PostgreSQL local com pedido preservado.
- Não usar a interface antiga como retorno operacional: ela pressupõe lançamentos diretos. Preservar a versão compatível em consulta e comunicar indisponibilidade temporária das operações.
- A reversão não contém donos do banco/service_role com outros privilégios já existentes. Suspensão administrativa desses produtores é pré-condição; a integração legítima conserva seus contratos para não ser alterada neste escopo.

## 6. Pendências exclusivamente administrativas

1. Comprovar restauração isolada do backup de 29/10 e limites de Auth/Storage/configurações; não enviar dump/senha pelo chat.
2. Definir início oficial e tratamento dos 49 históricos sem manipulação de datas ou aprovação automática.
3. Aprovar categorias/centros e confirmar saldos reais Sicredi/Mercado Pago/Caixa Físico ITV; decidir contas TESTE sem apagar histórico.
4. Autorizar janela, aplicação do pacote final e publicação compatível; executar controle dos escritores privilegiados/drenagem com responsável técnico.
5. Viabilizar validação autenticada na versão implantada e autorizar separadamente o início das operações reais. Executor Supabase externo não possui sessão gerenciada para essa comprovação.

**Status:** conclusão técnica preparada e testes isolados aprovados; implantação continua bloqueada por recuperação e decisões administrativas. Não houve aplicação, publicação, aprovação real, saldo alterado, sincronização ou modificação no GESTÃO ITV.
