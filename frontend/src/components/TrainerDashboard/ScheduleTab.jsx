import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

const SK_DAYS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const COLORS = ['c-blue', 'c-acid', 'c-red', 'c-orange', 'c-cyan'];

export default function ScheduleTab() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

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

  useEffect(() => {
    loadData();
  }, []);

  const getWeekBounds = (weekOffset) => {
    const now = new Date();
    const mon = new Date(now);
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon, 6=Sun
    mon.setDate(now.getDate() - dow + weekOffset * 7);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    return { mon, sun };
  };

  const { mon, sun } = getWeekBounds(offset);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });

  const weekClasses = classes.filter(c => {
    const d = new Date(c.startTime);
    return d >= mon && d <= sun;
  });

  // Assign colors to unique classes
  const colorMap = {};
  let ci = 0;
  weekClasses.forEach(c => {
    if (!colorMap[c.id]) {
      colorMap[c.id] = COLORS[ci % COLORS.length];
      ci++;
    }
  });

  const formatDateStr = (d) => d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
  const weekLabel = `${formatDateStr(mon)} — ${formatDateStr(sun)} ${sun.getFullYear()}`;

  return (
    <div className="panel animate-in">
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: 32, height: 32, background: 'rgba(10,132,255,0.1)', color: 'var(--blue)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-calendar-alt"></i>
          </div>
          <span className="pt">Týždenný rozvrh tréningov</span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-xs" onClick={() => setOffset(o => o - 1)} style={{ borderRadius: '6px' }}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em', minWidth: 180, textAlign: 'center', color: 'var(--text)' }}>
            {weekLabel}
          </span>
          <button className="btn btn-ghost btn-xs" onClick={() => setOffset(o => o + 1)} style={{ borderRadius: '6px' }}>
            <i className="fas fa-chevron-right"></i>
          </button>
          <button className="btn btn-ghost btn-xs" onClick={() => setOffset(0)} style={{ borderLeft: '1px solid var(--border)', marginLeft: '0.5rem', paddingLeft: '0.8rem' }}>
            DNES
          </button>
        </div>
      </div>
      
      <div className="pb">
        <div style={{ display: 'flex', gap: '1.2rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'rgba(255,255,255,0.02)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <i className="fas fa-info-circle" style={{marginRight: '0.5rem', color: 'var(--blue)'}}></i>
            Kliknite na lekciu pre zobrazenie zoznamu prihlásených
          </div>
          <span className="method m-get">API: GET_SCHEDULE</span>
        </div>

        {loading ? (
          <div className="empty-state" style={{ minHeight: '300px' }}>
            <span className="spinner" style={{width: 32, height: 32}}></span>
            <p style={{marginTop: '1rem'}}>Generujem tvoj rozvrh...</p>
          </div>
        ) : (
          <div className="animate-in">
            <div className="schedule-wrap" style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '70px repeat(7, 1fr)', 
                  minWidth: 800, 
                }}
              >
                {/* Headers */}
                <div style={{ background: 'var(--surface2)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}></div>
                {dayDates.map((d, i) => {
                  const isToday = d.getTime() === todayDate.getTime();
                  return (
                    <div 
                      key={i} 
                      style={{ 
                        background: isToday ? 'rgba(10,132,255,0.08)' : 'var(--surface2)',
                        padding: '1rem 0.5rem',
                        textAlign: 'center',
                        fontFamily: 'var(--font-d)',
                        fontSize: '0.75rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: isToday ? 'var(--blue)' : 'var(--muted)',
                        borderRight: '1px solid var(--border)',
                        borderBottom: '1px solid var(--border)',
                        lineHeight: 1.4,
                        position: 'relative'
                      }}
                    >
                      {SK_DAYS[i]}<br />
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: isToday ? 'var(--blue)' : 'var(--text)' }}>
                        {d.getDate()}
                      </span>
                      {isToday && <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: '2px', background: 'var(--blue)', borderRadius: '2px 2px 0 0' }}></div>}
                    </div>
                  );
                })}

                {/* Grid */}
                {HOURS.map(h => (
                  <React.Fragment key={`h-${h}`}>
                    <div 
                      style={{
                        background: 'var(--surface2)',
                        padding: '1rem 0.5rem',
                        textAlign: 'center',
                        fontFamily: 'var(--font-d)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--muted2)',
                        borderRight: '1px solid var(--border)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                    {dayDates.map((d, i) => {
                      const isToday = d.getTime() === todayDate.getTime();
                      const cellClasses = weekClasses.filter(c => {
                        const cd = new Date(c.startTime);
                        return cd.toDateString() === d.toDateString() && cd.getHours() === h;
                      });

                      return (
                        <div 
                          key={`c-${h}-${i}`}
                          style={{
                            padding: '0.4rem',
                            borderRight: '1px solid var(--border)',
                            borderBottom: '1px solid var(--border)',
                            minHeight: 70,
                            background: isToday ? 'rgba(10,132,255,0.01)' : 'transparent',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = isToday ? 'rgba(10,132,255,0.01)' : 'transparent'}
                        >
                          {cellClasses.map(c => {
                            const colorClass = colorMap[c.id];
                            
                            // Color mapping
                            let bg, border, color;
                            if (colorClass === 'c-blue') { bg = 'rgba(10,132,255,0.1)'; border = 'var(--blue)'; color = 'var(--blue)'; }
                            if (colorClass === 'c-acid') { bg = 'rgba(200,255,0,0.08)'; border = 'var(--acid)'; color = 'var(--acid)'; }
                            if (colorClass === 'c-red') { bg = 'rgba(255,45,85,0.1)'; border = 'var(--red)'; color = 'var(--red)'; }
                            if (colorClass === 'c-orange') { bg = 'rgba(255,149,0,0.1)'; border = 'var(--orange)'; color = 'var(--orange)'; }
                            if (colorClass === 'c-cyan') { bg = 'rgba(0,255,209,0.08)'; border = 'var(--acid2)'; color = 'var(--acid2)'; }

                            return (
                              <div 
                                key={c.id}
                                title={`${c.name} | ${new Date(c.startTime).toLocaleTimeString('sk-SK',{hour:'2-digit',minute:'2-digit'})} | ${c.booked||0}/${c.capacity||'?'} miest`}
                                style={{
                                  borderRadius: '8px',
                                  padding: '0.5rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  marginBottom: '0.3rem',
                                  lineHeight: 1.3,
                                  background: bg,
                                  borderLeft: `3px solid ${border}`,
                                  color: color,
                                  borderTop: '1px solid rgba(255,255,255,0.05)',
                                  borderRight: '1px solid rgba(255,255,255,0.05)',
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = `0 4px 12px ${bg}`; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                              >
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || 'Lekcia'}</div>
                                <div style={{ opacity: 0.8, fontSize: '0.62rem', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between' }}>
                                  <span><i className="far fa-clock"></i> {new Date(c.startTime).getHours()}:00</span>
                                  <span><i className="fas fa-user-friends"></i> {c.booked || 0}/{c.capacity || '?'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {weekClasses.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: 'dashed 1px var(--border)', marginTop: '2rem' }}>
                <i className="fas fa-calendar-alt" style={{ display: 'block', fontSize: '3rem', marginBottom: '1rem', opacity: 0.1 }}></i>
                <p style={{fontSize: '0.95rem', fontWeight: 500}}>Na tento týždeň nemáte naplánované žiadne lekcie.</p>
                <p style={{fontSize: '0.8rem', marginTop: '0.4rem'}}>Skúste prepnúť na iný týždeň pomocou šípok vyššie.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
