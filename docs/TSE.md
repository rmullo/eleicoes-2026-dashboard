# Integração com TSE — versão inicial

Fonte: https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados

## Implementado
- EA12 para identificação do município (ou `TSE_MUNICIPALITY_CODE` de cinco dígitos).
- EA20 para os cargos 1, 3, 5, 6 e 7.
- Eleição federal 6257 (presidente), estadual 6259 (demais cargos).
- Requisições condicionais HTTP (ETag e Last-Modified).
- Intervalo mínimo de 30 segundos, cache, snapshots persistidos, timeout.
- Interrupção definitiva de URL com 404, backoff em 429/5xx.
- Falhas explicitadas; últimos dados preservados e marcados como desatualizados.

## Validação pendente antes de uso em produção
A execução contra a CDN oficial, os formatos exatos dos arquivos EA12/EA20 e o mapeamento de campos precisam ser testados com arquivos reais de 2026. A API rejeita estruturas inesperadas em vez de apresentar votos fictícios. Verificar também o manual de assinaturas JWS e a consistência dos campos de seções antes de declarar resultados verificados.

O TSE alerta que requisições 404 repetidas podem bloquear IPs; portanto não testar por tentativa e erro em produção. O limite de 100 requisições por segundo não é uma recomendação de frequência.

## Endpoints
- `GET /api/health`
- `GET /api/status`
- `GET /api/results?office=governador`
- `GET /api/history?office=governador`

Cargos: `presidente`, `governador`, `senador`, `deputado-federal`, `deputado-estadual`.
