import Fastify from 'fastify';

const app = Fastify({ logger: true });
const startedAt = new Date().toISOString();

app.get('/api/health', async () => ({ status: 'ok', startedAt }));
app.get('/api/status', async () => ({
  source: 'TSE',
  municipality: process.env.TSE_MUNICIPALITY ?? 'Farias Brito',
  state: process.env.TSE_UF ?? 'ce',
  status: 'integration_pending',
  message: 'Official TSE JSON ingestion has not been implemented or validated.',
  lastSuccessfulFetch: null,
}));

const port = Number(process.env.PORT ?? 3000);
app.listen({ port, host: '0.0.0.0' }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
