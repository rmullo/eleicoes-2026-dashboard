# Eleições Dashboard 2026

Dashboard **independente, não oficial**, inicialmente para Farias Brito (CE). Monorepo React + Fastify + TypeScript + Docker Compose.

> **Estado: esqueleto funcional.** A API e o frontend sobem, mas a coleta dos dados do TSE **ainda não está implementada**. Não são exibidos votos fictícios.

## Executar
Requer Docker e Compose v2.
```bash
cp .env.example .env
docker compose up -d --build
```
Painel: http://localhost:8080 · API: /api/health e /api/status.

## Estrutura
- `apps/backend`: Fastify, futura coleta e cache.
- `apps/frontend`: React/Vite e Nginx.
- `packages/shared`: contratos futuros.
- `docs/`: arquitetura, integração TSE, operação e roadmap.

O frontend consulta a API a cada 5 s. **Não há coleta ativa do TSE ainda.** Coleta planejada a cada 30 s, ajustável, com cache, backoff e último dado válido.

## Fontes
- https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados
- https://resultados.tse.jus.br

Nunca confundir ausência de dados com zero votos, nem apuração parcial com projeções. Não incluir credenciais. Projeto sem vínculo com a Justiça Eleitoral.

Veja [Arquitetura](docs/ARCHITECTURE.md), [Integração](docs/TSE.md), [Operação](docs/OPERATIONS.md), [Roadmap](docs/ROADMAP.md) e [Contribuições](CONTRIBUTING.md).

**Licença:** a definir pelo mantenedor.