# Correção da coleta de resultados

A nomenclatura dos arquivos segue o manual do TSE: identificador de eleição com **seis dígitos**, por exemplo `mun-e006259-cm.json` e `ceXXXXX-c0003-e006259-u.json`. O município deve ter cinco dígitos. O arquivo EA12 contém `abr[].mu[]` e o EA20 contém candidatos em `carg[].agr[].par[].cand[]` e seções em `s.ts`, `s.st` e `s.pst`.

**Antes das 17h de 4 de outubro de 2026**, os resultados reais podem não estar publicados. Um erro 404 em arquivos de resultados não deve ser confundido com zero votos. O sistema interrompe novas consultas à URL que retornou 404 durante a execução atual para evitar bloqueio de IP. Após publicação posterior, reiniciar o serviço da API para liberar as URLs marcadas como indisponíveis.

Referências:
- https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados
- https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-instrucoes-para-download-dos-arquivos-da-divulgacao-2026
- https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea20-arquivo-de-resultado-unificado

A validação de execução real e da assinatura JWS permanece pendente.
