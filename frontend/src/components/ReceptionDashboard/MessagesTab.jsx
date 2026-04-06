import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../utils/api";
import Toast from "../Toast";

export default function MessagesTab() {
  const [members, setMembers] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  
  const [targetUser, setTargetUser] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("info");
  
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    loadMembers();
    loadSentMessages();
  }, []);

  const showToast = (msg, type = "ok") => {
    setToastMsg({ msg, type });
  };

  const loadMembers = async () => {
    try {
      const res = await authenticatedFetch("/api/admin/profiles");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.filter(m => m.role === "member" && m.active));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSentMessages = async () => {
    try {
      const res = await authenticatedFetch("/api/notifications/sent");
      if (res.ok) {
        const data = await res.json();
        setSentMessages(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!title.trim()) return showToast("Zadaj nadpis správy", "err");
    if (!body.trim()) return showToast("Zadaj text správy", "err");

    const payload = { title, message: body, severity };
    if (targetUser) payload.userId = targetUser;

    try {
      const res = await authenticatedFetch("/api/notifications/admin-message", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      
      if (!res.ok) throw new Error(d.message || "Chyba");
      
      showToast("Správa úspešne odoslaná!", "ok");
      setTitle("");
      setBody("");
      loadSentMessages();
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  return (
    <div className="dashboard-grid animate-in" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
      <div className="panel animate-in" style={{ animationDelay: '0.05s' }}>
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(191,90,242,0.1)', color: 'var(--purple)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-paper-plane"></i>
            </div>
            <span className="pt">Nová správa pre členov</span>
          </div>
        </div>
        <div className="pb" style={{ padding: '2rem' }}>
          <div className="fg">
            <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>PRÍJEMCA SPRÁVY</label>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-user-friends" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}></i>
              <select className="fi" value={targetUser} onChange={(e) => setTargetUser(e.target.value)} style={{ paddingLeft: '2.8rem', borderRadius: '10px' }}>
                <option value="">👥 VŠETCI AKTÍVNI ČLENOVIA ({members.length})</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.fullName.toUpperCase()} ({m.email})</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="fg">
            <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>PREDMET / NADPIS *</label>
            <input 
              className="fi" 
              type="text" 
              placeholder="Zadajte krátky nadpis..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ borderRadius: '10px' }}
            />
          </div>
          
          <div className="fg">
            <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>OBSAH SPRÁVY *</label>
            <textarea 
              className="fi" 
              rows="6" 
              placeholder="Napíšte vašu správu sem..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ borderRadius: '10px', resize: 'none', padding: '1rem' }}
            ></textarea>
          </div>
          
          <div className="fg">
            <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>PRIORITA / TYP OZNÁMENIA</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.8rem" }}>
              <button 
                className={`btn btn-xs ${severity === 'info' ? 'btn-blue' : 'btn-ghost'}`}
                onClick={() => setSeverity('info')}
                style={{ borderRadius: '8px', height: '40px', fontWeight: 800 }}
              >
                <i className="fas fa-info-circle"></i> INFO
              </button>
              <button 
                className={`btn btn-xs ${severity === 'warning' ? 'btn-orange' : 'btn-ghost'}`}
                onClick={() => setSeverity('warning')}
                style={{ borderRadius: '8px', height: '40px', fontWeight: 800 }}
              >
                <i className="fas fa-exclamation-triangle"></i> POZOR
              </button>
              <button 
                className={`btn btn-xs ${severity === 'danger' ? 'btn-red' : 'btn-ghost'}`}
                onClick={() => setSeverity('danger')}
                style={{ borderRadius: '8px', height: '40px', fontWeight: 800 }}
              >
                <i className="fas fa-fire"></i> KRITICKÉ
              </button>
            </div>
          </div>
          
          <button className="btn btn-purple btn-block" onClick={sendMessage} style={{ height: '52px', borderRadius: '12px', fontWeight: 900, marginTop: '1rem', letterSpacing: '0.05em' }}>
            <i className="fas fa-paper-plane" style={{marginRight: '0.8rem'}}></i> ODOSLAŤ OZNÁMENIE
          </button>
        </div>
      </div>

      <div className="panel animate-in" style={{ animationDelay: '0.15s' }}>
        <div className="ph" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)', color: 'var(--text)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-history"></i>
            </div>
            <span className="pt">História odoslaných správ</span>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={loadSentMessages} style={{ borderRadius: '6px' }}>
            <i className="fas fa-sync-alt" /> OBNOVIŤ
          </button>
        </div>
        <div className="pb" style={{ padding: '1.5rem', maxHeight: '700px', overflowY: 'auto' }}>
          {sentMessages.length === 0 ? (
            <div className="empty-state" style={{ padding: '5rem' }}>
              <i className="fas fa-paper-plane" style={{ fontSize: '3.5rem', opacity: 0.1, marginBottom: '1.5rem' }}></i>
              <p style={{ fontWeight: 700 }}>Zatiaľ ste neodoslali žiadne správy</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sentMessages.slice().reverse().slice(0, 15).map(n => {
                const time = new Date(n.createdAt).toLocaleString('sk-SK', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
                const sevColor = n.severity === 'danger' ? 'var(--red)' : n.severity === 'warning' ? 'var(--orange)' : 'var(--blue)';
                const sevBg = n.severity === 'danger' ? 'rgba(255,45,85,0.1)' : n.severity === 'warning' ? 'rgba(255,149,0,0.1)' : 'rgba(10,132,255,0.1)';
                
                return (
                  <div key={n.id} className="glass animate-in" style={{ padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--border)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                       <span style={{ fontSize: '1rem', fontWeight: 900, fontFamily: 'var(--font-d)' }}>{n.title}</span>
                       <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700 }}>{time}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>{n.message}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                       <div style={{ background: sevBg, color: sevColor, padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <i className={`fas ${n.severity === 'danger' ? 'fa-fire' : n.severity === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`} style={{marginRight: '0.4rem'}}></i>
                          {n.severity}
                       </div>
                       {n.userId && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700 }}>
                            <i className="fas fa-user-lock" style={{marginRight: '0.3rem'}}></i> PRIVÁTNA SPRÁVA
                          </div>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
