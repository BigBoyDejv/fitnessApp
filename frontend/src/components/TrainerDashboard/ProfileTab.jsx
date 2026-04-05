import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function ProfileTab({ user, updateUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile Edit Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Edit Form state
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  
  const [passMsg, setPassMsg] = useState({ text: '', type: '' });
  const [savingPass, setSavingPass] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/auth/me');
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setName(data.fullName || '');
        setPhone(data.phone || '');
        setSpecialization(data.specialization || '');
        setAvatar(data.avatarUrl || '');
        setBio(data.bio || '');

        // Update local context
        const u = JSON.parse(localStorage.getItem('fp_user') || '{}');
        const upd = { ...u, ...data };
        localStorage.setItem('fp_user', JSON.stringify(upd));
        if (updateUser) updateUser(upd);
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setProfileMsg({ text: 'Meno je povinné', type: 'err' });
      return;
    }

    setSavingProfile(true);
    setProfileMsg({ text: '', type: '' });

    try {
      const uid = user?.id || user?.userId;
      const res = await authenticatedFetch('/api/users/' + uid, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: name.trim(),
          phone: phone.trim(),
          specialization: specialization.trim(),
          avatarUrl: avatar.trim(),
          bio: bio.trim()
        })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Chyba servera');
      }

      setProfileMsg({ text: 'Profil bol úspešne aktualizovaný!', type: 'ok' });
      loadProfile(); // reload context

      // fade out message after 3 seconds
      setTimeout(() => setProfileMsg({ text: '', type: '' }), 3000);
    } catch (e) {
      setProfileMsg({ text: e.message, type: 'err' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!curPass) return setPassMsg({ text: 'Zadaj aktuálne heslo', type: 'err' });
    if (newPass.length < 6) return setPassMsg({ text: 'Nové heslo musí mať min. 6 znakov', type: 'err' });
    if (newPass !== newPass2) return setPassMsg({ text: 'Heslá sa nezhodujú', type: 'err' });

    setSavingPass(true);
    setPassMsg({ text: '', type: '' });

    try {
      const uid = user?.id || user?.userId;
      const res = await authenticatedFetch('/api/users/' + uid + '/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: curPass, newPassword: newPass })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Chyba pri zmene hesla');
      }

      setPassMsg({ text: 'Heslo bolo zmenené!', type: 'ok' });
      setCurPass('');
      setNewPass('');
      setNewPass2('');
      
      setTimeout(() => setPassMsg({ text: '', type: '' }), 3000);
    } catch (e) {
      setPassMsg({ text: e.message, type: 'err' });
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <span className="spinner"></span>
        <p>Načítavam tvoj profil...</p>
      </div>
    );
  }

  return (
    <div>
      {/* View purely the info */}
      <div className="panel">
        <div className="ph">
          <span className="pt">Môj profil</span>
          <span className="badge b-blue" style={{ textTransform: 'none', letterSpacing: 0, padding: '0.18rem 0.55rem' }}>GET /api/auth/me</span>
        </div>
        <div className="pb">
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem 1rem' }}>
            <div><div className="fl">Meno</div><div style={{ fontSize: '0.87rem' }}>{profile?.fullName || '—'}</div></div>
            <div><div className="fl">Email</div><div style={{ fontSize: '0.87rem' }}>{profile?.email || '—'}</div></div>
            <div><div className="fl">Telefón</div><div style={{ fontSize: '0.87rem' }}>{profile?.phone || '—'}</div></div>
            <div><div className="fl">Rola</div><span className="badge b-blue">{profile?.role || 'trainer'}</span></div>
            <div><div className="fl">Špecializácia</div><div style={{ fontSize: '0.87rem' }}>{profile?.specialization || '—'}</div></div>
            <div><div className="fl">Registrovaný</div><div style={{ fontSize: '0.87rem' }}>{new Date(profile?.createdAt || Date.now()).toLocaleDateString('sk-SK')}</div></div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Profile Form */}
        <div className="panel">
          <div className="ph">
            <span className="pt">Upraviť profil</span>
            <span className="badge b-orange" style={{ textTransform: 'none', letterSpacing: 0, padding: '0.18rem 0.55rem' }}>PUT /api/users/[id]</span>
          </div>
          <div className="pb">
            <div className="fg">
              <label className="fl">Celé meno *</label>
              <input className="fi" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tvoje meno" />
            </div>
            <div className="fg">
              <label className="fl">Telefón</label>
              <input className="fi" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+421..." />
            </div>
            <div className="fg">
              <label className="fl">Špecializácia</label>
              <input className="fi" type="text" value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="napr. CrossFit, Kondičný tréning..." />
            </div>
            <div className="fg">
              <label className="fl">URL avatara</label>
              <input className="fi" type="url" value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." />
            </div>
            <div className="fg">
              <label className="fl">Bio / O mne</label>
              <textarea className="fi" rows="3" value={bio} onChange={e => setBio(e.target.value)} placeholder="Napíš niečo o sebe, svojej filozofii trénovania..."></textarea>
            </div>
            
            <button className="btn btn-blue btn-block" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? <span className="spinner" style={{width:14,height:14}}></span> : <i className="fas fa-save"></i>} 
              {savingProfile ? 'Ukladám...' : 'Uložiť zmeny'}
            </button>
            
            {profileMsg.text && (
              <div style={{ marginTop: '0.65rem', padding: '0.55rem 0.8rem', borderRadius: 3, fontSize: '0.78rem', background: profileMsg.type === 'err' ? 'rgba(255,45,85,0.08)' : 'rgba(200,255,0,0.07)', color: profileMsg.type === 'err' ? 'var(--red)' : 'var(--acid)', border: `1px solid ${profileMsg.type === 'err' ? 'rgba(255,45,85,0.2)' : 'rgba(200,255,0,0.18)'}` }}>
                {profileMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* Password Form */}
        <div className="panel">
          <div className="ph">
            <span className="pt">Zmena hesla</span>
          </div>
          <div className="pb">
            <div className="fg">
              <label className="fl">Aktuálne heslo *</label>
              <input className="fi" type="password" value={curPass} onChange={e => setCurPass(e.target.value)} />
            </div>
            <div className="fg">
              <label className="fl">Nové heslo * (min 6)</label>
              <input className="fi" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
            </div>
            <div className="fg">
              <label className="fl">Potvrdiť nové heslo *</label>
              <input className="fi" type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)} />
            </div>
            
            <button className="btn btn-ghost btn-block" onClick={handleChangePassword} disabled={savingPass}>
              {savingPass ? <span className="spinner" style={{width:14,height:14}}></span> : <i className="fas fa-lock"></i>} 
              {savingPass ? 'Mení sa...' : 'Zmeniť heslo'}
            </button>
            
            {passMsg.text && (
              <div style={{ marginTop: '0.65rem', padding: '0.55rem 0.8rem', borderRadius: 3, fontSize: '0.78rem', background: passMsg.type === 'err' ? 'rgba(255,45,85,0.08)' : 'rgba(200,255,0,0.07)', color: passMsg.type === 'err' ? 'var(--red)' : 'var(--acid)', border: `1px solid ${passMsg.type === 'err' ? 'rgba(255,45,85,0.2)' : 'rgba(200,255,0,0.18)'}` }}>
                {passMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
