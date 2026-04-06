import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../utils/api";

export default function ClassesTab() {
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("upcoming");
  const [loading, setLoading] = useState(false);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

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
      console.error(e);
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

  return (
    <div className="animate-in">
      <div className="panel animate-in">
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(0,255,209,0.1)', color: 'var(--acid2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-calendar-alt"></i>
            </div>
            <span className="pt">Plán tréningov a lekcií</span>
          </div>
          <div style={{ display: "flex", gap: "0.8rem" }}>
             <button className="btn btn-ghost btn-xs" onClick={loadClasses}><i className="fas fa-sync-alt"></i> OBNOVIŤ</button>
             <button 
                className={`btn btn-xs ${showPast ? 'btn-blue' : 'btn-ghost'}`} 
                onClick={() => setShowPast(!showPast)}
                style={{ borderRadius: '6px' }}
             >
               <i className={`fas fa-eye${showPast ? '' : '-slash'}`}></i> MINULÉ
             </button>
          </div>
        </div>
        <div className="pb" style={{ padding: '1rem' }}>
          {/* Professional Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
              <input 
                className="fi" 
                type="text" 
                placeholder="Hľadať lekciu alebo trénera..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.8rem', borderRadius: '10px' }}
              />
            </div>
            <select className="fi" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ maxWidth: "180px", borderRadius: '10px' }}>
              <option value="upcoming">Nadchádzajúce</option>
              <option value="today">Dnes</option>
              <option value="">Celý týždeň</option>
            </select>
          </div>

          {loading ? (
            <div className="empty-state"><span className="spinner"></span></div>
          ) : Object.keys(groupedClasses).length === 0 ? (
            <div className="empty-state" style={{ padding: '4rem' }}>
              <i className="fas fa-calendar-times" style={{ fontSize: '3.5rem', opacity: 0.1, marginBottom: '1.5rem' }}></i>
              <p style={{ fontWeight: 700 }}>Žiadne lekcie nenájdené</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Skúste upraviť filtre alebo zobraziť minulé lekcie.</p>
            </div>
          ) : (
            Object.entries(groupedClasses).map(([label, items]) => (
              <div key={label} style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem', padding: '0 0.5rem' }}>
                   <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, var(--acid2), transparent)', opacity: 0.2 }}></div>
                   <h3 style={{ fontSize: '0.9rem', color: 'var(--acid2)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 900, marginBottom: 0 }}>{label}</h3>
                   <div style={{ height: '1px', flex: 5, background: 'linear-gradient(90deg, transparent, var(--border))', opacity: 0.5 }}></div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                   {items.map(c => {
                      const b = c.booked || 0;
                      const cap = c.capacity || 0;
                      const pct = cap ? Math.round((b / cap) * 100) : 0;
                      const bc = pct >= 90 ? "var(--red)" : pct >= 60 ? "var(--orange)" : "var(--acid2)";
                      const isPast = new Date(c.startTime) < new Date();

                      return (
                        <div key={c.id} className="glass animate-in" style={{ padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--border)', background: isPast ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.02)', opacity: isPast ? 0.6 : 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                 <div style={{ width: '48px', height: '48px', background: isPast ? 'var(--surface2)' : 'linear-gradient(135deg, var(--acid2), var(--blue))', color: isPast ? 'var(--muted)' : '#000', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 950, lineHeight: 1 }}>{fmtTimeOnly(c.startTime)}</span>
                                 </div>
                                 <div>
                                    <div style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '0.02em' }}>{c.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                       <i className="fas fa-user"></i> {c.instructor || "Bez trénera"}
                                    </div>
                                 </div>
                              </div>
                              <span className={`badge ${isPast ? 'b-grey' : 'b-acid2'}`} style={{ fontSize: '0.6rem' }}>
                                 {c.location || "Hlavná sála"}
                              </span>
                           </div>

                           <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.4rem', fontWeight: 800 }}>
                                 <span style={{ color: 'var(--muted)', textTransform: 'uppercase' }}>Obsadenosť</span>
                                 <span style={{ color: bc }}>{b} / {cap} miest</span>
                              </div>
                              <div className="occ-track" style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                 <div className="occ-fill" style={{ width: `${pct}%`, background: bc, height: '100%', transition: 'width 0.3s' }}></div>
                              </div>
                           </div>
                        </div>
                      );
                   })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
