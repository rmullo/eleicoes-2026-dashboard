import Fastify from 'fastify';
import { getHistory, getResult, getStatus, startCollector, validOffice } from './tse.js';

const app = Fastify({ logger: true });
app.get('/api/health', async () => ({ status: 'ok' }));
app.get('/api/status', async () => getStatus());
app.get<{ Querystring: { office?: string } }>('/api/results', async (request, reply) => {
  const office = request.query.office ?? 'governador';
  if (!validOffice(office)) return reply.code(400).send({ error: 'Cargo inválido' });
  const data = getResult(office);
  if (!data) return reply.code(503).send({ error: 'Resultado oficial ainda não disponível', status: getStatus() });
  return { ...data, stale: getStatus().stale };
});
app.get<{ Querystring: { office?: string } }>('/api/history', async (request, reply) => {
  const office = request.query.office ?? 'governador';
  if (!validOffice(office)) return reply.code(400).send({ error: 'Cargo inválido' });
  return { office, snapshots: getHistory(office) };
});
const port = Number(process.env.PORT ?? 3000);
await startCollector();
await app.listen({ port, host: '0.0.0.0' });
