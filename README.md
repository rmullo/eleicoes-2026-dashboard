# Eleições 2026 Dashboard

Dashboard **independente, não oficial**, com foco em Farias Brito (CE), alimentado pelos JSON públicos do TSE. Monorepo Node.js/Fastify + React/Vite, TypeScript e Docker Compose.

## Executar
Requisitos: Docker + Compose v2.

```bash
cp .env.example .env
docker compose up -d --build
```

Abra http://localhost:8080. A API responde em `/api/status`, `/api/results?office=governador`, `/api/history?office=governador` e `/api/health`.

## Recursos
- Coleta a cada 30 s (mínimo), consulta visual a cada 5 s.
- Cinco cargos: presidente, governador, senador, deputado federal e estadual.
- Filtros por nome, número e partido; favoritos guardados no navegador.
- Cache condicional, timeout, backoff e proteção contra 404 repetidos.
- Histórico persistido em volume Docker e indicação de dados desatualizados.
- Dados ausentes não são substituídos por números fictícios.

## Estrutura
- `apps/backend`: coletor TSE e API Fastify.
- `apps/frontend`: dashboard React e Nginx.
- `docs/`: arquitetura, integração, operação e roadmap.

## Estado e limitações
**A integração foi implementada, mas ainda não foi validada em execução real contra a CDN oficial de 2026.** Verificar o mapeamento EA12/EA20 e assinatura JWS antes de utilizar em produção ou divulgar dados. O frontend sinaliza erros e não inventa resultados. Não há vínculo com o TSE.

Fonte: https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados

Licença a definir pelo mantenedor.
