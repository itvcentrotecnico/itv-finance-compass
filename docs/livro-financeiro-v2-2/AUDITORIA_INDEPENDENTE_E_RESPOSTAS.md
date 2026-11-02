# Revisão independente — respostas

1. Recuperação na contenção: verificado useEnvioSeguro e executarSeguro existentes, que consultam caller-owned antes de escrita; não há dependência de EXECUTE do motor para esclarecer confirmação. Acrescentados testes pós-contenção por autor e usuário distinto. Sem reenvio de resultado incerto na contenção; documento explicita.
2. Nome atual: separado do identificador canônico nos detalhes, sem ampliar RLS. SQL invoker, subconsulta escalar não elimina operação.
3. Resultado negativo: teste SQL da direção de movimentos e teste exato resumir/dinheiro do indicador, sem confundir com saldo bancário. Valores sintéticos exclusivamente locais.
4. Comando de ensaio corrigido. JSON manifesto endurecido com IS DISTINCT FROM e validação de elementos.
5. Duas auditorias técnicas explicitamente permitidas; todas auditorias anteriores comparadas, nunca exclusão integral da tabela.

Limites: auditoria estática não é validação real hospedada. Nenhuma consulta/alteração GESTÃO ITV ou Supabase hospedado nesta tarefa.
