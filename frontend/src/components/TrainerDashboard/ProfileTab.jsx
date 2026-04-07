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
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBio, setEditBio] = useState('');
  
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
        setEditSpecialization(d.specialization || '');
        setEditAvatar(d.avatarUrl || '');
        setEditBio(d.bio || '');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveProfile = async () => {
    if (!editName) return setMsg({ text: 'Meno je povinné', type: 'err' });
    try {
      const uid = user?.id || user?.userId;
      const res = await authenticatedFetch('/api/users/' + uid, {
        method: 'PUT',
        body: JSON.stringify({ fullName: editName, phone: editPhone, specialization: editSpecialization, avatarUrl: editAvatar, bio: editBio })
      });
      if (res.ok) {
        setMsg({ text: 'Profil bol uložený!', type: 'ok' });
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
      const uid = user?.id || user?.userId;
      const res = await authenticatedFetch(`/api/users/${uid}/password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: curPass, newPassword: newPass })
      });
      if (res.ok) {
        setMsg({ text: 'Heslo bolo úspešne zmenené!', type: 'ok' });
        setCurPass(''); setNewPass(''); setNewPass2('');
        setTimeout(() => setMsg({ text: '', type: '' }), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Chyba pri zmene hesla');
      }
    } catch (e) { setMsg({ text: e.message, type: 'err' }); }
  };

  const initials = editName ? editName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  const menuItems = [
    { id: 'profile', icon: 'fa-user', label: 'Profil' },
    { id: 'security', icon: 'fa-shield-alt', label: 'Zabezpečenie' },
    { id: 'notifications', icon: 'fa-bell', label: 'Notifikácie' },
    { id: 'support', icon: 'fa-question-circle', label: 'Podpora' },
  ];

  if (loading) return <div className="ps active"><span className="spin"></span></div>;

  return (
    <div className="profile-redesign animate-in" style={{ padding: '0.5rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-d)', marginBottom: '0.4rem' }}>Nastavenia</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Spravuj svoju profesionálnu vizitku a účet</p>
      </header>

      <div className="settings-grid">
        {/* Sidebar */}
        <div className="panel profile-sidebar-wrapper" style={{ padding: '0.6rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => { setActiveSubTab(item.id); setMsg({ text: '', type: '' }); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1.1rem 1.2rem', background: activeSubTab === item.id ? 'rgba(10, 132, 255, 0.1)' : 'transparent',
                border: 'none', borderRadius: '12px', color: activeSubTab === item.id ? 'var(--blue)' : 'var(--muted)',
                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', fontWeight: activeSubTab === item.id ? 800 : 500,
                position: 'relative', overflow: 'hidden'
              }}
            >
              {activeSubTab === item.id && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: 'var(--blue)', borderRadius: '0 4px 4px 0' }} />}
              <i className={`fas ${item.icon}`} style={{ fontSize: '1rem', width: '20px' }}></i>
              <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
              {activeSubTab === item.id && <i className="fas fa-chevron-right" style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.5 }}></i>}
            </button>
          ))}
          <div className="version-info" style={{ marginTop: '3rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>VERZIA</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)' }}>TrainerPro v1.8.4</div>
          </div>
        </div>
        
        <div className="settings-content-wrapper">
          {/* Profile Card */}
          <div className="panel settings-profile-card" style={{ padding: 0, background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '120px', background: 'linear-gradient(135deg, #0f172a 30%, var(--blue) 100%)', opacity: 0.8 }}></div>
            <div style={{ marginTop: '-60px', padding: '1.5rem', textAlign: 'center' }}>
               <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '28px', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 900, color: '#fff', boxShadow: '0 15px 35px rgba(10, 132, 255, 0.3)', marginBottom: '1.5rem', border: '5px solid #161d2b', overflow: 'hidden' }}>
                    {editAvatar ? <img src={editAvatar} alt="Tvoj Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                  </div>
                  <button style={{ position: 'absolute', bottom: '15px', right: '-5px', width: '36px', height: '36px', borderRadius: '10px', background: '#334155', border: '3px solid #161d2b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <i className="fas fa-camera" style={{ fontSize: '0.8rem' }}></i>
                  </button>
               </div>
               <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.3rem' }}>{editName || 'Tréner'}</h3>
               <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '2rem' }}>{editSpecialization || 'Fitness Inštruktor'}</p>
               
               <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                        <i className="fas fa-certificate"></i>
                     </div>
                     <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase' }}>CERTIFIKÁT</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Overený Tréner</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Main Content Areas */}
          <AnimatePresence mode="wait">
            {activeSubTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel settings-form-panel" style={{ padding: '2.5rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Profilové údaje</h3>
                  <button onClick={saveProfile} className="btn" style={{ background: 'var(--blue)', color: '#fff', padding: '0.8rem 1.8rem', borderRadius: '12px', fontWeight: 800 }}>ULOŽIŤ</button>
                </div>

                <div className="profile-redesign-form-grid">
                  <div className="fg">
                    <label className="fl">Celé meno</label>
                    <input className="fi" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label className="fl">Špecializácia</label>
                    <input className="fi" value={editSpecialization} onChange={e => setEditSpecialization(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label className="fl">Telefón</label>
                    <input className="fi" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label className="fl">Avatar URL</label>
                    <input className="fi" value={editAvatar} onChange={e => setEditAvatar(e.target.value)} />
                  </div>
                </div>
                <div className="fg">
                  <label className="fl">Bio / O mne</label>
                  <textarea className="fi" style={{ height: '100px' }} value={editBio} onChange={e => setEditBio(e.target.value)} />
                </div>
                {msg.text && <div className={`fm ${msg.type}`} style={{ borderRadius: '12px', marginTop: '1rem' }}>{msg.text}</div>}
              </motion.div>
            )}

            {activeSubTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel settings-form-panel" style={{ padding: '2.5rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                   <h3 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Zmena hesla</h3>
                   <button onClick={changePassword} className="btn" style={{ background: 'var(--blue)', color: '#fff', padding: '0.8rem 1.8rem', borderRadius: '12px', fontWeight: 800 }}>ZMENIŤ HESLO</button>
                 </div>
                 
                 <div className="profile-redesign-form-grid">
                   <div className="fg" style={{ gridColumn: 'span 2' }}>
                     <label className="fl">Aktuálne heslo</label>
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

            {activeSubTab === 'notifications' && (
              <motion.div key="notif" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel settings-form-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
                 <i className="fas fa-bell-slash" style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem', display: 'block' }}></i>
                 <p style={{ color: 'var(--muted)' }}>Nastavenia notifikácií budú čoskoro dostupné.</p>
              </motion.div>
            )}

            {activeSubTab === 'support' && (
              <motion.div key="support" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel settings-form-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
                 <i className="fas fa-headset" style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem', display: 'block' }}></i>
                 <p style={{ color: 'var(--muted)' }}>Kontaktujte nás na support@fitnessapp.sk</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
