# Operação

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
docker compose logs -f
curl -f http://localhost:8080/api/health
curl -f http://localhost:8080/api/status
```

Para atualizar: `git pull && docker compose up -d --build`.
Para parar: `docker compose down`.

Em produção, configurar HTTPS, observabilidade e limitação de requisições. Não expor a API diretamente nem comitar `.env`. A coleta TSE ainda não existe.
