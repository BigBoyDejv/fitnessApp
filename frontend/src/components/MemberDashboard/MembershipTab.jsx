import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function MembershipTab({ setActiveTab }) {
  const [membership, setMembership] = useState(null);
  const [history, setHistory] = useState([]);
  const [memLoading, setMemLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    loadMembership();
    loadHistory();
  }, []);

  const loadMembership = async () => {
    try {
      const res = await authenticatedFetch('/api/memberships/my');
      if (res.status === 404 || !res.ok) throw new Error('No membership');
      const d = await res.json();
      setMembership(d);
    } catch {
      setMembership(null);
    } finally {
      setMemLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await authenticatedFetch('/api/memberships/my/history');
      const data = await res.json();
      if (!res.ok || !Array.isArray(data) || !data.length) throw new Error('Empty');
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  };

  const renderActiveCard = () => {
    if (memLoading) return <div className="empty"><span className="spin" /></div>;
    if (!membership) {
       return (
         <div className="empty">
           <i className="fas fa-id-card" style={{ color: 'var(--red)' }} />
           <p>Nemáš aktívne členstvo</p>
           <button className="btn btn-acid" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('pricing')}>
             <i className="fas fa-plus" /> Kúpiť členstvo
           </button>
         </div>
       );
    }

    const start = new Date(membership.startDate);
    const end = new Date(membership.endDate);
    const daysTotal = Math.ceil((end - start) / 864e5);
    const daysLeft = Math.max(0, Math.ceil((end - new Date()) / 864e5));
    const prog = Math.round((1 - daysLeft / daysTotal) * 100);

    return (
      <div className="mc">
        <div className="mc-type">{membership.membershipTypeName || 'Členstvo'}</div>
        <div className="mc-status"><div className="mc-dot" />{membership.status || 'active'}</div>
        <div className="mc-row">
          <div>
            <div className="mc-days">{daysLeft}</div>
            <div className="mc-days-lbl">dní ostáva</div>
          </div>
          <div className="mc-meta">
            <div className="mc-f"><label>Začiatok</label><p>{membership.startDate || '—'}</p></div>
            <div className="mc-f"><label>Koniec</label><p>{membership.endDate || '—'}</p></div>
            <div className="mc-f"><label>Cena</label><p>{membership.priceEuros || '—'} €</p></div>
          </div>
        </div>
        <div className="prog"><div className="prog-fill" style={{ width: `${prog}%` }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
          <span style={{ fontSize: '0.67rem', color: 'var(--muted)' }}>{membership.startDate}</span>
          <span style={{ fontSize: '0.67rem', color: 'var(--muted)' }}>{membership.endDate}</span>
        </div>
        <div style={{ marginTop: '1.1rem' }}>
          <button className="btn btn-acid btn-sm" onClick={() => setActiveTab('pricing')}><i className="fas fa-sync-alt" /> Obnoviť / Upgradovať</button>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    if (histLoading) return <div className="empty"><span className="spin" /></div>;
    if (history.length === 0) {
       return (
         <>
           <div style={{ marginBottom: '0.7rem', fontSize: '0.73rem', color: 'var(--muted)', padding: '0.45rem 0.7rem', background: 'rgba(255,255,255,0.03)', borderRadius: '3px' }}>Žiadna história. Ukážkové dáta:</div>
           <table className="dt">
             <thead><tr><th>Typ</th><th>Od</th><th>Do</th><th>Cena</th><th>Status</th></tr></thead>
             <tbody>
               <tr><td>Premium</td><td>01.02.2026</td><td>28.02.2026</td><td>79 €</td><td><span className="badge b-acid">active</span></td></tr>
               <tr><td>Štandard</td><td>01.01.2026</td><td>31.01.2026</td><td>49 €</td><td><span className="badge b-grey">expired</span></td></tr>
             </tbody>
           </table>
         </>
       );
    }
    
    return (
      <table className="dt">
        <thead>
          <tr><th>Typ</th><th>Od</th><th>Do</th><th>Cena</th><th>Status</th></tr>
        </thead>
        <tbody>
          {history.map((m, i) => {
             const c = m.status === 'active' ? 'b-acid' : m.status === 'expired' ? 'b-grey' : 'b-red';
             return (
               <tr key={i}>
                 <td>{m.membershipTypeName || '—'}</td>
                 <td>{m.startDate || '—'}</td>
                 <td>{m.endDate || '—'}</td>
                 <td>{m.priceEuros || '—'} €</td>
                 <td><span className={`badge ${c}`}>{m.status}</span></td>
               </tr>
             );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="ps active" id="pg-membership">
      <div className="g2">
        <div className="panel">
          <div className="ph"><span className="pt">Aktuálne členstvo</span></div>
          <div className="pb" style={{ padding: '2rem' }}>
            {renderActiveCard()}
          </div>
        </div>
        <div className="panel">
          <div className="ph"><span className="pt">História členstiev</span></div>
          <div className="pb" style={{ padding: 0 }}>
            {renderHistory()}
          </div>
        </div>
      </div>
    </div>
  );
}
