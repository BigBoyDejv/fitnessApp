import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function OverviewTab({ user }) {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [resCls, resCli] = await Promise.all([
        authenticatedFetch('/api/trainer/classes').catch(() => ({ ok: false, json: () => [] })),
        authenticatedFetch('/api/trainer/clients').catch(() => ({ ok: false, json: () => [] }))
      ]);

      const dataCls = resCls.ok ? await resCls.json() : [];
      const dataCli = resCli.ok ? await resCli.json() : [];

      setClasses(Array.isArray(dataCls) ? dataCls : []);
      setClients(Array.isArray(dataCli) ? dataCli : []);
    } catch (e) {
      setError(e.message || 'Nepodarilo sa načítať dáta z API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalClasses = classes.length;
  const totalClients = clients.length;
  const totalBooked = classes.reduce((sum, c) => sum + (c.booked || 0), 0);

  // Hours this week
  const now = new Date();
  const mon = new Date(now); 
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); 
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon); 
  sun.setDate(mon.getDate() + 7);

  const thisWeekClasses = classes.filter(c => {
    const d = new Date(c.startTime);
    return d >= mon && d < sun;
  });
  const hoursThisWeek = thisWeekClasses.reduce((sum, c) => sum + (c.durationMinutes || 60) / 60, 0);

  // Upcoming
  const upcoming = [...classes]
    .filter(c => new Date(c.startTime) >= now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 5);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="empty-state">
        <span className="spinner" style={{width: 32, height: 32}}></span>
        <p>Načítavam tvoj prehľad...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ background: 'rgba(255,45,85,0.1)', color: 'var(--red)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--kpi-color': 'var(--blue)' }}>
          <div className="kpi-icon"><i className="fas fa-calendar-check"></i></div>
          <div className="kpi-val">{totalClasses}</div>
          <div className="kpi-lbl">Lekcie celkovo</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--acid)' }}>
          <div className="kpi-icon"><i className="fas fa-users"></i></div>
          <div className="kpi-val">{totalClients}</div>
          <div className="kpi-lbl">Priradení klienti</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--acid2)' }}>
          <div className="kpi-icon"><i className="fas fa-user-check"></i></div>
          <div className="kpi-val">{totalBooked}</div>
          <div className="kpi-lbl">Prihlásení na lekcie</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--orange)' }}>
          <div className="kpi-icon"><i className="fas fa-fire"></i></div>
          <div className="kpi-val">{hoursThisWeek.toFixed(1)}h</div>
          <div className="kpi-lbl">Hodín tento týždeň</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="ph">
            <span className="pt">Najbližšie lekcie</span>
            <button className="btn btn-ghost btn-sm" onClick={loadData}>
              <i className="fas fa-sync-alt"></i> Obnoviť
            </button>
          </div>
          <div className="pb">
            {upcoming.length > 0 ? (
              upcoming.map((c, i) => {
                const pct = c.capacity ? Math.round(((c.booked || 0) / c.capacity) * 100) : 0;
                const bc = pct >= 90 ? 'var(--red)' : pct >= 60 ? 'var(--orange)' : 'var(--acid)';
                return (
                  <div key={i} style={{ padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <b style={{ fontSize: '0.87rem' }}>{c.name || '—'}</b>
                      <span className="badge b-grey" style={{ fontSize: '0.6rem' }}>{c.location || '—'}</span>
                    </div>
                    <div style={{ fontSize: '0.77rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>
                      {new Date(c.startTime).toLocaleString('sk-SK', { weekday:'short', day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </div>
                    <div className="occ-bar">
                      <div className="occ-track">
                        <div className="occ-fill" style={{ width: `${pct}%`, background: bc }}></div>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', minWidth: 36, textAlign: 'right' }}>
                        {c.booked || 0}/{c.capacity || '—'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <i className="fas fa-calendar-times"></i>
                <p>Žiadne nadchádzajúce lekcie</p>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="ph"><span className="pt">Moji klienti (Náhľad)</span></div>
          <div className="pb">
            {clients.length > 0 ? (
              clients.slice(0, 6).map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1rem', border: '1px solid var(--border)', borderRadius: 4, marginBottom: '0.6rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--border2),var(--surface3))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold' }}>
                     {getInitials(c.fullName)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{c.fullName || '—'}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>{c.email || '—'}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <i className="fas fa-users"></i>
                <p>Zatiaľ žiadni klienti</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
