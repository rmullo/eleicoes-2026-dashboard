# Arquitetura

```text
Arquivos JSON do TSE -> Coleta -> Normalização -> Armazenamento temporário e histórico
                                                   |
Navegador -> Nginx -> Servidor Fastify /api --------+
```

A aplicação consulta os arquivos do TSE periodicamente e apresenta as informações em português do Brasil. O sistema mantém o último dado válido e identifica resultados desatualizados.

## Endereços disponíveis
- `GET /api/health`: estado do serviço
- `GET /api/status`: estado da coleta
- `GET /api/results?office=governador`: resultados
- `GET /api/history?office=governador`: histórico
- `GET /api/groups`: grupos políticos

Os nomes dos endereços e das propriedades internas permanecem em inglês por compatibilidade técnica; todos os textos voltados aos usuários ficam em português brasileiro.
