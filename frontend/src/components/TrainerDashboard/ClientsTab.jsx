import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function ClientsTab() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

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
    <div style={{ position: 'relative' }}>
      
      {msg.text && (
        <div style={{ background: msg.type === 'err' ? 'rgba(255,45,85,0.1)' : 'rgba(200,255,0,0.1)', color: msg.type === 'err' ? 'var(--red)' : 'var(--acid)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {msg.text}
        </div>
      )}

      <div className="grid-2">
        <div className="panel">
          <div className="ph">
            <span className="pt">Moji klienti</span>
            <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={loadClients}>
                <i className="fas fa-sync-alt"></i> Obnoviť
              </button>
            </div>
          </div>
          <div className="pb">
            <div className="search-bar">
              <input 
                className="fi" 
                type="text" 
                placeholder="Hľadaj klienta..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div id="clientsList">
              {loading ? (
                <div className="empty-state"><span className="spinner"></span></div>
              ) : filteredClients.length > 0 ? (
                filteredClients.map(c => (
                  <div 
                    key={c.id} 
                    className="client-card" 
                    onClick={() => openDrawer(c)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1rem', border: '1px solid var(--border)', borderRadius: 4, marginBottom: '0.6rem', cursor: 'pointer' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--border2),var(--surface3))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'bold' }}>
                      {getInitials(c.fullName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{c.fullName || '—'}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>
                        {c.email || '—'}{c.phone ? ` · ${c.phone}` : ''}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span className={`badge ${c.active !== false ? 'b-acid' : 'b-grey'}`} style={{ fontSize: '0.6rem' }}>
                        {c.active !== false ? 'Aktívny' : 'Neaktívny'}
                      </span>
                      <button 
                        className="btn btn-red btn-sm" 
                        onClick={(e) => removeClient(c.id, c.fullName, e)}
                        style={{ background: 'transparent', padding: '0.2rem 0.5rem', minWidth: 0 }}
                      >
                        <i className="fas fa-user-minus"></i>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <i className="fas fa-users"></i>
                  <p>Žiadni klienti nenašli</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <span className="pt">Pridať klienta</span>
          </div>
          <div className="pb">
            <div className="fg" style={{ position: 'relative' }}>
              <label className="fl">Vyber člena</label>
              
              {!selectedMember ? (
                <div className="user-picker">
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      className="fi" 
                      type="text" 
                      placeholder="Hľadaj meno alebo email..." 
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                      onFocus={handleOpenPicker}
                    />
                    <button className="btn btn-ghost btn-sm" onClick={() => setPickerOpen(!pickerOpen)}>
                      <i className="fas fa-chevron-down"></i>
                    </button>
                  </div>
                  
                  {pickerOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 3, zIndex: 200, maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map(u => (
                          <div 
                            key={u.id} 
                            style={{ padding: '0.6rem 0.9rem', cursor: 'pointer', fontSize: '0.83rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between' }}
                            onClick={() => {
                              setSelectedMember(u);
                              setPickerOpen(false);
                            }}
                          >
                            <span>{u.fullName || '—'} <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>&lt;{u.email}&gt;</span></span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '0.6rem 0.9rem', color: 'var(--muted)', fontSize: '0.83rem' }}>
                          {availableMembers.length === 0 ? 'Načítavam členov...' : 'Žiadni dostupní členovia'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'rgba(10,132,255,0.07)', border: '1px solid rgba(10,132,255,0.2)', borderRadius: 3 }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--blue)', fontSize: '0.85rem' }}>{selectedMember.fullName || '—'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{selectedMember.email || '—'}</div>
                  </div>
                  <button 
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                    onClick={() => setSelectedMember(null)}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
            </div>
            
            <button className="btn btn-blue" onClick={handleAddClient} disabled={adding || !selectedMember}>
              {adding ? <span className="spinner" style={{width: 14, height: 14, marginRight: 6}}></span> : <i className="fas fa-user-plus" style={{marginRight: 6}}></i>}
              Pridať klienta
            </button>
            
            {addMsg.text && (
              <div style={{ marginTop: '0.65rem', padding: '0.55rem 0.8rem', borderRadius: 3, fontSize: '0.78rem', background: addMsg.type === 'err' ? 'rgba(255,45,85,0.08)' : 'rgba(200,255,0,0.07)', color: addMsg.type === 'err' ? 'var(--red)' : 'var(--acid)', border: `1px solid ${addMsg.type === 'err' ? 'rgba(255,45,85,0.2)' : 'rgba(200,255,0,0.18)'}` }}>
                {addMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DRAWER COMPONENT */}
      <div 
        style={{ display: drawerOpen ? 'block' : 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, backdropFilter: 'blur(4px)' }} 
        onClick={() => setDrawerOpen(false)}
      ></div>
      <div 
        style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 400, maxWidth: '100%', background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 301, display: 'flex', flexDirection: 'column', transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-d)' }}>{drawerData?.fullName || 'Detail klienta'}</h3>
          <button style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1rem', cursor: 'pointer' }} onClick={() => setDrawerOpen(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.4rem' }}>
          {drawerLoading ? (
            <div className="empty-state"><span className="spinner"></span></div>
          ) : drawerData ? (
            <>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.6rem', paddingBottom: '0.35rem', borderBottom: '1px solid var(--border)' }}>
                Základné info
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <div style={{ fontSize: '0.83rem' }}>
                  <div style={{ fontSize: '0.63rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Meno</div>
                  {drawerData.fullName || '—'}
                </div>
                <div style={{ fontSize: '0.83rem' }}>
                  <div style={{ fontSize: '0.63rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email</div>
                  <span style={{ fontSize: '0.78rem' }}>{drawerData.email || '—'}</span>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <div style={{ fontSize: '0.83rem' }}>
                  <div style={{ fontSize: '0.63rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Telefón</div>
                  {drawerData.phone || '—'}
                </div>
                <div style={{ fontSize: '0.83rem' }}>
                  <div style={{ fontSize: '0.63rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Stav</div>
                  {drawerData.active !== false ? <span className="badge b-acid">Aktívny</span> : <span className="badge b-grey">Neaktívny</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <div style={{ fontSize: '0.83rem' }}>
                  <div style={{ fontSize: '0.63rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Registrovaný</div>
                  {drawerData.createdAt ? new Date(drawerData.createdAt).toLocaleDateString('sk-SK') : '—'}
                </div>
                <div style={{ fontSize: '0.83rem' }}>
                  <div style={{ fontSize: '0.63rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rola</div>
                  <span className="badge b-blue">{drawerData.role || 'member'}</span>
                </div>
              </div>

              {drawerMembership && (
                <>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.6rem', paddingBottom: '0.35rem', borderBottom: '1px solid var(--border)', marginTop: '1rem' }}>
                    Predplatné
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <div style={{ fontSize: '0.83rem' }}>
                      <div style={{ fontSize: '0.63rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Typ</div>
                      {drawerMembership.membershipTypeName || '—'}
                    </div>
                    <div style={{ fontSize: '0.83rem' }}>
                      <div style={{ fontSize: '0.63rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</div>
                      <span className={`badge ${drawerMembership.status === 'active' ? 'b-acid' : 'b-red'}`}>{drawerMembership.status}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <div style={{ fontSize: '0.83rem' }}>
                      <div style={{ fontSize: '0.63rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Platí do</div>
                      {drawerMembership.endDate || '—'}
                    </div>
                    <div style={{ fontSize: '0.83rem' }}>
                      <div style={{ fontSize: '0.63rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Zostatok</div>
                      {drawerMembership.daysRemaining != null ? drawerMembership.daysRemaining + ' dní' : '—'}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="empty-state">
              <i className="fas fa-exclamation-triangle"></i>
              <p>Klient sa nenašiel</p>
            </div>
          )}
        </div>
        
        <div style={{ padding: '1rem 1.4rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.6rem' }}>
          <button 
            className="btn btn-red btn-sm" 
            onClick={() => removeClient(drawerData?.id, drawerData?.fullName)}
            disabled={!drawerData}
          >
            <i className="fas fa-user-minus"></i> Odstrániť klienta
          </button>
        </div>
      </div>
    </div>
  );
}
