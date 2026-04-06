import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { authenticatedFetch } from '../../utils/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Global Chart Defaults
ChartJS.defaults.color = '#6E6E73';
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.04)';
ChartJS.defaults.font.family = "'DM Sans', sans-serif";
ChartJS.defaults.font.size = 11;

const chartColors = {
  acid: '#C8FF00',
  acid2: '#00FFD1',
  red: '#FF2D55',
  orange: '#FF9500',
  blue: '#0A84FF',
  frozen: '#4FC3F7',
  purple: '#BF5AF2',
  pink: '#FF6B8A',
  teal: '#64FFDA',
  amber: '#FFC107'
};

const paletteArray = [
  chartColors.acid, chartColors.acid2, chartColors.orange, 
  chartColors.red, chartColors.blue, chartColors.frozen, 
  chartColors.purple, chartColors.pink, chartColors.teal, chartColors.amber
];

export default function StatsTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    dashboard: {},
    monthly: [],
    dailyRev: [],
    topProducts: [],
    byCategory: [],
    byPayment: [],
    memberships: [],
    checkinsHour: [],
    checkinsWeekday: [],
    checkinsDaily: []
  });

  const [filters, setFilters] = useState({
    monthlyMonths: 6,
    dailyDays: 30,
    productMonths: 1,
    checkinDays: 30,
    weekdayDays: 90
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchParams = [
        ['dashboard', '/api/admin/stats/dashboard'],
        ['monthly', `/api/admin/stats/reception/monthly?months=${filters.monthlyMonths}`],
        ['dailyRev', `/api/admin/stats/reception/daily?days=${filters.dailyDays}`],
        ['topProducts', `/api/admin/stats/reception/top-products?months=${filters.productMonths}`],
        ['byCategory', '/api/admin/stats/reception/by-category?months=3'],
        ['byPayment', '/api/admin/stats/reception/by-payment?months=3'],
        ['memberships', '/api/admin/stats/memberships'],
        ['checkinsHour', `/api/admin/stats/checkins/by-hour?days=${filters.checkinDays}`],
        ['checkinsWeekday', `/api/admin/stats/checkins/by-weekday?days=${filters.weekdayDays}`],
        ['checkinsDaily', `/api/admin/stats/checkins/daily?days=${filters.checkinDays}`]
      ];

      const results = await Promise.all(
        fetchParams.map(([key, url]) => 
          authenticatedFetch(url)
            .then(res => res.ok ? res.json() : (Array.isArray(data[key]) ? [] : {}))
            .catch(() => (Array.isArray(data[key]) ? [] : {}))
        )
      );

      const newData = {};
      fetchParams.forEach(([key], index) => {
        newData[key] = results[index];
      });

      setData(newData);
    } catch (e) {
      console.error('Stats loading error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const renderDelta = (current = 0, previous = 0) => {
    if (previous === 0 && current === 0) return <div className="sh-delta neutral">— rovnaké</div>;
    if (previous === 0) return <div className="sh-delta up"><i className="fas fa-arrow-up"></i> nové</div>;
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct > 0) return <div className="sh-delta up"><i className="fas fa-arrow-up"></i> +{pct}% vs minulý mes.</div>;
    if (pct < 0) return <div className="sh-delta down"><i className="fas fa-arrow-down"></i> {pct}% vs minulý mes.</div>;
    return <div className="sh-delta neutral">— rovnaké</div>;
  };

  // 1. Monthly Revenue Chart Config
  const monthlyChartData = {
    labels: data.monthly.map(d => d.label || `${d.month}/${d.year}`),
    datasets: [
      {
        label: 'Obrat Recepcia',
        data: data.monthly.map(d => d.totalRevenueEuros),
        backgroundColor: 'rgba(255, 149, 0, 0.7)',
        borderColor: chartColors.orange,
        borderWidth: 1,
        borderRadius: 3,
      }
    ]
  };

  // 2. Daily Revenue Chart Config
  const dailyRevData = {
    labels: data.dailyRev.map(d => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' });
    }),
    datasets: [{
      label: 'Denné tržby',
      data: data.dailyRev.map(d => d.totalRevenueEuros),
      borderColor: chartColors.acid,
      backgroundColor: 'rgba(200, 255, 0, 0.08)',
      fill: true,
      tension: 0.4,
      pointRadius: filters.dailyDays <= 14 ? 4 : 2,
    }]
  };

  // 3. Category Data
  const catChartData = {
    labels: data.byCategory.map(d => d.category),
    datasets: [{
      data: data.byCategory.map(d => d.totalRevenueEuros),
      backgroundColor: paletteArray.slice(0, data.byCategory.length),
      borderColor: '#0F0F11',
      borderWidth: 2
    }]
  };

  // 4. Payment Data
  const paymentChartData = {
    labels: data.byPayment.map(d => {
      const map = { cash: 'Hotovosť', card: 'Karta', membership_credit: 'Kredit' };
      return map[d.paymentMethod] || d.paymentMethod;
    }),
    datasets: [{
      data: data.byPayment.map(d => d.totalRevenueEuros),
      backgroundColor: [chartColors.acid, chartColors.blue, chartColors.orange, chartColors.red],
      borderColor: '#0F0F11',
      borderWidth: 2
    }]
  };

  // 5. Checkins Hourly
  const hourChartData = {
    labels: data.checkinsHour.map(d => d.label),
    datasets: [{
      label: 'Vstupy',
      data: data.checkinsHour.map(d => d.count),
      backgroundColor: 'rgba(10, 132, 255, 0.6)',
      borderRadius: 2,
    }]
  };

  // 6. Checkins Daily Trend
  const checkinTrendData = {
    labels: data.checkinsDaily.map(d => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' });
    }),
    datasets: [{
      label: 'Vstupy za deň',
      data: data.checkinsDaily.map(d => d.count),
      borderColor: chartColors.red,
      backgroundColor: 'rgba(255, 45, 85, 0.06)',
      fill: true,
      tension: 0.35,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(30, 30, 33, 0.9)',
        titleColor: '#fff',
        bodyColor: '#eee',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } }
    }
  };

  const donutOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: { display: true, position: 'bottom', labels: { boxWidth: 8, padding: 15, font: { size: 10 } } }
    },
    scales: { x: { display: false }, y: { display: false } },
    cutout: '70%'
  };

  const dash = data.dashboard || {};

  return (
    <div className="animate-in">
      <div className="dashboard-grid" style={{ marginBottom: "2.5rem", gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0s' }}>
           <div className="kpi-icon-v2" style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--acid)' }}><i className="fas fa-euro-sign"></i></div>
           <div className="kpi-content-v2">
              <div className="kpi-label-v2">CELKOVÝ OBRAT <span style={{fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 400, marginLeft: '0.5rem'}}>MESIAC</span></div>
              <div className="kpi-value-v2">{(dash.totalRevenueThisMonth || 0).toFixed(0)} <span style={{fontSize: '1.2rem'}}>€</span></div>
              {renderDelta(dash.totalRevenueThisMonth, dash.totalRevenueLastMonth)}
           </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.05s' }}>
           <div className="kpi-icon-v2" style={{ background: 'rgba(255,149,0,0.1)', color: 'var(--orange)' }}><i className="fas fa-cash-register"></i></div>
           <div className="kpi-content-v2">
              <div className="kpi-label-v2">TRŽBY RECEPCIA</div>
              <div className="kpi-value-v2">{(dash.receptionRevenueThisMonth || 0).toFixed(0)} <span style={{fontSize: '1.2rem'}}>€</span></div>
              {renderDelta(dash.receptionRevenueThisMonth, dash.receptionRevenueLastMonth)}
           </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.1s' }}>
           <div className="kpi-icon-v2" style={{ background: 'rgba(10,132,255,0.1)', color: 'var(--blue)' }}><i className="fas fa-id-card"></i></div>
           <div className="kpi-content-v2">
              <div className="kpi-label-v2">TRŽBY PERMANENTKY</div>
              <div className="kpi-value-v2">{(dash.membershipRevenueThisMonth || 0).toFixed(0)} <span style={{fontSize: '1.2rem'}}>€</span></div>
              {renderDelta(dash.membershipRevenueThisMonth, dash.membershipRevenueLastMonth)}
           </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.15s' }}>
           <div className="kpi-icon-v2" style={{ background: 'rgba(255,45,85,0.1)', color: 'var(--red)' }}><i className="fas fa-walking"></i></div>
           <div className="kpi-content-v2">
              <div className="kpi-label-v2">NÁVŠTEVNOSŤ</div>
              <div className="kpi-value-v2">{dash.checkinsThisMonth || 0} <span style={{fontSize: '1.2rem', fontWeight: 600}}>VSTUPOV</span></div>
              {renderDelta(dash.checkinsThisMonth, dash.checkinsLastMonth)}
           </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="panel animate-in" style={{ animationDelay: '0.2s', border: '1px solid var(--border)' }}>
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(255,149,0,0.1)', color: 'var(--orange)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-chart-bar"></i>
              </div>
              <span className="pt">Recepcia: Mesačný obrat</span>
            </div>
            <div className="stats-filter" style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: '10px' }}>
              <button 
                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: filters.monthlyMonths === 6 ? 'var(--orange)' : 'transparent', color: filters.monthlyMonths === 6 ? '#000' : 'var(--muted)' }} 
                onClick={() => setFilters(f => ({...f, monthlyMonths: 6}))}
              >6 MESIACOV</button>
              <button 
                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: filters.monthlyMonths === 12 ? 'var(--orange)' : 'transparent', color: filters.monthlyMonths === 12 ? '#000' : 'var(--muted)' }} 
                onClick={() => setFilters(f => ({...f, monthlyMonths: 12}))}
              >ROK</button>
            </div>
          </div>
          <div className="pb" style={{ padding: '2rem' }}>
            <div style={{ height: 280 }}>
              <Bar data={monthlyChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="panel animate-in" style={{ animationDelay: '0.25s', border: '1px solid var(--border)' }}>
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(200,255,0,0.1)', color: 'var(--acid)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-chart-line"></i>
              </div>
              <span className="pt">Denné tržby: Trend</span>
            </div>
            <div className="stats-filter" style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: '10px' }}>
              <button 
                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: filters.dailyDays === 7 ? 'var(--acid)' : 'transparent', color: filters.dailyDays === 7 ? '#000' : 'var(--muted)' }} 
                onClick={() => setFilters(f => ({...f, dailyDays: 7}))}
              >TÝŽDEŇ</button>
              <button 
                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: filters.dailyDays === 30 ? 'var(--acid)' : 'transparent', color: filters.dailyDays === 30 ? '#000' : 'var(--muted)' }} 
                onClick={() => setFilters(f => ({...f, dailyDays: 30}))}
              >MESIAC</button>
            </div>
          </div>
          <div className="pb" style={{ padding: '2rem' }}>
            <div style={{ height: 280 }}>
              <Line data={dailyRevData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="panel animate-in" style={{ animationDelay: '0.3s' }}>
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)', color: 'var(--text)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-trophy"></i>
              </div>
              <span className="pt">TOP PRODUKTY</span>
            </div>
          </div>
          <div className="pb" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {data.topProducts.slice(0, 8).map((p, i) => {
                const maxVal = Math.max(...data.topProducts.map(x => x.totalQuantity), 1);
                const pct = (p.totalQuantity / maxVal) * 100;
                return (
                  <div key={i} style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    padding: '0.8rem 1.2rem', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', left: 0, bottom: 0, height: '3px', background: paletteArray[i%paletteArray.length], width: `${pct}%`, opacity: 0.4 }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontFamily: 'var(--font-d)', fontWeight: 900, color: i < 3 ? 'var(--acid)' : 'var(--muted)', fontSize: i < 3 ? '1.2rem' : '0.9rem' }}>{i + 1}</span>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{p.productName}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{p.totalQuantity} PREDANÝCH</div>
                          </div>
                       </div>
                       <div style={{ fontFamily: 'var(--font-d)', fontWeight: 950, color: 'var(--blue)' }}>{p.totalRevenueEuros.toFixed(2)} €</div>
                    </div>
                  </div>
                );
              })}
              {data.topProducts.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.2 }}>
                  <i className="fas fa-box-open" style={{fontSize: '3rem', marginBottom: '1rem'}}></i>
                  <p>Žiadne predaje produktov</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel animate-in" style={{ animationDelay: '0.35s' }}>
          <div className="ph"><span className="pt">OBRAT PODĽA KATEGÓRIÍ</span></div>
          <div className="pb" style={{ padding: '2rem' }}>
            <div style={{ height: 320 }}>
              <Doughnut data={catChartData} options={donutOptions} />
            </div>
          </div>
        </div>

        <div className="panel animate-in" style={{ animationDelay: '0.4s' }}>
          <div className="ph"><span className="pt">PLATOBNÉ METÓDY</span></div>
          <div className="pb" style={{ padding: '2rem' }}>
            <div style={{ height: 320 }}>
              <Doughnut data={paymentChartData} options={donutOptions} />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
         <div className="panel animate-in" style={{ animationDelay: '0.45s' }}>
            <div className="ph">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ width: 32, height: 32, background: 'rgba(10,132,255,0.1)', color: 'var(--blue)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-clock"></i>
                </div>
                <span className="pt">Vstupy podľa hodín dňa</span>
              </div>
            </div>
            <div className="pb" style={{ padding: '2rem' }}>
               <div style={{ height: 250 }}>
                  <Bar data={hourChartData} options={chartOptions} />
               </div>
            </div>
         </div>
         <div className="panel animate-in" style={{ animationDelay: '0.5s' }}>
            <div className="ph">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ width: 32, height: 32, background: 'rgba(255,45,85,0.1)', color: 'var(--red)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-users-cog"></i>
                </div>
                <span className="pt">Trend návštevnosti: 30 Dní</span>
              </div>
            </div>
            <div className="pb" style={{ padding: '2rem' }}>
               <div style={{ height: 250 }}>
                  <Line data={checkinTrendData} options={chartOptions} />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
