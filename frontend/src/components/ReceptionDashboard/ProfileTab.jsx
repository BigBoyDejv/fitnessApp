import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedFetch } from '../../utils/api';
import Toast from "../Toast";

export default function ProfileTab({ user, setUser }) {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Security
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const showToast = (msg, type = "ok") => {
    setToastMsg({ msg, type });
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/api/auth/me");
      if (res.ok) {
        const d = await res.json();
        setProfile(d);
        setName(d.fullName || "");
        setPhone(d.phone || "");
        setAvatarUrl(d.avatarUrl || "");
      }
    } catch (e) { showToast(e.message, "err"); }
    finally { setLoading(false); }
  };

  const saveProfile = async () => {
    if (!name.trim()) return showToast("Meno je povinné", "err");
    try {
      const uid = user?.id || user?.userId;
      const res = await authenticatedFetch(`/api/users/${uid}`, {
        method: "PUT",
        body: JSON.stringify({ fullName: name.trim(), phone: phone.trim(), avatarUrl: avatarUrl.trim() || null })
      });
      if (res.ok) {
        showToast("Profil recepcie uložený!", "ok");
        const upd = { ...user, fullName: name.trim(), avatarUrl: avatarUrl.trim() || null };
        localStorage.setItem("fp_user", JSON.stringify(upd));
        if (setUser) setUser(upd);
      } else { throw new Error("Chyba servera"); }
    } catch (e) { showToast(e.message, "err"); }
  };

  const changePassword = async () => {
    if (!curPass) return showToast("Zadaj aktuálne heslo", "err");
    if (newPass.length < 6) return showToast("Nové heslo musí mať min. 6 znakov", "err");
    if (newPass !== newPass2) return showToast("Heslá sa nezhodujú", "err");

    try {
      const uid = user?.id || user?.userId;
      const res = await authenticatedFetch(`/api/users/${uid}/password`, {
        method: "PUT",
        body: JSON.stringify({ currentPassword: curPass, newPassword: newPass })
      });
      if (res.ok) {
        showToast("Heslo úspešne zmenené!", "ok");
        setCurPass(""); setNewPass(""); setNewPass2("");
      } else {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Chyba servera");
      }
    } catch (e) { showToast(e.message, "err"); }
  };

  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  const menuItems = [
    { id: 'profile', icon: 'fa-user-tie', label: 'Recepcia Profil' },
    { id: 'security', icon: 'fa-user-lock', label: 'Zabezpečenie' },
    { id: 'settings', icon: 'fa-sliders-h', label: 'Preferencie' },
  ];

  if (loading) return <div className="ps active"><span className="spin"></span></div>;

  return (
    <div className="profile-redesign animate-in" style={{ padding: '0.5rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-d)', marginBottom: '0.4rem' }}>Nastavenia</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Správa recepčného konta a dostupnosti</p>
      </header>

      <div className="settings-grid">
        <div className="panel profile-sidebar-wrapper" style={{ padding: '0.6rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => { setActiveSubTab(item.id); setToastMsg(null); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1.1rem 1.2rem', background: activeSubTab === item.id ? 'rgba(191, 90, 242, 0.1)' : 'transparent',
                border: 'none', borderRadius: '12px', color: activeSubTab === item.id ? 'var(--purple)' : 'var(--muted)',
                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', fontWeight: activeSubTab === item.id ? 800 : 500,
                position: 'relative', overflow: 'hidden'
              }}
            >
              {activeSubTab === item.id && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: 'var(--purple)', borderRadius: '0 4px 4px 0' }} />}
              <i className={`fas ${item.icon}`} style={{ fontSize: '1rem', width: '20px' }}></i>
              <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content-wrapper">
          <div className="panel settings-profile-card" style={{ padding: 0, background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '120px', background: 'linear-gradient(135deg, #0f172a 30%, var(--purple) 100%)', opacity: 0.8 }}></div>
            <div style={{ marginTop: '-60px', padding: '1.5rem', textAlign: 'center' }}>
               <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '28px', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 900, color: '#fff', boxShadow: '0 15px 35px rgba(191, 90, 242, 0.3)', marginBottom: '1.5rem', border: '5px solid #161d2b', overflow: 'hidden' }}>
                    {avatarUrl ? <img src={avatarUrl} alt="Recepcia Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                  </div>
               </div>
               <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.3rem' }}>{name || 'Staff'}</h3>
               <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>Služba na recepcii</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeSubTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel settings-form-panel" style={{ padding: '2.5rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Dáta personálu</h3>
                  <button onClick={saveProfile} className="btn" style={{ background: 'var(--purple)', color: '#fff', padding: '0.8rem 1.8rem', borderRadius: '12px', fontWeight: 800 }}>ULOŽIŤ</button>
                </div>

                <div className="profile-redesign-form-grid">
                  <div className="fg">
                    <label className="fl">Meno a priezvisko</label>
                    <input className="fi" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="fg">
                    <label className="fl">Kontaktný telefón</label>
                    <input className="fi" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div className="fg" style={{ gridColumn: 'span 2' }}>
                    <label className="fl">Avatar URL</label>
                    <input className="fi" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              </motion.div>
            )}

            {activeSubTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel settings-form-panel" style={{ padding: '2.5rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                   <h3 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Ochrana konta</h3>
                   <button onClick={changePassword} className="btn" style={{ background: 'var(--purple)', color: '#fff', padding: '0.8rem 1.8rem', borderRadius: '12px', fontWeight: 800 }}>AKTUALIZOVAŤ HESLO</button>
                 </div>
                 
                 <div className="profile-redesign-form-grid">
                   <div className="fg" style={{ gridColumn: 'span 2' }}>
                     <label className="fl">Súčasné heslo</label>
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
              </motion.div>
            )}

            {activeSubTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel settings-form-panel" style={{ padding: '2.5rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', textAlign: 'center' }}>
                 <i className="fas fa-magic" style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '1rem', display: 'block' }}></i>
                 <p style={{ color: 'var(--muted)' }}>Prispôsobenie prostredia bude čoskoro pridané.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
