# Contas a Pagar — primeira versão

## O que a equipe vai ver
- Novo item no menu **Contas a Pagar**, com cartões (em aberto, vencidas, pagas no período), filtros por período de vencimento e situação (em aberto, parcial, vencida, paga) e lista com fornecedor, vencimento, valor original, total pago e saldo.
- **Nova obrigação**: fornecedor/favorecido, descrição, categoria de despesa (do plano de contas oficial), valor, vencimento e referência:
  - "Número da OS" (aceita 1323 / OS 1323), ou
  - "Fatura / boleto / outro documento" com o número digitado, sem prefixos técnicos.
- **Registrar pagamento**: data e valor (parcial ou total, nunca acima do saldo), com duas opções: gerar a despesa no Livro Único ou vincular uma despesa já lançada e ainda não usada.
- Detalhes da obrigação com histórico de pagamentos: quem pagou, quando, valor e o lançamento vinculado.
- Parcial com vencimento passado continua em "vencidas" pelo saldo restante.

## Contrato do Livro Único (conferido)
- O motor aceita qualquer referência `externo:<texto>`; despesas sem OS funcionam como `externo:fatura-123`, `externo:boleto-…`, `externo:doc-…`. **Nenhum ajuste no Livro Único é necessário.**

## Permissões propostas
- Administrador Geral e Analista Financeiro: cadastrar obrigações e registrar pagamentos (o Analista é o operador aprovado do Livro Único).
- Administrador Financeiro: o mesmo, mas a baixa que gera lançamento só funciona para quem o Livro Único autoriza (par aprovado); caso contrário, a tela explica.
- Consulta Gerencial: somente consulta.
- Cancelar obrigação sem pagamentos: Administrador Geral.

## Detalhes técnicos
- Migração versionada **separada** (proposta, não aplicada no hospedado): tabelas `financeiro_hml.contas_pagar` e `financeiro_hml.contas_pagar_baixas` (valor em bigint de centavos, chave de idempotência única por baixa, operação do Livro Único única entre baixas), GRANTs, RLS, gatilhos existentes de auditoria/autoria.
- RPCs autenticadas `cp_cadastrar` e `cp_baixar`: `cp_baixar` trava a obrigação (`FOR UPDATE`), valida saldo, chama o motor `tesouraria_lancar` na mesma transação (ou valida a despesa existente: tipo despesa, mesmo valor, não vinculada), grava a baixa; qualquer falha desfaz tudo. Reenvio com a mesma chave devolve a baixa original.
- Situação calculada (em aberto/parcial/vencida/paga) pela data do banco em Manaus.
- UI no registro central de módulos, reaproveitando normalização de OS, proteção de reenvio em armazenamento local e formatação decimal existentes.
- Testes: harness PostgreSQL 17.11 local com os 5 cenários de aceite (1.000 → 400 → reenvio → vencida 600 → quitada; vínculo existente sem segundo lançamento; recusa acima do saldo, vínculo reutilizado, perfil sem permissão; corrida simultânea), testes de tela e da lógica de OS/fatura.
- Teste pela tela no banco real depende da aplicação autorizada da migração; será indicado como pendente.

## Fora do escopo
Despesas fixas/recorrentes, integração bancária, GESTÃO ITV, aplicação no hospedado e publicação.
