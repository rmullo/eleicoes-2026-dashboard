# Eleições 2026 Dashboard

Dashboard **independente, não oficial**, com foco em Farias Brito (CE), baseado nos JSON públicos do TSE. Monorepo Node.js/Fastify + React/Vite, TypeScript e Docker Compose.

## Executar
```bash
cp .env.example .env
docker compose up -d --build
```
Abra http://localhost:8080. API em `/api/status`, `/api/results?office=governador`, `/api/history?office=governador`, `/api/groups` e `/api/health`.

## Recursos
- Cinco cargos, filtros por candidato, número, partido e grupo.
- Flags personalizadas: nome, cor e descrição de grupos políticos regionais.
- Vários grupos por candidato e totalização **por cargo**, sem inferir votos exclusivos dos grupos.
- Grupos e histórico persistidos em volume Docker.
- Coleta periódica com ETag, Last-Modified, timeout, backoff e sinalização de dados desatualizados.

## Atenção
**A coleta ainda não foi homologada contra arquivos reais de 2026.** Conferir EA12/EA20 e JWS antes de divulgar resultados. Dados ausentes não são inventados.

**Segurança:** a API de gerenciamento de grupos ainda **não tem autenticação**. Não exponha este sistema publicamente com edição habilitada antes de adicionar autenticação/autorização. Recomenda-se implantação apenas em rede privada nesta versão.

Documentação: [Grupos](docs/GROUPS.md), [TSE](docs/TSE.md), [Arquitetura](docs/ARCHITECTURE.md), [Operação](docs/OPERATIONS.md), [Roadmap](docs/ROADMAP.md).

Fonte: https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados

Sem vínculo com a Justiça Eleitoral. Licença a definir pelo mantenedor.
