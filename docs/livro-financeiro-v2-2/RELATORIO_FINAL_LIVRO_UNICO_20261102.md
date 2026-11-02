# ITV FINANCEIRO — Livro financeiro único V2.2
## Resultado da preparação — 02/11/2026

**STATUS: PROPOSTA PREPARADA E TESTADA LOCALMENTE. NÃO APLICADA. NÃO PUBLICADA.**

### O que foi preparado
- Controle interno não bancário na estrutura existente, uma abertura técnica R$ 0,00 em 01/11/2026, sem receita/despesa/movimento automático.
- Motor resolve o vínculo único e rejeita seleção de qualquer conta; duas identidades responsáveis fixadas na proposta, com perfil administrador ativo obrigatório.
- Primeira aba adaptada sem seletor bancário, receitas/despesas/resultado por período, referência e responsável nos detalhes. Nome atual separado do UUID autor e exibido apenas conforme acesso permitido.
- Referência, precisão monetária, chave original/idempotência, autoria e classificação preservadas. Contas/categorias TESTE não são admitidas para novos lançamentos.
- Seis contas e seis aberturas originais preservadas integralmente; futura instalação acrescentará somente o controle interno e sua abertura (sete registros de cada no total) e dois eventos técnicos de auditoria. Nenhuma outra tabela/aba/função nova.
- Proposta V2.1 original íntegra, com hashes de todos seus arquivos. V2.2 separada, não instalação cumulativa de V2.1.
- Contenção fecha escritas sem apagar registros; consulta pela chave e pelo autor permanece disponível para esclarecer resposta perdida.

### Evidências
- **100/100 verificações PostgreSQL isoladas aprovadas:** receitas/despesas, primeira despesa sem receita de cobertura, resultado negativo exato, referência/autoria/histórico, duas pessoas e terceiros/inativos/perfis recusados, UUID imposto/conta alternativa recusados, duplicidade/reenvio/concorrência, imutabilidade/efeitos, manifesto inválido, pré-condições/RLS/gatilhos, preservação das seis contas/aberturas, dois eventos técnicos, M5 local sem efeitos financeiros, contenção e restauração sintética.
- **249/249 testes do aplicativo aprovados, 27 arquivos:** preservação/recuperação anteriores e novas regras do livro, resultado negativo/centavos, pedidos sem conta e bloqueio por contrato não instalado.
- Verificação automática do aplicativo: sem erros (build OK).
- Navegador sem sessão: /lancamentos redireciona /auth e oferece entrada restrita. Não houve consulta financeira ou sessão autenticada real nesse teste.

### O que não foi feito
Nenhum SQL aplicado no Supabase hospedado, nenhuma migração hospedada, criação real de controle/abertura, alteração financeira, publicação, nova aba ou integração bancária. Nenhum acesso ao GESTÃO ITV. A referência/nome enriquecidos dependem da futura proposta aplicada; no banco legado a tela informa indisponibilidade, sem inventar conteúdo.

### Antes de usar de verdade
1. Confirmar manifesto real: UUID técnico novo, abertura/chave novas, 14 categorias e os dois responsáveis reais (o manifesto entregue está intencionalmente vazio).
2. Validar catálogo atual e tipo não bancário, backup imediatamente anterior recuperável, proprietários/permissões omitidos por --no-owner --no-acl e manutenção/drenagem.
3. Aprovar especificamente V2.2 e implantação/publicação coordenadas. Instalar integralmente apenas depois desses critérios; qualquer divergência interrompe.
4. Validar acesso real de ambos, consultas/histórico/referência/identidade e compatibilidade. Primeiro registro real somente pelo gestor após liberação.

**Limites:** testes usam dados sintéticos e autenticação simplificada em PostgreSQL descartável, não comprovação de recuperação Supabase completa nem uso real autenticado. Outras telas financeiras seguem consulta legada; valores do livro são resultado, não saldo bancário/patrimônio. Lista positiva herdada da V2.1 restringe gravações de cadastros/perfis; não restaurar permissões amplas por conveniência. M5 manual preservada no ensaio; falha externa 503 não declarada resolvida.

### Conteúdo do pacote
SQL integral da proposta/contensão; manifesto pendente; procedimento completo e manutenção reaproveitada; consultas pré/pós somente leitura; auditoria independente/respostas; teste PostgreSQL reproduzível e resultados; arquivos fontes/testes necessários e dependências locais do ensaio; hashes de preservação V2.1 e integridade do pacote. Scripts de teste nunca devem ser executados no banco hospedado.
