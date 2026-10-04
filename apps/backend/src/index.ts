import Fastify from 'fastify';
import { getHistory, getResult, getStatus, startCollector, validOffice } from './tse.js';
import { createGroup, deleteGroup, listGroups, loadGroups, updateGroup } from './groups.js';

const app = Fastify({ logger: true, bodyLimit: 200_000 });
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
app.get('/api/groups', async () => ({ groups: listGroups() }));
app.post('/api/groups', async (request, reply) => {
  try { return reply.code(201).send(await createGroup(request.body)); }
  catch (e) { return reply.code(400).send({error: String(e)}); }
});
app.put<{Params:{id:string}}>('/api/groups/:id', async (request, reply) => {
  try {
    const group = await updateGroup(request.params.id,request.body);
    return group ?? reply.code(404).send({error:'Grupo não encontrado'});
  } catch (e) { return reply.code(400).send({error:String(e)}); }
});
app.delete<{Params:{id:string}}>('/api/groups/:id', async (request, reply) => {
  return (await deleteGroup(request.params.id)) ? {ok:true} : reply.code(404).send({error:'Grupo não encontrado'});
});
const port = Number(process.env.PORT ?? 3000);
await loadGroups();
await startCollector();
await app.listen({ port, host: '0.0.0.0' });
