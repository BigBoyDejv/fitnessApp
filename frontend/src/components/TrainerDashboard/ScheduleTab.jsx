import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

const SK_DAYS = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];
const SK_DAYS_SHORT = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

export default function ScheduleTab() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 850);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 850);
    window.addEventListener('resize', handleResize);
    loadData();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/trainer/classes');
      const data = await res.json();
      if (res.ok) {
        setClasses(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getWeekBounds = (weekOffset) => {
    const now = new Date();
    const mon = new Date(now);
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1; 
    mon.setDate(now.getDate() - dow + weekOffset * 7);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    return { mon, sun };
  };

  const { mon, sun } = getWeekBounds(offset);
  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });

  const weekClasses = classes.filter(c => {
    const d = new Date(c.startTime);
    return d >= mon && d <= sun;
  });

  const formatDateStr = (d) => d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
  const weekLabel = `${formatDateStr(mon)} — ${formatDateStr(sun)} ${sun.getFullYear()}`;

  // Pomocná funkcia na získanie lekcií pre konkrétny dátum
  const getClassesForDate = (date) => {
    return weekClasses.filter(c => new Date(c.startTime).toDateString() === date.toDateString());
  };

  const renderMobileSchedule = () => {
    const selectedDate = dayDates[selectedDayIdx];
    const dayClasses = getClassesForDate(selectedDate).sort((a,b) => new Date(a.startTime) - new Date(b.startTime));

    return (
      <div className="mobile-schedule animate-in">
        {/* Vylepšený prepínač dní s vizuálnymi bodkami */}
        <div className="day-selector-scroll" style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', padding: '0.5rem 0.2rem', marginBottom: '2rem', scrollbarWidth: 'none' }}>
           {dayDates.map((d, i) => {
             const active = i === selectedDayIdx;
             const dailyClasses = getClassesForDate(d);
             const dots = Math.min(dailyClasses.length, 3); // Max 3 bodky

             return (
               <button 
                 key={i} 
                 onClick={() => setSelectedDayIdx(i)}
                 style={{
                   flex: '0 0 72px',
                   height: '84px',
                   borderRadius: '20px',
                   border: active ? '2px solid var(--blue)' : '1px solid var(--border)',
                   background: active ? 'rgba(10,132,255,0.12)' : 'rgba(255,255,255,0.02)',
                   display: 'flex',
                   flexDirection: 'column',
                   alignItems: 'center',
                   justifyContent: 'center',
                   gap: '0.2rem',
                   transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                   cursor: 'pointer',
                   position: 'relative',
                   boxShadow: active ? '0 8px 20px rgba(10, 132, 255, 0.2)' : 'none'
                 }}
               >
                 <span style={{ fontSize: '0.65rem', fontWeight: 850, color: active ? 'var(--blue)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{SK_DAYS_SHORT[i]}</span>
                 <span style={{ fontSize: '1.25rem', fontWeight: 950, color: active ? 'var(--blue)' : 'var(--text)', fontFamily: 'var(--font-d)' }}>{d.getDate()}</span>
                 
                 {/* Bodky znázorňujúce plánované lekcie */}
                 <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                    {Array.from({ length: dots }).map((_, di) => (
                      <div key={di} style={{ width: '4px', height: '4px', borderRadius: '50%', background: active ? 'var(--blue)' : 'rgba(10,132,255,0.4)', boxShadow: active ? '0 0 5px var(--blue)' : 'none' }} />
                    ))}
                    {dailyClasses.length > 3 && <div style={{ fontSize: '8px', color: 'var(--blue)', marginLeft: '1px' }}>+</div>}
                 </div>
               </button>
             );
           })}
        </div>

        <div className="daily-timeline">
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-d)', letterSpacing: '0.03em' }}>
                {SK_DAYS[selectedDayIdx]} <span style={{ color: 'var(--blue)', opacity: 0.6 }}>/</span> <span style={{ color: 'var(--muted)' }}>{formatDateStr(selectedDate)}</span>
              </h3>
              <div className="badge b-blue" style={{ fontSize: '0.65rem' }}>{dayClasses.length} {dayClasses.length === 1 ? 'LEKCIA' : 'LEKCIE'}</div>
           </div>

           {dayClasses.length === 0 ? (
             <div style={{ padding: '4rem 1rem', textAlign: 'center', background: 'var(--surface2)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
               <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <i className="fas fa-bed" style={{ opacity: 0.1, fontSize: '1.8rem' }} />
               </div>
               <p style={{ color: 'var(--muted)', fontSize: '0.95rem', fontWeight: 600 }}>Tento deň máte voľno.</p>
               <p style={{ color: 'var(--muted2)', fontSize: '0.8rem', marginTop: '0.3rem' }}>Užite si regeneráciu!</p>
             </div>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
               {dayClasses.map((c, idx) => {
                 const st = new Date(c.startTime);
                 const time = st.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
                 const isPassed = st < new Date();
                 return (
                   <div key={c.id} className="trainer-class-card-mobile animate-in" style={{ 
                      padding: '1.25rem', 
                      borderRadius: '24px', 
                      display: 'flex', 
                      gap: '1.2rem', 
                      alignItems: 'center', 
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      opacity: isPassed ? 0.5 : 1,
                      animationDelay: `${idx * 0.1}s`,
                      position: 'relative',
                      overflow: 'hidden'
                   }}>
                      <div style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: 950, 
                        fontFamily: 'var(--font-d)', 
                        color: isPassed ? 'var(--muted)' : 'var(--blue)', 
                        borderRight: '1px solid var(--border)', 
                        paddingRight: '1.2rem',
                        minWidth: '65px',
                        textAlign: 'center'
                      }}>
                        {time}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{c.name}</div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                           <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <i className="fas fa-users" style={{ color: 'var(--blue)' }} /> {c.booked||0}/{c.capacity}
                           </span>
                           <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <i className="fas fa-map-marker-alt" style={{ color: 'var(--blue)' }} /> Sála 1
                           </span>
                        </div>
                      </div>
                      <div style={{ padding: '0.5rem', opacity: 0.3 }}>
                         <i className="fas fa-chevron-right" />
                      </div>
                      {isPassed && <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.6rem', fontWeight: 900, color: 'var(--muted2)', textTransform: 'uppercase' }}>UKONČENÉ</div>}
                   </div>
                 );
               })}
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderDesktopGrid = () => {
    return (
       <div className="schedule-desktop-view animate-in">
          <div className="schedule-table-card" style={{ overflowX: 'auto', borderRadius: '24px', border: '1px solid var(--border)', background: 'rgba(10, 10, 15, 0.4)', backdropFilter: 'blur(20px)' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
                <thead>
                   <tr>
                      <th style={{ width: '80px', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}></th>
                      {dayDates.map((d, i) => (
                        <th key={i} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                           <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>{SK_DAYS_SHORT[i]}</div>
                           <div style={{ fontSize: '1.6rem', fontWeight: 950, fontFamily: 'var(--font-d)', color: 'var(--text)' }}>{d.getDate()}</div>
                        </th>
                      ))}
                   </tr>
                </thead>
                <tbody>
                   {[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(h => (
                     <tr key={h}>
                        <td style={{ padding: '1.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--border)', fontSize: '0.9rem', fontWeight: 900, fontFamily: 'var(--font-d)', color: 'var(--muted2)' }}>{h}:00</td>
                        {dayDates.map((d, i) => {
                           const cellClasses = getClassesForDate(d).filter(c => new Date(c.startTime).getHours() === h);
                           return (
                             <td key={i} style={{ border: '1px solid var(--border)', padding: '0.5rem', height: '100px', verticalAlign: 'top', background: 'rgba(255,255,255,0.01)' }}>
                                {cellClasses.map(c => (
                                  <div key={c.id} className="trainer-class-tag glass highlight blue" style={{ padding: '0.6rem 0.8rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.4rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                                     <div style={{ marginBottom: '2px' }}>{c.name}</div>
                                     <div style={{ opacity: 0.7, fontSize: '0.65rem' }}>{c.booked}/{c.capacity} osôb</div>
                                  </div>
                                ))}
                             </td>
                           );
                        })}
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    );
  };

  return (
    <div className="schedule-tab-root animate-in">
      {/* Vylepšený Responsive Hero Header */}
      <div className="overview-hero trainer" style={{ 
        position: 'relative', 
        padding: isMobile ? '1.8rem 1.5rem' : '2.5rem 2rem', 
        borderRadius: isMobile ? '24px' : '28px',
        marginBottom: '2rem',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: isMobile ? '2rem' : '2.8rem', marginBottom: '0.5rem', fontWeight: 950, letterSpacing: '0.02em' }}>VÁŠ ROZVRH</h1>
          <p style={{ opacity: 0.7, fontSize: isMobile ? '0.85rem' : '1rem', maxWidth: isMobile ? '220px' : '100%' }}>Efektívny prehľad vašich tréningov a voľného času.</p>
        </div>
        <div className="hero-visual" style={{ fontSize: isMobile ? '4rem' : '6rem', right: '10px', top: '10px' }}>
          <i className="fas fa-calendar-alt" style={{ opacity: 0.15 }} />
        </div>
      </div>

      <div className="panel" style={{ borderRadius: isMobile ? '28px' : '32px', border: 'none', background: 'transparent' }}>
        <div className="ph" style={{ borderBottom: 'none', padding: isMobile ? '0 0 1.5rem' : '0 1rem 2rem', justifyContent: 'space-between', background: 'transparent' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setOffset(o => o - 1)} style={{ width: '42px', height: '42px', borderRadius: '12px' }}>
                 <i className="fas fa-chevron-left" />
              </button>
              <span style={{ fontFamily: 'var(--font-d)', fontSize: isMobile ? '1.1rem' : '1.4rem', fontWeight: 900, textTransform: 'uppercase' }}>{weekLabel}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setOffset(o => o + 1)} style={{ width: '42px', height: '42px', borderRadius: '12px' }}>
                 <i className="fas fa-chevron-right" />
              </button>
           </div>
           {!isMobile && (
             <button className="btn btn-acid btn-sm" onClick={() => setOffset(0)} style={{ minWidth: '100px' }}>Dnes</button>
           )}
        </div>
        
        <div style={{ padding: 0 }}>
           {loading ? (
             <div style={{ textAlign: 'center', padding: '6rem 0' }}><span className="spinner" style={{width: 44, height: 44}}></span></div>
           ) : (
             isMobile ? renderMobileSchedule() : renderDesktopGrid()
           )}
        </div>
      </div>
    </div>
  );
}
