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
    <div className="grid-2">
      <div className="panel">
        <div className="ph">
          <span className="pt">Odoslať správu členom</span>
        </div>
        <div className="pb">
          <div className="fg">
            <label className="fl">Príjemca</label>
            <select className="fi" value={targetUser} onChange={(e) => setTargetUser(e.target.value)}>
              <option value="">👥 Všetci aktívni členovia ({members.length})</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>
              ))}
            </select>
          </div>
          
          <div className="fg">
            <label className="fl">Nadpis *</label>
            <input 
              className="fi" 
              type="text" 
              placeholder="napr. Zmena otváracích hodín" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div className="fg">
            <label className="fl">Správa *</label>
            <textarea 
              className="fi" 
              rows="4" 
              placeholder="Text správy..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            ></textarea>
          </div>
          
          <div className="fg">
            <label className="fl">Typ</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button 
                className={`btn btn-sm ${severity === 'info' ? 'btn-cyan' : 'btn-ghost'}`}
                onClick={() => setSeverity('info')}
              >
                <i className="fas fa-info-circle"></i> Info
              </button>
              <button 
                className={`btn btn-sm ${severity === 'warning' ? 'btn-orange' : 'btn-ghost'}`}
                onClick={() => setSeverity('warning')}
              >
                <i className="fas fa-exclamation-triangle"></i> Varovanie
              </button>
              <button 
                className={`btn btn-sm ${severity === 'danger' ? 'btn-red' : 'btn-ghost'}`}
                onClick={() => setSeverity('danger')}
              >
                <i className="fas fa-exclamation-circle"></i> Dôležité
              </button>
            </div>
          </div>
          
          <button className="btn btn-purple btn-block" onClick={sendMessage}>
            <i className="fas fa-paper-plane"></i> Odoslať správu
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="ph">
          <span className="pt">Odoslané správy</span>
          <button className="btn btn-ghost btn-sm" onClick={loadSentMessages}>
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
        <div className="pb">
          {sentMessages.length === 0 ? (
            <div className="empty-state" style={{ padding: "1.5rem" }}>
              <i className="fas fa-inbox"></i>
              <p>Žiadne odoslané správy</p>
            </div>
          ) : (
            sentMessages.slice(0, 15).map(n => {
              const time = new Date(n.createdAt).toLocaleString('sk-SK', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
              const sevColor = n.severity === 'danger' ? 'var(--red)' : n.severity === 'warning' ? 'var(--orange)' : 'var(--acid2)';
              
              return (
                <div key={n.id} className="msg-item">
                  <div className="msg-head">
                    <span className="msg-title">{n.title}</span>
                    <span className="msg-time">{time}</span>
                  </div>
                  <div className="msg-body">{n.message}</div>
                  <div className="msg-meta" style={{ color: sevColor }}>{n.severity}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
