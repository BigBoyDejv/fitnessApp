import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authenticatedFetch } from "../../utils/api";
import Toast from "../Toast";

export default function ClassesTab() {
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("upcoming");
  const [loading, setLoading] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const showToast = (msg, type = "ok") => {
    setToastMsg({ msg, type });
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/api/classes");
      if (res.ok) {
        const data = await res.json();
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        setClasses(sorted);
      }
    } catch (e) {
      showToast("Chyba načítania lekcií", "err");
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(c => {
    const d = new Date(c.startTime);
    const now = new Date();
    const isPast = d < now;

    const matchSearch = !search || (c.name || "").toLowerCase().includes(search.toLowerCase()) || (c.instructor || "").toLowerCase().includes(search.toLowerCase());
    const matchTime = !timeFilter || (timeFilter === "upcoming" && !isPast) || (timeFilter === "today" && d.toDateString() === now.toDateString());
    const matchPast = showPast || !isPast;

    return matchSearch && matchTime && matchPast;
  });

  const groupedClasses = filteredClasses.reduce((groups, item) => {
    const d = new Date(item.startTime);
    const dateStr = d.toLocaleDateString("sk-SK", { weekday: 'long', day: '2-digit', month: '2-digit' });
    const todayStr = new Date().toLocaleDateString("sk-SK", { weekday: 'long', day: '2-digit', month: '2-digit' });
    
    let label = dateStr;
    if (dateStr === todayStr) label = "Dnes (" + dateStr + ")";
    
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
    return groups;
  }, {});

  const fmtTimeOnly = (dt) => {
    return dt ? new Date(dt).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" }) : "—";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="classes-tab-reception">
      <motion.div variants={itemVariants} className="panel glass-panel">
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="neon-icon cyan" style={{ width: 32, height: 32, background: 'rgba(0,255,209,0.1)', color: 'var(--acid2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-calendar-alt"></i>
            </div>
            <span className="pt">Harmonogram lekcií</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0.5rem 0 0 3.2rem', fontWeight: 500, lineHeight: '1.4' }}>
             Sledujte obsadenosť lekcií v reálnom čase, spravujte zoznamy účastníkov a pridávajte nových členov na tréningy.
          </p>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
             <button className="btn btn-ghost btn-xs" onClick={loadClasses}><i className="fas fa-sync-alt"></i></button>
             <button 
                className={`btn btn-xs ${showPast ? 'btn-blue' : 'btn-ghost'}`} 
                onClick={() => setShowPast(!showPast)}
                style={{ borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: 800, fontSize: '0.7rem' }}
             >
                <i className={`fas fa-history`} style={{marginRight: '0.4rem'}}></i> {showPast ? 'SKRYŤ MINULÉ' : 'ZOBRAZIŤ MINULÉ'}
             </button>
          </div>
        </div>
        <div className="pb" style={{ padding: '1.5rem' }}>
          <div className="search-bar glass-panel" style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 2, minWidth: '260px' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
              <input 
                className="fi" 
                type="text" 
                placeholder="Názov lekcie, tréner, miestnosť..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '3rem', borderRadius: '12px', height: '52px' }}
              />
            </div>
            <select className="fi" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ flex: 1, minWidth: '180px', borderRadius: '12px', height: '52px' }}>
              <option value="upcoming">🚀 Nadchádzajúce</option>
              <option value="today">📅 Dnešné</option>
              <option value="">🗓️ Celý týždeň</option>
            </select>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner"></span>
              </motion.div>
            ) : Object.keys(groupedClasses).length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="empty-state" style={{ padding: '6rem 2rem' }}>
                <i className="fas fa-calendar-times" style={{ fontSize: '4rem', opacity: 0.1, marginBottom: '2rem' }}></i>
                <p style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.05em' }}>ŽIADNE LEKCIE NENÁJDENÉ</p>
                <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>Skúste zmeniť filtre alebo časové obdobie.</p>
              </motion.div>
            ) : (
              <motion.div key="list" variants={containerVariants} initial="hidden" animate="visible">
                {Object.entries(groupedClasses).map(([label, items]) => (
                  <div key={label} style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                       <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, var(--acid2), transparent)', opacity: 0.3 }}></div>
                       <h3 style={{ fontSize: '0.95rem', color: 'var(--acid2)', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 950, marginBottom: 0, fontFamily: 'var(--font-d)' }}>{label}</h3>
                       <div style={{ height: '1px', flex: 5, background: 'linear-gradient(90deg, transparent, var(--border))', opacity: 0.5 }}></div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                       {items.map(c => {
                          const b = c.booked || 0;
                          const cap = c.capacity || 0;
                          const pct = cap ? Math.round((b / cap) * 100) : 0;
                          const bc = pct >= 90 ? "var(--red)" : pct >= 65 ? "var(--orange)" : "var(--acid2)";
                          const isPast = new Date(c.startTime) < new Date();

                          return (
                            <motion.div 
                              key={c.id} 
                              variants={itemVariants}
                              whileHover={!isPast ? { y: -5, boxShadow: '0 10px 40px rgba(0,255,209,0.1)' } : {}}
                              className="glass" 
                              style={{ 
                                padding: '1.8rem', borderRadius: '24px', border: '1px solid var(--border)', 
                                background: isPast ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.01)', 
                                opacity: isPast ? 0.6 : 1, display: 'flex', flexDirection: 'column', gap: '1.2rem',
                                position: 'relative', overflow: 'hidden'
                              }}
                            >
                               {!isPast && (
                                 <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--acid2)', boxShadow: '0 0 15px var(--acid2)' }}></div>
                               )}
                               
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                                     <div style={{ 
                                       width: '56px', height: '56px', 
                                       background: isPast ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, var(--acid2), var(--blue))', 
                                       color: isPast ? 'var(--muted)' : '#000', borderRadius: '16px', 
                                       display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                       boxShadow: isPast ? 'none' : '0 10px 20px rgba(0,255,209,0.2)'
                                     }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 950, fontFamily: 'var(--font-d)' }}>{fmtTimeOnly(c.startTime)}</span>
                                     </div>
                                     <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '0.02em', color: '#fff' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                           <i className="fas fa-user-tie" style={{ color: 'var(--acid2)' }}></i> {c.instructor || "Bez trénera"}
                                        </div>
                                     </div>
                                  </div>
                                  <span className={`badge ${isPast ? 'b-grey' : 'b-frozen'}`} style={{ fontSize: '0.62rem', border: 'none', background: isPast ? 'rgba(255,255,255,0.05)' : 'rgba(0,123,255,0.1)', color: isPast ? 'var(--muted)' : 'var(--blue)' }}>
                                     {c.location || "Hlavná sála"}
                                  </span>
                               </div>

                               <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.6rem', fontWeight: 800 }}>
                                     <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kapacita lekcie</span>
                                     <span style={{ color: bc, fontFamily: 'var(--font-d)', fontSize: '0.9rem' }}>{b} / {cap}</span>
                                  </div>
                                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                     <motion.div 
                                       initial={{ width: 0 }} 
                                       animate={{ width: `${pct}%` }} 
                                       transition={{ duration: 1, ease: 'easeOut' }}
                                       style={{ background: bc, height: '100%', boxShadow: `0 0 10px ${bc}` }}
                                     />
                                  </div>
                               </div>

                               <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900 }}>
                                    <i className="fas fa-users" style={{marginRight: '0.5rem'}}></i> ZOZNAM
                                  </button>
                                  {!isPast && (
                                     <button className="btn btn-acid2 btn-sm" style={{ borderRadius: '12px', width: '42px', padding: 0 }}>
                                       <i className="fas fa-plus"></i>
                                     </button>
                                  )}
                               </div>
                            </motion.div>
                          );
                       })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </motion.div>
  );
}
