# Ambiente isolado ITV FINANCEIRO

Esta branch fornece um **adaptador em memória** para testar regras de cadastro sem conexão de rede, banco de dados, credenciais, armazenamento no navegador ou escrita em produção.

- `FinanceSandbox` mantém plano de contas, centros de custo e contas financeiras somente durante a execução do processo.
- A reinicialização descarta os dados; não usar com dados reais.
- A aplicação publicada não foi conectada ao adaptador e não há telas de cadastro ativas.
- Datas ISO são validadas de forma compatível com Zod 3, incluindo rejeição de datas impossíveis.
- Testes unitários verificam cadastro, duplicidade, hierarquia, isolamento de objetos e reset.

## Antes de evoluir
1. Confirmar execução de testes, lint e build em CI.
2. Definir provedor de autenticação e criar ambiente de banco de homologação separado.
3. Implementar autenticação, autorização no servidor, RLS e auditoria.
4. Somente após homologação permitir persistência e integração com GESTÃO ITV.

**Nenhum banco foi criado e nenhum sistema operacional foi alterado.**
