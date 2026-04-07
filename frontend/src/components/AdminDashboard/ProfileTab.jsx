import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedFetch } from '../../utils/api';

export default function ProfileTab({ user, updateUser }) {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  
  // Security
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');

  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/auth/me');
      if (res.ok) {
        const d = await res.json();
        setProfile(d);
        setEditName(d.fullName || '');
        setEditPhone(d.phone || '');
        setEditAvatar(d.avatarUrl || '');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveProfile = async () => {
    if (!editName) return setMsg({ text: 'Meno je povinné', type: 'err' });
    try {
      const uid = user?.id || user?.userId || profile?.id;
      const res = await authenticatedFetch('/api/users/' + uid, {
        method: 'PUT',
        body: JSON.stringify({ fullName: editName, phone: editPhone, avatarUrl: editAvatar, active: profile?.active })
      });
      if (res.ok) {
        setMsg({ text: 'Administratívny profil uložený!', type: 'ok' });
        if (updateUser) updateUser({ ...user, fullName: editName, avatarUrl: editAvatar });
        setTimeout(() => setMsg({ text: '', type: '' }), 3000);
      } else { throw new Error('Chyba servera'); }
    } catch (e) { setMsg({ text: e.message, type: 'err' }); }
  };

  const changePassword = async () => {
    if (!curPass) return setMsg({ text: 'Zadaj aktuálne heslo', type: 'err' });
    if (newPass.length < 6) return setMsg({ text: 'Nové heslo musí mať aspoň 6 znakov', type: 'err' });
    if (newPass !== newPass2) return setMsg({ text: 'Nové heslá sa nezhodujú', type: 'err' });

    try {
      const uid = user?.id || user?.userId || profile?.id;
      const res = await authenticatedFetch(`/api/users/${uid}/password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: curPass, newPassword: newPass })
      });
      if (res.ok) {
        setMsg({ text: 'Admin heslo zmenené!', type: 'ok' });
        setCurPass(''); setNewPass(''); setNewPass2('');
        setTimeout(() => setMsg({ text: '', type: '' }), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Chyba');
      }
    } catch (e) { setMsg({ text: e.message, type: 'err' }); }
  };

  const initials = editName ? editName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  const menuItems = [
    { id: 'profile', icon: 'fa-user-shield', label: 'Admin Profil' },
    { id: 'security', icon: 'fa-lock', label: 'Zabezpečenie' },
    { id: 'system', icon: 'fa-cogs', label: 'Systém' },
  ];

  if (loading) return <div className="ps active"><span className="spin"></span></div>;

  return (
    <div className="profile-redesign animate-in" style={{ padding: '0.5rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-d)', marginBottom: '0.4rem' }}>Administrácia</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Správa vášho administrátorského účtu</p>
      </header>

      <div className="settings-grid">
        <div className="panel profile-sidebar-wrapper" style={{ padding: '0.6rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => { setActiveSubTab(item.id); setMsg({ text: '', type: '' }); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1.1rem 1.2rem', background: activeSubTab === item.id ? 'rgba(255, 45, 85, 0.1)' : 'transparent',
                border: 'none', borderRadius: '12px', color: activeSubTab === item.id ? 'var(--red)' : 'var(--muted)',
                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', fontWeight: activeSubTab === item.id ? 800 : 500,
                position: 'relative', overflow: 'hidden'
              }}
            >
              {activeSubTab === item.id && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: 'var(--red)', borderRadius: '0 4px 4px 0' }} />}
              <i className={`fas ${item.icon}`} style={{ fontSize: '1rem', width: '20px' }}></i>
              <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content-wrapper">
          <div className="panel settings-profile-card" style={{ padding: 0, background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '120px', background: 'linear-gradient(135deg, #0f172a 30%, var(--red) 100%)', opacity: 0.8 }}></div>
            <div style={{ marginTop: '-60px', padding: '1.5rem', textAlign: 'center' }}>
               <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '28px', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 900, color: '#fff', boxShadow: '0 15px 35px rgba(255, 45, 85, 0.3)', marginBottom: '1.5rem', border: '5px solid #161d2b', overflow: 'hidden' }}>
                    {editAvatar ? <img src={editAvatar} alt="Admin Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                  </div>
               </div>
               <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.3rem' }}>{editName || 'Admin'}</h3>
               <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>Hlavný Administrátor</p>
               <span className="badge b-red">SUPERUSER</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeSubTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel settings-form-panel" style={{ padding: '2.5rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Správa Admina</h3>
                  <button onClick={saveProfile} className="btn" style={{ background: 'var(--red)', color: '#fff', padding: '0.8rem 1.8rem', borderRadius: '12px', fontWeight: 800 }}>ULOŽIŤ</button>
                </div>

                <div className="profile-redesign-form-grid">
                  <div className="fg">
                    <label className="fl">Celé meno</label>
                    <input className="fi" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label className="fl">Telefón</label>
                    <input className="fi" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                  </div>
                  <div className="fg" style={{ gridColumn: 'span 2' }}>
                    <label className="fl">URL avatara</label>
                    <input className="fi" value={editAvatar} onChange={e => setEditAvatar(e.target.value)} />
                  </div>
                </div>
                {msg.text && <div className={`fm ${msg.type}`} style={{ borderRadius: '12px', marginTop: '1rem' }}>{msg.text}</div>}
              </motion.div>
            )}

            {activeSubTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel settings-form-panel" style={{ padding: '2.5rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                   <h3 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Zabezpečenie Admina</h3>
                   <button onClick={changePassword} className="btn" style={{ background: 'var(--red)', color: '#fff', padding: '0.8rem 1.8rem', borderRadius: '12px', fontWeight: 800 }}>ZMENIŤ HESLO</button>
                 </div>
                 
                 <div className="profile-redesign-form-grid">
                   <div className="fg" style={{ gridColumn: 'span 2' }}>
                     <label className="fl">Aktuálne admin heslo</label>
                     <input className="fi" type="password" value={curPass} onChange={e => setCurPass(e.target.value)} />
                   </div>
                   <div className="fg">
                     <label className="fl">Nové heslo</label>
                     <input className="fi" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
                   </div>
                   <div className="fg">
                     <label className="fl">Zopakovať nové heslo</label>
                     <input className="fi" type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)} />
                   </div>
                 </div>
                 {msg.text && <div className={`fm ${msg.type}`} style={{ borderRadius: '12px', marginTop: '1rem' }}>{msg.text}</div>}
              </motion.div>
            )}

            {activeSubTab === 'system' && (
              <motion.div key="system" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel settings-form-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
                 <i className="fas fa-server" style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '1rem', display: 'block' }}></i>
                 <p style={{ color: 'var(--muted)' }}>Systémové nastavenia sú v režime čítania.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}

