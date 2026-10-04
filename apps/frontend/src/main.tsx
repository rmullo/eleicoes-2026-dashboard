import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Candidate = { number: string; name: string; party: string; votes: number | null; percent: number | null };
type Result = { office: string; candidates: Candidate[]; sections: { total: number | null; counted: number | null; percent: number | null }; updatedAt: string | null; fetchedAt: string; stale: boolean };
type Status = { state: string; lastSuccess: string | null; stale: boolean; error: string | null; municipalityCode: string | null; intervalMs: number };
const offices = [
  ['presidente','Presidente'],['governador','Governador'],['senador','Senador'],
  ['deputado-federal','Deputado federal'],['deputado-estadual','Deputado estadual']
];
const format = (n: number | null) => n === null ? '—' : new Intl.NumberFormat('pt-BR').format(n);
const percentage = (n: number | null) => n === null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
function App() {
  const [office, setOffice] = useState('governador');
  const [status, setStatus] = useState<Status | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch { return []; }
  });
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [s, r] = await Promise.all([
          fetch('/api/status', { cache: 'no-store' }),
          fetch('/api/results?office=' + encodeURIComponent(office), { cache: 'no-store' })
        ]);
        if (!s.ok) throw new Error('API indisponível');
        const state = await s.json() as Status;
        if (active) setStatus(state);
        if (r.ok) {
          const data = await r.json() as Result;
          if (active) setResult(data);
        } else if (active) setResult(null);
        if (active) setError('');
      } catch (e) { if (active) { setError(String(e)); setResult(null); } }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => { active = false; clearInterval(timer); };
  }, [office]);
  const candidates = useMemo(() => (result?.candidates ?? []).filter(c => (
    (c.name + ' ' + c.number + ' ' + c.party).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
  )).sort((a, b) => Number(favorites.includes(office + ':' + b.number)) - Number(favorites.includes(office + ':' + a.number))), [result, search, favorites, office]);
  function toggle(number: string) {
    const key = office + ':' + number;
    const next = favorites.includes(key) ? favorites.filter(x => x !== key) : [...favorites, key];
    setFavorites(next); localStorage.setItem('favorites', JSON.stringify(next));
  }
  return <main>
    <header><div><span className="eyebrow">PAINEL ELEITORAL · 1º TURNO</span><h1>Eleições 2026</h1><p>Farias Brito · Ceará</p></div><a href="https://resultados.tse.jus.br" target="_blank" rel="noreferrer">Fonte: TSE ↗</a></header>
    <section className="summary">
      <div><small>Estado da coleta</small><strong>{status?.state ?? 'Conectando'}</strong></div>
      <div><small>Seções totalizadas</small><strong>{percentage(result?.sections.percent ?? null)}</strong></div>
      <div><small>Última coleta válida</small><strong>{status?.lastSuccess ? new Date(status.lastSuccess).toLocaleTimeString('pt-BR') : '—'}</strong></div>
    </section>
    {(status?.stale || error || status?.error) && <div className="warning" role="status">{error || (status?.stale ? 'Sem atualização recente. Os dados exibidos podem estar desatualizados.' : 'Consulta parcial ao TSE.')}{status?.error && <details><summary>Detalhes técnicos</summary>{status.error}</details>}</div>}
    <nav aria-label="Cargo">{offices.map(([id,label]) => <button key={id} className={office === id ? 'active' : ''} onClick={() => {setOffice(id);setSearch('');}}>{label}</button>)}</nav>
    <section>
      <div className="section-heading"><h2>Votação por candidato</h2><input aria-label="Filtrar candidato" placeholder="Buscar nome, número ou partido" value={search} onChange={e => setSearch(e.target.value)} /></div>
      {!result ? <p className="empty">Aguardando publicação e validação dos dados oficiais deste cargo. Nenhum número será estimado.</p> : <>
        <p className="muted">Atualização do arquivo: {result.updatedAt || 'não informada'} · Seções: {format(result.sections.counted)} / {format(result.sections.total)}</p>
        {candidates.map(c => <div className="candidate" key={c.number + c.name}>
          <button className="star" aria-label={'Favoritar ' + c.name} onClick={() => toggle(c.number)}>{favorites.includes(office + ':' + c.number) ? '★' : '☆'}</button>
          <div className="candidate-body"><div className="candidate-title"><span><b>{c.name}</b><small> {c.number} · {c.party}</small></span><b>{format(c.votes)} votos</b></div>
            <div className="bar"><div style={{width: Math.max(0, Math.min(100, c.percent ?? 0)) + '%'}} /></div>
            <small>{percentage(c.percent)}</small></div>
        </div>)}
        {!candidates.length && <p>Nenhum candidato corresponde à busca.</p>}
      </>}
    </section>
    <footer>Projeto independente, não oficial. Dados sujeitos à totalização e publicação pelo TSE. Atualização visual a cada 5 segundos.</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
