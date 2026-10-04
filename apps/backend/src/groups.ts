import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type Group = { id: string; name: string; color: string; description: string; candidates: Record<string, string[]> };
const dir = process.env.DATA_DIR || '/app/data';
const file = join(dir, 'groups.json');
let groups: Group[] = [];
let pending: Promise<void> = Promise.resolve();
const officeIds = new Set(['presidente','governador','senador','deputado-federal','deputado-estadual']);
export async function loadGroups() {
  try {
    const data: unknown = JSON.parse(await readFile(file,'utf8'));
    if (Array.isArray(data)) groups = data.filter(isGroup);
  } catch { groups = []; }
}
function isGroup(g: unknown): g is Group {
  if (!g || typeof g !== 'object') return false;
  const v = g as Partial<Group>;
  return typeof v.id === 'string' && typeof v.name === 'string' && typeof v.color === 'string' && typeof v.description === 'string' && !!v.candidates && typeof v.candidates === 'object';
}
function validate(body: unknown): Omit<Group,'id'> {
  if (!body || typeof body !== 'object') throw new Error('Objeto inválido');
  const v = body as Record<string,unknown>;
  const name = typeof v.name === 'string' ? v.name.trim() : '';
  const description = typeof v.description === 'string' ? v.description.trim() : '';
  const color = typeof v.color === 'string' ? v.color : '';
  if (!name || name.length > 80 || description.length > 300 || !/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error('Nome, descrição ou cor inválidos');
  const candidates: Record<string,string[]> = {};
  if (!v.candidates || typeof v.candidates !== 'object' || Array.isArray(v.candidates)) throw new Error('Candidatos inválidos');
  for (const [office,values] of Object.entries(v.candidates)) {
    if (!officeIds.has(office) || !Array.isArray(values) || values.length > 2000 || !values.every(x => typeof x === 'string' && /^\d{1,6}$/.test(x))) throw new Error('Candidatos inválidos');
    candidates[office] = [...new Set(values)];
  }
  return { name, color, description, candidates };
}
async function persist() {
  await mkdir(dir,{recursive:true});
  const tmp = file + '.tmp';
  await writeFile(tmp,JSON.stringify(groups,null,2),'utf8');
  await rename(tmp,file);
}
function save() { pending = pending.then(persist); return pending; }
export const listGroups = () => groups.map(g => ({...g, candidates: Object.fromEntries(Object.entries(g.candidates).map(([k,v])=>[k,[...v]]))}));
export async function createGroup(body: unknown) {
  const data = validate(body);
  const group = { id: crypto.randomUUID(), ...data };
  groups.push(group); await save(); return group;
}
export async function updateGroup(id: string, body: unknown) {
  const index = groups.findIndex(g=>g.id===id);
  if (index < 0) return null;
  groups[index] = { id, ...validate(body) };
  await save(); return groups[index];
}
export async function deleteGroup(id: string) {
  const index = groups.findIndex(g=>g.id===id);
  if (index < 0) return false;
  groups.splice(index,1); await save(); return true;
}
