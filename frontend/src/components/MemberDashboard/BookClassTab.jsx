// ─── BookClassTab.jsx ──────────────────────────────────────────────────────────
// Oprava: fm CSS trieda — treba "fm ok" alebo "fm err", nie "fm show"

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export function BookClassTab({ setActiveTab }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [forceWaitingIds, setForceWaitingIds] = useState(() => {
    const saved = localStorage.getItem('waiting_ids');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem('waiting_ids', JSON.stringify([...forceWaitingIds]));
  }, [forceWaitingIds]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookMsg, setBookMsg] = useState({ text: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { loadAllClasses(); }, []);

  const loadAllClasses = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      // Pridané ?t= pre obídenie browser cache
      const res = await authenticatedFetch(`/api/classes?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setClasses(data);

        // ČISTENIE FAILSAFE: Vymažeme ID len vtedy, ak už máme POTVRDENIE od backendu, 
        // že o nás vie (či už ako o čakajúcom alebo rezervovanom).
        setForceWaitingIds(prev => {
          const next = new Set(prev);
          data.forEach(c => {
            // Ak backend už potvrdil jeden z týchto stavov, môžeme vymazať našu lokálnu vynútenú hodnotu
            if (c.isWaiting || c.isReserved) {
              next.delete(String(c.id));
            }
          });
          return next;
        });

        // AKTUALIZÁCIA: Hlboké priradenie hodnôt pre istotu rerenderu
        if (selectedClass) {
          const fresh = data.find(c => String(c.id) === String(selectedClass.id));
          if (fresh) setSelectedClass({ ...fresh });
        }
        return data;
      } else {
        setError('Nepodarilo sa načítať lekcie.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const bookClass = async (id) => {
    const sId = String(id);
    setActionLoading(true);
    setBookMsg({ text: '', type: '' });
    try {
      const res = await authenticatedFetch(`/api/classes/${id}/book`, { method: 'POST' });
      const text = await res.text();
      let d = {}; try { d = JSON.parse(text); } catch { d = { message: text || 'OK' }; }

      const target = classes.find(cl => String(cl.id) === sId);
      const isActuallyFull = target ? (target.booked >= target.capacity) : false;

      if (!res.ok) {
        // Ak už je rezervovaný, hneď refreshneme, aby sa ukázal správny stav
        if (d.message && d.message.includes('Už si rezervovaný')) {
          await loadAllClasses(true);
          return;
        }
        throw new Error(d.message || 'Chyba servera');
      }

      if (isActuallyFull) {
        setForceWaitingIds(prev => new Set([...prev, sId]));
      }

      await loadAllClasses(true);
      showToast(isActuallyFull ? 'Úspešne pridané na čakačku' : 'Rezervácia potvrdená!', 'ok');
    } catch (e) {
      setBookMsg({ text: e.message, type: 'err' });
    } finally {
      setActionLoading(false);
    }
  };

  const cancelClass = async (e, id) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const sId = String(id);
    setActionLoading(true);
    try {
      const res = await authenticatedFetch(`/api/classes/${id}/cancel`, { method: 'POST' });
      const text = await res.text();
      if (res.ok) {
        setForceWaitingIds(prev => {
          const next = new Set(prev);
          next.delete(sId);
          return next;
        });
        showToast('Rezervácia zrušená', 'ok');
        await loadAllClasses(true);
        setSelectedClass(null); // Zatvor detail
      } else {
        let d = {}; try { d = JSON.parse(text); } catch { d = { message: text }; }
        showToast(d.message || 'Nepodarilo sa zrušiť rezerváciu.', 'err');
      }
    } catch (e) {
      console.error('CLIENT ERROR:', e);
      showToast(e.message, 'err');
    } finally {
      setActionLoading(false);
    }
  };

  const renderDetail = () => {
    if (!selectedClass) return (
      <div className="empty" style={{ padding: '3rem' }}>
        <i className="fas fa-hand-pointer" />
        <p>Vyber lekciu zo zoznamu pre detaily a rezerváciu.</p>
      </div>
    );

    const c = selectedClass;
    // AK NEMÁ POZÍCIU (.), považujeme ho za aktívneho (prianie užívateľa)
    const hasPosition = c.waitlistPosition && c.waitlistPosition > 0;
    const isWaiting = !c.isReserved && hasPosition && (c.isWaiting || forceWaitingIds.has(String(c.id)));
    const free = (c.capacity || 0) - (c.booked || 0);
    const full = c.isFull || free <= 0;
    const pct = c.capacity ? Math.round((c.booked / c.capacity) * 100) : 0;
    const barColor = pct >= 90 ? '#ff4d4d' : pct >= 60 ? 'var(--orange)' : 'var(--acid)';
    const dtStart = c.startTime ? new Date(c.startTime).toLocaleString('sk-SK', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—';
    const dur = c.durationMinutes ? `${c.durationMinutes} min` : '—';

    return (
      <div className="class-detail-inner animate-in">
        {isMobile && (
          <button className="detail-close-btn" onClick={() => setSelectedClass(null)}>
            <i className="fas fa-chevron-down" />
          </button>
        )}
        <div className="cd-header">
          <h1 className="cd-title">{c.name || '—'}</h1>
          <div className="cd-instructor">
            <i className="fas fa-user-circle" />
            <span>{c.instructor || 'Tím Fitness Pro'}</span>
          </div>
        </div>

        <div className="detail-stats-grid">
          <div className="detail-stat-item">
            <div className="fl">DEŇ A ČAS</div>
            <div className="val">{dtStart}</div>
          </div>
          <div className="detail-stat-item">
            <div className="fl">DĹŽKA</div>
            <div className="val">{dur}</div>
          </div>
          <div className="detail-stat-item">
            <div className="fl">MIESTNOSŤ</div>
            <div className="val"><span className="badge b-grey">{c.location || 'Hlavná sála'}</span></div>
          </div>
          <div className="detail-stat-item">
            <div className="fl">KAPACITA</div>
            <div className="val">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
                <span>{c.booked || 0} / {c.capacity || '?'}</span>
                <span style={{ color: barColor }}>{100 - pct}% voľné</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '10px' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', marginBottom: '1rem' }}>
          {c.isReserved ? (
            <button className="btn btn-red btn-block btn-lg" onClick={(e) => cancelClass(e, c.id)} disabled={actionLoading}>
              {actionLoading ? <span className="spinner" /> : <><i className="fas fa-times-circle" /> ZRUŠIŤ MOJU REZERVÁCIU</>}
            </button>
          ) : isWaiting ? (
            <div className="waiting-info-detailed">
              <div className="wi-header">
                <i className="fas fa-hourglass-half fa-spin-slow" /> STE NA ČAKAČEJ LISTINE
              </div>
              <div className="wi-body">
                <div className="wi-row">
                  <span className="wi-label">Vaše poradie:</span>
                  <span className="wi-value">{c.waitlistPosition}. miesto</span>
                </div>
                <div className="wi-row">
                  <span className="wi-label">Celkovo na zozname:</span>
                  <span className="wi-value">{c.waitlistCount || 1} ľudí</span>
                </div>
                <p className="wi-note">Akonáhle sa uvoľní miesto, systém vás automaticky prihlási.</p>
              </div>
              <button className="btn btn-orange-outline btn-block btn-lg" onClick={(e) => cancelClass(e, c.id)} disabled={actionLoading}>
                {actionLoading ? <span className="spinner" /> : <><i className="fas fa-times-circle" /> ODÍSŤ Z FRONTY</>}
              </button>
            </div>
          ) : full ? (
            <div style={{ marginBottom: '1rem' }}>
              <div className="waitlist-info">
                <i className="fas fa-users" /> Aktuálne na čakačke: <strong>{c.waitlistCount || 0} ľudí</strong>
              </div>
              <button className="btn btn-acid-ghost btn-block btn-lg" onClick={() => bookClass(c.id)} disabled={actionLoading}>
                {actionLoading ? <span className="spinner" /> : <><i className="fas fa-clock" /> VSTÚPIŤ DO ČAKAČKY</>}
              </button>
            </div>
          ) : (
            <button className="btn btn-acid btn-block btn-lg" onClick={() => bookClass(c.id)} disabled={actionLoading}>
              {actionLoading ? <span className="spinner" /> : <><i className="fas fa-plus-circle" /> REZERVOVAŤ MIESTO</>}
            </button>
          )}
        </div>

        {bookMsg.text && <div className={`fm ${bookMsg.type}`} style={{ padding: '1rem' }}>{bookMsg.text}</div>}
      </div>
    );
  };
  return (
    <div className={`book-class-wrapper ${isMobile ? 'mobile-mode' : 'desktop-mode'}`}>
      {/* Zoznam lekcií */}
      <div className="panel list-panel">
        <div className="ph">
          <span className="pt">Dostupné lekcie</span>
          <button className="btn btn-ghost btn-xs" onClick={() => loadAllClasses()} style={{ padding: '0.5rem' }}><i className="fas fa-sync-alt" /></button>
        </div>
        <div className="cl-scroller">
          {loading ? (
            <div className="empty" style={{ padding: '4rem 2rem' }}><span className="spinner" /></div>
          ) : error ? (
            <div className="empty" style={{ padding: '4rem 2rem' }}>❌ {error}</div>
          ) : classes.filter(c => new Date(c.startTime) > new Date()).length === 0 ? (
            <div className="empty" style={{ padding: '4rem 2rem' }}><i className="fas fa-dumbbell" /><p>Žiadne dostupné lekcie</p></div>
          ) : classes.filter(c => new Date(c.startTime) > new Date()).map(c => {
            const free = (c.capacity || 0) - (c.booked || 0);
            const full = c.isFull || free <= 0;
            const isSelected = selectedClass?.id === c.id;
            const dtObj = new Date(c.startTime);
            const timeStr = dtObj.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
            const dateStr = dtObj.toLocaleDateString('sk-SK', { weekday: 'short', day: '2-digit', month: 'short' });

            return (
              <div
                key={c.id}
                className={`cl-row${isSelected ? ' cl-row-selected' : ''}${(!c.isReserved && (c.waitlistPosition && c.waitlistPosition > 0) && (c.isWaiting || forceWaitingIds.has(String(c.id)))) ? ' cl-row-waiting' : ''}`}
                onClick={() => { setSelectedClass(c); setBookMsg({ text: '', type: '' }); }}
              >
                <div className="cl-row-time-box">
                  <div className="time">{timeStr}</div>
                  <div className="date">{dateStr}</div>
                </div>
                <div className="cl-row-main">
                  <div className="cl-row-name">{c.name || '—'}</div>
                  <div className="cl-row-meta">
                    <span><i className="fas fa-user" /> {c.instructor || 'Tím'}</span>
                    <span><i className="fas fa-map-marker-alt" /> {c.location || 'Sála 1'}</span>
                  </div>
                </div>
                <div className="cl-row-status">
                  {c.isReserved ? <span className="badge b-acid">MOJA</span>
                    : c.isWaiting ? <span className="badge b-orange">ČAKÁ SA ({c.waitlistPosition}.)</span>
                      : full ? <span className="badge b-red">PLNÁ</span>
                        : <span className="badge b-cyan">{free} voľných</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail - Panel / Mobile Drawer */}
      <div className={`detail-panel-container ${selectedClass ? 'open' : ''}`}>
        {isMobile && <div className="detail-overlay" onClick={() => setSelectedClass(null)} />}
        <div className="panel detail-panel" style={{ position: isMobile ? 'fixed' : 'sticky', top: isMobile ? 'auto' : '70px' }}>
          {!isMobile && <div className="ph"><span className="pt">Detail lekcie</span></div>}
          <div style={{ padding: 0 }}>{renderDetail()}</div>
        </div>
      </div>

      {toast && (
        <div className={`toast-message toast-${toast.type}`}>
          <i className={toast.type === 'ok' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>

  );
}

export default BookClassTab;