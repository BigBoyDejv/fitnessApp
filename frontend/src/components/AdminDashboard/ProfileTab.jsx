import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function ProfileTab() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Edit forms
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [msgProfile, setMsgProfile] = useState({ text: '', type: '' });
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [msgPass, setMsgPass] = useState({ text: '', type: '' });
  const [loadingPass, setLoadingPass] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/auth/me');
      if (res.ok) {
        const d = await res.json();
        setProfile(d);
        setFullName(d.fullName || '');
        setPhone(d.phone || '');
        setAvatarUrl(d.avatarUrl || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!fullName.trim()) return setMsgProfile({ text: 'Meno je povinné', type: 'err' });
    
    setLoadingProfile(true);
    setMsgProfile({ text: '', type: '' });

    try {
      const res = await authenticatedFetch(`/api/users/${profile.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          avatarUrl: avatarUrl.trim() || null
        })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Chyba');
      
      setMsgProfile({ text: 'Profil aktualizovaný!', type: 'ok' });
      
      // Update local storage so the sidebar reflects changes
      const u = JSON.parse(localStorage.getItem('fp_user') || '{}');
      const upd = { ...u, fullName, phone, avatarUrl };
      localStorage.setItem('fp_user', JSON.stringify(upd));
      
      loadProfile(); // refresh data
      
      // Reload page to update layout avatar optionally
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (e) {
      setMsgProfile({ text: e.message, type: 'err' });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!profile) return;
    if (!currentPassword) return setMsgPass({ text: 'Zadaj aktuálne heslo', type: 'err' });
    if (newPassword.length < 6) return setMsgPass({ text: 'Nové heslo musí mať aspoň 6 znakov', type: 'err' });
    if (newPassword !== newPassword2) return setMsgPass({ text: 'Nové heslá sa nezhodujú', type: 'err' });

    setLoadingPass(true);
    setMsgPass({ text: '', type: '' });

    try {
      const res = await authenticatedFetch(`/api/users/${profile.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Chyba');
      
      setMsgPass({ text: 'Heslo bolo úspešne zmenené!', type: 'ok' });
      setCurrentPassword('');
      setNewPassword('');
      setNewPassword2('');
    } catch (e) {
      setMsgPass({ text: e.message, type: 'err' });
    } finally {
      setLoadingPass(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) return <div className="empty-state"><span className="spinner"></span></div>;
  if (!profile) return <div className="empty-state"><i className="fas fa-exclamation-circle"></i><p>Profil sa nenašiel.</p></div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="panel">
        <div className="ph">
          <span className="pt">Osobné údaje</span>
        </div>
        <div className="pb" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '2rem' }}>
          <div>
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
               <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--red),var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', margin: '0 auto 1rem', overflow: 'hidden' }}>
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  ) : getInitials(profile.fullName)}
               </div>
               <div style={{ fontFamily: 'var(--font-d)', fontSize: '1.3rem', fontWeight: 900 }}>{profile.fullName || '—'}</div>
               <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{profile.email || '—'}</div>
               <div style={{ marginTop: '0.5rem' }}>
                 <span className="badge b-red">{profile.role}</span>
               </div>
               <div style={{ marginTop: '0.5rem' }}>
                 {profile.active !== false ? <span className="badge b-acid">Aktívny</span> : <span className="badge b-frozen">Zmrazený</span>}
               </div>
            </div>
          </div>
          <div>
            <div className="fr">
              <div className="fg">
                <label className="fl">Celé meno</label>
                <input className="fi" type="text" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="fg">
                <label className="fl">Telefón</label>
                <input className="fi" type="text" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="fg">
              <label className="fl">URL avatara</label>
              <input className="fi" type="text" placeholder="https://..." value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
            </div>
            <button className="btn btn-acid" onClick={handleSaveProfile} disabled={loadingProfile}>
              {loadingProfile ? <span className="spinner" style={{width:14,height:14,marginRight:6}}></span> : <i className="fas fa-save"></i>} Uložiť zmeny
            </button>
            {msgProfile.text && (
               <div className={`fm ${msgProfile.type}`} style={{marginTop:'0.8rem'}}>{msgProfile.text}</div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="ph">
          <span className="pt">Zmena hesla</span>
          <span className="method m-put" style={{ textTransform: 'none', letterSpacing: 0, padding: '0.18rem 0.55rem' }}>PUT /api/users/[id]/password</span>
        </div>
        <div className="pb">
           <div className="grid-3">
             <div className="fg">
               <label className="fl">Aktuálne heslo *</label>
               <input className="fi" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
             </div>
             <div className="fg">
               <label className="fl">Nové heslo *</label>
               <input className="fi" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
             </div>
             <div className="fg">
               <label className="fl">Nové heslo znova *</label>
               <input className="fi" type="password" value={newPassword2} onChange={e => setNewPassword2(e.target.value)} />
             </div>
           </div>
           <button className="btn btn-ghost" onClick={handleChangePassword} disabled={loadingPass}>
             {loadingPass ? <span className="spinner" style={{width:14,height:14,marginRight:6}}></span> : <i className="fas fa-key"></i>} Zmeniť heslo
           </button>
           {msgPass.text && (
             <div className={`fm ${msgPass.type}`} style={{marginTop:'0.8rem'}}>{msgPass.text}</div>
           )}
        </div>
      </div>
    </div>
  );
}
