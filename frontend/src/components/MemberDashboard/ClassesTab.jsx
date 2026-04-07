import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function ClassesTab({ setActiveTab }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { loadMyClasses(); }, []);

  const loadMyClasses = async () => {
    try {
      const [resC, resP] = await Promise.all([
        authenticatedFetch('/api/classes/my'),
        authenticatedFetch('/api/personal-sessions/my')
      ]);

      let combined = [];
      if (resC.ok) {
        const dataC = await resC.json();
        if (Array.isArray(dataC)) combined = [...combined, ...dataC.map(c => ({ ...c, isPersonal: false, className: c.name }))];
      }
      if (resP.ok) {
        const dataP = await resP.json();
        if (Array.isArray(dataP)) combined = [...combined, ...dataP.map(p => ({ ...p, isPersonal: true, className: p.title, instructor: p.trainerName }))];
      }
      
      const sorted = combined.sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
      setClasses(sorted);
    } catch { setClasses([]); }
    finally { setLoading(false); }
  };

  const cancelClass = async (e, id) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!id) return;
    
    const confirmed = window.confirm('Naozaj zrušiť rezerváciu?');
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/classes/${id}/cancel`, { method: 'DELETE' });
      const text = await res.text();
      
      if (res.ok) {
        showToast('Rezervácia zrušená', 'ok');
        await loadMyClasses();
      } else {
        let d = {}; try { d = JSON.parse(text); } catch { d = { message: text }; }
        showToast(d.message || 'Nepodarilo sa zrušiť rezerváciu.', 'err');
      }
    } catch (e) {
      showToast(e.message, 'err');
    } finally {
      setLoading(false);
    }
  };

  const formatDay = (iso) => {
     const d = new Date(iso);
     const today = new Date();
     if (d.toDateString() === today.toDateString()) return 'DNES';
     today.setDate(today.getDate() + 1);
     if (d.toDateString() === today.toDateString()) return 'ZAJTRA';
     return d.toLocaleDateString('sk-SK', { weekday: 'long' }).toUpperCase();
  };

  const formatFullDate = (iso) => {
     return new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' });
  };

  return (
    <div className="ps active animate-in" id="pg-classes">
      <div className="classes-timeline-container">
        {loading ? (
           <div className="empty-state"><span className="spin" /></div>
        ) : classes.length === 0 ? (
           <div className="timeline-empty">
              <i className="fas fa-calendar-alt" />
              <p>Nemáš žiadne rezervácie.</p>
              <button className="btn btn-acid btn-sm" onClick={() => setActiveTab('book-class')}>REZERVOVAŤ PRVÚ LEKCIU</button>
           </div>
        ) : (
          <div className="timeline-feed">
             {classes.map((c, idx) => {
               const isPast = c.startTime && new Date(c.startTime) < new Date();
               const showDayHeader = idx === 0 || formatDay(classes[idx-1].startTime) !== formatDay(c.startTime);

               return (
                 <React.Fragment key={c.id}>
                    {showDayHeader && (
                      <div className="timeline-day-separator">
                         <span className="day-name">{formatDay(c.startTime)}</span>
                         <span className="day-date">{formatFullDate(c.startTime)}</span>
                      </div>
                    )}
                    <div className={`timeline-card ${isPast ? 'past' : 'active'}`}>
                       <div className="t-time-column">
                          <div className="t-hour">{new Date(c.startTime).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="t-dot" />
                       </div>
                        <div className="t-content-card">
                           <div className="t-header">
                              <span className={`t-tag ${c.isPersonal ? 'personal' : ''}`}>{c.isPersonal ? 'SÚKROMNÝ TRÉNING' : 'SKUPINOVÁ LEKCIA'}</span>
                              <div className="t-status">{isPast ? 'UKONČENÁ' : 'AKTÍVNA'}</div>
                           </div>
                           <div className="t-main">
                              <div className="t-title">{c.className}</div>
                              <div className="t-info">
                                 <span><i className="fas fa-user-circle" /> {c.instructor || 'Tím Coach'}</span>
                                 <span className="sep">&bull;</span>
                                 <span><i className="fas fa-map-marker-alt" /> {c.isPersonal ? 'Osobná zóna' : 'Sála 2'}</span>
                              </div>
                           </div>
                           {!isPast && (
                              <div className="t-actions">
                                 <button className="btn btn-red btn-sm" onClick={(e) => cancelClass(e, c.id)} disabled={loading}>
                                    <i className="fas fa-times" /> ZRUŠIŤ
                                 </button>
                              </div>
                           )}
                       </div>
                    </div>
                 </React.Fragment>
               );
             })}
          </div>
        )}
      </div>
      {toast && (
        <div className={`toast-message toast-${toast.type}`}>
          {toast.type === 'ok' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  );
}
