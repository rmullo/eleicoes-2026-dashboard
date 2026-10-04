# Arquitetura

```text
TSE CDN (JSON) -> Coletor planejado -> Normalização -> Cache/snapshots
                                                       |
Browser -> Nginx -> Fastify /api ----------------------+
```

Um único coletor por implantação. Polling sem WebSocket no MVP. Dois contêineres (API e frontend/Nginx). Exibir horário oficial, última coleta bem-sucedida e estado desatualizado separadamente. Preservar último dado válido em falhas. Futuro SQLite em volume persistente.

## Endpoints implementados
- GET /api/health
- GET /api/status

## Planejados
- GET /api/elections
- GET /api/municipalities?uf=CE
- GET /api/results?municipality=...&office=...
- GET /api/history?municipality=...&office=...

O Nginx mantém frontend e API na mesma origem.
