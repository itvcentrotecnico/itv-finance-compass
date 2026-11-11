# Preparação de Conferência de Caixa

## Objetivo e limites
Preparar a rotina diária de conferência para as duas pessoas autorizadas, reaproveitando o trabalho existente e preservando o livro financeiro único.

Esta etapa entrega uma proposta; não instala o módulo, não modifica o banco, não publica, não sincroniza e não acessa o GESTÃO ITV. A instalação de Lançamentos V2.2.1 permanece bloqueada até a recuperação do backup e as demais condições serem comprovadas.

## O que preparar
1. Documentar a tela de conferência diária: período, referência/OS quando disponível, receita ou despesa, modalidade, bruto, taxa informada, líquido previsto, recebimento comprovado e divergência. Valores ausentes ficam pendentes, nunca presumidos.
2. Separar conferência de lançamento: conferir não gera movimento, não altera saldos e não aprova automaticamente. Identificar vínculo com lançamento existente para evitar registrar a mesma receita duas vezes.
3. Reaproveitar filtros, detalhes, histórico e controles existentes. Preservar fontes históricas; ajustes precisam de justificativa e histórico próprio, sem sobrescrever a origem.
4. Propor o fluxo do Analista Financeiro (preparar, divergir, encaminhar) e do Administrador Geral (revisar, devolver, aprovar), com pessoas distintas na revisão e sem ampliar permissões de Lançamentos.
5. Definir critérios: cartão sem taxa/líquido comprovados permanece pendente; pagamento misto exige componentes reais; boleto previsto não é recebimento; transferência interna não é receita. Nunca chamar resultado ou líquido previsto de saldo disponível.

## Reuso e incompatibilidades conhecidas
- Já existem painel, editor, histórico, regras de valores e proposta de controles da Etapa 2.
- A proposta antiga exige contas oficiais bancárias e pode fechar lançamentos avulsos. Não reaplicá-la sobre o livro único: primeiro documentar a adaptação mínima, seus impactos e dependências.
- Não criar seleção bancária obrigatória para lançar. A identificação do canal de recebimento serve à conferência, não substitui o vínculo técnico interno do livro.
- Não ativar integrações nem importar novos registros nesta preparação.

## Entrega e validação
- Proposta funcional com campos, estados, responsabilidades, origem dos dados e pendências de comprovação.
- Mapa de reuso, incompatibilidades e alterações futuras necessárias, sem SQL executável aplicado.
- Roteiro de testes futuros: precisão em centavos, pagamentos parciais/mistos, taxas ausentes, divergências, duplicidades, revisão distinta, acesso restrito e preservação do histórico.
- Separar evidências antigas de validações futuras; não declarar homologação ou liberação operacional nesta etapa.

## Detalhes técnicos
Manter o registro central de módulos e as páginas financeiras autenticadas. Antes de qualquer implementação posterior, inspecionar o esquema hospedado autorizado e verificar compatibilidade com a versão efetivamente instalada do livro único. Alterações de funções, permissões ou tabelas exigem proposta de impactos e aprovação expressa, recuperação comprovada e janela controlada. Publicação é uma decisão separada.