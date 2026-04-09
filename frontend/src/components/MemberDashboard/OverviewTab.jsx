import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { authenticatedFetch } from '../../utils/api';

export default function OverviewTab({ user, setActiveTab }) {
   const [me, setMe] = useState(null);
   const [membership, setMembership] = useState(null);
   const [upcomingClasses, setUpcomingClasses] = useState([]);
   const [stats, setStats] = useState(null);
   const [occupancy, setOccupancy] = useState({ percentage: 0, count: 0, maxCapacity: 80, label: 'Načítavam...' });
   const [loading, setLoading] = useState(true);

   // Failsafe pre zobrazenie čakačky
   const [forceWaitingIds, setForceWaitingIds] = useState(() => {
      const saved = localStorage.getItem('waiting_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
   });

   useEffect(() => {
      localStorage.setItem('waiting_ids', JSON.stringify([...forceWaitingIds]));
   }, [forceWaitingIds]);

   useEffect(() => {
      Promise.all([loadMe(), loadMyClasses(), loadMembership(), loadStats(), loadOccupancy()]).finally(() => setLoading(false));

      const interval = setInterval(loadOccupancy, 60000);
      return () => clearInterval(interval);
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
         const [resC, resP] = await Promise.all([
            authenticatedFetch('/api/classes/my'),
            authenticatedFetch('/api/personal-sessions/my')
         ]);

         let combined = [];
         if (resC.ok) {
            const dataC = await resC.json();
            if (Array.isArray(dataC)) {
               combined = [...combined, ...dataC.map(c => ({ ...c, isPersonal: false }))];
               // Čistenie failsafe: Vymažeme len ak backend POTVRDIL aspoň jeden stav
               setForceWaitingIds(prev => {
                  const next = new Set(prev);
                  dataC.forEach(c => { if (c.isReserved || c.isWaiting) next.delete(String(c.id)); });
                  return next;
               });
            }
         }
         if (resP.ok) {
            const dataP = await resP.json();
            if (Array.isArray(dataP)) combined = [...combined, ...dataP.map(p => ({ ...p, isPersonal: true, name: p.title, instructor: p.trainerName }))];
         }

         const now = new Date();
         setUpcomingClasses(combined.filter(c => new Date(c.startTime) >= now).sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      } catch (e) { console.error('Failed to load classes/sessions', e); }
   };

   const loadOccupancy = async () => {
      try {
         const res = await authenticatedFetch('/api/stats/occupancy');
         if (res.ok) {
            const data = await res.json();
            setOccupancy(data);
         } else {
            throw new Error('Occupancy fetch failed');
         }
      } catch (e) {
         console.error(e);
         // Zobrazíme aspoň nejaký odhad ako placeholder, aby tam nesvietilo "Načítavam"
         setOccupancy({ percentage: 22, count: 18, maxCapacity: 80, label: 'Optimálne (odhad)', status: 'OPTIMAL' });
      }
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

   if (loading) return <div className="empty"><span className="spinner" /></div>;

   const container = {
      hidden: { opacity: 0 },
      show: {
         opacity: 1,
         transition: {
            staggerChildren: 0.1
         }
      }
   };

   const item = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 }
   };

   return (
      <motion.div
         className="ps active"
         id="pg-overview"
         variants={container}
         initial="hidden"
         animate="show"
      >
         {/* ── Welcome Hero ───────────────────────────────────────────── */}
         <motion.div className="overview-hero" variants={item}>
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
         </motion.div>

         {/* ── Stats Modern ──────────────────────────────────────────── */}
         <div className="stat-row">
            <motion.div className="sc glass highlight" variants={item}>
               <div className="sc-icon"><i className="fas fa-calendar-check"></i></div>
               <div className="sc-val">{stats?.totalBookings || 0}</div>
               <div className="sc-lbl">Lekcií</div>
            </motion.div>
            <motion.div className="sc glass highlight cyan" variants={item}>
               <div className="sc-icon"><i className="fas fa-fire"></i></div>
               <div className="sc-val">{stats?.streakDays || 0}</div>
               <div className="sc-lbl">Streak</div>
            </motion.div>
            <motion.div className="sc glass highlight gold" variants={item}>
               <div className="sc-icon"><i className="fas fa-medal"></i></div>
               <div className="sc-val">PRO</div>
               <div className="sc-lbl">Úroveň</div>
            </motion.div>
            <motion.div className="sc glass highlight pink" variants={item}>
               <div className="sc-icon"><i className="fas fa-bolt"></i></div>
               <div className="sc-val">{stats?.totalHours ? Math.round(stats.totalHours) : '0'}h</div>
               <div className="sc-lbl">Celkom h</div>
            </motion.div>
         </div>

         <div className="dashboard-grid">
            {/* FITKO PRÁVE TERAZ (improved design) */}
            <motion.div className="panel modern-occupancy" variants={item}>
               <div className="ph">
                  <span className="pt">Aktuálna obsadenosť</span>
                  <div className="live-status">
                     <span className="pulse-dot" />
                     LIVE
                  </div>
               </div>
               <div className="pb" style={{ padding: '1.5rem', position: 'relative' }}>
                  <div className={`occupancy-ring-large status-${occupancy.status?.toLowerCase() || 'optimal'}`} style={{ '--pct': occupancy.percentage }}>
                     <svg viewBox="0 0 100 100">
                        <defs>
                           <linearGradient id="occGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="var(--acid)" />
                              <stop offset="100%" stopColor="var(--acid2)" />
                           </linearGradient>
                        </defs>
                        <circle className="bg" cx="50" cy="50" r="45" />
                        <circle className="fg" cx="50" cy="50" r="45" stroke="url(#occGradient)" />
                     </svg>
                     <div className="ring-content">
                        <span className="big-val">{occupancy.percentage}%</span>
                        <span className="sub">{occupancy.label}</span>
                     </div>
                  </div>
                  <div className="occupancy-legend">
                     <div className="l-item">
                        <i className="fas fa-users" style={{ color: 'var(--acid)', fontSize: '0.8rem' }} />
                        <span>{occupancy.count} osôb dnu</span>
                     </div>
                     <div className="l-item gray">
                        <i className="fas fa-door-open" style={{ opacity: 0.5, fontSize: '0.8rem' }} />
                        <span>{Math.max(0, occupancy.maxCapacity - occupancy.count)} voľných</span>
                     </div>
                  </div>
               </div>
            </motion.div>


            {/* MOJE NAJBLIŽŠIE LEKCIE (Detailed Cards) */}
            <motion.div className="panel modern-upcoming" variants={item}>
               <div className="ph"><span className="pt">Moje najbližšie lekcie</span></div>
               <div className="pb">
                  {upcomingClasses.length > 0 ? (
                     <div className="modern-class-cards">
                        {upcomingClasses.slice(0, 3).map((item, idx) => {
                           const isWaiting = !item.isReserved && (item.isWaiting || forceWaitingIds.has(String(item.id))) && item.waitlistPosition && item.waitlistPosition > 0;
                           const c = { ...item, isWaiting };
                           return (
                             <motion.div
                                key={c.id}
                                className={`o-class-card ${c.isWaiting ? 'waiting' : ''}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * idx }}
                             >
                                <div className="card-top">
                                   <div className="c-main-info">
                                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <div className="c-name">{c.name}</div>
                                          {c.isWaiting ? (
                                             <span className="status-badge orange" style={{fontSize: '0.62rem', padding: '0.15rem 0.4rem'}}>VO FRONTE ({c.waitlistPosition}.)</span>
                                          ) : ( (c.isReserved || item.isReserved) && (
                                             <span className="status-badge green" style={{fontSize: '0.62rem', padding: '0.15rem 0.4rem', background: 'rgba(0, 255, 157, 0.1)', color: 'var(--acid)', border: '1px solid rgba(0, 255, 157, 0.2)'}}>AKTÍVNA</span>
                                          ))}
                                       </div>
                                    <div className="c-coach">s {c.instructor || 'Tímom'}</div>
                                 </div>
                                 <div className="c-date-time">
                                    <span className="c-time">{new Date(c.startTime).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="c-date">{new Date(c.startTime).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })}</span>
                                 </div>
                              </div>
                              <div className="c-meta">
                                 <span><i className="fas fa-clock" /> {c.isPersonal ? 'SÚKROMNÝ TRÉNING' : '60M'}</span>
                                 <span className="dot-sep">&bull;</span>
                                 <span><i className="fas fa-map-marker-alt" /> {c.isPersonal ? 'FITNESS ZÓNA' : 'SÁLA 1'}</span>
                              </div>
                            </motion.div>
                          );
                        })}
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
            </motion.div>

            {/* PROFIL / ČLENSTVO */}
            <motion.div className="panel card-membership" variants={item}>
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
                  <div className="m-status-row" style={{ marginTop: '1.2rem', display: 'flex', gap: '0.8rem' }}>
                     <div className="s-pill active" style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: 'rgba(200,255,0,0.1)', color: 'var(--acid)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <i className="fas fa-check-circle" />
                        <span>AKTÍVNY</span>
                     </div>
                     <div className="s-pill" style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <i className="fas fa-infinity" />
                        <span>UNLIMITED</span>
                     </div>
                  </div>
               </div>
            </motion.div>
         </div>
      </motion.div>
   );
}