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
    authenticatedFetch('/api/memberships')
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
    <div className="panel" style={{ maxWidth: '800px' }}>
      <div className="ph">
        <span className="pt">Správa predplatného</span>
      </div>
      <div className="pb">
        <div className="fg" style={{ position: 'relative' }}>
          <label className="fl">1. Vyber člena</label>
          {!selectedUser ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="fi" type="text" placeholder="Hľadaj meno alebo email..." value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setPickerOpen(true)} />
              <button className="btn btn-ghost btn-sm" onClick={() => setPickerOpen(!pickerOpen)}>
                <i className="fas fa-chevron-down"></i>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.15)', borderRadius: 3 }}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--acid)', fontSize: '0.85rem' }}>{selectedUser.fullName || '—'}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{selectedUser.email || '—'}</div>
              </div>
              <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }} onClick={() => { setSelectedUser(null); setCurrentMembership(null); }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          
          {pickerOpen && !selectedUser && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 3, zIndex: 200, maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
              {filteredUsers.length > 0 ? filteredUsers.map(u => (
                <div key={u.id} style={{ padding: '0.6rem 0.9rem', cursor: 'pointer', fontSize: '0.83rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between' }} onClick={() => { setSelectedUser(u); setPickerOpen(false); setCurrentMembership(null); }}>
                  <span>{u.fullName || '—'} <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>&lt;{u.email}&gt;</span></span>
                </div>
              )) : (
                <div style={{ padding: '0.6rem', color: 'var(--muted)', fontSize: '0.8rem' }}>Žiadni členovia nenájdení.</div>
              )}
            </div>
          )}
        </div>

        <button className="btn btn-ghost btn-sm" onClick={loadMembership} style={{ marginBottom: '1.2rem' }} disabled={infoLoading || !selectedUser}>
          {infoLoading ? <span className="spinner" style={{width: 14, height: 14, marginRight: 6}}></span> : <i className="fas fa-search"></i>} Načítať aktuálne predplatné
        </button>

        {infoMsg.text && (
          <div className={`fm ${infoMsg.type}`} style={{ marginBottom: '1rem' }}>{infoMsg.text}</div>
        )}

        {currentMembership && (
          <div style={{ marginBottom: '1.4rem' }}>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Aktuálne predplatné</div>
              <div className="grid-2" style={{ gap: '0.8rem' }}>
                <div><div className="fl">Typ</div><div style={{ fontSize: '0.85rem' }}>{currentMembership.membershipTypeName}</div></div>
                <div><div className="fl">Platí do</div><div style={{ fontSize: '0.85rem' }}>{currentMembership.endDate} ({currentMembership.daysRemaining} dní)</div></div>
                <div><div className="fl">Status</div><span className={`badge ${currentMembership.status === 'active' ? 'b-acid' : 'b-red'}`}>{currentMembership.status}</span></div>
              </div>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
          <div className="fl" style={{ marginBottom: '0.8rem' }}>{currentMembership ? 'Zmeniť predplatné na iné' : '2. Priradiť predplatné'}</div>
          <div className="fr">
            <div className="fg">
              <label className="fl">Typ členstva</label>
              <select className="fi" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                {membershipTypes.length === 0 && <option value="">— Načítavam... —</option>}
                {membershipTypes.map(mt => (
                  <option key={mt.id} value={mt.id}>{mt.name} ({mt.durationMonths} mes., {mt.price} €)</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Dátum začiatku (voliteľné)</label>
              <input className="fi" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
            <button className="btn btn-acid" onClick={handleAssign} disabled={isSubmitLoading || !selectedUser}>
              {isSubmitLoading ? <span className="spinner" style={{width: 14, height: 14, marginRight: 6}}></span> : <i className="fas fa-id-card"></i>} {currentMembership ? 'Zmeniť predplatné' : 'Priradiť predplatné'}
            </button>
            <button className="btn btn-red" onClick={handleCancel} disabled={isSubmitLoading || !selectedUser || !currentMembership}>
               <i className="fas fa-ban"></i> Zrušiť predplatné
            </button>
          </div>
          {formMsg.text && (
            <div className={`fm ${formMsg.type}`}>{formMsg.text}</div>
          )}
        </div>
      </div>
    </div>
  );
}
