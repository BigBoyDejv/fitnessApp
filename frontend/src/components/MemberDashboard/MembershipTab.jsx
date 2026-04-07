import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function MembershipTab({ setActiveTab }) {
  const [membership, setMembership] = useState(null);
  const [history, setHistory] = useState([]);
  const [memLoading, setMemLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    loadMembership();
    loadHistory();
  }, []);

  const loadMembership = async () => {
    try {
      const res = await authenticatedFetch('/api/memberships/my');
      if (res.status === 404 || !res.ok) throw new Error('No membership');
      const d = await res.json();
      setMembership(d);
    } catch {
      setMembership(null);
    } finally {
      setMemLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await authenticatedFetch('/api/memberships/my/history');
      const data = await res.json();
      if (!res.ok || !Array.isArray(data) || !data.length) throw new Error('Empty');
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  };

  const renderActiveCard = () => {
    if (memLoading) return <div className="empty-state" style={{ minHeight: '300px' }}><span className="spinner" style={{width: 48, height: 48}}></span></div>;
    if (!membership) {
       return (
         <div className="empty-state animate-in" style={{ padding: '4rem 2rem' }}>
           <div style={{ width: 80, height: 80, background: 'rgba(255,45,85,0.1)', color: 'var(--red)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', fontSize: '2rem' }}>
            <i className="fas fa-id-card-alt" />
           </div>
           <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>ŽIADNE AKTÍVNE ČLENSTVO</h3>
           <p style={{ color: 'var(--muted)', marginBottom: '2rem', maxWidth: '300px' }}>Aktuálne nemáte prístup do fitness centra. Zakúpte si členstvo pre návrat k tréningu.</p>
           <button className="btn btn-acid btn-md" onClick={() => setActiveTab('pricing')} style={{ borderRadius: '12px', fontWeight: 800, padding: '0.8rem 2rem' }}>
             <i className="fas fa-shopping-cart" style={{marginRight: '0.6rem'}} /> KÚPIŤ ČLENSTVO
           </button>
         </div>
       );
    }

    const start = new Date(membership.startDate);
    const end = new Date(membership.endDate);
    const daysTotal = Math.ceil((end - start) / 864e5);
    const daysLeft = Math.max(0, Math.ceil((end - new Date()) / 864e5));
    const prog = Math.round((1 - daysLeft / daysTotal) * 100);

    return (
      <div className="animate-in">
        <div className="glass highlight acid" style={{ 
          background: 'linear-gradient(135deg, rgba(200,255,0,0.15) 0%, rgba(10,10,10,0.8) 100%)', 
          borderRadius: '24px', 
          padding: '2.5rem', 
          border: '1px solid rgba(200,255,0,0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 0 20px rgba(200,255,0,0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative Logo / Element */}
          <div style={{ position: 'absolute', right: '-20px', top: '-10px', fontSize: '12rem', opacity: 0.03, color: 'var(--acid)', transform: 'rotate(-15deg)', pointerEvents: 'none' }}>
            <i className="fas fa-dumbbell"></i>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--acid)', marginBottom: '0.5rem' }}>PRIME MEMBER</div>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '2.2rem', fontWeight: 950, letterSpacing: '0.05em', lineHeight: 1 }}>{membership.membershipTypeName?.toUpperCase()}</h2>
            </div>
            <div style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--acid)', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.1em', border: '1px solid rgba(200,255,0,0.2)' }}>AKTÍVNE</div>
          </div>

          <div className="grid-2" style={{ marginBottom: '2.5rem' }}>
            <div>
               <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.8rem', fontWeight: 700 }}>ZOSTÁVAJÚCI ČAS</div>
               <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                 <span style={{ fontSize: 'clamp(3rem, 10vw, 4.5rem)', fontWeight: 950, fontFamily: 'var(--font-d)', lineHeight: 0.8, color: 'var(--text)' }}>{daysLeft}</span>
                 <span style={{ fontSize: '1rem', fontWeight: 900, fontFamily: 'var(--font-d)', color: 'var(--acid)' }}>DNÍ</span>
               </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               <div style={{ marginBottom: '1rem', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>PLATNOSŤ OD</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{membership.startDate}</div>
               </div>
               <div style={{ borderLeft: '2px solid var(--acid)', paddingLeft: '1rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>PLATNOSŤ DO</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--acid)' }}>{membership.endDate}</div>
               </div>
            </div>
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
               <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)' }}>ČERPANIE OBDOBIA</span>
               <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text)' }}>{prog}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
               <div style={{ width: `${prog}%`, height: '100%', background: 'linear-gradient(90deg, var(--acid), var(--acid2))', borderRadius: '10px', boxShadow: '0 0 15px rgba(200,255,0,0.4)' }} />
            </div>
          </div>

          <button className="btn btn-acid btn-block" onClick={() => setActiveTab('pricing')} style={{ height: '56px', borderRadius: '14px', fontWeight: 900, letterSpacing: '0.05em', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
            <i className="fas fa-rocket" style={{marginRight: '0.8rem'}} /> UPGRADOVAŤ PROGRAM
          </button>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    if (histLoading) return <div className="empty-state" style={{ minHeight: '200px' }}><span className="spinner" style={{width: 32, height: 32}}></span></div>;
    if (history.length === 0) {
       return (
         <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.3 }}>
           <i className="fas fa-history" style={{ fontSize: '2.5rem', marginBottom: '1rem' }} />
           <p>Zatiaľ nemáte žiadnu históriu členstiev</p>
         </div>
       );
    }
    
    return (
      <div className="animate-in" style={{ padding: '0 1rem' }}>
        <div className="table-responsive">
          <table className="dt">
            <thead>
              <tr>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--border)', padding: '1.2rem 1rem' }}>TYP PROGRAMU</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--border)', padding: '1.2rem 1rem' }}>OD</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--border)', padding: '1.2rem 1rem' }}>DO</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--border)', padding: '1.2rem 1rem' }}>SUMA</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--border)', padding: '1.2rem 1rem', textAlign: 'right' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {history.map((m, i) => {
                 const c = m.status === 'active' ? 'b-acid' : m.status === 'expired' ? 'b-grey' : 'b-red';
                 return (
                   <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                     <td style={{ padding: '1.2rem 1rem', fontWeight: 800, fontFamily: 'var(--font-d)' }}>{m.membershipTypeName?.toUpperCase() || '—'}</td>
                     <td style={{ padding: '1.2rem 1rem', color: 'var(--muted)' }}>{m.startDate || '—'}</td>
                     <td style={{ padding: '1.2rem 1rem', color: 'var(--muted)' }}>{m.endDate || '—'}</td>
                     <td style={{ padding: '1.2rem 1rem', fontWeight: 700, color: 'var(--blue)' }}>{m.priceEuros || '0.00'} €</td>
                     <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                       <span className={`badge ${c}`} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.65rem' }}>{m.status?.toUpperCase()}</span>
                     </td>
                   </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in" id="pg-membership">
      <div className="overview-hero" style={{ marginBottom: '2.5rem' }}>
        <div style={{ position: 'relative', zIndex: 1, padding: '3rem 2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '2.8rem', fontWeight: 950, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>MOJE ČLENSTVO</h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', maxWidth: '600px' }}>Sledujte platnosť vášho programu, zostávajúce dni a históriu vašich predplatných.</p>
        </div>
        <div style={{ position: 'absolute', right: '5%', bottom: '10%', opacity: 0.1, fontSize: '10rem', pointerEvents: 'none' }}>
          <i className="fas fa-id-card"></i>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="ph" style={{ borderBottom: 'none' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(200,255,0,0.1)', color: 'var(--acid)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <span className="pt">Aktuálny stav</span>
            </div>
          </div>
          <div className="pb" style={{ padding: '1.5rem' }}>
            {renderActiveCard()}
          </div>
        </div>
        
        <div className="panel animate-in" style={{ animationDelay: '0.2s', flex: 1 }}>
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)', color: 'var(--text)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-history"></i>
              </div>
              <span className="pt">História platieb</span>
            </div>
            <button className="btn btn-ghost btn-xs" onClick={loadHistory}><i className="fas fa-sync-alt" /> OBNOVIŤ</button>
          </div>
          <div className="pb" style={{ padding: 0 }}>
            {renderHistory()}
          </div>
        </div>
      </div>
    </div>
  );
}
