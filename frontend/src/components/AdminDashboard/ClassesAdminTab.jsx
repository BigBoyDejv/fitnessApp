import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function ClassesAdminTab() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  const loadClasses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authenticatedFetch('/api/classes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Chyba načítania lekcií');
      
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(`Zmazať lekciu #${id}?`)) return;
    
    setMsg({ text: '', type: '' });
    try {
      const res = await authenticatedFetch(`/api/classes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMsg({ text: 'Lekcia zmazaná', type: 'ok' });
        loadClasses();
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Chyba servera pri mazaní');
      }
    } catch (e) {
      setMsg({ text: e.message, type: 'err' });
    }
  };

  return (
    <div className="panel" style={{ maxWidth: '1000px' }}>
      <div className="ph">
        <span className="pt">Aktuálne lekcie</span>
        <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge b-cyan" style={{textTransform:'none', letterSpacing:0, padding:'0.18rem 0.55rem'}}>GET /api/classes</span>
          <button className="btn btn-ghost btn-sm" onClick={loadClasses}>
            <i className="fas fa-sync-alt"></i> Obnoviť
          </button>
        </div>
      </div>
      <div className="pb" style={{ overflowX: 'auto' }}>
        {msg.text && (
          <div className={`fm ${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>
        )}
        
        {loading ? (
          <div className="empty-state"><span className="spinner"></span></div>
        ) : error ? (
          <div className="empty-state">
            <i className="fas fa-exclamation-circle" style={{color: 'var(--red)'}}></i>
            <p>{error}</p>
          </div>
        ) : classes.length > 0 ? (
          <table className="dt">
            <thead>
              <tr>
                <th>Názov</th>
                <th>Tréner</th>
                <th>Čas</th>
                <th>Miesto</th>
                <th>Obsadenosť</th>
                <th>Akcia</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(c => {
                const dt = c.startTime ? new Date(c.startTime).toLocaleString('sk-SK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
                const booked = c.booked || 0;
                const cap = c.capacity || '?';
                const pct = cap !== '?' && cap > 0 ? Math.round((booked / cap) * 100) : 0;
                const barColor = pct >= 90 ? 'var(--red)' : pct >= 60 ? 'var(--orange)' : 'var(--acid)';
                
                return (
                  <tr key={c.id}>
                    <td><b>{c.name || '—'}</b></td>
                    <td style={{ color: 'var(--muted)' }}>{c.instructor || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{dt}</td>
                    <td style={{ color: 'var(--muted)' }}>{c.location || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '4px', background: 'var(--border2)', borderRadius: '2px', minWidth: '60px' }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '4px', background: barColor, borderRadius: '2px' }}></div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{booked}/{cap}</span>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-red btn-sm" onClick={() => handleDelete(c.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <i className="fas fa-calendar-times"></i>
            <p>Žiadne lekcie neboli nájdené</p>
          </div>
        )}
      </div>
    </div>
  );
}
