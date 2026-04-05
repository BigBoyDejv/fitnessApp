import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function MyClassesTab() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(''); // '', 'upcoming', 'past'

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authenticatedFetch('/api/trainer/classes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Nepodarilo sa načítať lekcie');
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const now = new Date();

  const filteredClasses = classes.filter(c => {
    const matchQ = !search || 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (c.location || '').toLowerCase().includes(search.toLowerCase());
    
    const isPast = new Date(c.startTime) < now;
    const matchF = !filter || 
      (filter === 'upcoming' && !isPast) || 
      (filter === 'past' && isPast);
      
    return matchQ && matchF;
  });

  const sortedClasses = [...filteredClasses].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return (
    <div className="panel">
      <div className="ph">
        <span className="pt">Moje lekcie</span>
        <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
          <span className="badge b-blue" style={{ textTransform: 'none', letterSpacing: '0', padding: '0.18rem 0.55rem' }}>GET /api/trainer/classes</span>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>
            <i className="fas fa-sync-alt"></i> Obnoviť
          </button>
        </div>
      </div>
      
      <div className="pb">
        {error && (
          <div style={{ background: 'rgba(255,45,85,0.1)', color: 'var(--red)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        <div className="search-bar">
          <input 
            className="fi" 
            type="text" 
            placeholder="Hľadaj podľa názvu alebo miesta..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select 
            className="fi" 
            style={{ maxWidth: '160px' }} 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Všetky</option>
            <option value="upcoming">Nadchádzajúce</option>
            <option value="past">Prebehnuté</option>
          </select>
        </div>

        {loading ? (
          <div className="empty-state">
            <span className="spinner"></span>
            <p>Načítavam tvoje lekcie...</p>
          </div>
        ) : sortedClasses.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>Lekcia</th>
                  <th>Čas</th>
                  <th>Miesto</th>
                  <th>Obsadenosť</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedClasses.map(c => {
                  const booked = c.booked || 0;
                  const cap = c.capacity || 0;
                  const pct = cap ? Math.round((booked / cap) * 100) : 0;
                  const bc = pct >= 90 ? 'var(--red)' : pct >= 60 ? 'var(--orange)' : 'var(--acid)';
                  const isPast = new Date(c.startTime) < now;

                  return (
                    <tr key={c.id}>
                      <td><b>{c.name || '—'}</b></td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        {new Date(c.startTime).toLocaleString('sk-SK', { weekday:'short', day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td><span className="badge b-grey">{c.location || '—'}</span></td>
                      <td>
                        <div className="occ-bar">
                          <div className="occ-track" style={{ width: '80px' }}>
                            <div className="occ-fill" style={{ width: `${pct}%`, background: bc }}></div>
                          </div>
                          <span style={{ fontSize: '0.73rem', color: 'var(--muted)', minWidth: 32 }}>
                            {booked}/{cap || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        {isPast ? (
                          <span className="badge b-grey">Prebehla</span>
                        ) : (
                          <span className="badge b-acid">Nadchádzajúca</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <i className="fas fa-calendar-times"></i>
            <p>Žiadne lekcie nezodpovedajú filtru</p>
          </div>
        )}
      </div>
    </div>
  );
}
