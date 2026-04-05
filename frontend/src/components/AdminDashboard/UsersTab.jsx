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
    <div>
      <div className="panel">
        <div className="ph">
          <span className="pt">Všetky profily</span>
          <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge b-cyan" style={{textTransform:'none', letterSpacing:0, padding:'0.18rem 0.55rem'}}>GET /api/admin/profiles</span>
            <button className="btn btn-ghost btn-sm" onClick={loadUsers}>
              <i className="fas fa-sync-alt"></i> Obnoviť
            </button>
          </div>
        </div>
        <div className="pb">
          <div className="search-bar">
            <input className="fi" type="text" placeholder="Hľadať meno alebo email..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="fi" style={{ maxWidth: 140 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">Všetky role</option>
              <option value="member">Member</option>
              <option value="trainer">Trainer</option>
              <option value="admin">Admin</option>
              <option value="reception">Reception</option>
            </select>
            <select className="fi" style={{ maxWidth: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Všetky stavy</option>
              <option value="active">Aktívni</option>
              <option value="frozen">Zmrazení</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div className="empty-state"><span className="spinner"></span></div>
            ) : filteredUsers.length > 0 ? (
              <table className="dt">
                <thead>
                  <tr>
                    <th>Meno</th>
                    <th>Email</th>
                    <th>Rola</th>
                    <th>Stav účtu</th>
                    <th>Akcie</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const roleCls = u.role === 'admin' ? 'b-red' : u.role === 'trainer' ? 'b-orange' : u.role === 'reception' ? 'b-blue' : 'b-grey';
                    return (
                      <tr key={u.id} className={u.active === false ? 'frozen-row' : ''}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--red),var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              {getInitials(u.fullName)}
                            </div>
                            <div>
                              <b>{u.fullName || '—'}</b>
                              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{u.id?.substring(0, 8)}…</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{u.email || '—'}</td>
                        <td><span className={`badge ${roleCls}`}>{u.role || '—'}</span></td>
                        <td>
                          {u.active !== false ? <span className="badge b-acid">Aktívny</span> : <span className="badge b-frozen"><i className="fas fa-snowflake"></i> Zmrazený</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-sm" title="Detail" onClick={() => openDrawer(u)}>
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-ghost btn-sm" title="Rola" onClick={() => { setRoleSelectedUser(u); window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'}); }}>
                              <i className="fas fa-user-tag"></i>
                            </button>
                            <button 
                              className={`btn btn-${u.active !== false ? 'frozen' : 'cyan'} btn-sm`} 
                              title={u.active !== false ? 'Zmraziť' : 'Aktivovať'} 
                              onClick={() => handleToggleStatus(u.active === false, true, u)}
                            >
                              <i className={`fas fa-${u.active !== false ? 'snowflake' : 'user-check'}`}></i>
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
                <i className="fas fa-users"></i>
                <p>Žiadne výsledky</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Change Role Panel */}
        <div className="panel">
          <div className="ph">
            <span className="pt">Zmeniť rolu</span>
            <span className="method m-put" style={{ textTransform: 'none', letterSpacing: 0, padding: '0.18rem 0.55rem' }}>PUT /api/users/[id]</span>
          </div>
          <div className="pb">
            <div className="fg" style={{ position: 'relative' }}>
              <label className="fl">Vyber profil</label>
              {!roleSelectedUser ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="fi" type="text" placeholder="Hľadaj..." value={roleSearch} onChange={e => setRoleSearch(e.target.value)} onFocus={() => setRolePickerOpen(true)} />
                  <button className="btn btn-ghost btn-sm" onClick={() => setRolePickerOpen(!rolePickerOpen)}>
                    <i className="fas fa-chevron-down"></i>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.15)', borderRadius: 3 }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--acid)', fontSize: '0.85rem' }}>{roleSelectedUser.fullName || '—'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{roleSelectedUser.email || '—'}</div>
                  </div>
                  <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }} onClick={() => setRoleSelectedUser(null)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
              {rolePickerOpen && !roleSelectedUser && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 3, zIndex: 200, maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
                  {rolePickerItems.map(u => (
                    <div key={u.id} style={{ padding: '0.6rem 0.9rem', cursor: 'pointer', fontSize: '0.83rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between' }} onClick={() => { setRoleSelectedUser(u); setRolePickerOpen(false); }}>
                      <span>{u.fullName || '—'} <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>&lt;{u.email}&gt;</span></span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--muted)', fontFamily: 'var(--font-d)' }}>{u.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="fg">
              <label className="fl">Nová rola</label>
              <select className="fi" value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="member">member</option>
                <option value="trainer">trainer</option>
                <option value="admin">admin</option>
                <option value="reception">reception</option>
              </select>
            </div>
            <button className="btn btn-orange" onClick={handleChangeRole} disabled={roleLoading || !roleSelectedUser}>
              {roleLoading ? <span className="spinner" style={{width: 14, height: 14, marginRight: 6}}></span> : <i className="fas fa-user-tag"></i>} Zmeniť rolu
            </button>
            {roleMsg.text && (
               <div className={`fm ${roleMsg.type}`}>{roleMsg.text}</div>
            )}
          </div>
        </div>

        {/* Status Panel */}
        <div className="panel">
          <div className="ph">
            <span className="pt">Správa prístupu</span>
            <span className="method m-put" style={{ textTransform: 'none', letterSpacing: 0, padding: '0.18rem 0.55rem' }}>PUT /api/admin/profiles/[id]/status</span>
          </div>
          <div className="pb">
            <div style={{ background: 'var(--frozen-bg)', border: '1px solid var(--frozen-border)', borderRadius: 4, padding: '0.6rem 1rem', fontSize: '0.8rem', color: 'var(--frozen)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <i className="fas fa-snowflake"></i> <b>Zmrazený účet</b> = používateľ sa nevie prihlásiť. Aktívny = normálny prístup.
            </div>
            <div className="fg" style={{ position: 'relative' }}>
              <label className="fl">Vyber profil</label>
              {!statusSelectedUser ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="fi" type="text" placeholder="Hľadaj..." value={statusSearch} onChange={e => setStatusSearch(e.target.value)} onFocus={() => setStatusPickerOpen(true)} />
                  <button className="btn btn-ghost btn-sm" onClick={() => setStatusPickerOpen(!statusPickerOpen)}>
                    <i className="fas fa-chevron-down"></i>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.15)', borderRadius: 3 }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--acid)', fontSize: '0.85rem' }}>{statusSelectedUser.fullName || '—'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{statusSelectedUser.email || '—'}</div>
                  </div>
                  <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }} onClick={() => setStatusSelectedUser(null)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
              {statusPickerOpen && !statusSelectedUser && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 3, zIndex: 200, maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
                  {statusPickerItems.map(u => (
                    <div key={u.id} style={{ padding: '0.6rem 0.9rem', cursor: 'pointer', fontSize: '0.83rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between' }} onClick={() => { setStatusSelectedUser(u); setStatusPickerOpen(false); }}>
                      <span>{u.fullName || '—'} <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>&lt;{u.email}&gt;</span></span>
                      {u.active === false && <span style={{ color: 'var(--frozen)', fontSize: '0.65rem' }}>❄</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-cyan" onClick={() => handleToggleStatus(true)} disabled={statusLoadingName !== '' || !statusSelectedUser}>
                {statusLoadingName === 'active' ? <span className="spinner" style={{width: 14, height: 14, marginRight: 6}}></span> : <i className="fas fa-user-check"></i>} Aktivovať
              </button>
              <button className="btn btn-frozen" onClick={() => handleToggleStatus(false)} disabled={statusLoadingName !== '' || !statusSelectedUser}>
                {statusLoadingName === 'frozen' ? <span className="spinner" style={{width: 14, height: 14, marginRight: 6}}></span> : <i className="fas fa-snowflake"></i>} Zmraziť účet
              </button>
            </div>
            {statusMsg.text && (
              <div className={`fm ${statusMsg.type}`}>{statusMsg.text}</div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Drawer Component */}
      <div 
        style={{ display: drawerOpen ? 'block' : 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, backdropFilter: 'blur(4px)' }} 
        onClick={() => setDrawerOpen(false)}
      ></div>
      <div 
        style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, maxWidth: '100%', background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 301, display: 'flex', flexDirection: 'column', transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-d)' }}>{drawerUser?.fullName || 'Detail profilu'}</h3>
          <button style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.1rem', cursor: 'pointer' }} onClick={() => setDrawerOpen(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {drawerUser ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,var(--red),var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {getInitials(drawerUser.fullName)}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '1.3rem', fontWeight: 900 }}>{drawerUser.fullName || '—'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{drawerUser.email || ''}</div>
                  <div style={{ marginTop: '0.3rem' }}><span className="badge b-grey">{drawerUser.role || ''}</span></div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.7rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border)' }}>
                  Základné info
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.83rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>Telefón</div>
                    {drawerUser.phone || '—'}
                  </div>
                  <div style={{ fontSize: '0.83rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>Rola</div>
                    {drawerUser.role || '—'}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.83rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>Stav účtu</div>
                    {drawerUser.active !== false ? <span className="badge b-acid">Aktívny</span> : <span className="badge b-frozen"><i className="fas fa-snowflake"></i> Zmrazený</span>}
                  </div>
                  <div style={{ fontSize: '0.83rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>Registrovaný</div>
                    {drawerUser.createdAt ? new Date(drawerUser.createdAt).toLocaleDateString('sk-SK') : '—'}
                  </div>
                </div>
              </div>

              {drawerMembership ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.7rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border)' }}>
                    Predplatné
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.83rem' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>Typ</div>
                      {drawerMembership.membershipTypeName || '—'}
                    </div>
                    <div style={{ fontSize: '0.83rem' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>Status</div>
                      <span className={`badge ${drawerMembership.status === 'active' ? 'b-acid' : 'b-red'}`}>{drawerMembership.status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.83rem' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>Platí do</div>
                      {drawerMembership.endDate || '—'}
                    </div>
                    <div style={{ fontSize: '0.83rem' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>Zostatok</div>
                      {drawerMembership.daysRemaining != null ? drawerMembership.daysRemaining + ' dní' : '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.7rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border)' }}>
                    Predplatné
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.83rem' }}>Žiadne aktívne predplatné</div>
                </div>
              )}
            </>
          ) : (
             <div className="empty-state"><span className="spinner"></span></div>
          )}
        </div>
        
        <div style={{ padding: '1.2rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <button className={`btn btn-${drawerUser?.active !== false ? 'frozen' : 'cyan'}`} onClick={() => handleToggleStatus(drawerUser?.active === false, true, drawerUser)}>
            {drawerUser?.active !== false ? <><i className="fas fa-snowflake"></i> Zmraziť účet</> : <><i className="fas fa-user-check"></i> Aktivovať účet</>}
          </button>
        </div>
      </div>
    </div>
  );
}
