# M5 — publicação controlada do cliente HTTP, 27/10/2026

## Escopo e regressões
Publicação solicitada pela ferramenta oficial aproximadamente às 13:16 UTC para https://itv-financeiro.lovable.app. Nenhuma alteração de implementação nesta etapa: código fonte em src permanece idêntico ao snapshot aprovado e5ca3cc8027476e4e8d6472af438924953c1e91c. A comparação desde o snapshot anterior 88a105b inclui apenas leitor HTTP, testes e documentação; orquestração e POST preservados.

63/63 testes M5 aprovados novamente às 13:15:49 UTC (cinco arquivos); mais cinco testes de recuperação aprovados na mesma execução, 68/68 no total. Compilação automática build OK às 13:16:09 UTC.

SHA-256 leitor aprovado: 95cf17c3f13734bf55260c2f5802d615d679c907ebda792be400072d7cd76389.

## Evidência pública e limites
Uma única consulta GET, sem credencial, ao endereço /api/public/integracao/sincronizacao-diaria retornou HTTP 200 text/html às 13:17:05 UTC (09:17:05 Manaus). Cabeçalho x-deployment-id identifica armazenamento a3715a0e-3409-4853-ad12-3987e04291ab, diferente da implantação histórica e41c212d-e68b-4a75-964d-b83d909feef0. Cache-Control no-cache, must-revalidate, max-age=0.

O log publicado confirma esse GET às 13:17:05.237 UTC. Não há POST ou evento específico do novo leitor disponível no resultado da consulta de logs. GET retorna HTML e não exercita o handler POST nem importa o leitor: não comprova que a implementação corrigida do leitor está ativa. A ferramenta de publicação informou agendamento, não conclusão nem vínculo oficial artefato→commit. O horário exato de conclusão permanece indisponível. O commit local atual 8bcea0c6568152965ef14eb811e03e9bc6355aac tem fonte src idêntica ao snapshot aprovado; status de build hospedado consultado ainda estava running, e esse status é do preview, não da publicação.

Não atribuir o trecho numérico variável do cabeçalho a uma data de publicação. Não considerar nova identificação pública ou regressões simuladas como homologação da correção.

## Integridade por SELECT no HML
Às 13:16:49 e 13:17:06 UTC: 16 itens, 16 conferências, hashes dos registros idênticos entre as duas leituras. Zero referências duplicadas em ambas as tabelas; zero conferências lançadas; zero movimentos; zero operações diferentes de abertura. Aberturas somam 0.00, efeitos de movimentos somam 0, nenhuma conta tem abertura não zero. Saldos permanecem R$ 0,00.

Hashes de integridade: itens 01b3de508a9f7f43ea0a52d1bbad02a0; conferências e3483b93e924a9be95ec5d65df4350bb.

## Restrições e próximo passo
Nenhuma sincronização, POST, leitura da origem, importação ou alteração no HML/GESTÃO ITV executada. Sem mudança em autenticação, idempotência, auditoria, concorrência ou retentativas. Cron-job.org não acessado nem habilitado; seu estado externo não foi verificado e deve continuar desabilitado.

Preparação do teste real permanece pendente de prova específica da versão do leitor no endpoint. Opção segura: solicitar autorização para um GET de versão na mesma rota, que importe apenas marcador não sensível do leitor e devolva versão com no-store, sem origem, banco ou sincronização, preservando POST e autenticação. Isso é proposta, não implementação; exige alteração/publicação informadas e autorizadas. Nova sincronização real sempre exige autorização específica posterior.

Scan pré-publicação concluído às 13:16:07 UTC sem achados críticos, com aviso informativo preexistente de proteção contra senhas vazadas desativada. Não alterado por estar fora do escopo; análise aprofundada pode ser solicitada separadamente.