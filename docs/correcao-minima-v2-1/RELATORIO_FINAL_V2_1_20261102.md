# ITV FINANCEIRO — Relatório V2.1
**02/11/2026, 19:21 UTC — PREPARADA E TESTADA LOCALMENTE. IMPLANTAÇÃO BLOQUEADA POR PRÉ-CONDIÇÕES NÃO COMPROVADAS.**

## Resultado solicitado
- Proposta SQL V2.1 separada da V2; nenhuma tabela/coluna/módulo novo.
- Motor exclusivamente receitas/despesas de administradores ativos. Analista/Consulta/inativos/sem identidade recusados no banco.
- Abertura/transferência/estorno bloqueados no motor e demais intermediários; DML financeiro direto inclusive por coluna revogado na proposta. Lista positiva sem GRANT ALL.
- Referência persistida em `tesouraria_operacoes.requisicao.referencia`, normalizada e comparada na idempotência; auditoria financeira também a conserva. Histórico RPC legado não projeta a referência: consulta dos detalhes por referência segue limitação, não é prometida nesta versão.
- Formulário da primeira aba usa UUIDs oficiais fornecidos por sonda V2.1 e filtra naturezas/atividade/aceite. Erro ou consulta incompleta mostra indicadores indisponíveis, não zero; agregados usam bigint sem teto de operação individual.
- Outras páginas Tesouraria/Despesas continuam em consulta. Botão de lançamento permanece fechado no legado e sem contrato instalado.
- Contenção sela gravações sem apagar histórico/reabrir motor vulnerável; preserva consultas e M5 manual. Cadastros/perfis sem escrita direta é impacto deliberado do manifesto, exige aceitação.

## Evidências desta entrega
- **76/76 testes PostgreSQL locais**, script reproduzível incluso: proposta sem aprovação/manifesto recusa; RLS/gatilho/herança divergentes recusam; concorrência bloqueia preflight; seis aberturas sintéticas preservadas; 13 tabelas/31 funções; perfis/operacões proibidas; categorias incompatíveis; conta não oficial; referência persistida/alterada; duplicidade e concorrência; saldo exato/auditoria/histórico; ACL tabela/coluna; M5 manual cria pendência sem movimento; automação fechada; contenção e dump/restore sintético com hash/ACL.
- **240/240 testes do aplicativo** em 26 arquivos; seleção de conta/categoria fora do manifesto tem testes negativos. Verificação automática da aplicação: build OK.
- Navegador local: `/lancamentos` sem sessão redireciona a `/auth`, sem formulário financeiro e sem erro JavaScript. Screenshot conferida. Isto NÃO valida fluxo autenticado real.
- Rotas de conteúdo verificadas com metadados próprios. Supabase externo sem sessão gerenciável neste executor (`external_unmanaged`); nenhuma credencial solicitada.
- V2 original intacta: correção SHA-256 `fce7448b0fa42a82ca07ff7a87d6cb0a9fcdc82a3ddbd7891072350cdd3ba102`; reversão `0e9ec47476229596347956a4713cebc6fe1a440da8ba0ad021e70f43ac91a06b`.
- **Nenhum SQL hospedado, migração, dado real, sincronização real, publicação ou acesso ao GESTÃO ITV executado.** Preservação real não foi novamente consultada; hashes nesta rodada são do ensaio sintético. Evidências anteriores de seis aberturas/zero movimentos permanecem históricas.

## Riscos e pendências efetivas
1. UUIDs oficiais HML ainda não aprovados: manifesto entregue vazio e falha fechado. IDs sintéticos nunca devem ser copiados para implantação.
2. Catálogo estrutural derivado de migrações LOCAIS e funções de inventário histórico de 01/11. É necessário confrontar owners/ACLs/RLS/triggers/constraints/dependências/caminhos externos com destino atual; divergência bloqueia, não justifica remover guardas. Contenção exige catálogo conhecido, mas não certifica caminhos externos nem HTTP em voo.
3. Backup real imediatamente anterior e recomposição owners/ACLs/dependências do dump omitindo segurança ainda não comprovados aqui. Restore sintético não substitui recuperação Supabase/Auth/Storage/configurações.
4. Barreira de admissão e drenagem contínua hospedadas, inclusive owners/service_role e RPCs antigas, dependem de responsável/evidência. Locks NOWAIT não substituem isso.
5. Validação autenticada real da primeira aba, saldos/histórico, seleção oficial/recuperação e permissões da configuração hospedada pendente.
6. M5 manual preservada como exceção que pode criar conferência pendente sem efeito financeiro. Defeito legado de payload/iniciador não corrigido nem encoberto; automação/HTTP 503 não declaradas resolvidas.
7. Lista positiva suspende alterações diretas em perfis/cadastros e pode afetar convites. Conferir e aprovar impacto antes de implantar; sem retomada indiscriminada.
8. Proposta inicial exige seis aberturas e zero operações adicionais; é instalação única e não pode ser reaplicada após evolução legítima. Saldos reais continuam assunto separado.

## Conclusão e próximo passo
**Pronta para auditoria técnica do pacote; NÃO pronta para aplicação imediata.** Concluir mapeamento/catálogo real, recuperação/segurança, manutenção e validação autenticada; aprovar especificamente V2.1/hashes/impactos. Depois aplicar sob condições do procedimento e somente publicar com autorização expressa. Testes aprovados não equivalem a implantação autorizada.

Arquivos integrais, manifesto, consultas antes/depois, permissões, procedimento de backup Supabase Free, critérios de interrupção e ensaio estão no pacote. Não executar definições históricas/fragmentos isoladamente.
