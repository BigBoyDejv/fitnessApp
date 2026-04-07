import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedFetch } from '../../utils/api';

export default function TrainerHubTab({ setActiveTab }) {
  const [sessions, setSessions] = useState([]);
  const [myTrainer, setMyTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch personal sessions
      const resS = await authenticatedFetch('/api/personal-sessions/my');
      if (resS.ok) {
        const dataS = await resS.json();
        setSessions(Array.isArray(dataS) ? dataS : []);
      }

      // 2. Fetch my trainer details
      const resT = await authenticatedFetch('/api/users/my-trainer');
      if (resT.ok) {
         const dataT = await resT.json();
         if (dataT.id) {
            setMyTrainer(dataT);
         }
      }
    } catch (e) {
      console.error(e);
      setError('Nepodarilo sa načítať dáta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    return <div style={{ padding: '4rem', textAlign: 'center' }}><span className="spinner" /></div>;
  }

  if (!myTrainer) {
    return (
      <div className="tab-container animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
         <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(10,132,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', fontSize: '3rem', margin: '0 auto 1.5rem' }}>
                <i className="fas fa-user-tie"></i>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>Môj Tréner</h2>
            <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>Zatiaľ nespolupracuješ so žiadnym trénerom. Vyber si svojho osobného kouča a začni cvičiť na vyššej úrovni.</p>
            <button className="btn btn-blue" onClick={() => setActiveTab('trainers')} style={{ borderRadius: '12px', padding: '0.8rem 2rem', fontSize: '1rem', fontWeight: 800 }}>
                NÁJSŤ TRÉNERA
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="tab-container animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'linear-gradient(135deg, var(--acid), #00FFD1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '2rem', fontWeight: 900, boxShadow: '0 10px 20px rgba(200,255,0,0.2)', border: '2px solid rgba(255,255,255,0.1)' }}>
            {myTrainer.avatarUrl ? <img src={myTrainer.avatarUrl} alt="" style={{width: '100%', height: '100%', borderRadius: '22px', objectFit:'cover'}} /> : (myTrainer.fullName?.substring(0,2).toUpperCase() || 'TR')}
        </div>
        <div>
           <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.2rem', letterSpacing: '-0.02em', lineHeight: 1 }}>{myTrainer.fullName}</h2>
           <p style={{ color: 'var(--acid)', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <i className="fas fa-shield-alt"></i> OSOBNÝ TRÉNER
           </p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* ── Personal Schedule ────────────────────────────────────── */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <i className="fas fa-calendar-alt" style={{ color: 'var(--acid)' }} />
                Plán tvojich tréningov
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}><span className="spinner" /></div>
          ) : sessions.length > 0 ? (
            <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sessions.map(s => {
                const date = new Date(s.startTime);
                return (
                  <motion.div 
                    key={s.id} 
                    variants={item}
                    style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '16px', 
                        padding: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                  >
                    <div style={{ 
                        width: '55px', 
                        height: '55px', 
                        borderRadius: '12px', 
                        background: 'rgba(200,255,0,0.1)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid rgba(200,255,0,0.2)'
                    }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--acid)' }}>{date.toLocaleDateString('sk', { month: 'short' })}</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>{date.getDate()}</span>
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.2rem' }}>{s.title || 'Individuálny tréning'}</div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                            <span><i className="far fa-clock" /> {date.toLocaleTimeString('sk', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span><i className="fas fa-user-tie" /> {s.trainerName}</span>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 900, 
                            padding: '0.3rem 0.6rem', 
                            borderRadius: '4px', 
                            background: s.attendance === 'PRESENT' ? 'rgba(76,217,100,0.1)' : 'rgba(255,255,255,0.05)',
                            color: s.attendance === 'PRESENT' ? 'var(--acid)' : 'var(--muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {s.attendance === 'PRESENT' ? 'Zúčastnené' : 'Potvrdené'}
                        </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: 'dashed 1px var(--border)' }}>
                <i className="fas fa-calendar-minus" style={{ fontSize: '2.5rem', opacity: 0.1, marginBottom: '1rem' }} />
                <p style={{ fontWeight: 600 }}>Prazdny rozvrh</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.4rem' }}>Zatiaľ nemáš naplánované žiadne 1-na-1 tréningy.</p>
            </div>
          )}
        </section>

        {/* ── Sidebar / Interaction ────────────────────────────────── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(200,255,0,0.05), rgba(0,0,0,0.2))' }}>
            <h4 style={{ fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <i className="fas fa-comments" style={{ color: 'var(--acid)' }} />
                Rýchly Chat
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>Máš otázku ohľadom tréningu? Napíš svojmu trénerovi hneď teraz.</p>
            <button className="btn btn-acid btn-block" onClick={() => setActiveTab('messages', myTrainer.id)} style={{ borderRadius: '12px', height: '48px', fontWeight: 800 }}>
                OTVORIŤ SPRÁVY
            </button>
          </div>

          <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)', marginTop: '1rem' }}>
             <button className="btn btn-ghost btn-block" style={{ color: 'var(--red)', fontSize: '0.8rem', fontWeight: 700 }}>
                UKONČIŤ SPOLUPRÁCU
             </button>
          </div>

          <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
             <h4 style={{ fontWeight: 800, marginBottom: '1rem' }}>Tvoj progres</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--muted)' }}>Absolvované tréningy</span>
                    <span style={{ fontWeight: 800 }}>{sessions.filter(s => s.attendance === 'PRESENT').length}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                    <div style={{ width: '65%', height: '100%', background: 'var(--blue)', borderRadius: '2px' }} />
                </div>
             </div>
          </div>

          <button 
            className="btn btn-red btn-ghost btn-block" 
            style={{ borderRadius: '12px', marginTop: 'auto', fontSize: '0.75rem', opacity: 0.6 }}
            onClick={async () => {
                if (!window.confirm('Naozaj chceš ukončiť spoluprácu s trénerom?')) return;
                try {
                    const res = await authenticatedFetch('/api/trainer/terminate', { method: 'POST' });
                    if (res.ok) {
                        alert('Spolupráca bola ukončená.');
                        window.location.reload();
                    } else {
                        const d = await res.json();
                        alert(d.message || 'Chyba');
                    }
                } catch(e) { console.error(e); }
            }}
          >
            UKONČIŤ SPOLUPRÁCU
          </button>

        </aside>

      </div>
    </div>
  );
}
