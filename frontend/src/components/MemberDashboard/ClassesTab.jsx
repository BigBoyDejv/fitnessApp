import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function ClassesTab({ setActiveTab }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMyClasses(); }, []);

  const loadMyClasses = async () => {
    try {
      const res = await authenticatedFetch('/api/classes/my');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Chyba servera');
      
      // Sort by date/time
      const sorted = Array.isArray(data) ? data.sort((a,b) => new Date(a.startTime) - new Date(b.startTime)) : [];
      setClasses(sorted);
    } catch { setClasses([]); }
    finally { setLoading(false); }
  };

  const cancelClass = async (id) => {
    if (!id) return;
    console.log('CLIENT: Cancelling class ID from timeline:', id);
    if (!window.confirm('Naozaj zrušiť rezerváciu?')) return;
    
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/classes/${id}/cancel`, { method: 'DELETE' });
      const text = await res.text();
      console.log('CLIENT: Server response:', res.status, text);
      
      if (res.ok) {
        // V member.html volajú loadMyClasses()
        await loadMyClasses();
      } else {
        throw new Error('Nepodarilo sa zrušiť rezerváciu.');
      }
    } catch (e) {
      console.error('CLIENT ERROR:', e);
      alert('Chyba: ' + e.message);
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
                             <span className="t-tag">SKUPINOVÁ LEKCIA</span>
                             <div className="t-status">{isPast ? 'UKONČENÁ' : 'AKTÍVNA'}</div>
                          </div>
                          <div className="t-main">
                             <div className="t-title">{c.className || c.name}</div>
                             <div className="t-info">
                                <span><i className="fas fa-user-circle" /> {c.instructor || 'Tím Coach'}</span>
                                <span className="sep">&bull;</span>
                                <span><i className="fas fa-map-marker-alt" /> Sála 2</span>
                             </div>
                          </div>
                           {!isPast && (
                              <div className="t-actions">
                                 <button className="btn btn-red btn-sm" onClick={() => cancelClass(c.id)} disabled={loading}>
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
    </div>
  );
}
