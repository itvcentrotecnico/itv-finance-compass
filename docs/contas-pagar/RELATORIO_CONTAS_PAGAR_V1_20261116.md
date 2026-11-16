# Contas a Pagar V1 — relatório (16/11/2026)

Status: **PREPARADO E TESTADO EM AMBIENTE ISOLADO. NÃO APLICADO NO BANCO HOSPEDADO. NÃO PUBLICADO.**

## Arquivos
- `ITV_CONTAS_PAGAR_V1_PROPOSTA.sql` — tabelas `contas_pagar` e `contas_pagar_baixas`, resumo com situação (data de Manaus), funções `cp_cadastrar`, `cp_baixar`, `cp_cancelar`.
- `ITV_CONTAS_PAGAR_V1_CONTENCAO.sql` — fecha cadastro/pagamento preservando obrigações, pagamentos e auditoria.
- `testes_contas_pagar.py` — 28 verificações, executadas dentro do ensaio da V2.2.1 (`testar_livro_local.py`): **161/161 aprovadas**.
- Tela: `src/components/contas-pagar/ContasPagarPanel.tsx`, regras em `src/lib/contas-pagar.ts` (270/270 testes do aplicativo).

## Contrato do Livro Único
Aceita qualquer referência `externo:…`. Sem OS: `externo:fatura-55-a`, `externo:boleto-9`, `externo:doc-…`. **Nenhum ajuste no Livro Único necessário.**

## Permissões
| Perfil | Consultar | Cadastrar | Pagar lançando despesa | Pagar vinculando despesa existente | Cancelar sem pagamentos |
|---|---|---|---|---|---|
| Administrador Geral | sim | sim | sim | sim | sim |
| Analista Financeiro | sim | sim | sim | sim | não |
| Administrador Financeiro | sim | sim | não (motor recusa; nada gravado) | sim | não |
| Consulta Gerencial | sim | não | não | não | não |

Escrita direta nas tabelas negada; somente pelas funções. Visitantes sem login não leem nada.

## Testes de aceite (ambiente isolado)
1. R$ 1.000,00 cadastrado → saldo 1.000,00; nenhuma despesa no Livro Único. ✔
2. Pagamento de 400 → saldo 600, um lançamento de 400 com `externo:os-1323`, vínculo e autor gravados; reenvio idêntico não altera nada; reenvio alterado recusado. ✔
3. Vencimento passado → "vencida" pelo saldo de 600; quitação → "paga". ✔
4. Vínculo de despesa já lançada sem segundo lançamento; recusas: acima do saldo, vínculo reutilizado, valor incompatível, Consulta Gerencial, Administrador Financeiro gerando lançamento; duas baixas simultâneas de 200 sobre saldo 250 → só uma passa. ✔
5. OS 1323 e fatura sem OS gravadas e aceitas pelo Livro Único. ✔ (no banco isolado)

**Pendente:** teste pela tela no banco real — depende da instalação autorizada; o login automático na pré-visualização não está disponível para este projeto.

## Observação para a janela
A contingência da V2.2.1 confere a estrutura do banco. Depois de instalar Contas a Pagar, os hashes dessa contingência precisam ser recalculados (ou Contas a Pagar contido antes).

## Passos de homologação
1. Backup novo + SHA-256. 2. Autorização expressa. 3. Aplicar a proposta. 4. Pela tela: obrigação OS 1323 (R$ 1.000,00), pagar 400, conferir saldo 600 e lançamento em Lançamentos; obrigação com fatura, pagar total. 5. Publicação separada.
