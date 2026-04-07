import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const now = new Date();
  
  // Stats
  const totalClasses = classes.length;
  const totalClients = clients.length;
  const totalBooked = classes.reduce((sum, c) => sum + (c.booked || 0), 0);

  // Hours this week
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
    .slice(0, 4);

  const getInitials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1.5rem' }}>
        <span className="spinner" style={{ width: 48, height: 48, borderTopColor: 'var(--blue)' }} />
        <p style={{ fontFamily: 'var(--font-d)', letterSpacing: '0.2em', color: 'var(--muted)', fontSize: '0.8rem' }}>PRIPRAVUJEM PREHĽAD...</p>
      </div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="overview-container"
    >
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fm err" 
            style={{ marginBottom: '1.5rem' }}
          >
            <i className="fas fa-exclamation-circle" /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <motion.section variants={item} className="overview-hero trainer-modern" style={{
        background: 'linear-gradient(135deg, rgba(8, 8, 10, 0.8) 0%, rgba(10, 132, 255, 0.05) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        padding: '2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '0.5rem', lineHeight: 1 }}>
            Dobrý deň, <span style={{ color: 'var(--blue)' }}>{user?.fullName?.split(' ')[0]}</span>! 👋
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', maxWidth: '500px', lineHeight: 1.5 }}>
            Dnes máte v rozvrhu <b style={{ color: 'var(--text)' }}>{totalClasses} tréningov</b>. {totalClients} klientov čaká na vaše vedenie.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn btn-blue" style={{ borderRadius: '12px', padding: '0.8rem 1.5rem' }}>
              <i className="fas fa-calendar-alt" /> MÔJ ROZVRH
            </button>
            <button className="btn btn-ghost" style={{ borderRadius: '12px', padding: '0.8rem 1.5rem' }}>
              <i className="fas fa-plus" /> PRIDAŤ TRÉNING
            </button>
          </div>
        </div>
        <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', opacity: 0.03, fontSize: '20rem', pointerEvents: 'none' }}>
            <i className="fas fa-dumbbell" />
        </div>
      </motion.section>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <motion.div variants={item} className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Lekcie celkovo', val: totalClasses, icon: 'fa-calendar-check', col: 'var(--blue)' },
          { label: 'Priradení klienti', val: totalClients, icon: 'fa-users', col: 'var(--acid2)' },
          { label: 'Prihlásení spolu', val: totalBooked, icon: 'fa-user-check', col: 'var(--acid)' },
          { label: 'Hodín / Týždeň', val: `${hoursThisWeek.toFixed(1)}h`, icon: 'fa-fire', col: 'var(--orange)' }
        ].map((k, i) => (
          <div key={i} className="glass kpi-card-modern" style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: '1.5rem', color: k.col, opacity: 0.8 }}><i className={`fas ${k.icon}`} /></div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-d)' }}>{k.val}</div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.1em' }}>{k.label}</div>
            <div style={{ position: 'absolute', right: 0, bottom: 0, width: '40px', height: '40px', background: k.col, filter: 'blur(40px)', opacity: 0.15 }}></div>
          </div>
        ))}
      </motion.div>

      {/* ── Content Grid ────────────────────────────────────────────── */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Upcoming Classes */}
        <motion.section variants={item} className="panel-modern" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.5rem' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Najbližšie lekcie</h3>
            <button className="btn btn-ghost btn-sm" style={{ border: 'none', background: 'rgba(255,255,255,0.03)' }}>Zobraziť všetky</button>
          </header>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {upcoming.length > 0 ? (
              upcoming.map((c, i) => {
                const pct = c.capacity ? Math.round(((c.booked || 0) / c.capacity) * 100) : 0;
                const d = new Date(c.startTime);
                return (
                  <motion.div 
                    key={i} 
                    whileHover={{ x: 6, background: 'rgba(255,255,255,0.03)' }}
                    style={{ 
                      padding: '1rem', 
                      background: 'rgba(255,255,255,0.015)', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'var(--surface2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: 900, opacity: 0.5 }}>{d.toLocaleDateString('sk', { month: 'short' })}</span>
                        <span style={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>{d.getDate()}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>
                            <i className="far fa-clock" /> {d.toLocaleTimeString('sk', { hour: '2-digit', minute: '2-digit' })} • {c.location || 'Sála 1'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '60px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900 }}>{c.booked || 0}/{c.capacity}</div>
                        <div style={{ height: 4, width: 40, background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px', marginLeft: 'auto' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--red)' : 'var(--blue)' }} />
                        </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
                <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.2 }}>
                    <i className="fas fa-calendar-times" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                    <p>Žiadne plánované lekcie</p>
                </div>
            )}
          </div>
        </motion.section>

        {/* Favorite Clients */}
        <motion.section variants={item} className="panel-modern" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1.5rem' }}>
           <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aktívni klienti</h3>
            <button className="btn btn-ghost btn-sm" style={{ border: 'none', background: 'rgba(255,255,255,0.03)' }}>Detail list</button>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {clients.slice(0, 6).map((c, i) => (
                <motion.div 
                    key={i}
                    whileHover={{ scale: 1.02, background: 'rgba(10, 132, 255, 0.05)' }}
                    style={{ 
                        padding: '1rem', 
                        background: 'rgba(255,255,255,0.015)', 
                        borderRadius: '16px', 
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '0.75rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{ 
                        width: 52, 
                        height: 52, 
                        borderRadius: '16px', 
                        background: 'linear-gradient(135deg, var(--blue), var(--acid2))', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        fontWeight: 900,
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(10, 132, 255, 0.2)'
                    }}>
                        {getInitials(c.fullName)}
                    </div>
                    <div style={{ width: '100%' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.fullName}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '2px' }}>KLIENT</div>
                    </div>
                </motion.div>
            ))}
          </div>

          {clients.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.2 }}>
                <i className="fas fa-user-clock" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                <p>Zatiaľ žiadni klienti</p>
              </div>
          )}
        </motion.section>

      </div>
    </motion.div>
  );
}
