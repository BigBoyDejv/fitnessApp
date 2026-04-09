import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function MembershipsTab() {
  const [users, setUsers] = useState([]);
  const [membershipTypes, setMembershipTypes] = useState([]);
  
  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Load info state
  const [currentMembership, setCurrentMembership] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState({ text: '', type: '' });

  // Add/Change Form state
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [formMsg, setFormMsg] = useState({ text: '', type: '' });
  const [isSubmitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    // Load members
    authenticatedFetch('/api/admin/profiles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(e => console.error(e));

    // Load membership types
    authenticatedFetch('/api/memberships/types')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMembershipTypes(data);
          if (data.length > 0) setSelectedType(data[0].id);
        }
      })
      .catch(e => console.error(e));
  }, []);

  const loadMembership = async () => {
    if (!selectedUser) {
      setInfoMsg({ text: 'Vyber člena zo zoznamu vyššie', type: 'err' });
      return;
    }

    setInfoLoading(true);
    setInfoMsg({ text: '', type: '' });
    setCurrentMembership(null);

    try {
      const res = await authenticatedFetch(`/api/admin/memberships/user/${selectedUser.id}`);
      const data = await res.json();
      if (res.ok && data.status) {
        setCurrentMembership(data);
      } else {
        setInfoMsg({ text: 'Člen nemá aktívne predplatné', type: 'ok' });
      }
    } catch (e) {
      setInfoMsg({ text: 'Člen nemá aktívne predplatné', type: 'ok' });
    } finally {
      setInfoLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser) return setFormMsg({ text: 'Vyber člena', type: 'err' });
    if (!selectedType) return setFormMsg({ text: 'Vyber typ predplatného', type: 'err' });

    setSubmitLoading(true);
    setFormMsg({ text: '', type: '' });

    try {
      const res = await authenticatedFetch(`/api/admin/memberships/assign/${selectedUser.id}?membershipTypeId=${selectedType}${startDate ? '&startDate='+startDate : ''}`, {
        method: 'POST'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Chyba servera');
      
      setFormMsg({ text: `Predplatné bolo úspešne priradené členovi ${selectedUser.fullName}.`, type: 'ok' });
      loadMembership(); // refresh current membership view
    } catch (e) {
      setFormMsg({ text: e.message, type: 'err' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedUser) return setFormMsg({ text: 'Vyber člena', type: 'err' });
    if (!currentMembership) return setFormMsg({ text: 'Tento člen momentálne nemá aktívne predplatné', type: 'err' });

    if (!window.confirm(`Naozaj chceš zrušiť predplatné členovi ${selectedUser.fullName}?`)) return;

    setSubmitLoading(true);
    setFormMsg({ text: '', type: '' });

    try {
      const res = await authenticatedFetch(`/api/admin/memberships/cancel/${selectedUser.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Chyba servera');

      setFormMsg({ text: `Predplatné zrušené.`, type: 'ok' });
      setCurrentMembership(null);
    } catch (e) {
      setFormMsg({ text: e.message, type: 'err' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.id !== selectedUser?.id && 
    ((u.fullName || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="panel animate-in" style={{ maxWidth: '850px' }}>
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: 32, height: 32, background: 'rgba(200,255,0,0.1)', color: 'var(--acid)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-id-card"></i>
          </div>
          <span className="pt">Správa členstiev a permanentiek</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0.5rem 0 0 3.2rem', fontWeight: 500, maxWidth: '600px', lineHeight: '1.4' }}>
          Nástroj pre priraďovanie a aktualizáciu permanentiek. Vyberte člena, skontrolujte jeho stav a priraďte mu nový balík služieb.
        </p>
      </div>
      <div className="pb">
        <div className="fg" style={{ position: 'relative' }}>
          <label className="fl" style={{ fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 800 }}>1. VYBERTE ČLENA</label>
          {!selectedUser ? (
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
                <input 
                  className="fi" 
                  type="text" 
                  placeholder="Hľadajte podľa mena alebo emailu..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  onFocus={() => setPickerOpen(true)} 
                  style={{ paddingLeft: '2.8rem', borderRadius: '10px', height: '52px' }}
                />
              </div>
              <button className="btn btn-ghost" onClick={() => setPickerOpen(!pickerOpen)} style={{ borderRadius: '10px', width: '52px', padding: 0 }}>
                <i className={`fas fa-chevron-${pickerOpen ? 'up' : 'down'}`}></i>
              </button>
            </div>
          ) : (
            <div className="glass highlight acid" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem', borderRadius: '12px', border: '1px solid rgba(200,255,0,0.2)', background: 'rgba(200,255,0,0.05)' }}>
               <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'var(--acid)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'var(--font-d)', fontSize: '1.1rem' }}>
                 {selectedUser.fullName?.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
               </div>
              <div>
                <div style={{ fontWeight: 900, color: 'var(--acid)', fontSize: '1.1rem', fontFamily: 'var(--font-d)', letterSpacing: '0.02em', lineHeight: 1.1 }}>{selectedUser.fullName || '—'}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>{selectedUser.email || '—'}</div>
              </div>
              <button className="btn btn-ghost btn-xs" style={{ marginLeft: 'auto', borderRadius: '50%', width: '32px', height: '32px', padding: 0 }} onClick={() => { setSelectedUser(null); setCurrentMembership(null); }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          
          {pickerOpen && !selectedUser && (
            <div className="animate-in" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', zIndex: 200, maxHeight: 250, overflowY: 'auto', marginTop: '0.5rem', boxShadow: '0 15px 40px rgba(0,0,0,0.4)', padding: '0.5rem' }}>
              {filteredUsers.length > 0 ? filteredUsers.map(u => (
                <div 
                  key={u.id} 
                  style={{ padding: '0.8rem 1rem', cursor: 'pointer', borderRadius: '8px', borderBottom: '1px solid rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s' }} 
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { setSelectedUser(u); setPickerOpen(false); setCurrentMembership(null); }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'var(--surface)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                    {u.fullName?.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{u.fullName || '—'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{u.email}</div>
                  </div>
                  <span className="badge btn-xs" style={{marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', fontSize: '0.6rem'}}>{u.role}</span>
                </div>
              )) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  <i className="fas fa-user-slash" style={{display: 'block', marginBottom: '0.5rem', opacity: 0.2}}></i>
                  Neboli nájdení žiadni členovia.
                </div>
              )}
            </div>
          )}
        </div>

        {selectedUser && !currentMembership && !infoLoading && (
           <div className="animate-in" style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: 'dashed 1px var(--border)', marginBottom: '1.5rem' }}>
              <button className="btn btn-acid btn-sm" onClick={loadMembership}>
                 <i className="fas fa-search" style={{marginRight: '0.6rem'}}></i> OVERIŤ AKTUÁLNE ČLENSTVO
              </button>
           </div>
        )}

        {infoLoading && (
           <div style={{ padding: '2rem', textAlign: 'center' }}>
              <span className="spinner" style={{width: 32, height: 32}}></span>
           </div>
        )}

        {infoMsg.text && (
          <div className={`fm ${infoMsg.type}`} style={{ marginBottom: '1.5rem', borderRadius: '10px' }}>{infoMsg.text}</div>
        )}

        {currentMembership && (
          <div className="animate-in" style={{ marginBottom: '2rem' }}>
            <div className="glass" style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)' }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)' }}>Dáta aktuálneho členstva</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <div className="fl" style={{fontSize: '0.65rem', marginBottom: '0.3rem'}}>TYP PERMANENTKY</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--acid)', fontFamily: 'var(--font-d)' }}>{currentMembership.membershipTypeName}</div>
                </div>
                <div>
                  <div className="fl" style={{fontSize: '0.65rem', marginBottom: '0.3rem'}}>PLATNOSŤ DO</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{currentMembership.endDate}</div>
                </div>
                <div>
                  <div className="fl" style={{fontSize: '0.65rem', marginBottom: '0.3rem'}}>ZOSTATOK</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: currentMembership.daysRemaining < 5 ? 'var(--red)' : 'var(--text)' }}>{currentMembership.daysRemaining} dní</div>
                </div>
                <div>
                  <div className="fl" style={{fontSize: '0.65rem', marginBottom: '0.3rem'}}>STAV</div>
                  <span className={`badge ${currentMembership.status === 'active' ? 'b-acid' : 'b-red'}`} style={{padding: '0.3rem 0.8rem', borderRadius: '6px'}}>{currentMembership.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.9rem', letterSpacing: '0.1em', fontWeight: 900, marginBottom: '1.5rem', color: 'var(--text)' }}>
            <i className="fas fa-plus-circle" style={{marginRight: '0.6rem', color: 'var(--acid)'}}></i>
            {currentMembership ? 'ZMENA ALEBO PREDĹŽENIE ČLENSTVA' : '2. PRIRADENIE NOVÉHO ČLENSTVA'}
          </div>
          
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.5rem' }}>
            <div className="fg">
              <label className="fl">Typ programu</label>
              <select className="fi" value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ height: '52px', borderRadius: '10px' }}>
                {membershipTypes.length === 0 && <option value="">— Načítavam... —</option>}
                {membershipTypes.map(mt => (
                  <option key={mt.id} value={mt.id}>{mt.name} · {mt.durationDays} dní · {(mt.priceCents/100).toFixed(2)} €</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Dátum aktivácie</label>
              <input className="fi" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ height: '52px', borderRadius: '10px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-acid" onClick={handleAssign} disabled={isSubmitLoading || !selectedUser} style={{ height: '52px', padding: '0 2rem', borderRadius: '10px', fontWeight: 800, flex: 1 }}>
              {isSubmitLoading ? <span className="spinner" style={{width: 20, height: 20, marginRight: 10, borderColor: '#000', borderTopColor: 'transparent'}}></span> : <i className="fas fa-check-circle" style={{marginRight: '0.8rem'}}></i>} 
              {currentMembership ? 'AKTUALIZOVAŤ ČLENSTVO' : 'AKTIVOVAŤ ČLENSTVO'}
            </button>
            <button className="btn btn-red" onClick={handleCancel} disabled={isSubmitLoading || !selectedUser || !currentMembership} style={{ height: '52px', padding: '0 1.5rem', borderRadius: '10px', fontWeight: 700 }}>
               <i className="fas fa-trash-alt"></i> ZRUŠIŤ
            </button>
          </div>
          
          {formMsg.text && (
            <div className={`fm ${formMsg.type}`} style={{ marginTop: '1.5rem', borderRadius: '10px' }}>{formMsg.text}</div>
          )}
        </div>
      </div>
    </div>
  );
}
