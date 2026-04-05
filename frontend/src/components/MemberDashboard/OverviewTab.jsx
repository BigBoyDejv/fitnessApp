import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function OverviewTab({ user, setActiveTab }) {
   const [me, setMe] = useState(null);
   const [membership, setMembership] = useState(null);
   const [upcomingClasses, setUpcomingClasses] = useState([]);
   const [stats, setStats] = useState(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      Promise.all([loadMe(), loadMyClasses(), loadMembership(), loadStats()]).finally(() => setLoading(false));
   }, []);

   const loadMe = async () => {
      try {
         const res = await authenticatedFetch('/api/auth/me');
         if (res.ok) setMe(await res.json());
      } catch (e) { console.error(e); }
   };

   const loadStats = async () => {
      try {
         const res = await authenticatedFetch('/api/stats/my');
         if (res.ok) setStats(await res.json());
      } catch (e) { console.error(e); }
   };

   const loadMembership = async () => {
      try {
         const res = await authenticatedFetch('/api/memberships/my');
         if (res.ok) setMembership(await res.json());
      } catch { }
   };

   const loadMyClasses = async () => {
      try {
         const res = await authenticatedFetch('/api/classes/my');
         if (!res.ok) return;
         const data = await res.json();
         const now = new Date();
         setUpcomingClasses(Array.isArray(data) ? data.filter(c => new Date(c.startTime) >= now).sort((a, b) => new Date(a.startTime) - new Date(b.startTime)) : []);
      } catch { }
   };

   const renderAvatar = (size = 48) => {
      const u = me || user;
      if (!u) return <div style={{ width: size, height: size, borderRadius: '50%', background: '#222' }} />;
      const ini = (u.fullName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      if (u.avatarUrl) return <img src={u.avatarUrl} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} alt="" />;
      return (
         <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,var(--acid),var(--acid2))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900 }}>
            {ini}
         </div>
      );
   };

   if (loading) return <div className="empty"><span className="spin" /></div>;

   return (
      <div className="ps active animate-in" id="pg-overview">
         {/* ── Welcome Hero ───────────────────────────────────────────── */}
         <div className="overview-hero">
            <div className="hero-content">
               <h1>Ahoj, {user?.fullName?.split(' ')[0] || 'Šampión'}! 👋</h1>
               <p>Tvoj progres je na dobrej ceste. Dnes je skvelý deň na tréning.</p>
               <div className="hero-actions">
                  <button className="btn btn-acid btn-sm" onClick={() => setActiveTab('workout')}>ZAPÍSAŤ TRÉNING</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('book-class')}>REZERVÁCIA</button>
               </div>
            </div>
            <div className="hero-visual">
               <i className="fas fa-dumbbell" />
            </div>
         </div>

         {/* ── Stats Modern ──────────────────────────────────────────── */}
         <div className="stat-row">
            <div className="sc glass highlight">
               <div className="sc-icon"><i className="fas fa-calendar-check"></i></div>
               <div className="sc-val">{stats?.totalBookings || 0}</div>
               <div className="sc-lbl">Lekcií</div>
            </div>
            <div className="sc glass highlight cyan">
               <div className="sc-icon"><i className="fas fa-fire"></i></div>
               <div className="sc-val">{stats?.streakDays || 0}</div>
               <div className="sc-lbl">Streak</div>
            </div>
            <div className="sc glass highlight gold">
               <div className="sc-icon"><i className="fas fa-medal"></i></div>
               <div className="sc-val">PRO</div>
               <div className="sc-lbl">Úroveň</div>
            </div>
            <div className="sc glass highlight pink">
               <div className="sc-icon"><i className="fas fa-bolt"></i></div>
               <div className="sc-val">{stats?.totalHours ? Math.round(stats.totalHours) : '0'}h</div>
               <div className="sc-lbl">Celkom h</div>
            </div>
         </div>

         <div className="dashboard-grid">
            {/* FITKO PRÁVE TERAZ (Ring View) */}
            <div className="panel modern-occupancy">
               <div className="ph"><span className="pt">Aktuálna obsadenosť</span></div>
               <div className="pb" style={{ padding: '1.5rem' }}>
                  <div className="occupancy-ring-large" style={{ '--pct': '32' }}>
                     <svg viewBox="0 0 100 100">
                        <circle className="bg" cx="50" cy="50" r="45" />
                        <circle className="fg" cx="50" cy="50" r="45" />
                     </svg>
                     <div className="ring-content">
                        <span className="big-val">32%</span>
                        <span className="sub">Optimálne</span>
                     </div>
                  </div>
                  <div className="occupancy-legend">
                     <div className="l-item"><span></span> 22 osôb dnu</div>
                     <div className="l-item gray"><span></span> 58 voľných miest</div>
                  </div>
               </div>
            </div>

            {/* MOJE NAJBLIŽŠIE LEKCIE (Detailed Cards) */}
            <div className="panel modern-upcoming">
               <div className="ph"><span className="pt">Moje najbližšie lekcie</span></div>
               <div className="pb">
                  {upcomingClasses.length > 0 ? (
                     <div className="modern-class-cards">
                        {upcomingClasses.slice(0, 3).map(c => (
                           <div key={c.id} className="o-class-card">
                              <div className="card-top">
                                 <div className="c-main-info">
                                    <div className="c-name">{c.name}</div>
                                    <div className="c-coach">s {c.instructor || 'Tímom'}</div>
                                 </div>
                                 <div className="c-date-time">
                                    <span className="c-time">{new Date(c.startTime).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="c-date">{new Date(c.startTime).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })}</span>
                                 </div>
                              </div>
                              <div className="c-meta">
                                 <span><i className="fas fa-clock" /> 60M</span>
                                 <span className="dot-sep">&bull;</span>
                                 <span><i className="fas fa-map-marker-alt" /> SÁLA 1</span>
                              </div>
                           </div>
                        ))}
                        <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: '1rem', borderColor: 'rgba(255,255,255,0.1)' }} onClick={() => setActiveTab('classes')}>ZOBRAZIŤ CELÝ ROZVRH</button>
                     </div>
                  ) : (
                     <div className="empty-state-mini">
                        <i className="fas fa-calendar-alt" style={{ opacity: 0.1, fontSize: '2rem' }} />
                        <p>Žiadne naplánované lekcie.</p>
                        <button className="btn btn-acid btn-xs" onClick={() => setActiveTab('book-class')}>REZERVOVAŤ</button>
                     </div>
                  )}
               </div>
            </div>

            {/* PROFIL / ČLENSTVO */}
            <div className="panel card-membership">
               <div className="ph"><span className="pt">Aktívne členstvo</span></div>
               <div className="pb" style={{ padding: '1.2rem' }}>
                  <div className="m-card-visual">
                     <div className="m-logo-top">FITPRO PREMIUM</div>
                     <div className="m-type">{membership?.membershipTypeName || 'ROČNÝ PASS'}</div>
                     <div className="m-id">ID: {user?.id?.slice(0, 8).toUpperCase()}</div>
                     <div className="m-footer">
                        <div className="m-valid">PLATNÉ DO: {membership?.endDate || '31.12.2026'}</div>
                        <i className="fas fa-bolt m-icon" />
                     </div>
                  </div>
                  <div className="m-status-row">
                     <div className="s-pill active">
                        <i className="fas fa-check-circle" />
                        <div className="s-content">STAV: <span>AKTÍVNY</span></div>
                     </div>
                     <div className="s-pill">
                        <i className="fas fa-infinity" />
                        <div className="s-content">VSTUPY: <span>UNLIMITED</span></div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}