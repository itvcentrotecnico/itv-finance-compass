# Etapa 2 — Correções operacionais seguras no HML

## Resultado esperado

Preparar a conferência existente para separar preparação, aprovação e lançamento, exigir classificações oficiais, eliminar valores presumidos no rateio e tornar o histórico individual acessível.

**Não executar aprovações reais, lançamentos, sincronizações ou publicação.** Preservar integralmente os 49 registros e as 49 conferências atuais, datas, classificações, contas, aberturas, auditoria e saldos zerados. GESTÃO ITV e M5 ficam fora das alterações.

## 1. Separação de responsabilidades

- Analista: consultar, preparar classificações, registrar divergências e encaminhar para revisão; sem aprovar ou lançar, inclusive por chamadas diretas ao banco.
- Administrador Financeiro: revisar, aprovar formalmente, devolver com justificativa e autorizar o futuro lançamento.
- Administrador Geral: supervisionar e tratar exceções, sem dispensar classificação, aprovação rastreável ou integridade.
- Consulta Gerencial: somente consulta.
- Reaproveitar os estados existentes; registrar separadamente encaminhamento, aprovação/devolução, autor, horário e versão aprovada. Alterar dados invalida a aprovação anterior.

## 2. Classificação oficial e proteção dos lançamentos

- Aceitar somente contas vinculadas às três contas oficiais habilitadas; contas HML TESTE continuam disponíveis para consulta, mas não como opções oficiais.
- Exigir categoria ativa, autorizada para operação oficial, que aceite lançamentos e seja compatível com receita/despesa. Não cadastrar ou transformar classificações atuais de teste em oficiais.
- Exigir centro de custo válido quando aplicável; manter a operação bloqueada quando a classificação necessária ainda depender da direção.
- Validar data, valor e requisitos de cartão, boleto e demais formas no banco e na tela.
- Preservar bloqueio de data anterior à abertura; não ajustar datas ou saldos para liberar os 49 registros históricos.
- Tratar lançamentos avulsos como caminho potencial de desvio: impedir que o analista contorne a aprovação e não permitir que o mesmo recebimento seja registrado novamente por outro caminho.

## 3. Integridade, rateio e concorrência

- Substituir a criação de componente com R$ 0,01 por entrada explícita de forma, valor real e conta; nenhum componente é gravado sem dados válidos.
- Validar soma exata dos componentes e proteger o grupo inteiro durante edição, aprovação e lançamento, com ordem consistente de bloqueios.
- Usar versão de edição e rejeitar salvamento sobre versão alterada por outra pessoa; mostrar que o registro precisa ser atualizado.
- Bloquear aprovação/lançamento enquanto houver alterações não salvas e verificar a versão aprovada também no banco.
- Preservar transações e idempotência existentes; reforçar vínculo único da origem e não considerar valores iguais, sozinhos, prova de duplicidade.
- Retirar da rotina oficial o carregamento de lote não autorizado, sem importar dados ou alterar M5.

## 4. Histórico individual

- Disponibilizar histórico na própria conferência, com ação, situação anterior/posterior, responsável, horário de Manaus e justificativa.
- Reutilizar auditoria existente, com consulta limitada à conferência permitida ao usuário; não abrir acesso geral à auditoria para o analista.
- Manter autores históricos nulos como não identificados; não atribuir autoria retroativamente.

## 5. Histórico e prontidão operacional

- Preparar representação do corte **proposto em 01/11/2026**, sem ativá-lo. A confirmação definitiva da direção continua pendente.
- Não atualizar nem preencher retroativamente as 49 conferências para instalar os controles. Os registros continuam pendentes e consultáveis.
- Não habilitar operação real por efeito desta entrega: cadastros operacionais, tratamento histórico, saldos iniciais reais e autorização dos primeiros lançamentos continuam pendentes.

## Detalhes técnicos e impacto da migração

- Manter arquitetura TanStack Start, funções autenticadas e esquema `financeiro_hml`; não redesenhar autenticação ou mover dados para outro esquema.
- Introduzir metadados auxiliares de fluxo/versão sem atualizar linhas financeiras existentes; novos controles só geram registros quando ações futuras autorizadas ocorrerem.
- Substituir escrita direta de conferência por operações transacionais com perfil e versão validados; fechar permissões e caminhos antigos que permitam contornar aprovação.
- Restringir funções de lançamento pertinentes, preservando o motor decimal, transações, vínculo da conferência e recuperação idempotente. Não modificar funções da integração M5.
- Apresentar o SQL completo, funções/permissões afetadas, impacto e riscos antes da aplicação. **Aplicação no HML somente após aprovação específica da migração.**
- Risco principal: aplicar permissões novas antes de publicar a tela correspondente fará ações da versão antiga serem recusadas. A leitura permanece; planejar essa transição e não publicar sem autorização.
- Reversão deve preservar históricos novos e não reabrir privilégios inseguros silenciosamente; qualquer reversão exige aprovação própria.

## Testes e entrega

1. Testes automatizados de permissões por perfil, encaminhamento, aprovação/devolução, invalidação da aprovação e lançamento não autorizado.
2. Testes de conta oficial, categoria compatível, centro obrigatório quando aplicável, datas, dinheiro decimal e dados específicos da forma de pagamento.
3. Testes isolados de duplicidade, chamadas concorrentes, sobrescrita, rateio com valores reais, soma e proteção do grupo, histórico restrito e autores nulos.
4. Testes em banco descartável com dados sintéticos identificados como teste; nenhuma operação de teste financeira no HML.
5. Antes e depois de eventual migração aprovada: contagens e hashes integrais dos 49 registros/conferências, auditoria, contas, aberturas, operações e saldos.
6. Entregar arquivos/funções modificados, resultados, integridade, limitações verificáveis e decisões administrativas pendentes. Validação autenticada no HML depende da sessão do usuário; não pedir credenciais nem contornar permissões.

**Aprovar este plano autoriza preparar código, SQL e testes isolados; não autoriza aprovar registros reais, movimentar valores, sincronizar, aplicar o corte ou publicar.**