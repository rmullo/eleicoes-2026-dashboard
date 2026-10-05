import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

type Any = Record<string, unknown>;
export type Candidate = { number: string; name: string; party: string; votes: number | null; percent: number | null };
export type Result = {
  office: string; code: string; election: string; municipality: string; uf: string;
  candidates: Candidate[]; sections: { total: number | null; counted: number | null; percent: number | null };
  updatedAt: string | null; fetchedAt: string; source: string; idg: string | null;
};
type Cache = { etag?: string; modified?: string; data: unknown };

const base = 'https://resultados.tse.jus.br';
const interval = Math.max(60000, Number(process.env.POLL_INTERVAL_MS) || 60000);
const uf = 'ce';
// Código TSE de Farias Brito/CE. Não confundir com o código IBGE 2304301.
const defaultMunicipalityCode = '13870';
const municipalityCode = /^\d{5}$/.test(process.env.TSE_MUNICIPALITY_CODE ?? '')
  ? process.env.TSE_MUNICIPALITY_CODE!
  : defaultMunicipalityCode;

const offices = [
  { id: 'presidente', code: '1', election: '6257' },
  { id: 'governador', code: '3', election: '6259' },
  { id: 'senador', code: '5', election: '6259' },
  { id: 'deputado-federal', code: '6', election: '6259' },
  { id: 'deputado-estadual', code: '7', election: '6259' }
] as const;

const httpCache = new Map<string, Cache>();
const results = new Map<string, Result>();
const history = new Map<string, Result[]>();
let state: 'starting' | 'waiting' | 'live' | 'degraded' = 'starting';
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
const text = (v: Any, ...keys: string[]) => {
  for (const key of keys) {
    const value = v[key];
    if (value !== undefined && value !== null && value !== '') return str(value);
  }
  return '';
};
const pad = (v: string, size: number) => v.padStart(size, '0');

async function fetchJson(path: string): Promise<unknown> {
  const cached = httpCache.get(path);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  if (cached?.modified) headers['If-Modified-Since'] = cached.modified;

  const response = await fetch(base + path, { headers, signal: AbortSignal.timeout(15000) });
  if (response.status === 304 && cached) return cached.data;
  if (response.status === 404) throw new Error('Arquivo de resultado não encontrado no TSE (404): ' + path);
  if (response.status === 429) {
    retryAfter = Date.now() + 10 * 60 * 1000;
    throw new Error('Limite de consultas do TSE atingido (HTTP 429). Nova tentativa em 10 minutos.');
  }
  if (response.status >= 500) {
    retryAfter = Date.now() + 120000;
    throw new Error('Serviço do TSE temporariamente indisponível: HTTP ' + response.status);
  }
  if (!response.ok) throw new Error('Erro ao consultar o TSE: HTTP ' + response.status);

  const data: unknown = await response.json();
  httpCache.set(path, {
    data,
    etag: response.headers.get('etag') ?? undefined,
    modified: response.headers.get('last-modified') ?? undefined
  });
  return data;
}

function collectCandidates(cargo: Any): Candidate[] {
  const found = new Map<string, Candidate>();
  const add = (entry: unknown, party = '') => {
    const c = obj(entry);
    const number = text(c, 'n', 'nr');
    // EA20: "nmu" = nome de urna; "nm" = nome completo.
    // O painel deve exibir o nome de urna e usar o nome completo apenas como fallback.
    const name = text(c, 'nmu', 'nmurna', 'nomeUrna', 'nm', 'nome');
    if (!number || !name) return;
    const candidate: Candidate = {
      number,
      name,
      party: party || text(c, 'cc', 'sgp', 'sg', 'partido'),
      votes: num(c.vap),
      percent: num(c.pvap)
    };
    const previous = found.get(number);
    if (!previous || (candidate.votes ?? -1) > (previous.votes ?? -1)) found.set(number, candidate);
  };

  if (Array.isArray(cargo.cand)) for (const c of cargo.cand) add(c);

  if (Array.isArray(cargo.agr)) {
    for (const agrEntry of cargo.agr) {
      const agr = obj(agrEntry);
      if (Array.isArray(agr.cand)) for (const c of agr.cand) add(c, text(agr, 'sg'));
      if (!Array.isArray(agr.par)) continue;
      for (const parEntry of agr.par) {
        const par = obj(parEntry);
        const party = text(par, 'sg', 'sgp', 'nm');
        if (Array.isArray(par.cand)) for (const c of par.cand) add(c, party);
      }
    }
  }

  return [...found.values()].sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1));
}

function parse(raw: unknown, office: typeof offices[number], source: string): Result {
  const doc = obj(raw);
  const cargos = Array.isArray(doc.carg) ? doc.carg.map(obj) : [];
  const cargo = cargos.find(c => Number(text(c, 'cd')) === Number(office.code));
  if (!cargo) throw new Error('Cargo ' + office.id + ' não encontrado no arquivo EA20.');

  const candidates = collectCandidates(cargo);
  if (!candidates.length) throw new Error('Nenhum candidato encontrado para ' + office.id + ' no arquivo EA20.');

  const scope = text(doc, 'tpabr');
  const scopeCode = text(doc, 'cdabr');
  if (scope && scope !== 'mu') throw new Error('O arquivo recebido não possui abrangência municipal.');
  if (scopeCode && pad(scopeCode, 5) !== municipalityCode) {
    throw new Error('O arquivo recebido pertence ao município ' + scopeCode + ', não a Farias Brito (' + municipalityCode + ').');
  }

  const sections = obj(doc.s);
  const total = num(sections.ts);
  const counted = num(sections.st);
  const percent = num(sections.pst);

  return {
    office: office.id,
    code: office.code,
    election: office.election,
    municipality: 'Farias Brito',
    uf: 'CE',
    candidates,
    sections: { total, counted, percent },
    updatedAt: [text(doc, 'dt', 'dg'), text(doc, 'ht', 'hg')].filter(Boolean).join(' ') || null,
    fetchedAt: new Date().toISOString(),
    source,
    idg: text(doc, 'idg') || null
  };
}

async function persist() {
  await mkdir(store, { recursive: true });
  await writeFile(join(store, 'snapshots.json'), JSON.stringify(Object.fromEntries(history)), 'utf8');
}

async function restore() {
  try {
    const raw = JSON.parse(await readFile(join(store, 'snapshots.json'), 'utf8')) as Record<string, Result[]>;
    for (const [key, snapshots] of Object.entries(raw)) {
      if (!offices.some(o => o.id === key) || !Array.isArray(snapshots)) continue;
      const valid = snapshots.filter(s => s && Array.isArray(s.candidates) && typeof s.fetchedAt === 'string').slice(-100);
      history.set(key, valid);
      if (valid.length) results.set(key, valid[valid.length - 1]);
    }
  } catch {
    // Primeira execução ou histórico inválido.
  }
}

async function cycle() {
  if (busy || Date.now() < retryAfter) return;
  busy = true;
  lastAttempt = new Date().toISOString();
  const failures: string[] = [];
  let succeeded = 0;

  try {
    for (const office of offices) {
      // EA20 municipal: {uf}{municipio}-c{cargo4}-e{eleicao6}-u.json
      const path = `/oficial/ele2026/${office.election}/dados/${uf}/${uf}${municipalityCode}-c${pad(office.code, 4)}-e${pad(office.election, 6)}-u.json`;
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
      } catch (e) {
        failures.push(office.id + ': ' + (e instanceof Error ? e.message : String(e)));
      }
    }

    if (succeeded > 0) {
      lastSuccess = new Date().toISOString();
      state = failures.length ? 'degraded' : 'live';
    } else {
      state = results.size ? 'degraded' : 'waiting';
    }
    error = failures.length ? failures.join('; ').slice(0, 1800) : null;
  } finally {
    busy = false;
  }
}

export async function startCollector() {
  await restore();
  await cycle();
  setInterval(() => void cycle(), interval).unref();
}

export const getStatus = () => ({
  state,
  municipality: 'Farias Brito',
  municipalityCode,
  uf: 'CE',
  lastAttempt,
  lastSuccess,
  stale: !lastSuccess || Date.now() - Date.parse(lastSuccess) > interval * 3,
  error,
  intervalMs: interval,
  offices: offices.map(o => o.id),
  source: 'Tribunal Superior Eleitoral',
  official: true
});
export const getResult = (office: string) => results.get(office) ?? null;
export const getHistory = (office: string) => history.get(office) ?? [];
export const validOffice = (office: string) => offices.some(o => o.id === office);
