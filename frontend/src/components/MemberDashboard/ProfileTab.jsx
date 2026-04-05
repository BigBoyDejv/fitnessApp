import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function ProfileTab({ user, updateUser }) {
  const [profile, setProfile] = useState(null);
  
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  
  const [profMsg, setProfMsg] = useState({ text: '', type: '' });
  const [passMsg, setPassMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/me');
      if (!res.ok) throw new Error('Chyba načítania');
      const d = await res.json();
      setProfile(d);
      setEditName(d.fullName || '');
      setEditPhone(d.phone || '');
      setEditAvatar(d.avatarUrl || '');
    } catch (e) {
      setProfMsg({ text: e.message, type: 'err' });
    }
  };

  const saveProfile = async () => {
    if (!editName) return setProfMsg({ text: 'Meno je povinné', type: 'err' });
    const uid = user?.id || user?.userId;
    if (!uid) return setProfMsg({ text: 'ID nenájdené', type: 'err' });
    
    try {
      const res = await authenticatedFetch('/api/users/' + uid, {
        method: 'PUT',
        body: JSON.stringify({ fullName: editName, phone: editPhone, avatarUrl: editAvatar })
      });
      if (!res.ok) {
         let d; try { d = await res.json(); } catch { d = {}; }
         throw new Error(d.message || 'Chyba pri ukladaní');
      }
      setProfMsg({ text: 'Profil úspešne aktualizovaný!', type: 'ok' });
      
      const upd = { ...user, fullName: editName, phone: editPhone, avatarUrl: editAvatar };
      localStorage.setItem('fp_user', JSON.stringify(upd));
      if (updateUser) updateUser(upd);
      loadProfile();
      
    } catch (e) {
      setProfMsg({ text: e.message, type: 'err' });
    }
  };

  const changePassword = async () => {
    if (!curPass) return setPassMsg({ text: 'Zadaj aktuálne heslo', type: 'err' });
    if (newPass.length < 6) return setPassMsg({ text: 'Nové heslo musí mať aspoň 6 znakov', type: 'err' });
    if (newPass !== newPass2) return setPassMsg({ text: 'Heslá sa nezhodujú', type: 'err' });
    const uid = user?.id || user?.userId;
    if (!uid) return setPassMsg({ text: 'ID nenájdené', type: 'err' });
    
    try {
      const res = await authenticatedFetch('/api/users/' + uid + '/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: curPass, newPassword: newPass })
      });
      if (!res.ok) {
         let d; try { d = await res.json(); } catch { d = {}; }
         throw new Error(d.message || 'Chyba servera');
      }
      setPassMsg({ text: 'Heslo úspešne zmenené!', type: 'ok' });
      setCurPass(''); setNewPass(''); setNewPass2('');
    } catch (e) {
      setPassMsg({ text: e.message, type: 'err' });
    }
  };

  return (
    <div className="ps active" id="pg-profile">
      {/* Zobrazenie profilu */}
      <div className="panel">
        <div className="ph"><span className="pt">Údaje člena</span></div>
        <div className="pb">
          {profile ? (
            <div className="g3" style={{ marginBottom: '0.5rem' }}>
              <div><div className="fl">Celé meno</div><div style={{ fontSize: '1rem', fontWeight: 700 }}>{profile.fullName || '—'}</div></div>
              <div><div className="fl">Email</div><div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{profile.email || '—'}</div></div>
              <div><div className="fl">Telefón</div><div style={{ fontSize: '0.9rem' }}>{profile.phone || '—'}</div></div>
              <div><div className="fl">Rola</div><div style={{ marginTop: '0.3rem' }}><span className="badge b-acid" style={{ border: '1px solid var(--acid)' }}>{profile.role || '—'}</span></div></div>
              <div><div className="fl">Status</div><div style={{ marginTop: '0.3rem' }}>{profile.isActive ? <span className="badge b-acid">Aktívny</span> : <span className="badge b-red">Neaktívny</span>}</div></div>
              <div><div className="fl">Členom od</div><div style={{ fontSize: '0.9rem', marginTop: '0.3rem' }}>{new Date(profile.createdAt).toLocaleDateString('sk-SK')}</div></div>
            </div>
          ) : (
            <div className="empty-cta">
               <span className="spin" />
               <p>Načítavam tvoje údaje...</p>
            </div>
          )}
        </div>
      </div>

      <div className="g2">
        {/* Upraviť profil */}
        <div className="panel">
          <div className="ph"><span className="pt">Zmeniť údaje</span></div>
          <div className="pb">
            <div className="form-group">
              <label className="fl">Celé meno *</label>
              <input className="fi" type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ján Novák" />
            </div>
            <div className="form-group">
              <label className="fl">Telefón</label>
              <input className="fi" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+421 9XX XXX XXX" />
            </div>
            <div style={{ marginBottom: '1.2rem' }}>
              <label className="fl">URL avatara</label>
              <input className="fi" type="url" value={editAvatar} onChange={e => setEditAvatar(e.target.value)} placeholder="https://..." />
            </div>
            <button className="btn btn-acid btn-block" onClick={saveProfile}><i className="fas fa-save" /> Uložiť profil</button>
            {profMsg.text && <div className={`fm ${profMsg.type === 'err' ? 'err' : 'ok'} show`}>{profMsg.text}</div>}
          </div>
        </div>

        {/* Zmena hesla */}
        <div className="panel">
          <div className="ph"><span className="pt">Bezpečnosť</span></div>
          <div className="pb">
            <div className="form-group">
              <label className="fl">Aktuálne heslo *</label>
              <input className="fi" type="password" value={curPass} onChange={e => setCurPass(e.target.value)} placeholder="Aktuálne heslo" />
            </div>
            <div className="form-group">
              <label className="fl">Nové heslo *</label>
              <input className="fi" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Aspoň 6 znakov" />
            </div>
            <div style={{ marginBottom: '1.2rem' }}>
              <label className="fl">Zopakuj nové heslo *</label>
              <input className="fi" type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)} placeholder="Potvrdenie hesla" />
            </div>
            <button className="btn btn-ghost btn-block" onClick={changePassword}><i className="fas fa-lock" /> Zmeniť heslo</button>
            {passMsg.text && <div className={`fm ${passMsg.type === 'err' ? 'err' : 'ok'} show`}>{passMsg.text}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
