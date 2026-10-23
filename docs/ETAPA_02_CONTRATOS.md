# Etapa 02 — contratos financeiros (sem banco de produção)

Esta entrega adiciona contratos de validação de dados e testes unitários para plano de contas, centros de custo, contas financeiras e transferências. Nenhuma tabela, migração, credencial, integração ou rota de produção foi modificada.

## Regras

- Quantias em centavos inteiros, evitando arredondamentos de ponto flutuante.
- Conta contábil: código, descrição, natureza, vínculo hierárquico, classificação de lançamento e status.
- Centro de custo: código, descrição, responsável opcional e status.
- Conta financeira: banco ou caixa, BRL, saldo inicial e data de referência.
- Transferência: chave de idempotência, origem e destino distintos, valor positivo e data válida.
- A aplicação dessas regras no frontend **não substitui** controles no servidor, autenticação, RLS, auditoria ou transações atômicas.

## Próximos portões

1. Confirmar provedor de autenticação e banco de homologação isolado.
2. Criar políticas de acesso no banco e testar negação de operações indevidas.
3. Implementar migrações versionadas, unicidade de códigos por escopo e integridade referencial.
4. Implementar transferências como transação indivisível, com idempotência garantida no banco.
5. Somente então conectar formulários e consultas reais.

## Verificação

Executar `npm test`, `npm run lint` e `npm run build` no ambiente de CI ou local. Os testes foram adicionados, mas a execução não foi confirmada nesta etapa.
