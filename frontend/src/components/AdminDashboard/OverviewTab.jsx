import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function OverviewTab() {
  const [stats, setStats] = useState({
    users: 0,
    activeMembers: 0,
    todayCheckins: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profilesRes, checkinsRes, dashRes] = await Promise.all([
        authenticatedFetch('/api/admin/profiles').catch(() => ({ ok: false, json: () => [] })),
        authenticatedFetch('/api/checkin/today').catch(() => ({ ok: false, json: () => [] })),
        authenticatedFetch('/api/admin/dashboard-stats').catch(() => ({ ok: false, json: () => ({ dashboard: {} }) }))
      ]);

      const profiles = profilesRes.ok ? await profilesRes.json() : [];
      const checkins = checkinsRes.ok ? await checkinsRes.json() : [];
      const dash = dashRes.ok ? await dashRes.json() : { dashboard: {} };

      const activeMembers = profiles.filter(p => p.role === 'member' && p.active).length;

      setStats({
        users: profiles.length,
        activeMembers: activeMembers,
        todayCheckins: Array.isArray(checkins) ? checkins.length : 0,
        monthlyRevenue: dash.dashboard?.totalRevenueThisMonth || 0
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="empty-state"><span className="spinner" style={{width: 32, height: 32}}></span></div>;

  return (
    <div className="animate-in">
      <div className="overview-hero admin">
        <div className="hero-content">
          <h1>Vitajte v administrácii! ⚙️</h1>
          <p>Tu máte prehľad o celom fitnescentre. Všetko pod kontrolou na jednom mieste.</p>
          <div className="hero-actions">
            <button className="btn btn-red btn-sm" onClick={loadData}>
              <i className="fas fa-sync-alt"></i> OBNOVIŤ DÁTA
            </button>
          </div>
        </div>
        <div className="hero-visual"><i className="fas fa-unlock-alt"></i></div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '2.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0s' }}>
          <div className="kpi-icon-v2" style={{ background: 'rgba(255,45,85,0.1)', color: 'var(--red)' }}><i className="fas fa-users-cog"></i></div>
          <div className="kpi-content-v2">
            <div className="kpi-label-v2">POČET POUŽÍVATEĽOV</div>
            <div className="kpi-value-v2">{stats.users}</div>
          </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.05s' }}>
          <div className="kpi-icon-v2" style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--acid)' }}><i className="fas fa-user-check"></i></div>
          <div className="kpi-content-v2">
            <div className="kpi-label-v2">AKTÍVNI ČLENOVIA</div>
            <div className="kpi-value-v2">{stats.activeMembers}</div>
          </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="kpi-icon-v2" style={{ background: 'rgba(10,132,255,0.1)', color: 'var(--blue)' }}><i className="fas fa-walking"></i></div>
          <div className="kpi-content-v2">
            <div className="kpi-label-v2">VSTUPY DNES</div>
            <div className="kpi-value-v2">{stats.todayCheckins}</div>
          </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.15s' }}>
          <div className="kpi-icon-v2" style={{ background: 'rgba(255,149,0,0.1)', color: 'var(--orange)' }}><i className="fas fa-euro-sign"></i></div>
          <div className="kpi-content-v2">
            <div className="kpi-label-v2">OBRAT MESIAC</div>
            <div className="kpi-value-v2">{stats.monthlyRevenue.toFixed(0)} €</div>
          </div>
        </div>
      </div>
    </div>
  );
}
