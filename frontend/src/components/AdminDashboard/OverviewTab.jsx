import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function OverviewTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Parallel requests like in HTML
      const [resU, resCls, resMem, resRev] = await Promise.all([
        authenticatedFetch('/api/admin/profiles').catch(() => ({ ok: false, json: () => [] })),
        authenticatedFetch('/api/classes').catch(() => ({ ok: false, json: () => [] })),
        authenticatedFetch('/api/admin/stats/memberships').catch(() => ({ ok: false, json: () => ({}) })),
        authenticatedFetch('/api/admin/stats/revenue').catch(() => ({ ok: false, json: () => ({}) }))
      ]);

      const users = resU.ok ? await resU.json() : [];
      const classes = resCls.ok ? await resCls.json() : [];
      const memStats = resMem.ok ? await resMem.json() : {};
      const revStats = resRev.ok ? await resRev.json() : {};

      const usersArr = Array.isArray(users) ? users : [];
      const classesArr = Array.isArray(classes) ? classes : [];

      setData({
        users: usersArr,
        classes: classesArr,
        memStats,
        revStats
      });
    } catch (e) {
      setError(e.message || 'Chyba pri načítaní dát');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderRevenueChart = (monthly) => {
    const months = ['Aug', 'Sep', 'Okt', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const values = (monthly && monthly.length >= 8)
      ? monthly.slice(-8).map(m => m.total || 0)
      : [820, 940, 780, 1050, 1230, 890, 1100, monthly && monthly.length ? monthly[monthly.length - 1]?.total || 0 : 0];

    const maxV = Math.max(...values, 1);
    
    return (
      <>
        <div className="rev-chart">
          {values.map((v, i) => {
            const h = Math.max(6, (v / maxV) * 56);
            const isCurrent = i === values.length - 1;
            return (
              <div key={i} className="rev-bar" style={{ height: `${h}px`, background: isCurrent ? 'var(--orange)' : 'rgba(200,255,0,0.25)' }}>
                <div className="rev-tip">{months[i]}: {v} €</div>
              </div>
            );
          })}
        </div>
        <div className="rev-labels">
          {months.map((m, i) => <span key={i}>{m}</span>)}
        </div>
        {(!monthly || monthly.length === 0) && (
          <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
            * Zobrazené sú odhadované dáta (backend endpoint /api/admin/stats/revenue ešte nie je plne aktívny)
          </div>
        )}
      </>
    );
  };

  const renderMembershipBreakdown = (stats) => {
    if (!stats?.byType || !stats.byType.length) {
      return (
        <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
          <i className="fas fa-info-circle"></i> Backend endpoint /api/admin/stats/memberships nie je plne aktívny, alebo nie sú dáta.
        </div>
      );
    }
    const total = stats.totalActive || 1;
    return stats.byType.map((t, idx) => {
      const pct = Math.round((t.count / total) * 100);
      return (
        <div key={idx} style={{ marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
            <span>{t.name}</span>
            <span style={{ color: 'var(--acid)', fontFamily: 'var(--font-d)', fontSize: '0.95rem', fontWeight: 700 }}>{t.count}</span>
          </div>
          <div style={{ height: '4px', background: 'var(--border2)', borderRadius: '2px' }}>
            <div style={{ height: '4px', width: `${pct}%`, background: 'var(--acid)', borderRadius: '2px', transition: 'width 0.8s' }}></div>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.15rem' }}>{pct}% z aktívnych</div>
        </div>
      );
    });
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  const getUserStatusBadge = (u) => {
    if (u.active === false) return <span className="badge b-frozen"><i className="fas fa-snowflake"></i> Zmrazený</span>;
    return <span className="badge b-acid">Aktívny</span>;
  };

  if (loading) {
    return (
      <div className="empty-state">
        <span className="spinner" style={{width: 32, height: 32}}></span>
        <p>Načítavam Dashboard dáta...</p>
      </div>
    );
  }

  const { users, classes, memStats, revStats } = data || {};
  
  const totalProfiles = users?.length || 0;
  const frozenProfiles = users?.filter(u => u.active === false)?.length || 0;
  const recentUsers = users ? [...users].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 8) : [];

  return (
    <div>
      {error && (
        <div className="fm err" style={{ marginBottom: '1.5rem' }}>
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {/* KPI GRID */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--kpi-color': 'var(--acid2)' }}>
          <div className="kpi-icon"><i className="fas fa-users"></i></div>
          <div className="kpi-val">{totalProfiles}</div>
          <div className="kpi-lbl">Celkom profilov</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--acid)' }}>
          <div className="kpi-icon"><i className="fas fa-id-card"></i></div>
          <div className="kpi-val">{memStats?.totalActive || '—'}</div>
          <div className="kpi-lbl">Aktívne permanentky</div>
          <div className="kpi-sub">z {totalProfiles} profilov</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--orange)' }}>
          <div className="kpi-icon"><i className="fas fa-euro-sign"></i></div>
          <div className="kpi-val">{revStats?.currentMonth || 0} €</div>
          <div className="kpi-lbl">Obrat tento mesiac</div>
          <div className="kpi-sub">vs {revStats?.lastMonth || 0} € minulý mesiac</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--red)' }}>
          <div className="kpi-icon"><i className="fas fa-calendar-check"></i></div>
          <div className="kpi-val">{classes?.length || 0}</div>
          <div className="kpi-lbl">Lekcie celkovo</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--frozen)' }}>
          <div className="kpi-icon"><i class="fas fa-snowflake"></i></div>
          <div className="kpi-val">{frozenProfiles}</div>
          <div className="kpi-lbl">Zmrazené účty</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Revenue chart */}
        <div className="panel">
          <div className="ph">
            <span className="pt">Mesačný obrat (€)</span>
            <span className="method m-get" style={{ textTransform: 'none', letterSpacing: 0 }}>GET /api/admin/stats/revenue</span>
          </div>
          <div className="pb">
            {renderRevenueChart(revStats?.monthly)}
          </div>
        </div>
        
        {/* Membership breakdown */}
        <div className="panel">
          <div className="ph">
            <span className="pt">Permanentky podľa typu</span>
            <span className="method m-get" style={{ textTransform: 'none', letterSpacing: 0 }}>GET /api/admin/stats/memberships</span>
          </div>
          <div className="pb" style={{ minHeight: '150px' }}>
            {renderMembershipBreakdown(memStats)}
          </div>
        </div>
      </div>

      {/* Recent registrations */}
      <div className="panel">
        <div className="ph">
          <span className="pt">Nedávne registrácie</span>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>
            <i className="fas fa-sync-alt"></i> Obnoviť
          </button>
        </div>
        <div className="pb" style={{ overflowX: 'auto' }}>
          {recentUsers.length > 0 ? (
            <table className="dt">
              <thead>
                <tr>
                  <th>Meno</th>
                  <th>Email</th>
                  <th>Rola</th>
                  <th>Stav</th>
                  <th>Registrovaný</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => {
                  const roleCls = u.role === 'admin' ? 'b-red' : u.role === 'trainer' ? 'b-orange' : u.role === 'reception' ? 'b-blue' : 'b-grey';
                  return (
                    <tr key={u.id} className={u.active === false ? 'frozen-row' : ''}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--border2),var(--surface3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            {getUserInitials(u.fullName)}
                          </div>
                          <b>{u.fullName || '—'}</b>
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{u.email || '—'}</td>
                      <td><span className={`badge ${roleCls}`}>{u.role || '—'}</span></td>
                      <td>{getUserStatusBadge(u)}</td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('sk-SK') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>Žiadne nedávne registrácie</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
