import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Role Change State
  const [roleSearch, setRoleSearch] = useState('');
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [roleSelectedUser, setRoleSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('member');
  const [roleMsg, setRoleMsg] = useState({ text: '', type: '' });
  const [roleLoading, setRoleLoading] = useState(false);

  // Status Change State
  const [statusSearch, setStatusSearch] = useState('');
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [statusSelectedUser, setStatusSelectedUser] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [statusLoadingName, setStatusLoadingName] = useState(''); // track which button 'active' or 'frozen'

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerMembership, setDrawerMembership] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/profiles');
      const data = await res.json();
      if (res.ok) setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChangeRole = async () => {
    if (!roleSelectedUser) {
      setRoleMsg({ text: 'Vyber profil', type: 'err' });
      return;
    }
    setRoleLoading(true);
    try {
      const res = await authenticatedFetch(`/api/users/${roleSelectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Zlyhalo to');
      }
      setRoleMsg({ text: `Rola pre ${roleSelectedUser.fullName} bola zmenená na ${newRole}`, type: 'ok' });
      setRoleSelectedUser(null);
      setRoleSearch('');
      loadUsers();
    } catch (e) {
      setRoleMsg({ text: e.message, type: 'err' });
    } finally {
      setRoleLoading(false);
    }
  };

  const handleToggleStatus = async (targetActive, fromTable = false, userFromTable = null) => {
    const targetUser = fromTable ? userFromTable : statusSelectedUser;
    if (!targetUser) {
      if(!fromTable) setStatusMsg({ text: 'Vyber profil', type: 'err' });
      return;
    }

    if (!fromTable) setStatusLoadingName(targetActive ? 'active' : 'frozen');
    
    try {
      const res = await authenticatedFetch(`/api/admin/profiles/${targetUser.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ active: targetActive })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Zlyhalo to');
      }
      if (!fromTable) {
        setStatusMsg({ text: targetActive ? 'Účet aktivovaný' : 'Účet zmrazený', type: 'ok' });
        setStatusSelectedUser(null);
        setStatusSearch('');
      } else {
        if(drawerOpen && drawerUser?.id === targetUser.id) {
            setDrawerUser({...drawerUser, active: targetActive});
        }
      }
      loadUsers();
    } catch (e) {
      if (!fromTable) setStatusMsg({ text: e.message, type: 'err' });
      else alert(e.message);
    } finally {
      if (!fromTable) setStatusLoadingName('');
    }
  };

  const openDrawer = async (user) => {
    setDrawerUser(user);
    setDrawerMembership(null);
    setDrawerOpen(true);
    try {
      // also fetch membership info if we want to show it in drawer
      const res = await authenticatedFetch(`/api/admin/memberships/user/${user.id}`);
      if (res.ok) {
        const d = await res.json();
        if(d.status) setDrawerMembership(d);
      }
    } catch (e) { } // silent fail for missing membership
  };

  // derived data
  const filteredUsers = users.filter(u => {
    const matchSearch = !search || 
      (u.fullName || '').toLowerCase().includes(search.toLowerCase()) || 
      (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStatus = !statusFilter || 
      (statusFilter === 'active' && u.active !== false) || 
      ((statusFilter === 'frozen' || statusFilter === 'inactive') && u.active === false);
    return matchSearch && matchRole && matchStatus;
  });

  const getFilteredPicker = (list, query, excludeId) => {
    return list.filter(u => 
      u.id !== excludeId && 
      ((u.fullName || '').toLowerCase().includes(query.toLowerCase()) || (u.email || '').toLowerCase().includes(query.toLowerCase()))
    );
  };

  const rolePickerItems = getFilteredPicker(users, roleSearch, roleSelectedUser?.id);
  const statusPickerItems = getFilteredPicker(users, statusSearch, statusSelectedUser?.id);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="animate-in">
      <div className="panel animate-in">
        <div className="ph">
          <span className="pt">Manažment používateľských profilov</span>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="method m-get">GET /api/admin/profiles</span>
            <button className="btn btn-ghost btn-sm" onClick={loadUsers}>
              <i className="fas fa-sync-alt"></i> OBNOVIŤ
            </button>
          </div>
        </div>
        <div className="pb">
          <div className="search-bar" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
              <input 
                className="fi" 
                type="text" 
                placeholder="Hľadať meno, email alebo ID..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ paddingLeft: '2.8rem', borderRadius: '8px' }}
              />
            </div>
            <select className="fi" style={{ maxWidth: 160, borderRadius: '8px' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">Všetky role</option>
              <option value="member">Člen</option>
              <option value="trainer">Tréner</option>
              <option value="admin">Administrátor</option>
              <option value="reception">Recepcia</option>
            </select>
            <select className="fi" style={{ maxWidth: 160, borderRadius: '8px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Všetky stavy</option>
              <option value="active">Aktívni</option>
              <option value="frozen">Zmrazení</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div className="empty-state"><span className="spinner" style={{width: 32, height: 32}}></span></div>
            ) : filteredUsers.length > 0 ? (
              <table className="dt">
                <thead>
                  <tr>
                    <th>Používateľ</th>
                    <th>Email</th>
                    <th>Rola</th>
                    <th>Stav účtu</th>
                    <th style={{ textAlign: 'right' }}>Akcie</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const roleCls = u.role === 'admin' ? 'b-red' : u.role === 'trainer' ? 'b-orange' : u.role === 'reception' ? 'b-blue' : 'b-grey';
                    return (
                      <tr key={u.id} className={u.active === false ? 'frozen-row' : ''} style={{ transition: 'background 0.2s' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,var(--surface2),var(--surface3))', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, color: 'var(--muted)', flexShrink: 0 }}>
                              {getInitials(u.fullName)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{u.fullName || '—'}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'monospace' }}>ID: {u.id?.substring(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{u.email || '—'}</td>
                        <td><span className={`badge ${roleCls}`}>{u.role || '—'}</span></td>
                        <td>
                          {u.active !== false ? 
                            <span className="badge b-acid"><i className="fas fa-check-circle" style={{fontSize: '0.6rem'}}></i> Aktívny</span> : 
                            <span className="badge b-frozen"><i className="fas fa-snowflake" style={{fontSize: '0.6rem'}}></i> Zmrazený</span>
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" title="Viac informácií" onClick={() => openDrawer(u)} style={{ borderRadius: '6px', width: '32px', height: '32px', padding: 0 }}>
                              <i className="fas fa-info-circle"></i>
                            </button>
                            <button className="btn btn-ghost btn-sm" title="Upraviť rolu" onClick={() => { setRoleSelectedUser(u); window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'}); }} style={{ borderRadius: '6px', width: '32px', height: '32px', padding: 0 }}>
                              <i className="fas fa-user-shield"></i>
                            </button>
                            <button 
                              className={`btn btn-${u.active !== false ? 'red' : 'acid'} btn-sm`} 
                              title={u.active !== false ? 'Deaktivovať' : 'Aktivovať'} 
                              onClick={() => handleToggleStatus(u.active === false, true, u)}
                              style={{ borderRadius: '6px', width: '32px', height: '32px', padding: 0, background: 'transparent', borderColor: u.active !== false ? 'rgba(255,45,85,0.2)' : 'rgba(200,255,0,0.2)', color: u.active !== false ? 'var(--red)' : 'var(--acid)' }}
                            >
                              <i className={`fas fa-${u.active !== false ? 'user-slash' : 'user-check'}`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <i className="fas fa-user-friends" style={{ opacity: 0.1, fontSize: '3rem' }}></i>
                <p>Nenašli sa žiadni používatelia zodpovedajúci filtrom.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Change Role Panel */}
        <div className="panel animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="ph">
            <span className="pt">Zmena oprávnení</span>
            <span className="method m-put">API: UPDATE_ROLE</span>
          </div>
          <div className="pb">
            <div className="fg" style={{ position: 'relative' }}>
              <label className="fl">Vybraný používateľ</label>
              {!roleSelectedUser ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="fi" type="text" placeholder="Hľadaj podľa mena..." value={roleSearch} onChange={e => setRoleSearch(e.target.value)} onFocus={() => setRolePickerOpen(true)} style={{ borderRadius: '8px' }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => setRolePickerOpen(!rolePickerOpen)} style={{ borderRadius: '8px' }}>
                    <i className="fas fa-chevron-down"></i>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1rem', background: 'rgba(200,255,0,0.04)', border: '1px solid rgba(200,255,0,0.1)', borderRadius: '10px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--acid)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.7rem' }}>
                    {getInitials(roleSelectedUser.fullName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--acid)', fontSize: '0.88rem' }}>{roleSelectedUser.fullName || '—'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{roleSelectedUser.email || '—'}</div>
                  </div>
                  <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.5rem' }} onClick={() => setRoleSelectedUser(null)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
              {rolePickerOpen && !roleSelectedUser && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '10px', zIndex: 200, maxHeight: 200, overflowY: 'auto', marginTop: '4px', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', padding: '0.5rem' }}>
                  {rolePickerItems.length > 0 ? rolePickerItems.map(u => (
                    <div key={u.id} style={{ padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '6px', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }} 
                         onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                         onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                         onClick={() => { setRoleSelectedUser(u); setRolePickerOpen(false); }}>
                      <span>{u.fullName || '—'} <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: '0.3rem' }}>({u.email})</span></span>
                      <span className="badge b-grey" style={{ fontSize: '0.6rem' }}>{u.role}</span>
                    </div>
                  )) : <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>Žiadni používatelia</div>}
                </div>
              )}
            </div>
            <div className="fg">
              <label className="fl">Nová úroveň prístupu</label>
              <select className="fi" value={newRole} onChange={e => setNewRole(e.target.value)} style={{ borderRadius: '8px' }}>
                <option value="member">Člen (Member)</option>
                <option value="trainer">Tréner (Trainer)</option>
                <option value="admin">Administrátor (Admin)</option>
                <option value="reception">Recepcia (Reception)</option>
              </select>
            </div>
            <button className="btn btn-acid btn-block" onClick={handleChangeRole} disabled={roleLoading || !roleSelectedUser} style={{ borderRadius: '8px', marginTop: '0.5rem' }}>
              {roleLoading ? <span className="spinner" style={{width: 16, height: 16, marginRight: 8}}></span> : <i className="fas fa-save" style={{marginRight: 8}}></i>} ULOŽIŤ ZMENY
            </button>
            {roleMsg.text && (
               <div className={`fm ${roleMsg.type}`} style={{ borderRadius: '8px', padding: '0.8rem', marginTop: '1rem' }}>
                 <i className={`fas ${roleMsg.type === 'ok' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`} style={{marginRight: '0.5rem'}}></i>
                 {roleMsg.text}
               </div>
            )}
          </div>
        </div>

        {/* Status Panel */}
        <div className="panel animate-in" style={{ animationDelay: '0.2s' }}>
          <div className="ph">
            <span className="pt">Stav systémového účtu</span>
            <span className="method m-put">API: UPDATE_STATUS</span>
          </div>
          <div className="pb">
            <div style={{ background: 'rgba(79, 195, 247, 0.05)', border: '1px solid rgba(79, 195, 247, 0.15)', borderRadius: '12px', padding: '1rem', fontSize: '0.78rem', color: 'var(--frozen)', display: 'flex', alignItems: 'flex-start', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <i className="fas fa-info-circle" style={{ marginTop: '0.2rem' }}></i>
              <div>
                <b>ZMRAZENIE ÚČTU:</b> Používateľ sa nebude môcť prihlásiť do aplikácie, kým jeho účet opätovne neaktivujete.
              </div>
            </div>
            <div className="fg" style={{ position: 'relative' }}>
              <label className="fl">Hľadať profil</label>
              {!statusSelectedUser ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="fi" type="text" placeholder="Hľadaj podľa mena..." value={statusSearch} onChange={e => setStatusSearch(e.target.value)} onFocus={() => setStatusPickerOpen(true)} style={{ borderRadius: '8px' }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => setStatusPickerOpen(!statusPickerOpen)} style={{ borderRadius: '8px' }}>
                    <i className="fas fa-filter"></i>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1rem', background: 'rgba(79, 195, 247, 0.04)', border: '1px solid rgba(79, 195, 247, 0.15)', borderRadius: '10px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--frozen)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.7rem' }}>
                    {getInitials(statusSelectedUser.fullName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--frozen)', fontSize: '0.88rem' }}>{statusSelectedUser.fullName || '—'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{statusSelectedUser.email || '—'}</div>
                  </div>
                  <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.5rem' }} onClick={() => setStatusSelectedUser(null)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
              {statusPickerOpen && !statusSelectedUser && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: '10px', zIndex: 200, maxHeight: 200, overflowY: 'auto', marginTop: '4px', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', padding: '0.5rem' }}>
                  {statusPickerItems.length > 0 ? statusPickerItems.map(u => (
                    <div key={u.id} style={{ padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '6px', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }} 
                         onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                         onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                         onClick={() => { setStatusSelectedUser(u); setStatusPickerOpen(false); }}>
                      <span>{u.fullName || '—'}</span>
                      {u.active === false && <span className="badge b-frozen"><i className="fas fa-snowflake" style={{fontSize: '0.5rem', marginRight: '0.3rem'}}></i> ZMRAZENÝ</span>}
                    </div>
                  )) : <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>Žiadne výsledky</div>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1rem' }}>
              <button className="btn btn-acid btn-sm" style={{flex: 1, borderRadius: '8px'}} onClick={() => handleToggleStatus(true)} disabled={statusLoadingName !== '' || !statusSelectedUser}>
                {statusLoadingName === 'active' ? <span className="spinner" style={{width: 14, height: 14, marginRight: 6}}></span> : <i className="fas fa-user-check" style={{marginRight: 6}}></i>} AKTIVOVAŤ
              </button>
              <button className="btn btn-red btn-sm" style={{flex: 1, borderRadius: '8px', background: 'transparent', color: 'var(--red)', borderColor: 'var(--red)'}} onClick={() => handleToggleStatus(false)} disabled={statusLoadingName !== '' || !statusSelectedUser}>
                {statusLoadingName === 'frozen' ? <span className="spinner" style={{width: 14, height: 14, marginRight: 6}}></span> : <i className="fas fa-snowflake" style={{marginRight: 6}}></i>} ZMRAZIŤ
              </button>
            </div>
            {statusMsg.text && (
              <div className={`fm ${statusMsg.type}`} style={{ borderRadius: '8px', padding: '0.8rem', marginTop: '1rem' }}>
                <i className={`fas ${statusMsg.type === 'ok' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`} style={{marginRight: '0.5rem'}}></i>
                {statusMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Drawer Component */}
      <div 
        style={{ display: drawerOpen ? 'block' : 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, backdropFilter: 'blur(8px)', opacity: drawerOpen ? 1 : 0, transition: 'opacity 0.3s' }} 
        onClick={() => setDrawerOpen(false)}
      ></div>
      <div 
        style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 450, maxWidth: '90%', background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 301, display: 'flex', flexDirection: 'column', transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)', boxShadow: '-20px 0 50px rgba(0,0,0,0.5)' }}
      >
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)' }}>
          <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-d)', letterSpacing: '0.05em', fontWeight: 900 }}>DETAILY POUŽÍVATEĽA</h3>
          <button style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} 
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onClick={() => setDrawerOpen(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {drawerUser ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ width: 80, height: 80, borderRadius: '20px', background: 'linear-gradient(135deg,var(--red),var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 950, color: '#fff', boxShadow: '0 10px 25px rgba(255,45,85,0.2)', border: '2px solid rgba(255,255,255,0.1)' }}>
                  {getInitials(drawerUser.fullName)}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '1.8rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '0.4rem' }}>{drawerUser.fullName || 'BEZ MENA'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.6rem' }}>{drawerUser.email || 'Žiadny email'}</div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <span className="badge b-red" style={{fontSize: '0.6rem'}}>{drawerUser.role || 'MEMBER'}</span>
                    {drawerUser.active !== false ? <span className="badge b-acid" style={{fontSize: '0.6rem'}}>AKTÍVNY</span> : <span className="badge b-frozen" style={{fontSize: '0.6rem'}}>ZMRAZENÝ</span>}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)', fontWeight: 800 }}>
                  <i className="fas fa-info-circle" style={{marginRight: '0.6rem'}}></i> Základné informácie
                </div>
                
                <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <div className="glass" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700 }}>Telefón</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{drawerUser.phone || '—'}</div>
                  </div>
                  <div className="glass" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700 }}>Členom od</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{drawerUser.createdAt ? new Date(drawerUser.createdAt).toLocaleDateString('sk-SK') : '—'}</div>
                  </div>
                </div>
                
                <div className="glass" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '1.2rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700 }}>Systémové ID</div>
                  <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--muted)' }}>{drawerUser.id || '—'}</div>
                </div>
              </div>

              <div style={{ marginBottom: '150px' }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1.2rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border)', fontWeight: 800 }}>
                  <i className="fas fa-id-card" style={{marginRight: '0.6rem'}}></i> Aktuálne predplatné
                </div>
                {drawerMembership ? (
                  <div className="glass highlight acid" style={{ padding: '1.5rem', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(200,255,0,0.05) 0%, rgba(10,10,10,0.4) 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.2rem' }}>TYP ČLENSTVA</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-d)', color: 'var(--acid)' }}>{drawerMembership.membershipTypeName || '—'}</div>
                      </div>
                      <span className={`badge ${drawerMembership.status === 'active' ? 'b-acid' : 'b-red'}`} style={{padding: '0.3rem 0.8rem', borderRadius: '6px'}}>{drawerMembership.status === 'active' ? 'AKTÍVNE' : 'VYPRŠANÉ'}</span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>Platnosť do</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{drawerMembership.endDate || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>Dni k dispozícii</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: drawerMembership.daysRemaining < 7 ? 'var(--red)' : 'var(--text)' }}>{drawerMembership.daysRemaining != null ? drawerMembership.daysRemaining : '—'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: 'dashed 1px var(--border)' }}>
                    <i className="fas fa-times-circle" style={{ opacity: 0.2, marginBottom: '0.5rem' }}></i>
                    <p style={{ fontSize: '0.85rem' }}>Používateľ nemá žiadne aktívne predplatné v systéme.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
             <div className="empty-state"><span className="spinner" style={{width: 32, height: 32}}></span></div>
          )}
        </div>
        
        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'var(--surface2)' }}>
          <button className={`btn btn-${drawerUser?.active !== false ? 'red' : 'acid'} btn-block`} onClick={() => handleToggleStatus(drawerUser?.active === false, true, drawerUser)} style={{ borderRadius: '10px', height: '48px' }}>
            {drawerUser?.active !== false ? <><i className="fas fa-user-slash" style={{marginRight: '0.8rem'}}></i> ZMRAZIŤ POUŽÍVATEĽA</> : <><i className="fas fa-user-check" style={{marginRight: '0.8rem'}}></i> AKTIVOVAŤ POUŽÍVATEĽA</>}
          </button>
        </div>
      </div>
    </div>
  );
}
