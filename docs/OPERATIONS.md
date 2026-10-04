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

Em produção, configurar HTTPS, monitoramento de funcionamento e limitação de requisições. Não expor a API diretamente nem enviar ao repositório `.env`. A coleta do TSE está implementada, mas ainda requer validação com os arquivos oficiais reais de 2026.
