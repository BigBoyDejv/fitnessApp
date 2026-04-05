// ─── BookClassTab.jsx ──────────────────────────────────────────────────────────
// Oprava: fm CSS trieda — treba "fm ok" alebo "fm err", nie "fm show"

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export function BookClassTab({ setActiveTab }) {
  const [classes, setClasses]         = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [bookMsg, setBookMsg]         = useState({ text: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { loadAllClasses(); }, []);

  const loadAllClasses = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
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
    setActionLoading(true);
    setBookMsg({ text: '', type: '' });
    try {
      const res  = await authenticatedFetch(`/api/classes/${id}/book`, { method: 'POST' });
      const text = await res.text();
      let d = {}; try { d = JSON.parse(text); } catch { d = { message: text || 'OK' }; }
      if (!res.ok) throw new Error(d.message || 'Chyba servera');
      setBookMsg({ text: '✓ Lekcia rezervovaná!', type: 'ok' });
      await loadAllClasses();
      // Aktualizuj vybraté
      setSelectedClass(prev => prev ? { ...prev, isReserved: true, booked: (prev.booked || 0) + 1 } : null);
      setTimeout(() => { if (setActiveTab) setActiveTab('classes'); }, 1500);
    } catch (e) {
      setBookMsg({ text: e.message, type: 'err' });
    } finally {
      setActionLoading(false);
    }
  };

  const cancelClass = async (id) => {
    if (!id) return;
    console.log('CLIENT: Cancelling class ID:', id);
    if (!window.confirm('Naozaj zrušiť rezerváciu?')) return;
    
    setActionLoading(true);
    try {
      const res = await authenticatedFetch(`/api/classes/${id}/cancel`, { method: 'DELETE' });
      const text = await res.text();
      console.log('CLIENT: Server response:', res.status, text);
      
      if (res.ok) {
        showToast('Rezervácia zrušená', 'ok');
        await loadAllClasses(true);
        setSelectedClass(null); // Zatvor detail
      } else {
        const d = JSON.parse(text).catch(() => ({}));
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

    const c    = selectedClass;
    const free = (c.capacity || 0) - (c.booked || 0);
    const full = c.isFull || free <= 0;
    const pct  = c.capacity ? Math.round((c.booked / c.capacity) * 100) : 0;
    const barColor = pct >= 90 ? 'var(--red)' : pct >= 60 ? 'var(--orange)' : 'var(--acid)';
    const dtStart  = c.startTime ? new Date(c.startTime).toLocaleString('sk-SK', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—';
    const dtEnd    = c.endTime   ? new Date(c.endTime).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) : '';
    const dur      = c.durationMinutes ? `${c.durationMinutes} min` : '—';

    return (
      <div style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.2rem' }}>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.25rem' }}>{c.name || '—'}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{c.instructor || '—'}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.2rem' }}>
          <div><div className="fl">Začiatok</div><div style={{ fontSize: '0.85rem' }}>{dtStart}</div></div>
          <div><div className="fl">Koniec</div><div style={{ fontSize: '0.85rem' }}>{dtEnd ? `${dtEnd} (${dur})` : dur}</div></div>
          <div><div className="fl">Miesto</div><span className="badge b-grey">{c.location || '—'}</span></div>
          <div>
            <div className="fl">Obsadenosť</div>
            <div style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>{c.booked || 0} / {c.capacity || '?'}</div>
            <div style={{ height: '4px', background: 'var(--border2)', borderRadius: '2px' }}>
              <div style={{ width: `${pct}%`, height: '4px', background: barColor, borderRadius: '2px' }} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          {c.isReserved ? (
            <button className="btn btn-red btn-block" onClick={() => cancelClass(c.id)} disabled={actionLoading} style={{ justifyContent: 'center' }}>
              {actionLoading ? <span className="spin" /> : <><i className="fas fa-times" /> Zrušiť rezerváciu</>}
            </button>
          ) : full ? (
            <button className="btn btn-ghost btn-block" disabled style={{ justifyContent: 'center', opacity: 0.5 }}>
              <i className="fas fa-ban" /> Lekcia je plná
            </button>
          ) : (
            <button className="btn btn-acid btn-block" onClick={() => bookClass(c.id)} disabled={actionLoading} style={{ justifyContent: 'center' }}>
              {actionLoading ? <span className="spin" /> : <><i className="fas fa-plus" /> Rezervovať</>}
            </button>
          )}
        </div>

        {/* Oprava: použiť "fm ok" / "fm err" nie "fm show" */}
        {bookMsg.text && <div className={`fm ${bookMsg.type}`}>{bookMsg.text}</div>}
      </div>
    );
  };

  return (
    <div className="g2 book-class-container" style={{ alignItems: 'start' }}>
      {/* Zoznam lekcií */}
      <div className="panel">
        <div className="ph">
          <span className="pt">Dostupné lekcie</span>
          <button className="btn btn-ghost btn-sm" onClick={loadAllClasses}><i className="fas fa-sync-alt" /></button>
        </div>
        <div style={{ padding: 0 }}>
          {loading ? (
            <div className="empty" style={{ padding: '2rem' }}><span className="spin" /></div>
          ) : error ? (
            <div className="empty" style={{ padding: '2rem' }}>❌ {error}</div>
          ) : classes.length === 0 ? (
            <div className="empty" style={{ padding: '2rem' }}><i className="fas fa-dumbbell" /><p>Žiadne dostupné lekcie</p></div>
          ) : classes.map(c => {
            const free     = (c.capacity || 0) - (c.booked || 0);
            const full     = c.isFull || free <= 0;
            const isSelected = selectedClass?.id === c.id;
            const dt       = c.startTime ? new Date(c.startTime).toLocaleString('sk-SK', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
            const dur      = c.durationMinutes ? ` · ${c.durationMinutes} min` : '';

            return (
              <div
                key={c.id}
                className={`cl-row${isSelected ? ' cl-row-selected' : ''}`}
                onClick={() => { setSelectedClass(c); setBookMsg({ text: '', type: '' }); }}
                style={{ background: c.isReserved ? 'rgba(200,255,0,0.04)' : '' }}
              >
                <div className="cl-row-main">
                  <div className="cl-row-name">{c.name || '—'}</div>
                  <div className="cl-row-meta">
                    <span><i className="fas fa-clock" style={{ opacity: 0.5 }} /> {dt}{dur}</span>
                    <span><i className="fas fa-user" style={{ opacity: 0.5 }} /> {c.instructor || '—'}</span>
                  </div>
                </div>
                <div className="cl-row-status">
                  {c.isReserved ? <span className="badge b-acid" style={{ fontSize: '0.6rem' }}><i className="fas fa-check" /> Moja</span>
                  : full        ? <span className="badge b-red"  style={{ fontSize: '0.6rem' }}>Plná</span>
                  :               <span className="badge b-cyan" style={{ fontSize: '0.6rem' }}>{free} voľných</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div className="panel" style={{ position: 'sticky', top: '70px' }}>
        <div className="ph"><span className="pt">Detail lekcie</span></div>
        <div style={{ padding: 0 }}>{renderDetail()}</div>
      </div>
      {toast && (
        <div className={`toast-message toast-${toast.type}`}>
          {toast.type === 'ok' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  );
}

export default BookClassTab;