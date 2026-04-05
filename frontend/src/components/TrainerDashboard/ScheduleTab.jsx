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
    <div className="panel">
      <div className="ph">
        <span className="pt">Týždenný rozvrh</span>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setOffset(o => o - 1)}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.92rem', letterSpacing: '0.05em', minWidth: 180, textAlign: 'center' }}>
            {weekLabel}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setOffset(o => o + 1)}>
            <i className="fas fa-chevron-right"></i>
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setOffset(0)}>
            <i className="fas fa-dot-circle"></i> Dnes
          </button>
        </div>
      </div>
      
      <div className="pb">
        <div style={{ display: 'flex', gap: '1.2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(10,132,255,0.3)', borderLeft: '2px solid var(--blue)', marginRight: 4, borderRadius: 1 }}></span>
            Lekcie
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Rozvrh je generovaný z tvojich lekcií v systéme
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <span className="spinner"></span>
            <p>Načítavam rozvrh...</p>
          </div>
        ) : (
          <>
            <div className="schedule-wrap" style={{ overflowX: 'auto' }}>
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '60px repeat(7, 1fr)', 
                  minWidth: 720, 
                  border: '1px solid var(--border)', 
                  borderRadius: 4, 
                  overflow: 'hidden' 
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
                        background: isToday ? 'rgba(10,132,255,0.06)' : 'var(--surface2)',
                        padding: '0.6rem 0.4rem',
                        textAlign: 'center',
                        fontFamily: 'var(--font-d)',
                        fontSize: '0.7rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: isToday ? 'var(--blue)' : 'var(--muted)',
                        borderRight: '1px solid var(--border)',
                        borderBottom: '1px solid var(--border)',
                        lineHeight: 1.4
                      }}
                    >
                      {SK_DAYS[i]}<br />
                      <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 700 : 400 }}>
                        {d.getDate()}.{d.getMonth() + 1}.
                      </span>
                    </div>
                  );
                })}

                {/* Grid */}
                {HOURS.map(h => (
                  <React.Fragment key={`h-${h}`}>
                    <div 
                      style={{
                        background: 'var(--surface)',
                        padding: '0.5rem 0.35rem',
                        textAlign: 'right',
                        fontFamily: 'var(--font-d)',
                        fontSize: '0.65rem',
                        color: 'var(--muted2)',
                        borderRight: '1px solid var(--border)',
                        borderBottom: '1px solid var(--border)'
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
                            padding: '0.3rem',
                            borderRight: '1px solid var(--border)',
                            borderBottom: '1px solid var(--border)',
                            minHeight: 52,
                            background: isToday ? 'rgba(10,132,255,0.025)' : 'var(--surface)'
                          }}
                        >
                          {cellClasses.map(c => {
                            const colorClass = colorMap[c.id];
                            
                            // Emulate original CSS classes logic
                            let bg, border, color;
                            if (colorClass === 'c-blue') { bg = 'rgba(10,132,255,0.18)'; border = 'var(--blue)'; color = '#a8cfff'; }
                            if (colorClass === 'c-acid') { bg = 'rgba(200,255,0,0.1)'; border = 'var(--acid)'; color = '#d6ff5e'; }
                            if (colorClass === 'c-red') { bg = 'rgba(255,45,85,0.12)'; border = 'var(--red)'; color = '#ff8099'; }
                            if (colorClass === 'c-orange') { bg = 'rgba(255,149,0,0.12)'; border = 'var(--orange)'; color = '#ffc266'; }
                            if (colorClass === 'c-cyan') { bg = 'rgba(0,255,209,0.1)'; border = 'var(--acid2)'; color = '#66ffe8'; }

                            return (
                              <div 
                                key={c.id}
                                title={`${c.name} | ${new Date(c.startTime).toLocaleTimeString('sk-SK',{hour:'2-digit',minute:'2-digit'})} | ${c.booked||0}/${c.capacity||'?'} miest`}
                                style={{
                                  borderRadius: 3,
                                  padding: '0.25rem 0.4rem',
                                  fontSize: '0.68rem',
                                  fontWeight: 500,
                                  cursor: 'default',
                                  marginBottom: 2,
                                  lineHeight: 1.35,
                                  background: bg,
                                  borderLeft: `2px solid ${border}`,
                                  color: color
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>{c.name || '—'}</div>
                                <div style={{ opacity: 0.75, fontSize: '0.62rem' }}>
                                  {new Date(c.startTime).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })} · {c.booked || 0}/{c.capacity || '?'}
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
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                <i className="fas fa-calendar-times" style={{ display: 'block', fontSize: '1.8rem', marginBottom: '0.6rem', opacity: 0.3 }}></i>
                Žiadne lekcie tento týždeň — použi navigáciu na iný týždeň.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
