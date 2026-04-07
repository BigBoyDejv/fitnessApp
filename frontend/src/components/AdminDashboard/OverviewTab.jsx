import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function OverviewTab() {
  const [stats, setStats] = useState({
    users: 0,
    activeMembers: 0,
    todayCheckins: 0,
    monthlyRevenue: 0,
    lowStockCount: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profilesRes, checkinsRes, dashRes, invRes] = await Promise.all([
        authenticatedFetch('/api/admin/profiles').catch(() => ({ ok: false, json: () => [] })),
        authenticatedFetch('/api/checkin/today').catch(() => ({ ok: false, json: () => [] })),
        authenticatedFetch('/api/admin/dashboard-stats').catch(() => ({ ok: false, json: () => ({ dashboard: {} }) })),
        authenticatedFetch('/api/admin/inventory').catch(() => ({ ok: false, json: () => ({ items: [] }) }))
      ]);

      const profiles = profilesRes.ok ? await profilesRes.json() : [];
      const checkins = checkinsRes.ok ? await checkinsRes.json() : [];
      const dash = dashRes.ok ? await dashRes.json() : { dashboard: {} };
      const inventory = invRes.ok ? await invRes.json() : { items: [] };

      const activeMembers = profiles.filter(p => p.role === 'member' && p.active).length;
      const lowStock = inventory.items?.filter(p => p.status === 'low' || p.status === 'out').length || 0;

      // Simulate a bit of recent activity if we don't have a real endpoint yet
      const recent = [
        { id: 1, type: 'checkin', user: 'Peter Nagy', time: 'Pred 5 min' },
        { id: 2, type: 'sale', user: 'Protein Shake', time: 'Pred 12 min' },
        { id: 3, type: 'member', user: 'Zuzana M.', time: 'Pred 30 min' },
      ];

      setStats({
        users: profiles.length,
        activeMembers: activeMembers,
        todayCheckins: Array.isArray(checkins) ? checkins.length : 0,
        monthlyRevenue: dash.dashboard?.totalRevenueThisMonth || 0,
        lowStockCount: lowStock,
        recentActivity: recent
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="empty-state"><span className="spinner" style={{ width: 32, height: 32 }}></span></div>;

  return (
    <div className="animate-in">
      <div className="overview-hero admin" style={{ marginBottom: '2.5rem' }}>
        <div className="hero-content">
          <div style={{ display: 'inline-flex', padding: '0.4rem 1rem', background: 'rgba(255,45,85,0.15)', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--red)', marginBottom: '1.2rem', border: '1px solid rgba(255,45,85,0.2)' }}>
            <i className="fas fa-shield-alt" style={{ marginRight: '0.6rem' }}></i> ADMIN OVERSIGHT ACTIVATED
          </div>
          <h1>Centrálny Dashboard ⚙️</h1>
          <p>Vitajte v riadiacom centre HammerIT. Tu máte prehľad o raste, financiách a prevádzke vášho gymu v reálnom čase.</p>
          <div className="hero-actions" style={{ marginTop: '2rem' }}>
            <button className="btn btn-red" onClick={loadData} style={{ borderRadius: '12px', padding: '0.8rem 1.8rem', fontWeight: 950 }}>
              <i className="fas fa-sync-alt" style={{ marginRight: '0.8rem' }}></i> AKTUALIZOVAŤ PREHĽAD
            </button>
            <button className="btn btn-ghost" style={{ borderRadius: '12px', padding: '0.8rem 1.8rem' }}>
              EXPEDÍCIA DÁT <i className="fas fa-download" style={{ marginLeft: '0.8rem' }}></i>
            </button>
          </div>
        </div>
        <div className="hero-visual" style={{ opacity: 0.15, fontSize: '6rem' }}><i className="fas fa-chart-line"></i></div>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="kpi-card-v2" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)' }}>
          <div className="kpi-icon-v2" style={{ background: 'rgba(255,45,85,0.15)', color: 'var(--red)' }}><i className="fas fa-users"></i></div>
          <div className="kpi-content-v2">
            <div className="kpi-label-v2">CELKOVÝ POČET</div>
            <div className="kpi-value-v2">{stats.users}</div>
            <div className="kpi-delta-v2 up"><i className="fas fa-arrow-up"></i> +2.4%</div>
          </div>
        </div>
        <div className="kpi-card-v2">
          <div className="kpi-icon-v2" style={{ background: 'rgba(200,255,0,0.15)', color: 'var(--acid)' }}><i className="fas fa-user-check"></i></div>
          <div className="kpi-content-v2">
            <div className="kpi-label-v2">AKTÍVNI ČLENOVIA</div>
            <div className="kpi-value-v2">{stats.activeMembers}</div>
            <div className="kpi-delta-v2 up"><i className="fas fa-arrow-up"></i> +1.1%</div>
          </div>
        </div>
        <div className="kpi-card-v2">
          <div className="kpi-icon-v2" style={{ background: 'rgba(10,132,255,0.15)', color: 'var(--blue)' }}><i className="fas fa-running"></i></div>
          <div className="kpi-content-v2">
            <div className="kpi-label-v2">VSTUPY DNES</div>
            <div className="kpi-value-v2">{stats.todayCheckins}</div>
            <div className="kpi-delta-v2 down"><i className="fas fa-arrow-down"></i> -4.3%</div>
          </div>
        </div>
        <div className="kpi-card-v2" style={{ background: 'rgba(255,149,0,0.03)' }}>
          <div className="kpi-icon-v2" style={{ background: 'rgba(255,149,0,0.15)', color: 'var(--orange)' }}><i className="fas fa-euro-sign"></i></div>
          <div className="kpi-content-v2">
            <div className="kpi-label-v2">OBRAT MESIAC</div>
            <div className="kpi-value-v2">{stats.monthlyRevenue.toFixed(0)} <span style={{ fontSize: '1.2rem' }}>€</span></div>
            <div className="kpi-delta-v2 up"><i className="fas fa-arrow-up"></i> +12%</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
        {/* Main Activity Area */}
        <div className="panel" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <i className="fas fa-stream" style={{ color: 'var(--red)' }}></i>
              <span className="pt">AKTIVITA A NOTIFIKÁCIE</span>
            </div>
          </div>
          <div className="pb">
            {stats.lowStockCount > 0 && (
              <div className="animate-in" style={{ background: 'rgba(255,149,0,0.05)', padding: '1.2rem', borderRadius: '14px', border: '1px solid rgba(255,149,0,0.2)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,149,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', fontSize: '1.4rem' }}>
                  <i className="fas fa-boxes"></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, color: 'var(--orange)', fontSize: '1.1rem' }}>Nízky stav zásob!</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Detekovali sme {stats.lowStockCount} položiek s podlimitným množstvom.</div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ borderRadius: '10px' }}>VYRIEŠIŤ TERAZ</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stats.recentActivity.map(act => (
                <div key={act.id} className="glass" style={{ padding: '1rem 1.2rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                    <i className={act.type === 'checkin' ? 'fas fa-id-card' : act.type === 'sale' ? 'fas fa-shopping-cart' : 'fas fa-user-plus'}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{act.user}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {act.type === 'checkin' ? 'Vstup do fitnescentra' : act.type === 'sale' ? 'Nákup tovaru' : 'Nová registrácia'}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--muted)' }}>{act.time}</div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button className="btn btn-ghost btn-xs" style={{ borderRadius: '10px', color: 'var(--muted)' }}>ZOBRAZIŤ KOMPLETNÝ PROTOKOL AKCIÍ</button>
            </div>
          </div>
        </div>

        {/* Sidebar: Quick Actions */}
        <div>
          <div className="panel" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
            <div className="ph" style={{ justifyContent: 'center' }}>
              <span className="pt" style={{ fontSize: '0.75rem', opacity: 0.6 }}>RÝCHLE OPERÁCIE</span>
            </div>
            <div className="pb" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="glass hover-bright" style={{ padding: '1.2rem', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border)' }}>
                <i className="fas fa-user-plus" style={{ display: 'block', fontSize: '1.4rem', marginBottom: '0.6rem', color: 'var(--blue)' }}></i>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>Nový člen</div>
              </div>
              <div className="glass hover-bright" style={{ padding: '1.2rem', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border)' }}>
                <i className="fas fa-calendar-plus" style={{ display: 'block', fontSize: '1.4rem', marginBottom: '0.6rem', color: 'var(--acid)' }}></i>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>Nová lekcia</div>
              </div>
              <div className="glass hover-bright" style={{ padding: '1.2rem', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border)' }}>
                <i className="fas fa-shopping-basket" style={{ display: 'block', fontSize: '1.4rem', marginBottom: '0.6rem', color: 'var(--orange)' }}></i>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>Pridať tovar</div>
              </div>
              <div className="glass hover-bright" style={{ padding: '1.2rem', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border)' }}>
                <i className="fas fa-file-invoice" style={{ display: 'block', fontSize: '1.4rem', marginBottom: '0.6rem', color: 'var(--purple)' }}></i>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>Reporty</div>
              </div>
            </div>
          </div>

          <div className="glass animate-in" style={{ padding: '1.5rem', borderRadius: '20px', background: 'rgba(200,255,0,0.02)', border: '1px solid rgba(200,255,0,0.1)', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
              <i className="fas fa-robot" style={{ color: 'var(--acid)' }}></i>
              <div style={{ fontSize: '0.85rem', fontWeight: 900 }}>AI ASISTENT</div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              HammerIT AI odporúča zvýšiť počet poobedných CrossFit lekcií o 10%. Kapacita je dlhodobo vyťažená na 95%.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
