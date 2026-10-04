# Integração oficial TSE — plano

**Não implementada.** Validar documentos antes de assumir formatos ou URLs.

- https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados
- https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados

Parâmetros de referência para 04/10/2026: pleito 3220, eleição federal 6257 e estaduais 6259. Município com código de cinco dígitos, a verificar na EA12. O teto de 100 requisições/IP/s não é frequência recomendada.

## Checklist
1. Conferir EA11 (eleições), EA12 (municípios) e EA20 (resultados).
2. Validar o código de Farias Brito e as URLs oficiais.
3. Criar testes com JSON reais.
4. Implementar ETag, Last-Modified, timeout e backoff em 404/429/5xx.
5. Normalizar cargos, votos, candidatos e seções.
6. Verificar JWS conforme manual aplicável.
7. Separar data oficial, última coleta e stale.
8. Não transformar ausência de dados em zero nem inferir vencedores.
