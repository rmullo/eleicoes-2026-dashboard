import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
type Candidate = { number: string; name: string; party: string; votes: number | null; percent: number | null };
type Result = { office: string; candidates: Candidate[]; sections: { total: number | null; counted: number | null; percent: number | null }; updatedAt: string | null; fetchedAt: string; stale: boolean };
type Status = { state: string; lastSuccess: string | null; stale: boolean; error: string | null; municipalityCode: string | null };
type Group = { id: string; name: string; color: string; description: string; candidates: Record<string,string[]> };
const offices = [['presidente','Presidente'],['governador','Governador'],['senador','Senador'],['deputado-federal','Deputado federal'],['deputado-estadual','Deputado estadual']];
const format = (n: number | null) => n === null ? '—' : new Intl.NumberFormat('pt-BR').format(n);
const percentage = (n: number | null) => n === null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
async function json(url:string,init?:RequestInit) { const r=await fetch(url,init); if(!r.ok) throw new Error((await r.text()).slice(0,180)); return r.json(); }
function App() {
  const [office,setOffice]=useState('governador');
  const [status,setStatus]=useState<Status|null>(null);
  const [result,setResult]=useState<Result|null>(null);
  const [groups,setGroups]=useState<Group[]>([]);
  const [search,setSearch]=useState('');
  const [groupFilter,setGroupFilter]=useState('all');
  const [editing,setEditing]=useState<string|null>(null);
  const [name,setName]=useState('');
  const [color,setColor]=useState('#24b38b');
  const [description,setDescription]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function reloadGroups() { const v=await json('/api/groups');setGroups(v.groups); }
  useEffect(()=>{ void reloadGroups().catch(e=>setError(String(e))); },[]);
  useEffect(()=>{
    let active=true;
    async function refresh() {
      try {
        const [s,r]=await Promise.all([fetch('/api/status',{cache:'no-store'}),fetch('/api/results?office='+encodeURIComponent(office),{cache:'no-store'})]);
        if(!s.ok) throw new Error('API indisponível');
        if(active) {setStatus(await s.json());setResult(r.ok?await r.json():null);}
      }catch(e){if(active){setError(String(e));setResult(null);}}
    }
    void refresh();const timer=setInterval(()=>void refresh(),5000);
    return()=>{active=false;clearInterval(timer);};
  },[office]);
  const candidates=useMemo(()=>(result?.candidates??[]).filter(c=>
    (c.name+' '+c.number+' '+c.party).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) &&
    (groupFilter==='all'||groups.some(g=>g.id===groupFilter&&(g.candidates[office]??[]).includes(c.number)))
  ),[result,search,groupFilter,groups,office]);
  function begin(group?:Group) {setEditing(group?.id??'new');setName(group?.name??'');setColor(group?.color??'#24b38b');setDescription(group?.description??'');}
  async function saveGroup() {
    if(!name.trim()) return;
    setBusy(true);
    try {
      const old=groups.find(g=>g.id===editing);
      await json(editing==='new'?'/api/groups':'/api/groups/'+editing,{
        method:editing==='new'?'POST':'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,color,description,candidates:old?.candidates??{}})
      });
      await reloadGroups();setEditing(null);setError('');
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  async function removeGroup(id:string) {
    if(!confirm('Excluir este grupo e todas as suas marcações?')) return;
    try {await json('/api/groups/'+id,{method:'DELETE'});await reloadGroups();if(groupFilter===id)setGroupFilter('all');}
    catch(e){setError(String(e));}
  }
  async function toggle(group:Group,number:string) {
    const current=group.candidates[office]??[];
    const next=current.includes(number)?current.filter(n=>n!==number):[...current,number];
    try {
      await json('/api/groups/'+group.id,{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...group,candidates:{...group.candidates,[office]:next}})});
      await reloadGroups();
    }catch(e){setError(String(e));}
  }
  return <main>
    <header><div><span className="eyebrow">PAINEL ELEITORAL · 1º TURNO</span><h1>Eleições 2026</h1><p>Farias Brito · Ceará</p></div><a href="https://resultados.tse.jus.br" target="_blank" rel="noreferrer">Fonte: TSE ↗</a></header>
    <section className="summary">
      <div><small>Estado da coleta</small><strong>{status?.state??'Conectando'}</strong></div>
      <div><small>Seções totalizadas</small><strong>{percentage(result?.sections.percent??null)}</strong></div>
      <div><small>Última coleta válida</small><strong>{status?.lastSuccess?new Date(status.lastSuccess).toLocaleTimeString('pt-BR'):'—'}</strong></div>
    </section>
    {(status?.stale||error||status?.error)&&<div className="warning" role="status">{error||(status?.stale?'Sem atualização recente. Os dados podem estar desatualizados.':'Consulta parcial ao TSE.')}{status?.error&&<details><summary>Detalhes técnicos</summary>{status.error}</details>}</div>}
    <section className="groups">
      <div className="section-heading"><h2>Grupos políticos regionais</h2><button className="action" onClick={()=>begin()}>+ Novo grupo</button></div>
      <p className="muted">Classificações editoriais personalizadas, não fornecidas pelo TSE. Votos são contabilizados por cargo e candidato; não representam eleitores únicos nem transferência de votos.</p>
      {editing&&<div className="editor"><input aria-label="Nome do grupo" placeholder="Nome do grupo" maxLength={80} value={name} onChange={e=>setName(e.target.value)}/><input type="color" aria-label="Cor" value={color} onChange={e=>setColor(e.target.value)}/><input aria-label="Descrição" placeholder="Descrição (opcional)" maxLength={300} value={description} onChange={e=>setDescription(e.target.value)}/><button disabled={busy||!name.trim()} onClick={()=>void saveGroup()}>Salvar</button><button onClick={()=>setEditing(null)}>Cancelar</button></div>}
      <div className="group-grid">{groups.map(g=>{
        const assigned=new Set(g.candidates[office]??[]);
        const matching=(result?.candidates??[]).filter(c=>assigned.has(c.number));
        const known=matching.filter(c=>c.votes!==null);
        const total=known.length?known.reduce((sum,c)=>sum+(c.votes??0),0):null;
        return <div className="group-card" key={g.id} style={{borderLeftColor:g.color}}>
          <div className="group-head"><b><span className="flag" style={{background:g.color}}/>{g.name}</b><span><button title="Editar grupo" onClick={()=>begin(g)}>Editar</button><button title="Excluir grupo" onClick={()=>void removeGroup(g.id)}>Excluir</button></span></div>
          <small>{g.description}</small><strong>{format(total)} votos</strong><small>{assigned.size} candidato(s) marcados · {offices.find(o=>o[0]===office)?.[1]}{known.length!==assigned.size?' · dados incompletos':''}</small>
        </div>;
      })}{!groups.length&&<p>Nenhum grupo cadastrado. Crie um grupo para começar.</p>}</div>
    </section>
    <nav aria-label="Cargo">{offices.map(([id,label])=><button key={id} className={office===id?'active':''} onClick={()=>{setOffice(id);setSearch('');}}>{label}</button>)}</nav>
    <section>
      <div className="section-heading"><h2>Votação por candidato</h2><div className="filters"><input aria-label="Buscar candidato" placeholder="Nome, número ou partido" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filtrar por grupo" value={groupFilter} onChange={e=>setGroupFilter(e.target.value)}><option value="all">Todos os grupos</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div></div>
      {!result?<p className="empty">Aguardando publicação e validação dos dados oficiais. Nenhum número será estimado.</p>:<>
        <p className="muted">Arquivo: {result.updatedAt||'sem horário'} · Seções: {format(result.sections.counted)} / {format(result.sections.total)}</p>
        {candidates.map(c=><div className="candidate" key={c.number+c.name}>
          <div className="candidate-body"><div className="candidate-title"><span><b>{c.name}</b><small> {c.number} · {c.party}</small></span><b>{format(c.votes)} votos</b></div>
            <div className="flags">{groups.filter(g=>(g.candidates[office]??[]).includes(c.number)).map(g=><span className="flag-label" key={g.id} style={{borderColor:g.color}}><span className="flag" style={{background:g.color}}/>{g.name}</span>)}</div>
            <div className="bar"><div style={{width:Math.max(0,Math.min(100,c.percent??0))+'%'}}/></div><small>{percentage(c.percent)}</small>
            {!!groups.length&&<details className="assign"><summary>Marcar grupo político</summary><div className="assign-options">{groups.map(g=><label key={g.id}><input type="checkbox" checked={(g.candidates[office]??[]).includes(c.number)} onChange={()=>void toggle(g,c.number)}/><span className="flag" style={{background:g.color}}/>{g.name}</label>)}</div></details>}
          </div>
        </div>)}{!candidates.length&&<p>Nenhum candidato corresponde ao filtro.</p>}
      </>}
    </section><footer>Projeto independente, não oficial. As flags são atribuídas pelos usuários e não indicam apoio oficial. Painel atualizado visualmente a cada 5 segundos.</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
