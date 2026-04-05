// ─── StatsTab.jsx ──────────────────────────────────────────────────────────────
// Oprava: var(--cyan) neexistuje → var(--acid2)

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  Title, Tooltip, Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);
ChartJS.defaults.color        = '#6E6E73';
ChartJS.defaults.borderColor  = 'rgba(255,255,255,0.05)';
ChartJS.defaults.font.family  = "'DM Sans', sans-serif";

export function StatsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authenticatedFetch('/api/stats/my')
      .then(r => r.ok ? r.json() : Promise.reject('not ok'))
      .then(d => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const barData = {
    labels: ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'],
    datasets: [{
      label: 'Návštevy',
      data: [8, 5, 9, 4, 7, 3, 1],
      backgroundColor: ['rgba(200,255,0,0.85)', 'rgba(200,255,0,0.45)', 'rgba(200,255,0,0.85)', 'rgba(200,255,0,0.45)', 'rgba(200,255,0,0.85)', 'rgba(200,255,0,0.3)', 'rgba(200,255,0,0.2)'],
      borderRadius: 4,
      borderSkipped: false,
    }]
  };

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 2 } } }
  };

  const pieData = {
    labels: ['CrossFit', 'HIIT', 'Boxing', 'Joga', 'Body Pump'],
    datasets: [{
      data: [12, 8, 5, 3, 2],
      backgroundColor: ['#C8FF00', '#00FFD1', '#FF2D55', '#FF9500', '#0A84FF'],
      borderColor: '#111111',
      borderWidth: 3,
      hoverOffset: 8
    }]
  };

  const pieOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '60%',
    plugins: { legend: { position: 'right', labels: { font: { size: 11 }, padding: 12 } } }
  };

  const statItems = [
    { icon: 'fas fa-calendar-check', val: stats?.totalBookings || 0, lbl: 'Celkovo lekcií', color: 'var(--acid)' },
    { icon: 'fas fa-fire', val: stats?.streakDays || 0, lbl: 'Aktuálny streak', color: 'var(--orange)' },
    { icon: 'fas fa-clock', val: stats?.totalHours ? `${Math.round(stats.totalHours)}h` : '0h', lbl: 'Hodín celkovo', color: 'var(--acid2)' },
    { icon: 'fas fa-times-circle', val: stats?.noShows || 0, lbl: 'No-show', color: 'var(--red)' },
  ];

  return (
    <div className="ps active" id="pg-stats">
      {/* KPI row */}
      <div className="stats-kpi-row">
        {statItems.map(({ val, lbl, color }) => (
          <div key={lbl} className="stats-kpi-card">
            <div className="stats-kpi-val" style={{ color }}>{val}</div>
            <div className="stats-kpi-lbl">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="stats-chart-grid">
        <div className="panel">
          <div className="ph"><span className="pt">Aktivita podľa dňa</span></div>
          <div className="pb">
            <div className="chart-panel-inner">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="ph"><span className="pt">Obľúbené lekcie</span></div>
          <div className="pb">
            <div className="chart-panel-inner">
              <Doughnut data={pieData} options={pieOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Structured API Data Panel */}
      <div className="panel">
        <div className="ph"><span className="pt">Podrobné štatistiky účtu</span></div>
        <div className="pb" style={{ padding: '1.2rem' }}>
          {loading ? (
            <div className="empty" style={{ padding: '2rem' }}><span className="spin" /></div>
          ) : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="wd-mini-stat">
                <div className="wd-mini-val">{stats.totalCheckins}</div>
                <div className="wd-mini-lbl">Počet prihlásení</div>
              </div>
              <div className="wd-mini-stat">
                <div className="wd-mini-val">{stats.totalBookings}</div>
                <div className="wd-mini-lbl">Rezervované lekcie</div>
              </div>
              <div className="wd-mini-stat">
                <div className="wd-mini-val">{stats.streakDays}</div>
                <div className="wd-mini-lbl">Dni v rade (Streak)</div>
              </div>
              <div className="wd-mini-stat">
                <div className="wd-mini-val">{Math.round(stats.totalHours)} h</div>
                <div className="wd-mini-lbl">Odtrénované hodiny</div>
              </div>
            </div>
          ) : (
            <div className="empty">❌ Nepodarilo sa načítať štatistiky z API.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatsTab;