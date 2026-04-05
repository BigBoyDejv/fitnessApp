import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function MessagesTab() {
  const [users, setUsers] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  
  const [tab, setTab] = useState('all'); // 'all' or 'one'
  const [severity, setSeverity] = useState('info'); // 'info', 'warning', 'danger'
  
  const [targetUser, setTargetUser] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Load members
    authenticatedFetch('/api/admin/profiles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data.filter(u => u.role === 'member'));
        }
      })
      .catch(e => console.error(e));

    loadSentMessages();
  }, []);

  const loadSentMessages = async () => {
    try {
      const res = await authenticatedFetch('/api/notifications/sent');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setSentMessages(data);
    } catch {
      // safe fallback since endpoint might not be fully working
      setSentMessages([]);
    }
  };

  const handleSend = async () => {
    if (!title.trim()) return setMsg({ text: 'Zadaj nadpis správy', type: 'err' });
    if (!body.trim()) return setMsg({ text: 'Zadaj text správy', type: 'err' });
    if (tab === 'one' && !targetUser) return setMsg({ text: 'Vyber člena', type: 'err' });

    setLoading(true);
    setMsg({ text: '', type: '' });

    const payload = {
      title: title.trim(),
      message: body.trim(),
      severity
    };
    if (tab === 'one') {
      payload.userId = targetUser;
    }

    try {
      const res = await authenticatedFetch('/api/notifications/admin-message', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) throw new Error(data.message || 'Nepodarilo sa odoslať správu');
      
      const targetName = tab === 'all' ? 'Všetkým členom' : (users.find(u => String(u.id) === targetUser)?.fullName || 'členovi');
      setMsg({ text: `Správa úspešne odoslaná: ${targetName}`, type: 'ok' });
      
      setTitle('');
      setBody('');
      loadSentMessages();
    } catch (e) {
      setMsg({ text: e.message, type: 'err' });
    } finally {
      setLoading(false);
    }
  };

  const getIconConfig = () => {
    if (severity === 'warning') return { icon: 'fa-exclamation-triangle', bg: 'rgba(255,149,0,0.1)', color: 'var(--orange)' };
    if (severity === 'danger') return { icon: 'fa-exclamation-circle', bg: 'rgba(255,45,85,0.1)', color: 'var(--red)' };
    return { icon: 'fa-envelope', bg: 'rgba(0,255,209,0.1)', color: 'var(--acid2)' };
  };

  const cfg = getIconConfig();

  return (
    <div className="grid-2">
      <div>
        <div className="panel">
          <div className="ph">
             <span className="pt">Nová správa</span>
          </div>
          <div className="pb">
             {/* Tab Buttons */}
             <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.2rem' }}>
                <button 
                  className="btn" 
                  style={{ flex: 1, background: tab === 'all' ? 'var(--red)' : 'var(--surface2)', color: tab === 'all' ? '#fff' : 'var(--muted)', borderColor: 'transparent' }} 
                  onClick={() => setTab('all')}
                >
                  <i className="fas fa-users"></i> Všetkým členom
                </button>
                <button 
                  className="btn" 
                  style={{ flex: 1, background: tab === 'one' ? 'var(--red)' : 'var(--surface2)', color: tab === 'one' ? '#fff' : 'var(--muted)', borderColor: 'transparent' }} 
                  onClick={() => setTab('one')}
                >
                  <i className="fas fa-user"></i> Konkrétnemu členovi
                </button>
             </div>

             {tab === 'one' && (
               <div className="fg">
                 <label className="fl">Vyber člena</label>
                 <select className="fi" value={targetUser} onChange={e => setTargetUser(e.target.value)}>
                   <option value="">— vyber člena —</option>
                   {users.map(u => (
                     <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                   ))}
                 </select>
               </div>
             )}

             <div className="fg">
                <label className="fl">Nadpis správy *</label>
                <input className="fi" type="text" placeholder="napr. Dôležité oznámenie" value={title} onChange={e => setTitle(e.target.value)} />
             </div>
             
             <div className="fg">
                <label className="fl">Text správy *</label>
                <textarea className="fi" rows="4" style={{resize:'vertical', fontFamily:'var(--font-b)', lineHeight:1.6}} placeholder="Text správy..." value={body} onChange={e => setBody(e.target.value)}></textarea>
             </div>

             <div className="fg">
                <label className="fl">Typ / závažnosť</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                   <button 
                     className="btn btn-sm" 
                     style={{ background: severity === 'info' ? 'rgba(0,255,209,0.1)' : 'transparent', color: severity === 'info' ? 'var(--acid2)' : 'var(--muted)', borderColor: severity === 'info' ? 'var(--acid2)' : 'var(--border2)' }}
                     onClick={() => setSeverity('info')}
                   >
                     <i className="fas fa-info-circle"></i> Info
                   </button>
                   <button 
                     className="btn btn-sm" 
                     style={{ background: severity === 'warning' ? 'rgba(255,149,0,0.1)' : 'transparent', color: severity === 'warning' ? 'var(--orange)' : 'var(--muted)', borderColor: severity === 'warning' ? 'var(--orange)' : 'var(--border2)' }}
                     onClick={() => setSeverity('warning')}
                   >
                     <i className="fas fa-exclamation-triangle"></i> Upozornenie
                   </button>
                   <button 
                     className="btn btn-sm" 
                     style={{ background: severity === 'danger' ? 'rgba(255,45,85,0.1)' : 'transparent', color: severity === 'danger' ? 'var(--red)' : 'var(--muted)', borderColor: severity === 'danger' ? 'var(--red)' : 'var(--border2)' }}
                     onClick={() => setSeverity('danger')}
                   >
                     <i className="fas fa-exclamation-circle"></i> Dôležité
                   </button>
                </div>
             </div>

             <button className="btn btn-red btn-block" style={{ marginTop: '0.5rem' }} onClick={handleSend} disabled={loading}>
                {loading ? <span className="spinner" style={{width:14,height:14,marginRight:6}}></span> : <i className="fas fa-paper-plane"></i>} Odoslať správu
             </button>
             {msg.text && (
                <div className={`fm ${msg.type}`}>{msg.text}</div>
             )}
          </div>
        </div>
      </div>

      <div>
         {/* Preview */}
         <div className="panel">
            <div className="ph"><span className="pt">Náhľad notifikácie</span></div>
            <div className="pb">
               <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, padding: '1rem', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
                     <i className={`fas ${cfg.icon}`}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '0.86rem', fontWeight: 500, marginBottom: '0.12rem', wordBreak: 'break-word' }}>{title || 'Nadpis správy'}</div>
                     <div style={{ fontSize: '0.76rem', color: 'var(--muted)', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>{body || 'Text správy sa zobrazí tu...'}</div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Teraz</div>
               </div>
            </div>
         </div>

         {/* Sent Messages */}
         <div className="panel">
            <div className="ph">
               <span className="pt">Odoslané správy</span>
               <button className="btn btn-ghost btn-sm" onClick={loadSentMessages}><i className="fas fa-sync-alt"></i></button>
            </div>
            <div className="pb">
               {sentMessages.length > 0 ? sentMessages.slice(0, 20).map(n => {
                 const time = new Date(n.createdAt).toLocaleString('sk-SK', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
                 const sevColor = n.severity === 'danger' ? 'var(--red)' : n.severity === 'warning' ? 'var(--orange)' : 'var(--acid2)';
                 return (
                   <div key={n.id} style={{ padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.15rem' }}>{n.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{n.message}</div>
                     </div>
                     <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{time}</div>
                        <div style={{ fontSize: '0.65rem', color: sevColor, marginTop: '0.15rem', textTransform: 'uppercase' }}>{n.severity}</div>
                     </div>
                   </div>
                 );
               }) : (
                 <div className="empty-state">
                   <i className="fas fa-inbox"></i>
                   <p>Žiadne odoslané správy alebo API nie je dostupné</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
