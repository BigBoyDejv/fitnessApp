import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

const SK_DAYS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const COLORS = ['c-blue', 'c-acid', 'c-red', 'c-orange', 'c-cyan', 'c-purple'];

export default function ClassesAdminTab() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  
  // View Settings
  const [viewMode, setViewMode] = useState('calendar'); // 'table' or 'calendar'
  const [weekOffset, setWeekOffset] = useState(0);
  
  // Search & Filter (for table)
  const [search, setSearch] = useState('');
  
  const loadClasses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authenticatedFetch('/api/classes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Chyba načítania lekcií');
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(`Naozaj chcete zmazať túto lekciu?`)) return;
    try {
      const res = await authenticatedFetch(`/api/classes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMsg({ text: 'Lekcia odstránená', type: 'ok' });
        loadClasses();
      }
    } catch (e) {
      setMsg({ text: e.message, type: 'err' });
    }
  };

  // Calendar Helpers
  const getWeekBounds = (offset) => {
    const now = new Date();
    const mon = new Date(now);
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    mon.setDate(now.getDate() - dow + offset * 7);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    return { mon, sun };
  };

  const { mon, sun } = getWeekBounds(weekOffset);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });

  const weekClasses = classes.filter(c => {
    const d = new Date(c.startTime);
    return d >= mon && d <= sun;
  });

  // Table Sorting & Filtering
  const filteredTable = classes.filter(c => 
    !search || (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.instructor || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a,b) => new Date(a.startTime) - new Date(b.startTime));

  const weekLabel = `${mon.toLocaleDateString('sk-SK', {day:'numeric', month:'numeric'})} — ${sun.toLocaleDateString('sk-SK', {day:'numeric', month:'numeric', year:'numeric'})}`;

  return (
    <div className="animate-in">
      <div className="panel" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
        <div className="ph" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(200,255,0,0.1)', color: 'var(--acid)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={viewMode === 'calendar' ? "fas fa-calendar-alt" : "fas fa-list"}></i>
            </div>
            <span className="pt">ROZVRH VŠETKÝCH LEKCIÍ</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.3rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <button 
              className={`btn btn-xs ${viewMode === 'calendar' ? 'btn-acid' : 'btn-ghost'}`} 
              onClick={() => setViewMode('calendar')}
              style={{ borderRadius: '7px', padding: '0.4rem 0.8rem' }}
            >
              <i className="fas fa-th" style={{marginRight:'0.4rem'}}></i> KALENDÁR
            </button>
            <button 
              className={`btn btn-xs ${viewMode === 'table' ? 'btn-blue' : 'btn-ghost'}`} 
              onClick={() => setViewMode('table')}
              style={{ borderRadius: '7px', padding: '0.4rem 0.8rem' }}
            >
              <i className="fas fa-table" style={{marginRight:'0.4rem'}}></i> TABUĽKA
            </button>
          </div>
        </div>

        <div className="pb" style={{ padding: '1.2rem' }}>
          {/* Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
             {viewMode === 'calendar' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setWeekOffset(o => o - 1)}><i className="fas fa-chevron-left"></i></button>
                      <button className="btn btn-ghost btn-xs" onClick={() => setWeekOffset(0)} style={{fontWeight:900}}>DNES</button>
                      <button className="btn btn-ghost btn-xs" onClick={() => setWeekOffset(o => o + 1)}><i className="fas fa-chevron-right"></i></button>
                   </div>
                   <span style={{ fontFamily: 'var(--font-d)', fontSize: '1.05rem', fontWeight: 900, color: 'var(--text)' }}>{weekLabel}</span>
                </div>
             ) : (
                <div style={{ position: 'relative', width: 300 }}>
                  <i className="fas fa-search" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.8rem' }}></i>
                  <input className="fi" placeholder="Rýchle hľadanie v zozname..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.4rem', borderRadius: '8px' }} />
                </div>
             )}
             <button className="btn btn-ghost btn-xs" onClick={loadClasses}><i className="fas fa-sync-alt"></i></button>
          </div>

          {msg.text && <div className={`fm ${msg.type} animate-in`} style={{ marginBottom: '1rem', borderRadius: '10px' }}>{msg.text}</div>}

          {loading ? (
             <div className="empty-state" style={{ minHeight: 300 }}><span className="spinner" style={{width: 32, height: 32}}></span></div>
          ) : viewMode === 'calendar' ? (
             /* CALENDAR VIEW */
             <div className="animate-in">
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', minWidth: 900 }}>
                      <div style={{ background: 'var(--surface2)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}></div>
                      {dayDates.map((d, i) => {
                         const isToday = d.getTime() === today.getTime();
                         return (
                            <div key={i} style={{ background: isToday ? 'rgba(200,255,0,0.03)' : 'var(--surface2)', padding: '0.8rem 0.5rem', textAlign: 'center', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                               <div style={{ fontSize: '0.65rem', color: isToday ? 'var(--acid)' : 'var(--muted)', fontWeight: 900, textTransform: 'uppercase' }}>{SK_DAYS[i]}</div>
                               <div style={{ fontSize: '1.2rem', fontWeight: 950, color: isToday ? 'var(--acid)' : 'var(--text)' }}>{d.getDate()}</div>
                               {isToday && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'var(--acid)' }}></div>}
                            </div>
                         );
                      })}

                      {HOURS.map(h => (
                         <React.Fragment key={`h-${h}`}>
                            <div style={{ background: 'var(--surface2)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted2)' }}>{String(h).padStart(2,'0')}:00</div>
                            {dayDates.map((d, i) => {
                               const cellClasses = weekClasses.filter(c => {
                                  const cd = new Date(c.startTime);
                                  return cd.toDateString() === d.toDateString() && cd.getHours() === h;
                               });
                               return (
                                  <div key={`${h}-${i}`} style={{ padding: '0.3rem', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', minHeight: 80, background: d.getTime() === today.getTime() ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                     {cellClasses.map(c => (
                                        <div 
                                          key={c.id} 
                                          onClick={() => handleDelete(c.id)}
                                          title={`Kliknutím zmazať: ${c.name} (${c.instructor})`}
                                          style={{ 
                                            padding: '0.4rem', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 800, marginBottom: '0.2rem', cursor: 'pointer',
                                            background: 'rgba(200,255,0,0.1)', borderLeft: '3px solid var(--acid)', color: 'var(--acid)', transition: 'transform 0.2s'
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                           <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                           <div style={{ opacity: 0.7, fontSize: '0.6rem', marginTop:'0.2rem' }}>{c.instructor}</div>
                                        </div>
                                     ))}
                                  </div>
                               );
                            })}
                         </React.Fragment>
                      ))}
                   </div>
                </div>
             </div>
          ) : (
             /* TABLE VIEW */
             <div className="animate-in">
                <table className="dt dt-compact">
                   <thead>
                      <tr>
                         <th>Lekcia</th>
                         <th>Tréner</th>
                         <th>Termín</th>
                         <th>Miesto</th>
                         <th style={{ textAlign: 'right' }}>Akcie</th>
                      </tr>
                   </thead>
                   <tbody>
                      {filteredTable.map(c => (
                         <tr key={c.id}>
                            <td>
                               <div style={{fontWeight:800}}>{c.name}</div>
                               <div style={{fontSize:'0.65rem', color: 'var(--acid2)', textTransform:'uppercase'}}>{c.type}</div>
                            </td>
                            <td>{c.instructor}</td>
                            <td>{new Date(c.startTime).toLocaleString('sk-SK', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
                            <td style={{color:'var(--muted)'}}>{c.location || '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                               <button 
                                 className="btn-icon-v2" 
                                 onClick={() => handleDelete(c.id)} 
                                 style={{ color: 'var(--red)', background: 'rgba(255,45,85,0.05)', border: '1px solid rgba(255,45,85,0.1)' }}
                                 title="Zmazať lekciu"
                               >
                                 <i className="fas fa-trash-alt"></i>
                               </button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
