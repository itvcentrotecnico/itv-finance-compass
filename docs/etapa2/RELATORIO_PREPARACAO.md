# Etapa 2 — correções preparadas, aplicação pendente

29/10/2026, verificação final HML às 20h03min58s Manaus.

## Resultado

Código e SQL proposto preparados. **Não aplicados ao banco, não publicados e não homologados em sessão real.** A segurança SQL foi testada em PostgreSQL 17.9 descartável com perfis autenticados simulados, sem HML/GESTÃO ITV. Não houve sincronização, aprovação real, alteração financeira ou cadastro oficial.

## Controles preparados

- Analista prepara/classifica/diverge/encaminha; administradores revisam, devolvem, aprovam e autorizam. Aprovação requer pessoa diferente do preparador. Edição invalida aprovação/autorização.
- Fonte importada intacta; fluxo/versão/dados preparados/componentes e vínculo financeiro ficam em tabelas auxiliares sem backfill.
- Conta oficial por vínculo à conta preparada habilitada; categoria/centro dependem de lista de IDs administrativamente aprovada. Listas ficam vazias: não promovem cadastros HML TESTE.
- Categoria compatível com receita/despesa, centro quando aplicável, dinheiro decimal positivo, datas válidas, cartão líquido/liquidação, boleto pago/data.
- Rateio sem centavo fictício: formulário inicia vazio; componentes só persistem com valores reais e dados completos. Soma validada para encaminhar/aprovar/lançar, identidade reservada globalmente e trava única de grupo para comandos e lançamento.
- Versão esperada/hash de fonte rejeitam sobrescrita; aprovação/lançamento ficam bloqueados no formulário sujo ou com outra ação pendente.
- Histórico por conferência, com ações/estados/responsável/horário/justificativa, paginação e autor nulo preservado. Não concede auditoria geral ao analista.
- Lançamento avulso fechado na proposta: sem origem verificável não se pode provar que não duplica recebimento importado. Transferência, nova abertura/habilitação e estorno também ficam bloqueados na preparação. Não remove endpoints, contas ou histórico; futura reabertura desses fluxos exige decisão específica.
- Corte definitivo e operação real continuam sem liberação: tabela de autorização vazia; 01/11/2026 é apenas proposta documental.

## Arquivos

- `src/lib/conferencia-operacional.ts`: contratos, permissões, guardas, rateio exato e mensagens.
- `src/lib/conferencia-operacional.functions.ts`: consultar, comandar, histórico e opções; funções autenticadas sem cliente administrativo.
- `src/components/tesouraria/ConferenciaOperacionalEditor.tsx`: edição preparada, ações formais e histórico.
- `src/components/tesouraria/ConferenciaPanel.tsx`: remove lote/rateio legado, integra estado auxiliar e novo editor.
- `src/lib/tesouraria.functions.ts`: lançamento exige versão e traduz recusa do novo fluxo.
- `src/lib/conferencia-operacional.test.ts`: 18 testes concretos de regras.
- `src/components/tesouraria/TesourariaPanel.test.tsx`: mock local adicional preservando regressões.
- `docs/etapa2/CONTROLES_OPERACIONAIS_PROPOSTOS.sql`: proposta, **não migração aplicada**.
- `docs/etapa2/testar_controles_local.py`: 47 testes SQL isolados; banco criado e removido ao final.
- `AGENTS.md`, memória e `roadmap.md`: decisão estrutural e acompanhamento.

## Funções SQL propostas

Novas: `conf_dinheiro`, `conf_validar`, `conf_validar_grupo`, `conferencia_consultar`, `conferencia_comandar`, `conferencia_historico`, `conferencia_opcoes`.
Substituições: `tesouraria_lancar_conferencia`, `tesouraria_lancar`, `tesouraria_transferir`, `tesouraria_criar_conta`, `tesouraria_habilitar_conta`, `tesouraria_estornar`.
Novas tabelas auxiliares: regras oficiais, autorização da operação, controles, identidade dos componentes e vínculos.
Permissões: revogar INSERT/UPDATE por coluna na fonte para authenticated, manter SELECT/RLS/serviço M5, conceder leitura restrita e execução autenticada nas novas consultas/comandos. Nenhuma mudança nos perfis, M5 ou dados cadastrais existentes.

## Testes

- **201/201 testes do aplicativo aprovados** (22 arquivos), incluindo 18 novos e regressões M5/Tesouraria.
- **47/47 testes PostgreSQL isolados aprovados**: perfis, aprovação/devolução, idempotência entre administradores, classificação, dados ausentes, datas, componente global, DML antigo recusado, wrappers bloqueados, trava física em sessões diferentes, hashes das 49 fontes locais intactos e preparação sem movimentos.
- Dinheiro sintético foi usado somente em banco descartável para testar motor/vínculo; nenhuma operação de teste ocorreu no HML.
- Não equivale a homologação completa de toda combinação de concorrência nem recuperação pós-estorno. Validação autenticada end-to-end HML indisponível no executor externo e, de todo modo, ações reais estão proibidas nesta etapa.

## Integridade HML confirmada por SELECT

49 itens, 49 conferências **Pendentes**, 19 sincronizações, 280 auditorias, 6 operações de abertura zero, **0 movimentos**. Três contas oficiais habilitadas e ativas; todos os saldos zero. Nenhuma alteração desde o baseline 19h55:

- itens MD5 `f64dc54b9b5b6821d2570a2b3c906782`
- conferências MD5 `93c55a20c6c20dd66b2b97204f687434`

## Impacto e riscos antes de aplicar

1. SQL-first fecha operações da versão publicada antiga. Leitura permanece, mas salvar/ratear/lançar/abrir/estornar antigos serão recusados. **Agendar janela controlada e autorizar publicação compatível separadamente.** Não aplicar silenciosamente.
2. Novas regras são vazias; não se aprova classificação oficial até a direção informar IDs e aplicabilidade de centro. Isso é bloqueio deliberado, não importação de cadastros.
3. As 49 fontes ficam intactas, inclusive pendência histórica; não aplicar corte nem mexer em abertura/data para fazê-las lançar.
4. Proposta não garante deduplicação econômica universal de referências arbitrárias. Fecha o caminho avulso sem origem e protege referência/identidade/vínculo; suspeitas existentes impedem lançamento. Duplicidade de origem com IDs diferentes continua exigindo revisão humana.
5. Alterações locais não são persistidas automaticamente; salvar preparação é explícito. Não prometer recuperação de rascunho após fechar navegador ou proteção além do que foi testado.
6. Fonte e metadados auxiliares não recebem migração retroativa. Reversão não pode apagar novos históricos nem reabrir privilégios vulneráveis sem autorização.
7. Administradores de banco com credenciais privilegiadas continuam fora da contenção do cliente comum; não expor essas credenciais nem prometer controle sobre ações administrativas diretas.

## Decisões pendentes

- **Aprovação específica do SQL/migração** com os bloqueios descritos acima.
- Autorização de publicação compatível, ainda não concedida.
- Confirmação definitiva de 01/11 como corte e tratamento dos 49 históricos.
- Classificações oficiais/centros aplicáveis aprovados e saldos iniciais reais administrativamente conferidos.
- Liberação explícita dos primeiros lançamentos e política futura de transferências/aberturas/estornos.

**Nenhuma ação financeira é autorizada por este relatório.**
