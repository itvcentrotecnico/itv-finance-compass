# Conferência de Caixa — proposta de preparação

11/11/2026 · ITV FINANCEIRO HML

**Situação: proposta documental preparada. Não implementada, não instalada e não publicada.**

## 1. Objetivo e limites

Organizar a conferência diária de receitas, despesas, taxas, recebimentos líquidos e divergências pelas duas pessoas autorizadas. Não administrar saldos bancários nem exigir escolha de banco para lançar no livro único.

A aprovação desta preparação não dispensa as condições de instalação de Lançamentos V2.2.1. O catálogo do backup informado pelo responsável pôde ser listado, mas o arquivo completo não foi disponibilizado nem a recuperação atual comprovada. A instalação permanece bloqueada.

Nesta etapa não houve consulta hospedada, acesso ao GESTÃO ITV, sincronização, importação, alteração de código operacional, aplicação de SQL, criação de registros ou publicação. Não criar uma tela aparentemente operacional antes de comprovar as condições necessárias.

## 2. Tela proposta

Layout sem novas abas internas desnecessárias: cabeçalho, filtros, resumo, lista e detalhes com histórico.

### Filtros

- Período pela data da ocorrência, com distinção da data de recebimento/liquidação.
- Receita ou despesa, modalidade, situação e referência/OS quando disponível.
- Pesquisa por descrição ou referência; não inventar OS para registros que só possuem outra referência de origem.

### Resumo

- Quantidade de registros pendentes, em conferência e divergentes.
- Totais separados de bruto, líquido previsto e recebimento comprovado no período escolhido.
- Cada total deve declarar sua base temporal e não somar valor previsto ao confirmado como se fossem dois recebimentos.
- Dados incompletos devem ser identificados; falha de consulta não pode aparecer como zero.
- Nenhum indicador denominado saldo bancário ou saldo disponível. Resultado do livro e conferência de recebimentos não são a mesma medida.

### Lista e detalhes

| Campo | Tratamento proposto |
| --- | --- |
| Identificador e referência | Preservar identidade de origem e vínculo rastreável; referência/OS apenas quando comprovada. |
| Receita/despesa, descrição e data de origem | Exibir fonte imutável e, separadamente, eventual preparação justificada. |
| Modalidade e canal informado | Distinguir Pix, dinheiro, crédito, débito, parcelado, boleto e misto; canal não é conta técnica do livro. |
| Valor bruto | Valor documentado de origem, sem substituição silenciosa. |
| Taxa | Valor informado/comprovado, com justificativa de ajuste; nenhum percentual padrão inventado. |
| Líquido previsto | Campo distinto do recebido; ausente significa não informado. |
| Recebimento comprovado e data | Somente evidência real; o antigo valor líquido não será automaticamente tratado como comprovação. |
| Divergência | Comparação apenas com bases comparáveis; ausências mantêm pendência, não diferença zero. |
| Categoria e centro de custo | Consultar classificações autorizadas; obrigatoriedade de centro depende de regra previamente aprovada. |
| Responsáveis e histórico | Preparador, revisor, ação, horário de Manaus e justificativa conforme acesso; autoria antiga ausente permanece ausente. |
| Vínculo no livro | Mostrar operação existente quando comprovada; nunca simular vínculo com texto ou criar outro lançamento automaticamente. |

Evidências de recebimento devem ter referência documentada. Anexos e armazenamento de comprovantes não estão autorizados nesta preparação; sua necessidade, acesso e retenção deverão ser avaliados antes de implementação.

## 3. Fluxo proposto e responsabilidades

| Situação | Ação e responsável | Condição |
| --- | --- | --- |
| Pendente | Analista inicia preparação | Sem modificar a fonte ou movimentar valores. |
| Em conferência | Analista prepara, classifica e justifica ajustes | Dados salvos explicitamente e revisão atual. |
| Divergente | Analista registra diferença ou falta de comprovação | Justificativa rastreável; não aprovar automaticamente. |
| Aguardando revisão | Analista encaminha | Preparação salva, componentes reais e requisitos completos. |
| Devolvido | Administrador Geral devolve | Justificativa; nova preparação exige nova revisão. |
| Conferência aprovada | Administrador Geral revisa | Pessoa diferente do preparador, evidência e versão válidas. |

Se o Administrador Geral preparar um item, não poderá aprová-lo sozinho; o item fica bloqueado até existir revisão distinta permitida e aprovada. Não conceder aprovação ao analista para contornar essa condição.

Estados financeiros antigos, como autorizado/lançado, devem permanecer reconhecíveis no histórico, mas não serão reutilizados como novos comandos nesta proposta. Aprovação de conferência não é confirmação de lançamento.

Permissões de Lançamentos V2.2.1 são independentes: o direito do analista de lançar no livro aprovado não significa direito de aprovar sua própria conferência. Não alterar essas permissões nesta preparação.

## 4. Regras de conferência

- **Cartão:** separar venda, bruto, taxa, líquido previsto e crédito comprovado. Sem taxa/líquido/data de recebimento comprovados, manter pendência; não inferir liquidação pelo status importado.
- **Misto:** preservar total; componentes fornecidos pelo financeiro devem somar exatamente o bruto em centavos. Sem divisão documentada, pendente de rateio manual.
- **Boleto:** previsão, vencimento ou emissão não são pagamento. Somente pagamento real comprovado pode compor recebimento confirmado.
- **Transferência interna:** Mercado Pago → Sicredi não é nova receita. Não duplicar o recebimento original nem criar operação de transferência nesta etapa.
- **Parcial:** manter bruto/obrigação de origem e discriminar comprovado versus parcela ainda não confirmada. Não marcar o total como recebido com base em apenas uma parcela.
- **Taxas/ajustes:** não transformar diferença automaticamente em despesa. Exigir comprovação, classificação e aprovação separada para qualquer eventual lançamento futuro.
- **Duplicidade:** referência igual, origem equivalente ou vínculo existente exigem consulta e revisão. Texto semelhante sozinho não prova duplicidade nem autoriza exclusão.
- **Concorrência:** revisão esperada, identidade e bloqueio de grupo devem recusar sobrescrita; após mudança, aprovação anterior perde validade.
- **Integridade:** nunca modificar contas, aberturas, operações, movimentos ou históricos existentes para fazer um item passar na conferência.

## 5. Conferência não lança

Salvar, divergir, encaminhar, devolver ou aprovar conferência não deve chamar o motor financeiro, confirmar recebimento por presunção ou alterar saldo.

O futuro módulo deverá consultar vínculo já existente sob as permissões do usuário. Quando o vínculo não puder ser comprovado, mostrar pendência e bloquear qualquer futura geração financeira. Referência documental livre no livro não comprova, sozinha, correspondência única de origem.

Criar uma ponte para lançamentos importados exigirá proposta e autorização posteriores com identidade econômica, proteção contra duplicidade, compatibilidade do motor V2.2.1 e revisão distinta. Esta proposta não abre `tesouraria_lancar_conferencia` nem reativa fluxos legados.

## 6. Mapa técnico de reuso e lacunas

| Artefato existente | Reuso possível | Ajuste necessário antes de implementação |
| --- | --- | --- |
| `ConferenciaPanel.tsx` | Lista, filtro, detalhes e modalidades | Incluir período, base temporal e campos distintos; evitar limite silencioso e vínculo artificial `vinculo-auxiliar`. |
| `ConferenciaOperacionalEditor.tsx` | Preparação explícita, justificativa, histórico, componentes | Separar conta técnica de canal; distinguir previsto/confirmado; não expor autorizar/lançar como ação de conferência. |
| `conferencia-operacional.ts` | Precisão, soma de componentes, estados e guardas | Preservar regras antigas como referência; não reutilizar autorização financeira antiga como contrato do livro único. |
| `conferencia-operacional.functions.ts` | Consultas e comandos autenticados sob RLS | Dependem de RPCs propostas; verificar disponibilidade real antes de qualquer conexão da nova tela. |
| Propostas `docs/etapa2/` | Fonte imutável, revisão, grupo, auditoria e testes históricos | Exigem contas oficiais e fecham caminhos avulsos; não aplicar sobre V2.2.1 sem revisão específica. |
| Registro `src/lib/modules.ts` e rota `/$modulo` autenticada | Navegação central e proteção de acesso | Adicionar entrada somente na futura implementação autorizada; não criar rota ad-hoc ou usar Conciliação Bancária como sinônimo. |

O contrato existente tem `valor_liquido`, mas não campos distintos suficientes para todas as evidências propostas. A presença de `taxa` na interface da fonte não comprova a disponibilidade de edição/armazenamento dessa evidência no fluxo auxiliar. Há seleção de conta oficial no editor antigo e um botão explícito de lançamento. Portanto, não é seguro apenas renomear a tela antiga.

O painel de Tesouraria roteado continua somente consulta. Inspeção local de código não prova instalação de RPCs ou condições atuais do HML. Antes da implementação, inspecionar o esquema real autorizado, ACLs/RLS, dependências, campos e versão do livro efetivamente instalada.

## 7. Roteiro de testes futuros — não executados nesta preparação

| Caso | Resultado exigido |
| --- | --- |
| Componentes de 40,00 + 60,00 para bruto 100,00 | Soma aceita; 40,00 + 60,01 recusada. Valores de teste somente isolados. |
| Cartão sem taxa ou comprovação de liquidação | Permanece pendente, sem crédito presumido. |
| Boleto previsto, não pago | Não compõe recebimento confirmado. |
| Recebimento parcial | Confirmado somente na parte comprovada; restante separado. |
| Misto sem componentes | Não encaminha como rateio completo; nunca dividir automaticamente. |
| Transferência interna | Não cria receita nem duplica o crédito original. |
| Ajuste de taxa | Justificativa e histórico; nenhuma despesa automática. |
| Aprovar por quem preparou | Recusa efetiva no banco, mesmo chamada direta. |
| Analista tentar aprovar | Recusa; direitos no livro não ampliam revisão. |
| Aprovação de conferência | Zero novas operações ou movimentos, inclusive em repetição. |
| Duas sessões editando a mesma revisão | Uma versão antiga é recusada; nenhum ajuste se perde silenciosamente. |
| Vínculo já existente ou suspeita de duplicidade | Não permite nova geração financeira. |
| Usuário sem sessão/perfil autorizado | Nenhuma leitura ou escrita financeira; testar banco e interface. |
| Erro de consulta ou valores ausentes | Não exibir zero como resultado confirmado. |
| Dados e autoria históricos | Fontes, operações, aberturas e histórico intactos; autor ausente não inventado. |
| Desktop e celular | Filtros, valores e detalhes legíveis; central flow validado com sessão real quando autorizado. |

Os 18 testes existentes de `conferencia-operacional.test.ts` cobrem regras antigas de ações e rateio, não todas as regras desta proposta. Foram relidos, não alterados nem reexecutados: nenhum código operacional mudou. Resultados antigos da Etapa 2 não homologam o futuro módulo ou seu funcionamento no HML.

## 8. Impactos, riscos e condições posteriores

1. Campos auxiliares e RPCs poderão precisar de adaptação; apresentar SQL integral, impactos e reversão antes de pedir autorização de aplicação. Nenhuma migração é entregue/aplicada por este documento.
2. A proposta antiga pode bloquear lançamentos avulsos da operação simplificada. Preservar o motor e os direitos aprovados de V2.2.1; não aplicá-la diretamente.
3. Dados locais/históricos podem não conter OS, taxa ou evidência separada. Não preencher por suposição nem consultar a origem sem autorização específica.
4. A recuperação atual, owners/ACLs e dependências continuam condição obrigatória para alteração hospedada. Dificuldade para localizar um arquivo não dispensa segurança.
5. Implantação futura exige janela, admissão bloqueada/drenagem, inspeção atual, validações isoladas e autorização expressa. Publicação é separada.

**Conclusão:** preparação funcional e mapa de reuso concluídos; operação e instalação não liberadas. Próxima etapa possível é avaliar a implementação proposta, sem dispensar as condições anteriores de segurança.