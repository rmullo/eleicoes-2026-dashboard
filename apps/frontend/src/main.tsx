import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
type Status = { source: string; municipality: string; state: string; status: string; message: string; lastSuccessfulFetch: string | null };
function App() {
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const update = async () => {
      try {
        const response = await fetch('/api/status', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result: Status = await response.json();
        if (active) { setData(result); setError(''); }
      } catch (e) { if (active) setError(String(e)); }
    };
    void update();
    const timer = setInterval(() => void update(), 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <main><h1>Eleições 2026</h1><p>Farias Brito · Ceará</p><section><h2>Estado da integração</h2><p>{error || data?.message || 'Consultando API...'}</p><small>Fonte planejada: TSE. Este projeto ainda não exibe votos.</small></section><footer>Projeto independente, não oficial.</footer></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
