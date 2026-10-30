# Etapa 2 — aplicação interrompida na verificação de segurança

**29/10/2026, 20h09 Manaus (30/10, 00h09 UTC).**

## Decisão

Autorização recebida e registrada. **Nenhuma migração enviada ou aplicada, nenhuma publicação e nenhuma operação financeira ou sincronização executada.** A aplicação foi interrompida antes de alterar o HML, conforme a condição expressa da direção: não aplicar se backup/restauração, manutenção sem escritas e compatibilidade não puderem ser garantidos.

Não é necessário ampliar o projeto ou redesenhar os controles. O impedimento é de implantação coordenada, não de novas funcionalidades.

## Condições verificadas

| Condição | Resultado | Evidência e limite |
|---|---|---|
| Autorização de aplicar somente Etapa 2 no HML | Confirmada | Documento recebido; não inclui publicação ou lançamentos |
| Proposta identificada | Confirmada | SHA-256 `709db761e7de3259d2139e24d2ea44cb832686b5a95e610b8bc0b6bb8fbd324e` |
| Transação no SQL | Presente | Proposta contém BEGIN/COMMIT; isso não substitui manutenção ou backup |
| Backup atual verificável e restauração | **Não comprovados** | Pacote disponível é de 23/10, anterior à M5 e ao estado atual; integridade ZIP OK, mas não cobre por si só o HML de 29/10. Não há conexão direta de banco disponível no executor para gerar novo dump. Não foi obtida comprovação de backup hospedado atual ou restauração |
| Inventário das funções e permissões substituídas | Confirmado por leitura | Seis rotinas existentes têm execução para authenticated; novas RPCs de conferência não instaladas |
| Compatibilidade sem publicação | **Não garantida** | A proposta recusa ações da tela antiga e exige novas RPCs/editor ainda não publicados; nenhuma janela com indisponibilidade controlada foi estabelecida |
| Escritas impedidas e chamadas anteriores drenadas | **Não comprovados** | authenticated ainda pode atualizar a coluna descricao da fonte e executar rotinas financeiras. Conexões PostgREST existentes; estarem ociosas na observação não impede novas chamadas |
| Contenção de serviços privilegiados | **Não comprovada** | Sessões pg_net e pg_cron observadas, sem comprovação de tarefas ativas. Sua presença não prova sincronização nem atividade de escrita; tampouco permite afirmar drenagem total |

O acesso de consulta utilizado informa `supabase_read_only_user`. Ausência de conexão direta neste executor não significa ausência de backup no Supabase; significa que backup atual e restauração não foram comprovados nesta etapa. Nenhuma credencial foi solicitada ou divulgada.

## Inventário afetado pela proposta

**Cinco tabelas auxiliares novas:** conferencia_regras_oficiais, conferencia_operacao_autorizada, conferencia_controles, conferencia_componentes_identidade e conferencia_vinculos. Todas permanecem não instaladas; nenhuma regra, centro ou autorização de operação foi cadastrada.

**Sete funções novas:** conf_dinheiro, conf_validar, conf_validar_grupo, conferencia_consultar, conferencia_comandar, conferencia_historico e conferencia_opcoes.

**Seis funções substituídas:** tesouraria_lancar_conferencia, tesouraria_lancar, tesouraria_transferir, tesouraria_criar_conta, tesouraria_habilitar_conta e tesouraria_estornar.

**Permissões previstas:** retirada de INSERT/UPDATE por coluna da fonte para authenticated; SELECT restrito por perfil nas tabelas auxiliares e execução autenticada das novas consultas/comandos. As permissões antigas permanecem como estavam, pois nenhuma migração foi aplicada.

## Integridade confirmada por consultas de leitura

- **49 registros de integração e 49 conferências, todas pendentes.**
- **19 sincronizações históricas; 280 eventos de auditoria.**
- **Zero movimentos financeiros.**
- Sicredi, Mercado Pago e Caixa Físico ITV: ativas/habilitadas, data de abertura 29/10/2026, abertura e efeitos financeiros **R$ 0,00**.
- Hash MD5 dos itens: `f64dc54b9b5b6821d2570a2b3c906782`.
- Hash MD5 das conferências: `93c55a20c6c20dd66b2b97204f687434`.
- Ambos coincidem exatamente com o baseline anterior: fontes intactas, sem mudança ou duplicidade adicional nesses conjuntos.
- Funções M5 consultadas permanecem instaladas; nenhuma foi alterada ou invocada. Não houve chamada ao GESTÃO ITV.

## Testes e homologação

Resultado da preparação anterior: **201 testes da aplicação e 47 testes PostgreSQL isolados aprovados**. Não foram repetidos nesta verificação documental/de leitura; esses resultados não equivalem a homologação dos controles instalados no HML.

Não houve comandos de preparação, aprovação ou lançamento sobre as 49 conferências. Sem aplicação, não é possível declarar os novos controles funcionando no HML. Regras oficiais vazias impediriam encaminhar/aprovar classificações; não serão inseridos cadastros para contornar a restrição atual. Homologação de cenários completos permanece isolada enquanto classificações oficiais e alteração dos registros estiverem proibidas.

## Caminho único para concluir este marco

1. Obter e verificar um **backup atual restaurável** dos dados, definições e permissões afetados, declarando limites de cobertura de Auth e configurações hospedadas; o pacote antigo não substitui essa verificação.
2. Estabelecer **uma janela de manutenção coordenada**, com bloqueio efetivo de novas escritas e confirmação da drenagem de chamadas anteriores/controle dos escritores privilegiados. Fechar navegadores ou observar sessões ociosas não basta.
3. Resolver a compatibilidade com **autorização específica de publicação coordenada da versão preparada**, mantendo operação financeira bloqueada; alternativamente, comprovar isolamento de acesso à versão antiga durante todo o período até publicação posteriormente autorizada. Não publicar ou alterar acesso automaticamente.
4. Satisfeitas as condições, aplicar somente o SQL aprovado pelo mecanismo oficial, verificar objetos/permissões/M5 e comparar novamente contagens, saldos e hashes; não testar movimentos reais nem editar fontes.

**Recomendação atual:** não aplicar nem publicar agora. A autorização SQL já existe; faltam as garantias de recuperação/manutenção e a decisão de compatibilidade. Não pedir aprovação repetida dos mesmos controles nem cadastrar dados oficiais antes da decisão administrativa.

Depois desse marco, concentrar o trabalho nas três decisões da direção: **início oficial da operação; categorias e centros de custo; validação dos saldos iniciais Sicredi/Mercado Pago/Caixa Físico ITV.** Corte de 01/11, tratamento dos históricos e liberação de lançamentos não foram definidos automaticamente.

**Status verdadeiro: ETAPA 2 PREPARADA — APLICAÇÃO HML AUTORIZADA, INTERROMPIDA POR PRÉ-CONDIÇÕES DE SEGURANÇA NÃO COMPROVADAS.**