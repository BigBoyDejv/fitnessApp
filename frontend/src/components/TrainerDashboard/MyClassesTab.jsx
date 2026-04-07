import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedFetch } from '../../utils/api';

export default function MyClassesTab() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past'

  const [selectedClass, setSelectedClass] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authenticatedFetch('/api/trainer/classes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Nepodarilo sa načítať lekcie');
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openParticipants = async (c) => {
    setSelectedClass(c);
    setLoadingParticipants(true);
    try {
      const res = await authenticatedFetch(`/api/classes/${c.id}/participants`);
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const updateAttendance = async (userId, status) => {
    try {
        const res = await authenticatedFetch(`/api/classes/${selectedClass.id}/attendance/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            setParticipants(prev => prev.map(p => p.userId === userId ? { ...p, status } : p));
        }
    } catch (e) {
        console.error(e);
    }
  };

  const now = new Date();

  const filteredClasses = classes.filter(c => {
    const matchSearch = !search || 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (c.location || '').toLowerCase().includes(search.toLowerCase());
    
    const isPast = new Date(c.startTime) < now;
    const matchTab = (activeTab === 'upcoming' && !isPast) || 
                     (activeTab === 'past' && isPast);
      
    return matchSearch && matchTab;
  });

  const sortedClasses = [...filteredClasses].sort((a, b) => {
    const da = new Date(a.startTime);
    const db = new Date(b.startTime);
    return activeTab === 'upcoming' ? da - db : db - da;
  });

  const getStatusInfo = (startTime) => {
    const isPast = new Date(startTime) < now;
    return isPast 
      ? { label: 'Prebehla', color: 'var(--muted)', bg: 'rgba(255,255,255,0.05)', icon: 'fa-check-circle' }
      : { label: 'Nadchádzajúca', color: 'var(--blue)', bg: 'rgba(10,132,255,0.1)', icon: 'fa-clock' };
  };

  const getAttendanceIcon = (status) => {
    switch(status) {
        case 'PRESENT': return { icon: 'fa-check-circle', color: 'var(--acid)', label: 'Prítomný' };
        case 'ABSENT': return { icon: 'fa-times-circle', color: 'var(--red)', label: 'Neprišiel' };
        default: return { icon: 'fa-clock', color: 'var(--muted)', label: 'Čaká' };
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.2rem' }}>Moje lekcie</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Správa tréningových hodín a účastníkov</p>
        </div>
        <button className="btn btn-ghost" onClick={loadData} style={{ borderRadius: '10px' }}>
          <i className="fas fa-sync-alt" /> Refresh
        </button>
      </header>

      {/* ── Sub-Tabs Navigation ────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {[
            { id: 'upcoming', label: 'Nadchádzajúce', icon: 'fa-bolt' },
            { id: 'past', label: 'Minulé / Ukončené', icon: 'fa-history' }
          ].map(t => (
            <div 
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{ 
                    padding: '0.75rem 0.2rem', 
                    cursor: 'pointer', 
                    position: 'relative',
                    color: activeTab === t.id ? 'var(--blue)' : 'var(--muted)',
                    fontWeight: activeTab === t.id ? 800 : 600,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    transition: 'all 0.2s'
                }}
            >
                <i className={`fas ${t.icon}`} style={{ fontSize: '0.85rem' }} />
                {t.label}
                {activeTab === t.id && (
                    <motion.div 
                        layoutId="activeTabUnderline"
                        style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--blue)', borderRadius: 1 }}
                    />
                )}
            </div>
          ))}
        </div>

        {/* Search inside tab row for efficiency */}
        <div style={{ position: 'relative', minWidth: '280px' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.85rem' }} />
          <input 
            className="fi" 
            type="text" 
            placeholder="Rýchle hľadanie..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem', height: '36px', borderRadius: '8px', background: 'rgba(0,0,0,0.15)', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* ── Classes Grid ────────────────────────────────────────────── */}
      <section style={{ marginTop: '0.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', gap: '1rem', color: 'var(--muted)' }}>
            <span className="spinner" style={{ width: 40, height: 40 }} />
            <p style={{ fontFamily: 'var(--font-d)', letterSpacing: '0.1em', fontSize: '0.8rem' }}>NAČÍTAVAM LEKCIE...</p>
          </div>
        ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,45,85,0.05)', border: '1px solid rgba(255,45,85,0.1)', borderRadius: '12px', color: 'var(--red)' }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }} />
                <p>{error}</p>
            </div>
        ) : sortedClasses.length > 0 ? (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: '1.5rem' 
            }}
          >
            {sortedClasses.map(c => {
              const booked = c.booked || 0;
              const cap = c.capacity || 0;
              const pct = cap ? Math.round((booked / cap) * 100) : 0;
              const status = getStatusInfo(c.startTime);
              const date = new Date(c.startTime);

              return (
                <motion.div 
                  key={c.id} 
                  variants={item}
                  whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.01)' }}
                  style={{ 
                    background: 'rgba(20, 20, 22, 0.4)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                       <div style={{ 
                        fontSize: '0.62rem', 
                        textTransform: 'uppercase', 
                        fontWeight: 900, 
                        color: status.color, 
                        background: status.bg, 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '4px', 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        marginBottom: '0.5rem',
                        letterSpacing: '0.1em'
                       }}>
                         <i className={`fas ${status.icon}`} style={{ fontSize: '0.6rem' }} />
                         {status.label}
                       </div>
                       <h3 style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1.1, color: '#fff' }}>{c.name || 'Pomenovaná lekcia'}</h3>
                    </div>
                    <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5 }}>{date.toLocaleDateString('sk', { month: 'short' })}</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, lineHeight: 1 }}>{date.getDate()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                        <i className="far fa-clock" style={{ width: 14 }} />
                        <span>{date.toLocaleTimeString('sk', { hour: '2-digit', minute: '2-digit' })} • {c.durationMinutes || 60} min</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                        <i className="fas fa-map-marker-alt" style={{ width: 14 }} />
                        <span style={{ color: 'var(--text)' }}>{c.location || 'Sála 1'}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span style={{ color: 'var(--muted)' }}>Účastníci</span>
                        <span style={{ color: pct > 80 ? 'var(--red)' : '#fff' }}>{booked} / {cap}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                            style={{ 
                                height: '100%', 
                                background: pct > 80 ? 'linear-gradient(to right, var(--red), #ff7e5f)' : 'linear-gradient(to right, var(--blue), var(--acid2))',
                                boxShadow: `0 0 10px ${pct > 80 ? 'var(--red)' : 'var(--blue)'}44`
                            }} 
                        />
                    </div>
                  </div>

                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => openParticipants(c)}
                    style={{ width: '100%', justifyContent: 'center', borderRadius: '8px', fontSize: '0.75rem', marginTop: '0.5rem' }}
                  >
                    Spravovať účastníkov <i className="fas fa-users" style={{ fontSize: '0.6rem', marginLeft: '0.5rem' }} />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: 'dashed 1px var(--border)' }}>
            <div style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '1rem' }}>
                <i className={`fas ${activeTab === 'upcoming' ? 'fa-calendar-plus' : 'fa-history'}`} />
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}>
                {activeTab === 'upcoming' ? 'Žiadne nadchádzajúce tréningy' : 'Zatiaľ žiadna história tréningov'}
            </p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
                {search ? 'Zmeňte kritériá vyhľadávania' : activeTab === 'upcoming' ? 'Váš rozvrh je momentálne voľný' : 'Po ukončení lekcie sa tu zobrazí jej záznam'}
            </p>
          </div>
        )}
      </section>

      {/* ── Attendance Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedClass && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedClass(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ 
                width: '100%', 
                maxWidth: '500px', 
                background: 'rgba(30, 30, 35, 0.95)', 
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                padding: '2rem',
                position: 'relative',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
              }}
            >
              <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Účastníci lekcie</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{selectedClass.name} • {new Date(selectedClass.startTime).toLocaleTimeString('sk', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedClass(null)} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
                  <i className="fas fa-times" />
                </button>
              </header>

              <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                {loadingParticipants ? (
                  <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>
                ) : participants.length > 0 ? (
                  participants.map(p => {
                    const info = getAttendanceIcon(p.status);
                    return (
                        <div key={p.userId} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '1rem', 
                            background: 'rgba(255,255,255,0.03)', 
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ 
                                width: '38px', height: '38px', borderRadius: '10px', 
                                background: p.status === 'PRESENT' ? 'rgba(76,217,100,0.1)' : p.status === 'ABSENT' ? 'rgba(255,45,85,0.1)' : 'var(--surface)', 
                                color: p.status === 'PRESENT' ? 'var(--acid)' : p.status === 'ABSENT' ? 'var(--red)' : 'var(--muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid currentColor', opacity: 0.8
                            }}>
                                <i className={`fas ${info.icon}`} style={{ fontSize: '1rem' }} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: 'var(--font-d)' }}>{p.fullName}</div>
                                <div style={{ fontSize: '0.65rem', color: info.color, display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {info.label}
                                </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <button 
                                onClick={() => updateAttendance(p.userId, 'PRESENT')}
                                className="btn btn-sm"
                                style={{ 
                                  padding: '0.5rem 0.9rem', 
                                  borderRadius: '10px',
                                  background: p.status === 'PRESENT' ? 'var(--acid)' : 'rgba(255,255,255,0.03)',
                                  color: p.status === 'PRESENT' ? '#000' : 'var(--muted)',
                                  border: '1px solid currentColor',
                                  fontWeight: 800,
                                  fontSize: '0.65rem'
                                }}
                            >
                                <i className="fas fa-check" style={{ marginRight: '0.4rem' }} /> PRÍTOMNÝ
                            </button>
                            <button 
                                onClick={() => updateAttendance(p.userId, 'ABSENT')}
                                className="btn btn-sm"
                                style={{ 
                                  padding: '0.5rem 0.9rem', 
                                  borderRadius: '10px',
                                  background: p.status === 'ABSENT' ? 'var(--red)' : 'rgba(255,255,255,0.03)',
                                  color: p.status === 'ABSENT' ? '#fff' : 'var(--muted)',
                                  border: '1px solid currentColor',
                                  fontWeight: 800,
                                  fontSize: '0.65rem'
                                }}
                            >
                                <i className="fas fa-times" style={{ marginRight: '0.4rem' }} /> NO SHOW
                            </button>
                          </div>
                        </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.85rem' }}>Zatiaľ žiadne rezervácie</div>
                )}
              </div>

              <footer style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                <button className="btn btn-blue" onClick={() => setSelectedClass(null)} style={{ width: '100%', borderRadius: '12px' }}>Hotovo</button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
