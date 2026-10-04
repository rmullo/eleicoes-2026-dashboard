import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

type Any = Record<string, unknown>;
export type Candidate = { number: string; name: string; party: string; votes: number | null; percent: number | null };
export type Result = { office: string; code: string; election: string; municipality: string; uf: string; candidates: Candidate[]; sections: { total: number | null; counted: number | null; percent: number | null }; updatedAt: string | null; fetchedAt: string; source: string; idg: string | null };
type Cache = { etag?: string; modified?: string; data: unknown };
const base = 'https://resultados.tse.jus.br';
const interval = Math.max(30000, Number(process.env.POLL_INTERVAL_MS) || 30000);
const uf = 'ce';
const offices = [
  { id: 'presidente', code: '1', election: '6257' },
  { id: 'governador', code: '3', election: '6259' },
  { id: 'senador', code: '5', election: '6259' },
  { id: 'deputado-federal', code: '6', election: '6259' },
  { id: 'deputado-estadual', code: '7', election: '6259' }
];
const httpCache = new Map<string, Cache>();
const results = new Map<string, Result>();
const history = new Map<string, Result[]>();
const blocked = new Set<string>();
let municipalityCode: string | null = /^\d{5}$/.test(process.env.TSE_MUNICIPALITY_CODE ?? '') ? process.env.TSE_MUNICIPALITY_CODE! : null;
let state: 'starting' | 'waiting' | 'live' | 'degraded' | 'configuration_error' = 'starting';
let lastSuccess: string | null = null;
let lastAttempt: string | null = null;
let error: string | null = null;
let busy = false;
let retryAfter = 0;
const store = process.env.DATA_DIR || '/app/data';

const obj = (v: unknown): Any => v && typeof v === 'object' && !Array.isArray(v) ? v as Any : {};
const str = (v: unknown): string => v === null || v === undefined ? '' : String(v);
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(str(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const pick = (v: Any, ...keys: string[]) => keys.map(k => v[k]).find(x => x !== undefined && x !== null && x !== '');
const text = (v: Any, ...keys: string[]) => str(pick(v, ...keys));
const code = (v: string, size: number) => v.padStart(size, '0');
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

async function fetchJson(path: string): Promise<unknown> {
  if (blocked.has(path)) throw new Error('URL desabilitada após erro 404: ' + path);
  const cached = httpCache.get(path);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  if (cached?.modified) headers['If-Modified-Since'] = cached.modified;
  const response = await fetch(base + path, { headers, signal: AbortSignal.timeout(12000) });
  if (response.status === 304 && cached) return cached.data;
  if (response.status === 404) {
    blocked.add(path); throw new Error('Arquivo TSE indisponível (404): ' + path);
  }
  if (response.status === 429 || response.status >= 500) {
    retryAfter = Date.now() + 120000;
    throw new Error('TSE indisponível: HTTP ' + response.status);
  }
  if (!response.ok) throw new Error('TSE HTTP ' + response.status);
  const data: unknown = await response.json();
  httpCache.set(path, { data, etag: response.headers.get('etag') ?? undefined, modified: response.headers.get('last-modified') ?? undefined });
  return data;
}
function findMunicipality(root: unknown): string | null {
  const stack: unknown[] = [root];
  while (stack.length) {
    const current = stack.pop();
    if (Array.isArray(current)) { stack.push(...current); continue; }
    const v = obj(current);
    const name = text(v, 'nm', 'nome', 'nmu', 'ds');
    const id = text(v, 'cd', 'codigo', 'cm');
    if (normalize(name) === 'farias brito' && /^\d{5}$/.test(id)) return id;
    stack.push(...Object.values(v).filter(x => typeof x === 'object' && x !== null));
  }
  return null;
}
function parse(raw: unknown, office: typeof offices[number], source: string): Result {
  const doc = obj(raw);
  const cargos = Array.isArray(doc.carg) ? doc.carg : [];
  const cargo = cargos.map(obj).find(c => Number(text(c, 'cd')) === Number(office.code));
  if (!cargo) throw new Error('Cargo ausente no EA20: ' + office.id);
  if (!Array.isArray(cargo.cand)) throw new Error('Candidatos ausentes no EA20: ' + office.id);
  const candidates = cargo.cand.map((entry: unknown) => {
    const c = obj(entry);
    return { number: text(c, 'n', 'nr'), name: text(c, 'nm', 'nome'), party: text(c, 'cc', 'sgp', 'partido'), votes: num(pick(c, 'vap')), percent: num(pick(c, 'pvap')) };
  }).filter(c => c.name || c.number).sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1));
  const total = num(pick(cargo, 's', 'st')) ?? num(pick(doc, 's', 'st'));
  const counted = num(pick(cargo, 'st', 's')) ?? num(pick(doc, 'st', 's'));
  const percent = num(pick(cargo, 'pst', 'ps')) ?? num(pick(doc, 'pst', 'ps'));
  return {
    office: office.id, code: office.code, election: office.election, municipality: 'Farias Brito',
    uf: 'CE', candidates, sections: { total, counted, percent },
    updatedAt: [text(doc, 'dt', 'dg'), text(doc, 'ht', 'hg')].filter(Boolean).join(' ') || null,
    fetchedAt: new Date().toISOString(), source, idg: text(doc, 'idg') || null
  };
}
async function persist() {
  await mkdir(store, { recursive: true });
  await writeFile(join(store, 'snapshots.json'), JSON.stringify(Object.fromEntries(history)), 'utf8');
}
async function restore() {
  try {
    const raw = JSON.parse(await readFile(join(store, 'snapshots.json'), 'utf8')) as Record<string, Result[]>;
    for (const [k, snapshots] of Object.entries(raw)) {
      if (!offices.some(o => o.id === k) || !Array.isArray(snapshots)) continue;
      const valid = snapshots.filter(s => s && Array.isArray(s.candidates) && typeof s.fetchedAt === 'string').slice(-100);
      history.set(k, valid);
      if (valid.length) results.set(k, valid[valid.length - 1]);
    }
  } catch { /* first run or corrupt history: no prior data */ }
}
async function cycle() {
  if (busy || Date.now() < retryAfter) return;
  busy = true;
  lastAttempt = new Date().toISOString();
  try {
    if (!municipalityCode) {
      const config = await fetchJson('/oficial/ele2026/6259/config/mun-e06259-cm.json');
      municipalityCode = findMunicipality(config);
      if (!municipalityCode) {
        state = 'configuration_error';
        throw new Error('Município não localizado no EA12; configure TSE_MUNICIPALITY_CODE com 5 dígitos.');
      }
    }
    let succeeded = 0;
    const failures: string[] = [];
    for (const office of offices) {
      const path = `/oficial/ele2026/${office.election}/dados/${uf}/${uf}${municipalityCode}-c${code(office.code, 4)}-e${code(office.election, 5)}-u.json`;
      try {
        const raw = await fetchJson(path);
        const result = parse(raw, office, base + path);
        const previous = results.get(office.id);
        results.set(office.id, result);
        if (!previous || previous.idg !== result.idg || JSON.stringify(previous.candidates) !== JSON.stringify(result.candidates)) {
          history.set(office.id, [...(history.get(office.id) ?? []), result].slice(-100));
          await persist();
        }
        succeeded++;
      } catch (e) { failures.push(String(e)); }
    }
    if (succeeded) {
      lastSuccess = new Date().toISOString();
      state = failures.length ? 'degraded' : 'live';
    } else state = results.size ? 'degraded' : 'waiting';
    error = failures.length ? failures.join('; ').slice(0, 1000) : null;
  } catch (e) {
    error = String(e);
    if (state !== 'configuration_error') state = results.size ? 'degraded' : 'waiting';
  } finally { busy = false; }
}
export async function startCollector() {
  await restore();
  void cycle();
  setInterval(() => void cycle(), interval).unref();
}
export const getStatus = () => ({
  state, municipality: 'Farias Brito', municipalityCode, uf: 'CE', lastAttempt, lastSuccess,
  stale: !lastSuccess || Date.now() - Date.parse(lastSuccess) > interval * 3,
  error, intervalMs: interval, offices: offices.map(o => o.id),
  source: 'Tribunal Superior Eleitoral', official: false
});
export const getResult = (office: string) => results.get(office) ?? null;
export const getHistory = (office: string) => history.get(office) ?? [];
export const validOffice = (office: string) => offices.some(o => o.id === office);
