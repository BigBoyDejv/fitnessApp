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
        <span className="spinner" style={{ width: 32, height: 32 }}></span>
        <p>Načítavam tvoj prehľad...</p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {error && (
        <div className="fm err" style={{ marginBottom: '1.5rem' }}>
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {/* ── Trainer Hero Section ────────────────────────────────────────── */}
      <div className="overview-hero trainer">
        <div className="hero-content">
          <h1>Ahoj, tréner {user?.fullName?.split(' ')[0] || 'Šampión'}! 👋</h1>
          <p>Tvoji klienti sa na teba tešia. Dnes máš naplánovaných {totalClasses} lekcií.</p>
          <div className="hero-actions">
            <button className="btn btn-blue btn-sm" onClick={loadData}>
              <i className="fas fa-calendar-alt"></i> MÔJ ROZVRH
            </button>
            <button className="btn btn-ghost btn-sm">
              <i className="fas fa-plus-circle"></i> PRIDAŤ TRÉNING
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <i className="fas fa-dumbbell" />
        </div>
      </div>

      <div className="stat-row" style={{ background: 'transparent', gap: '1.2rem', marginBottom: '2rem' }}>
        <div className="kpi-card-v2 glass highlight blue" style={{ '--kpi-color': 'var(--blue)' }}>
          <div className="kpi-icon"><i className="fas fa-calendar-check"></i></div>
          <div className="kpi-val">{totalClasses}</div>
          <div className="kpi-lbl">Lekcie celkovo</div>
        </div>
        <div className="kpi-card-v2 glass highlight acid" style={{ '--kpi-color': 'var(--acid)' }}>
          <div className="kpi-icon"><i className="fas fa-users"></i></div>
          <div className="kpi-val">{totalClients}</div>
          <div className="kpi-lbl">Priradení klienti</div>
        </div>
        <div className="kpi-card-v2 glass highlight cyan" style={{ '--kpi-color': 'var(--acid2)' }}>
          <div className="kpi-icon"><i className="fas fa-user-check"></i></div>
          <div className="kpi-val">{totalBooked}</div>
          <div className="kpi-lbl">Prihlásení na lekcie</div>
        </div>
        <div className="kpi-card-v2 glass highlight orange" style={{ '--kpi-color': 'var(--orange)' }}>
          <div className="kpi-icon"><i className="fas fa-fire"></i></div>
          <div className="kpi-val">{hoursThisWeek.toFixed(1)}h</div>
          <div className="kpi-lbl">Hodín tento týždeň</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="ph">
            <span className="pt">Najbližšie lekcie</span>
            <button className="btn btn-ghost btn-xs" onClick={loadData}>
              OBNOVIŤ <i className="fas fa-sync-alt"></i>
            </button>
          </div>
          <div className="pb">
            {upcoming.length > 0 ? (
              upcoming.map((c, i) => {
                const pct = c.capacity ? Math.round(((c.booked || 0) / c.capacity) * 100) : 0;
                const bc = pct >= 90 ? 'var(--red)' : pct >= 60 ? 'var(--orange)' : 'var(--acid)';
                return (
                  <div key={i} style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '0.8rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <b style={{ fontSize: '0.92rem' }}>{c.name || '—'}</b>
                      <span className="badge b-grey" style={{ fontSize: '0.6rem' }}>{c.location || 'SÁLA 1'}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.6rem' }}>
                      <i className="far fa-clock" style={{ marginRight: '0.4rem' }}></i>
                      {new Date(c.startTime).toLocaleString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                      <div className="occ-track" style={{ flex: 1, height: "6px", background: "var(--border2)", borderRadius: "3px", overflow: 'hidden' }}>
                        <div className="occ-fill" style={{ width: `${pct}%`, background: bc, height: "100%", transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700, minWidth: '35px', textAlign: 'right' }}>
                        {c.booked || 0}/{c.capacity || '—'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <i className="fas fa-calendar-times" style={{ opacity: 0.1 }}></i>
                <p>Žiadne nadchádzajúce lekcie</p>
              </div>
            )}
          </div>
        </div>

        <div className="panel animate-in" style={{ animationDelay: '0.2s' }}>
          <div className="ph">
            <span className="pt">Aktívni klienti</span>
            <button className="btn btn-ghost btn-xs">DETAIL <i className="fas fa-chevron-right"></i></button>
          </div>
          <div className="pb">
            {clients.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                {clients.slice(0, 6).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,var(--blue),var(--acid2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900, fontSize: '0.75rem', color: '#000' }}>
                      {getInitials(c.fullName)}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.fullName || '—'}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <i className="fas fa-users" style={{ opacity: 0.1 }}></i>
                <p>Zatiaľ žiadni klienti</p>
              </div>
            )}
            {clients.length > 6 && (
              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1rem' }}>
                Zobrazených 6 z {clients.length} klientov
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
