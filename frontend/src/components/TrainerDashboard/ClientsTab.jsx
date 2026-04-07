import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedFetch } from '../../utils/api';

export default function ClientsTab() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [schedulingClient, setSchedulingClient] = useState(null);

  // Add Client state
  const [availableMembers, setAvailableMembers] = useState([]);
  const [addSearch, setAddSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [addMsg, setAddMsg] = useState({ text: '', type: '' });
  const [adding, setAdding] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeClient, setActiveClient] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerData, setDrawerData] = useState(null);
  const [drawerMembership, setDrawerMembership] = useState(null);

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/trainer/clients');
      const data = await res.json();
      if (res.ok) setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableMembers = async () => {
    try {
      const res = await authenticatedFetch('/api/trainer/available-members');
      const data = await res.json();
      if (res.ok) setAvailableMembers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleOpenPicker = () => {
    setPickerOpen(true);
    if (availableMembers.length === 0) loadAvailableMembers();
  };

  const handleAddClient = async () => {
    if (!selectedMember) {
      setAddMsg({ text: 'Vyber člena zo zoznamu', type: 'err' });
      return;
    }
    setAdding(true);
    setAddMsg({ text: '', type: '' });
    try {
      const res = await authenticatedFetch('/api/trainer/clients', {
        method: 'POST',
        body: JSON.stringify({ memberId: selectedMember.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Chyba servera');
      
      setAddMsg({ text: `${selectedMember.fullName} pridaný!`, type: 'ok' });
      setSelectedMember(null);
      setAddSearch('');
      setAvailableMembers([]); // invalidate cache
      loadClients();
    } catch (e) {
      setAddMsg({ text: e.message, type: 'err' });
    } finally {
      setAdding(false);
    }
  };

  const removeClient = async (id, name, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Naozaj odstrániť klienta ${name}?`)) return;
    
    try {
      const res = await authenticatedFetch('/api/trainer/clients/' + id, { method: 'DELETE' });
      if (res.ok) {
        setMsg({ text: `Klient ${name} bol odstránený`, type: 'ok' });
        if (activeClient === id) setDrawerOpen(false);
        loadClients();
      } else {
        setMsg({ text: 'Chyba pri odstraňovaní', type: 'err' });
      }
    } catch (err) {
      setMsg({ text: err.message, type: 'err' });
    }
  };

  const openDrawer = async (client) => {
    setActiveClient(client.id);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerData(null);
    setDrawerMembership(null);

    try {
      const res = await authenticatedFetch('/api/users/' + client.id);
      const data = await res.json();
      if (res.ok) setDrawerData(data);

      try {
        const resM = await authenticatedFetch('/api/admin/memberships/user/' + client.id);
        const mem = await resM.json();
        if (resM.ok && mem.status) setDrawerMembership(mem);
      } catch (e) {}

    } catch (e) {
      console.error(e);
    } finally {
      setDrawerLoading(false);
    }
  };

  const filteredClients = clients.filter(c => 
    (c.fullName || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const assignedIds = clients.map(c => c.id);
  const filteredMembers = availableMembers.filter(u => 
    !assignedIds.includes(u.id) &&
    ((u.fullName || '').toLowerCase().includes(addSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(addSearch.toLowerCase()))
  );

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="animate-in" style={{ position: 'relative' }}>
      
      {msg.text && (
         <div className={`fm ${msg.type} animate-in`} style={{ marginBottom: '1.5rem', borderRadius: '10px' }}>{msg.text}</div>
      )}

      <div className="dashboard-grid">
        <div className="panel animate-in">
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(10,132,255,0.1)', color: 'var(--blue)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-users"></i>
              </div>
              <span className="pt">Moji aktívni klienti</span>
            </div>
            <button className="btn btn-ghost btn-xs" onClick={loadClients}>
              <i className="fas fa-sync-alt"></i> OBNOVIŤ
            </button>
          </div>
          <div className="pb">
            <div className="search-bar" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
                <input 
                  className="fi" 
                  type="text" 
                  placeholder="Hľadajte klienta podľa mena..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '2.8rem', borderRadius: '10px' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {loading ? (
                <div className="empty-state" style={{ minHeight: '200px' }}><span className="spinner" style={{width: 32, height: 32}}></span></div>
              ) : filteredClients.length > 0 ? (
                filteredClients.map(c => (
                  <div 
                    key={c.id} 
                    className="glass highlight blue" 
                    onClick={() => openDrawer(c)}
                    style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem', borderRadius: '16px', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.2s', background: 'rgba(10,132,255,0.02)' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; e.currentTarget.style.background = 'rgba(10,132,255,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.background = 'rgba(10,132,255,0.02)'; }}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'linear-gradient(135deg, var(--blue), var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900, fontFamily: 'var(--font-d)', fontSize: '1.2rem', color: '#fff', boxShadow: '0 8px 16px rgba(10,132,255,0.2)' }}>
                      {getInitials(c.fullName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-d)', letterSpacing: '0.02em' }}>{c.fullName || '—'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                        {c.email || '—'}{c.phone ? ` · ${c.phone}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                      <span className={`badge ${c.active !== false ? 'b-acid' : 'b-frozen'}`} style={{ fontSize: '0.65rem' }}>
                        {c.active !== false ? 'AKTÍVNY' : 'NEAKTÍVNY'}
                      </span>
                      <button 
                        className="btn btn-red btn-xs" 
                        onClick={(e) => removeClient(c.id, c.fullName, e)}
                        style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <i className="fas fa-user-minus" style={{fontSize: '0.8rem'}}></i>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ padding: '3rem', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: 'dashed 1px var(--border)' }}>
                  <i className="fas fa-user-friends" style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '1rem' }}></i>
                  <p style={{ fontWeight: 600 }}>Nenašli sa žiadni klienti</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.4rem' }}>Pridajte nového klienta pomocou panela vpravo.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel animate-in" style={{ height: 'fit-content', animationDelay: '0.1s' }}>
          <div className="ph">
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.1)', color: 'var(--text)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-plus-circle"></i>
              </div>
              <span className="pt">Pridať nového klienta</span>
            </div>
          </div>
          <div className="pb">
            <div className="fg" style={{ position: 'relative' }}>
              <label className="fl" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vyhľadať člena Gymu</label>
              
              {!selectedMember ? (
                <div className="user-picker">
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                       <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
                        <input 
                          className="fi" 
                          type="text" 
                          placeholder="Meno alebo email..." 
                          value={addSearch}
                          onChange={(e) => setAddSearch(e.target.value)}
                          onFocus={handleOpenPicker}
                          style={{ paddingLeft: '2.8rem', borderRadius: '10px' }}
                        />
                    </div>
                    <button className="btn btn-ghost" onClick={() => setPickerOpen(!pickerOpen)} style={{ borderRadius: '10px', width: '52px', padding: 0 }}>
                      <i className={`fas fa-chevron-${pickerOpen ? 'up' : 'down'}`}></i>
                    </button>
                  </div>
                  
                  {pickerOpen && (
                    <div className="animate-in" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', zIndex: 200, maxHeight: 250, overflowY: 'auto', marginTop: '0.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: '0.5rem' }}>
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map(u => (
                          <div 
                            key={u.id} 
                            style={{ padding: '0.8rem 1rem', cursor: 'pointer', borderRadius: '8px', borderBottom: '1px solid rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => {
                              setSelectedMember(u);
                              setPickerOpen(false);
                            }}
                          >
                             <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'var(--surface)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, fontFamily: 'var(--font-d)' }}>
                              {getInitials(u.fullName)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{u.fullName || '—'}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                          <i className="fas fa-info-circle" style={{display: 'block', marginBottom: '0.5rem', opacity: 0.2}}></i>
                          {availableMembers.length === 0 ? 'Načítavam zoznam...' : 'Žiadni dostupní členovia'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass highlight blue animate-in" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(10,132,255,0.3)', background: 'rgba(10,132,255,0.05)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontFamily: 'var(--font-d)', fontSize: '1rem' }}>
                    {getInitials(selectedMember.fullName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--blue)', fontSize: '1rem', fontFamily: 'var(--font-d)' }}>{selectedMember.fullName || '—'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{selectedMember.email || '—'}</div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-xs"
                    style={{ marginLeft: 'auto', borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                    onClick={() => setSelectedMember(null)}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
            </div>
            
            <button className="btn btn-blue btn-block" onClick={handleAddClient} disabled={adding || !selectedMember} style={{ height: '52px', borderRadius: '10px', fontWeight: 800, marginTop: '2rem' }}>
              {adding ? <span className="spinner" style={{width: 20, height: 20, marginRight: 10}}></span> : <i className="fas fa-plus-circle" style={{marginRight: 10}}></i>}
              PRIDAŤ DO ZOZNAMU
            </button>
            
            {addMsg.text && (
               <div className={`fm ${addMsg.type} animate-in`} style={{ marginTop: '1.5rem', borderRadius: '10px' }}>{addMsg.text}</div>
            )}
          </div>
        </div>
      </div>

      {/* DRAWER COMPONENT */}
      <div 
        style={{ display: drawerOpen ? 'block' : 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, backdropFilter: 'blur(8px)' }} 
        onClick={() => setDrawerOpen(false)}
      ></div>
      <div 
        style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 450, maxWidth: '100%', background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 301, display: 'flex', flexDirection: 'column', transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)', boxShadow: '-20px 0 50px rgba(0,0,0,0.5)' }}
      >
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)' }}>
          <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-d)', letterSpacing: '0.05em', fontWeight: 900 }}>KARTA KLIENTA</h3>
          <button style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                  onClick={() => setDrawerOpen(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {drawerLoading ? (
            <div className="empty-state" style={{marginTop: '5rem'}}><span className="spinner" style={{width: 48, height: 48}}></span></div>
          ) : drawerData ? (
            <div className="animate-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ width: 80, height: 80, borderRadius: '20px', background: 'linear-gradient(135deg,var(--blue),var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 950, color: '#fff', boxShadow: '0 10px 25px rgba(10,132,255,0.2)', border: '2px solid rgba(255,255,255,0.1)' }}>
                  {getInitials(drawerData.fullName)}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '1.8rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '0.4rem' }}>{drawerData.fullName || 'BEZ MENA'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.6rem' }}>{drawerData.email || 'Žiadny email'}</div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <span className="badge b-blue" style={{fontSize: '0.6rem'}}>KLIENT</span>
                    {drawerData.active !== false ? <span className="badge b-acid" style={{fontSize: '0.6rem'}}>AKTÍVNY</span> : <span className="badge b-frozen" style={{fontSize: '0.6rem'}}>ZMRAZENÝ</span>}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)', fontWeight: 800 }}>
                  <i className="fas fa-id-badge" style={{marginRight: '0.6rem', color: 'var(--blue)'}}></i> Kontaktné údaje
                </div>
                
                <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <div className="glass" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700 }}>Telefón</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{drawerData.phone || '—'}</div>
                  </div>
                  <div className="glass" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700 }}>Registrovaný</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{drawerData.createdAt ? new Date(drawerData.createdAt).toLocaleDateString('sk-SK') : '—'}</div>
                  </div>
                </div>
              </div>

              {drawerMembership ? (
                <div style={{ marginBottom: '2rem' }}>
                   <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)', fontWeight: 800 }}>
                    <i className="fas fa-credit-card" style={{marginRight: '0.6rem', color: 'var(--blue)'}}></i> Členstvo v Gym-e
                  </div>
                  
                  <div className="glass highlight blue" style={{ padding: '1.5rem', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(10,132,255,0.05) 0%, rgba(10,10,10,0.4) 100%)', border: '1px solid rgba(10,132,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.2rem' }}>TYP PROGRAMU</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-d)', color: 'var(--blue)' }}>{drawerMembership.membershipTypeName || '—'}</div>
                      </div>
                      <span className={`badge ${drawerMembership.status === 'active' ? 'b-acid' : 'b-red'}`} style={{padding: '0.3rem 0.8rem', borderRadius: '6px'}}>{drawerMembership.status?.toUpperCase()}</span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>Platnosť do</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{drawerMembership.endDate || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>Zostáva</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{drawerMembership.daysRemaining} dní</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: 'dashed 1px var(--border)', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Žiadne aktívne predplatné v systéme.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-user-times" style={{fontSize: '3rem', opacity: 0.1, marginBottom: '1rem'}}></i>
              <p>Údaje nie sú dostupné</p>
            </div>
          )}
        </div>
        
        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'var(--surface2)' }}>
          <button 
            className="btn btn-blue btn-block" 
            onClick={() => { setSchedulingClient(drawerData); setDrawerOpen(false); }}
            disabled={!drawerData}
            style={{ borderRadius: '10px', height: '48px', fontWeight: 800 }}
          >
            <i className="fas fa-calendar-plus" style={{marginRight: '0.8rem'}}></i> NAPLÁNOVAŤ TRÉNING
          </button>
          <button 
            className="btn btn-red btn-block btn-ghost" 
            onClick={() => removeClient(drawerData?.id, drawerData?.fullName)}
            disabled={!drawerData}
            style={{ borderRadius: '10px', height: '44px', fontWeight: 600, fontSize: '0.75rem' }}
          >
            UKONČIŤ SPOLUPRÁCU
          </button>
        </div>
      </div>

      {/* ── Scheduling Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {schedulingClient && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setSchedulingClient(null)}
               style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} 
            />
            <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               style={{ 
                 width: '100%', maxWidth: '450px', background: 'rgba(30, 30, 35, 0.95)', backdropFilter: 'blur(20px)',
                 border: '1px solid var(--border)', borderRadius: '24px', padding: '2rem', position: 'relative'
               }}
            >
               <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Plánovanie tréningu</h3>
               <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Pre klienta: <b>{schedulingClient.fullName}</b></p>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div className="fg">
                    <label className="fl">Názov tréningu</label>
                    <input className="fi" placeholder="napr. Silový tréning - Nohy" id="ps-title" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                    <div className="fg">
                        <label className="fl">Dátum a čas</label>
                        <input className="fi" type="datetime-local" id="ps-time" defaultValue={new Date().toISOString().slice(0, 16)} />
                    </div>
                    <div className="fg">
                        <label className="fl">Trvanie</label>
                        <select className="fi" id="ps-duration">
                            <option value="30">30 min</option>
                            <option value="45">45 min</option>
                            <option value="60" selected>60 min</option>
                            <option value="90">90 min</option>
                            <option value="120">120 min</option>
                        </select>
                    </div>
                  </div>
                  <div className="fg">
                    <label className="fl">Súkromné poznámky</label>
                    <textarea className="fi" style={{ height: '80px', resize: 'none' }} id="ps-notes" placeholder="Ciele tréningu, zranenia..." />
                  </div>
               </div>

               <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-ghost btn-block" onClick={() => setSchedulingClient(null)}>ZRUŠIŤ</button>
                  <button className="btn btn-blue btn-block" onClick={async () => {
                    const title = document.getElementById('ps-title').value;
                    const startTime = document.getElementById('ps-time').value;
                    const duration = parseInt(document.getElementById('ps-duration').value);
                    const notes = document.getElementById('ps-notes').value;

                    try {
                        const res = await authenticatedFetch('/api/personal-sessions', {
                            method: 'POST',
                            body: JSON.stringify({ clientId: schedulingClient.id, title, startTime, durationMinutes: duration, notes })
                        });
                        const data = await res.json();
                        if (res.ok) {
                            setMsg({ text: `Tréning pre ${schedulingClient.fullName} bol úspešne naplánovaný!`, type: 'ok' });
                            setSchedulingClient(null);
                            // Možno obnoviť zoznam ak treba
                        } else {
                            alert(data.message || 'Chyba pri plánovaní');
                        }
                    } catch(e) { 
                      console.error(e);
                      alert('Nepodarilo sa spojiť so serverom');
                    }
                  }}>POTVRDIŤ</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
