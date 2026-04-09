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
  const [bio, setBio] = useState('');
  const [nationality, setNationality] = useState('Slovenská');
  
  // Security states
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [autoRenew, setAutoRenew] = useState(false);
  const [membership, setMembership] = useState(null);

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
        // Mock bio/nationality since they might not be in DB yet
        setBio(d.bio || '');
        setNationality(d.nationality || 'Slovenská');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
    
    // Load current membership for auto-renew status
    try {
      const resp = await authenticatedFetch('/api/memberships/my');
      if (resp.ok) {
        const ms = await resp.json();
        const active = ms.find(m => m.status === 'active' || m.status === 'ACTIVE');
        if (active) {
          setMembership(active);
          setAutoRenew(active.autoRenew || false);
        }
      }
    } catch (e) { console.error('Membership load err:', e); }
  };

  const toggleAutoRenew = async () => {
    if (!membership) return;
    const newVal = !autoRenew;
    setAutoRenew(newVal);
    try {
       // Obrazná implementácia - voláme backend pre zmenu auto-renew
       const res = await authenticatedFetch(`/api/memberships/${membership.id}/auto-renew`, {
         method: 'PATCH',
         body: JSON.stringify({ autoRenew: newVal })
       });
       if (res.ok) {
         setMsg({ text: `Automatické obnovenie ${newVal ? 'zapnuté' : 'vypnuté'}`, type: 'ok' });
         setTimeout(() => setMsg({ text: '', type: '' }), 3000);
       }
    } catch (e) { console.error(e); }
  };

  const saveProfile = async () => {
    if (!editName) return setMsg({ text: 'Meno je povinné', type: 'err' });
    try {
      const uid = user?.id || user?.userId;
      const res = await authenticatedFetch('/api/users/' + uid, {
        method: 'PUT',
        body: JSON.stringify({ fullName: editName, phone: editPhone, avatarUrl: editAvatar, bio, nationality })
      });
      if (res.ok) {
        setMsg({ text: 'Profil bol úspešne uložený', type: 'ok' });
        const upd = { ...user, fullName: editName, phone: editPhone, avatarUrl: editAvatar };
        if (updateUser) updateUser(upd);
        setTimeout(() => setMsg({ text: '', type: '' }), 3000);
      } else {
        throw new Error('Chyba pri ukladaní');
      }
    } catch (e) {
      setMsg({ text: e.message, type: 'err' });
    }
  };

  const changePassword = async () => {
    if (!curPass || !newPass) return setMsg({ text: 'Vyplňte polia', type: 'err' });
    if (newPass !== newPass2) return setMsg({ text: 'Heslá sa nezhodujú', type: 'err' });
    try {
      const uid = user?.id || user?.userId;
      const res = await authenticatedFetch(`/api/users/${uid}/password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: curPass, newPassword: newPass })
      });
      if (res.ok) {
        setMsg({ text: 'Heslo bolo zmenené', type: 'ok' });
        setCurPass(''); setNewPass(''); setNewPass2('');
      } else {
        const d = await res.json();
        throw new Error(d.message || 'Chyba');
      }
    } catch (e) {
      setMsg({ text: e.message, type: 'err' });
    }
  };

  const menuItems = [
    { id: 'profile', icon: 'fa-user', label: 'Môj profil' },
    { id: 'security', icon: 'fa-shield-alt', label: 'Zabezpečenie' },
    { id: 'notifications', icon: 'fa-bell', label: 'Notifikácie' },
    { id: 'payments', icon: 'fa-credit-card', label: 'Platby' },
    { id: 'support', icon: 'fa-question-circle', label: 'Podpora' },
  ];

  const initials = editName ? editName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  return (
    <div className="profile-redesign animate-in" style={{ padding: '0.5rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-d)', marginBottom: '0.4rem' }}>Nastavenia</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Spravujte svoj profil a nastavenia aplikácie</p>
      </header>

      <div className="settings-grid">
        
        {/* Sidebar */}
        <div className="panel profile-sidebar-wrapper" style={{ padding: '0.6rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1.1rem 1.2rem', background: activeSubTab === item.id ? 'rgba(200, 255, 0, 0.1)' : 'transparent',
                border: 'none', borderRadius: '12px', color: activeSubTab === item.id ? 'var(--acid)' : 'var(--muted)',
                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', fontWeight: activeSubTab === item.id ? 800 : 500,
                position: 'relative', overflow: 'hidden'
              }}
            >
              {activeSubTab === item.id && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: 'var(--acid)', borderRadius: '0 4px 4px 0' }} />}
              <i className={`fas ${item.icon}`} style={{ fontSize: '1rem', width: '20px' }}></i>
              <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
              {activeSubTab === item.id && <i className="fas fa-chevron-right" style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.5 }}></i>}
            </button>
          ))}
          <div className="version-info" style={{ marginTop: '3rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>VERZIA</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)' }}>FitnessPro v2.1.0</div>
          </div>
        </div>

        <div className="settings-content-wrapper">
          {/* Profile Card Overlay */}
          <div className="panel settings-profile-card" style={{ padding: 0, background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '120px', background: 'linear-gradient(135deg, #0f172a 30%, var(--acid) 100%)', opacity: 0.8 }}></div>
            <div style={{ marginTop: '-60px', padding: '1.5rem', textAlign: 'center' }}>
               <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '28px', background: 'var(--acid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 900, color: '#000', boxShadow: '0 15px 35px rgba(200, 255, 0, 0.3)', marginBottom: '1.5rem', border: '5px solid #161d2b', overflow: 'hidden' }}>
                    {editAvatar ? (
                      <img src={editAvatar} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : initials}
                  </div>
                  <button style={{ position: 'absolute', bottom: '15px', right: '-5px', width: '36px', height: '36px', borderRadius: '10px', background: '#334155', border: '3px solid #161d2b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <i className="fas fa-camera" style={{ fontSize: '0.8rem' }}></i>
                  </button>
               </div>
               <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.3rem' }}>{editName || '—'}</h3>
               <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '2rem' }}>Člen klubu</p>
               
               <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                        <i className="fas fa-mobile-alt"></i>
                     </div>
                     <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase' }}>TELEFÓN</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{editPhone || 'Nepriradený'}</div>
                     </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                        <i className="fas fa-globe-europe"></i>
                     </div>
                     <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase' }}>NÁRODNOSŤ</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{nationality}</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Form Area */}
          <AnimatePresence mode="wait">
            {activeSubTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="panel settings-form-panel" 
                style={{ padding: '2.5rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ color: 'var(--acid)', fontSize: '1.4rem' }}><i className="fas fa-id-card"></i></div>
                    <div>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '0.2rem' }}>Osobné údaje</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Zmeňte základné údaje o svojom konte</p>
                    </div>
                  </div>
                  <button onClick={saveProfile} className="btn" style={{ background: 'var(--acid)', color: '#000', padding: '0.8rem 1.8rem', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <i className="fas fa-save"></i> ULOŽIŤ
                  </button>
                </div>

                <div className="profile-redesign-form-grid">
                  <div className="fg">
                    <label className="fl" style={{ fontSize: '0.85rem', marginBottom: '0.6rem' }}>Celé meno</label>
                    <input className="fi" value={editName} onChange={e => setEditName(e.target.value)} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                  </div>
                  <div className="fg">
                    <label className="fl" style={{ fontSize: '0.85rem', marginBottom: '0.6rem' }}>Email (nemožné zmeniť)</label>
                    <input className="fi" value={profile?.email || ''} readOnly style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #334155', borderRadius: '12px', color: 'var(--muted)', cursor: 'not-allowed' }} />
                  </div>
                  <div className="fg">
                    <label className="fl" style={{ fontSize: '0.85rem', marginBottom: '0.6rem' }}>Telefón</label>
                    <div style={{ position: 'relative' }}>
                      <i className="fas fa-mobile-alt" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', opacity: 0.5 }}></i>
                      <input className="fi" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+421 xxx xxx xxx" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', paddingLeft: '3rem' }} />
                    </div>
                  </div>
                  <div className="fg">
                    <label className="fl" style={{ fontSize: '0.85rem', marginBottom: '0.6rem' }}>Národnosť</label>
                    <div style={{ position: 'relative' }}>
                      <i className="fas fa-globe-europe" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', opacity: 0.5 }}></i>
                      <input className="fi" value={nationality} onChange={e => setNationality(e.target.value)} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', paddingLeft: '3rem' }} />
                    </div>
                  </div>
                </div>

                <div className="fg" style={{ marginBottom: '1.5rem' }}>
                  <label className="fl" style={{ fontSize: '0.85rem', marginBottom: '0.6rem' }}>URL profilovej fotky (Avatar)</label>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-link" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', opacity: 0.5 }}></i>
                    <input className="fi" value={editAvatar} onChange={e => setEditAvatar(e.target.value)} placeholder="https://example.com/photo.jpg" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', paddingLeft: '3rem' }} />
                  </div>
                </div>

                <div className="fg">
                  <label className="fl" style={{ fontSize: '0.85rem', marginBottom: '0.6rem' }}>O mne / Bio</label>
                  <textarea className="fi" value={bio} onChange={e => setBio(e.target.value)} placeholder="Povedzte niečo o sebe..." style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', height: '120px', resize: 'none', padding: '1rem' }} />
                </div>

                {msg.text && <div className={`fm ${msg.type}`} style={{ marginTop: '1.5rem', borderRadius: '12px' }}>{msg.text}</div>}
              </motion.div>
            )}

            {activeSubTab === 'security' && (
              <motion.div 
                 key="security"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="panel settings-form-panel" 
                 style={{ padding: '2.5rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}
              >
               <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '2rem' }}>Zabezpečenie účtu</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="fg">
                    <label className="fl">Aktuálne heslo</label>
                    <input className="fi" type="password" value={curPass} onChange={e => setCurPass(e.target.value)} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                  </div>
                  <div className="fg">
                    <label className="fl">Nové heslo</label>
                    <input className="fi" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                  </div>
                  <div className="fg">
                    <label className="fl">Zopakujte nové heslo</label>
                    <input className="fi" type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                  </div>
                  <button onClick={changePassword} className="btn btn-blue btn-block" style={{ height: '50px', borderRadius: '12px' }}>ZMENIŤ HESLO</button>
               </div>
               {msg.text && <div className={`fm ${msg.type}`} style={{ marginTop: '1.5rem' }}>{msg.text}</div>}
            </motion.div>
          )}

            {activeSubTab === 'payments' && (
              <motion.div 
                 key="payments"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="panel settings-form-panel" 
                 style={{ padding: '2.5rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}
              >
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.4rem' }}>Správa platieb</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Nastavenia predplatného a opakovaných faktúr</p>
                </div>

                {membership ? (
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'var(--acid)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                          <i className="fas fa-crown"></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{membership.membershipType?.name || 'Aktívne členstvo'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Platné do: {membership.endDate}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--acid)' }}>
                          {(membership.membershipType?.priceCents / 100).toFixed(2)} €
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>MESAČNE</div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 800, marginBottom: '0.2rem' }}>Opakované platby (Stripe)</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', maxWidth: '300px' }}>
                              Vaše predplatné sa automaticky obnoví 24 hodín pred vypršaním.
                            </p>
                          </div>
                          
                          <label className="switch-wrapper" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <div 
                              onClick={toggleAutoRenew}
                              style={{ 
                                width: '50px', height: '26px', background: autoRenew ? 'var(--acid)' : '#334155', 
                                borderRadius: '15px', position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                              }}
                            >
                              <div style={{ 
                                position: 'absolute', top: '3px', left: autoRenew ? '27px' : '3px', 
                                width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                              }} />
                            </div>
                          </label>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                     <i className="fas fa-credit-card" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                     <p>Momentálne nemáte žiadne aktívne predplatné pre správu platieb.</p>
                  </div>
                )}

                <div style={{ marginTop: '2rem', padding: '1.2rem', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.1)', display: 'flex', gap: '1rem' }}>
                    <i className="fas fa-info-circle" style={{ color: '#38bdf8', marginTop: '0.2rem' }}></i>
                    <p style={{ fontSize: '0.8rem', color: '#bae6fd', lineHeight: 1.5 }}>
                      <strong>Poznámka:</strong> Pre zmenu bankovej karty alebo históriu faktúr budete presmerovaní na Stripe Customer Portal.
                    </p>
                </div>
              </motion.div>
            )}

            {!['profile', 'security', 'payments'].includes(activeSubTab) && (
              <motion.div 
                 key="empty"
                 className="panel" 
                 style={{ padding: '4rem', background: '#161d2b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', textAlign: 'center' }}
              >
                 <i className="fas fa-tools" style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '1.5rem' }}></i>
                 <h4 style={{ fontSize: '1.2rem', opacity: 0.5 }}>Táto sekcia je vo vývoji</h4>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

