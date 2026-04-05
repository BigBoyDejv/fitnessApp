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
    <div className="stats-tab-content">
      <div className="stats-hero">
        <div className="sh-card" style={{ '--sh-accent': chartColors.acid }}>
          <div className="sh-icon"><i className="fas fa-euro-sign"></i></div>
          <div className="sh-val">{(dash.totalRevenueThisMonth || 0).toFixed(2)} €</div>
          <div className="sh-lbl">Celkový obrat tento mesiac</div>
          {renderDelta(dash.totalRevenueThisMonth, dash.totalRevenueLastMonth)}
        </div>
        <div className="sh-card" style={{ '--sh-accent': chartColors.orange }}>
          <div className="sh-icon"><i className="fas fa-cash-register"></i></div>
          <div className="sh-val">{(dash.receptionRevenueThisMonth || 0).toFixed(2)} €</div>
          <div className="sh-lbl">Tržby recepcia</div>
          {renderDelta(dash.receptionRevenueThisMonth, dash.receptionRevenueLastMonth)}
        </div>
        <div className="sh-card" style={{ '--sh-accent': chartColors.acid2 }}>
          <div className="sh-icon"><i className="fas fa-id-card"></i></div>
          <div className="sh-val">{(dash.membershipRevenueThisMonth || 0).toFixed(2)} €</div>
          <div className="sh-lbl">Tržby permanentky</div>
          {renderDelta(dash.membershipRevenueThisMonth, dash.membershipRevenueLastMonth)}
        </div>
        <div className="sh-card" style={{ '--sh-accent': chartColors.red }}>
          <div className="sh-icon"><i className="fas fa-walking"></i></div>
          <div className="sh-val">{dash.checkinsThisMonth || 0}</div>
          <div className="sh-lbl">Check-iny tento mesiac</div>
          {renderDelta(dash.checkinsThisMonth, dash.checkinsLastMonth)}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="ph">
            <span className="pt">Mesačné tržby (Recepcia)</span>
            <div className="stats-filter">
              <button className={filters.monthlyMonths === 6 ? 'active' : ''} onClick={() => setFilters(f => ({...f, monthlyMonths: 6}))}>6M</button>
              <button className={filters.monthlyMonths === 12 ? 'active' : ''} onClick={() => setFilters(f => ({...f, monthlyMonths: 12}))}>12M</button>
            </div>
          </div>
          <div className="pb">
            <div className="chart-wrap" style={{height: 250}}>
              <Bar data={monthlyChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <span className="pt">Trend denných tržieb</span>
            <div className="stats-filter">
              <button className={filters.dailyDays === 7 ? 'active' : ''} onClick={() => setFilters(f => ({...f, dailyDays: 7}))}>7D</button>
              <button className={filters.dailyDays === 30 ? 'active' : ''} onClick={() => setFilters(f => ({...f, dailyDays: 30}))}>30D</button>
            </div>
          </div>
          <div className="pb">
            <div className="chart-wrap" style={{height: 250}}>
              <Line data={dailyRevData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid-3">
        <div className="panel">
          <div className="ph"><span className="pt">Top Produkty</span></div>
          <div className="pb" style={{maxHeight: 280, overflowY: 'auto'}}>
            {data.topProducts.map((p, i) => {
              const maxVal = Math.max(...data.topProducts.map(x => x.totalQuantity), 1);
              const pct = (p.totalQuantity / maxVal) * 100;
              return (
                <div key={i} className="top-product-row">
                  <div className="tp-rank" style={{ color: i===0?'#FFD700':i===1?'#C0C0C0':i===2?'#CD7F32':'' }}>{i+1}</div>
                  <div className="tp-info">
                    <div className="tp-name">{p.productName}</div>
                    <div className="tp-qty">{p.totalQuantity}×</div>
                  </div>
                  <div className="tp-bar-wrap">
                     <div className="tp-bar-bg"><div className="tp-bar-fill" style={{ width: `${pct}%`, background: paletteArray[i%paletteArray.length] }}></div></div>
                  </div>
                  <div className="tp-rev">{p.totalRevenueEuros.toFixed(2)}€</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <div className="ph"><span className="pt">Podľa kategórie</span></div>
          <div className="pb">
            <div className="chart-wrap" style={{height: 240}}>
              <Doughnut data={catChartData} options={donutOptions} />
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="ph"><span className="pt">Spôsob platby</span></div>
          <div className="pb">
            <div className="chart-wrap" style={{height: 240}}>
              <Doughnut data={paymentChartData} options={donutOptions} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
         <div className="panel">
            <div className="ph"><span className="pt">Vstupy podľa hodiny</span></div>
            <div className="pb">
               <div className="chart-wrap" style={{height: 220}}>
                  <Bar data={hourChartData} options={chartOptions} />
               </div>
            </div>
         </div>
         <div className="panel">
            <div className="ph"><span className="pt">Trend návštevnosti</span></div>
            <div className="pb">
               <div className="chart-wrap" style={{height: 220}}>
                  <Line data={checkinTrendData} options={chartOptions} />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
