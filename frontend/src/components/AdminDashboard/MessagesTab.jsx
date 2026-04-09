import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
      <motion.div variants={itemVariants} className="panel glass-panel">
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="neon-icon purple" style={{ width: 32, height: 32, background: 'rgba(191,90,242,0.1)', color: 'var(--purple)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-paper-plane"></i>
            </div>
            <span className="pt">Nové oznámenie</span>
          </div>
        </div>
        <div className="pb" style={{ padding: '2rem' }}>
          <div className="fg" style={{ marginBottom: '1.5rem' }}>
            <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', marginBottom: '0.6rem' }}>PRÍJEMCA OZNÁMENIA</label>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-users-cog" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--purple)', zIndex: 1 }}></i>
              <select className="fi" value={targetUser} onChange={(e) => setTargetUser(e.target.value)} style={{ paddingLeft: '3.2rem', borderRadius: '14px', height: '52px', border: '1px solid var(--border)' }}>
                <option value="">🚀 VŠETCI AKTÍVNI ČLENOVIA ({members.length})</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.fullName.toUpperCase()} ({m.email})</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="fg" style={{ marginBottom: '1.5rem' }}>
            <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', marginBottom: '0.6rem' }}>PREDMET SPRÁVY</label>
            <input 
              className="fi" 
              type="text" 
              placeholder="Napr.: Zmena otváracích hodín..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ borderRadius: '14px', height: '52px', border: '1px solid var(--border)' }}
            />
          </div>
          
          <div className="fg" style={{ marginBottom: '1.5rem' }}>
            <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', marginBottom: '0.6rem' }}>OBSAH OZNÁMENIA</label>
            <textarea 
              className="fi" 
              rows="6" 
              placeholder="Napíšte vašu správu sem..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ borderRadius: '14px', resize: 'none', padding: '1.2rem', border: '1px solid var(--border)' }}
            ></textarea>
          </div>
          
          <div className="fg" style={{ marginBottom: '1.5rem' }}>
            <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', marginBottom: '0.8rem' }}>PRIORITA</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.8rem" }}>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                className={`btn btn-xs ${severity === 'info' ? 'btn-blue' : 'btn-ghost'}`}
                onClick={() => setSeverity('info')}
                style={{ borderRadius: '12px', height: '44px', fontWeight: 950, letterSpacing: '0.05em' }}
              >
                INFO
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                className={`btn btn-xs ${severity === 'warning' ? 'btn-orange' : 'btn-ghost'}`}
                onClick={() => setSeverity('warning')}
                style={{ borderRadius: '12px', height: '44px', fontWeight: 950, letterSpacing: '0.05em' }}
              >
                POZOR
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                className={`btn btn-xs ${severity === 'danger' ? 'btn-red' : 'btn-ghost'}`}
                onClick={() => setSeverity('danger')}
                style={{ borderRadius: '12px', height: '44px', fontWeight: 950, letterSpacing: '0.05em' }}
              >
                ALARM
              </motion.button>
            </div>
          </div>
          
          <button className="btn btn-purple btn-block" onClick={sendMessage} style={{ height: '60px', borderRadius: '16px', fontWeight: 950, marginTop: '1.5rem', letterSpacing: '0.1em', boxShadow: '0 10px 20px rgba(191,90,242,0.2)' }}>
            <i className="fas fa-paper-plane" style={{marginRight: '0.8rem'}}></i> ODOSLAŤ OZNÁMENIE
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="panel glass-panel">
        <div className="ph" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="neon-icon cyan" style={{ width: 32, height: 32, background: 'rgba(0,123,255,0.1)', color: 'var(--blue)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-history"></i>
            </div>
            <span className="pt">Archív odoslaných správ</span>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={loadSentMessages} style={{ borderRadius: '10px' }}>
            <i className="fas fa-sync-alt" />
          </button>
        </div>
        <div className="pb" style={{ padding: '1.5rem', maxHeight: '700px', overflowY: 'auto' }}>
          <AnimatePresence>
            {sentMessages.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state" style={{ height: '400px' }}>
                <i className="fas fa-envelope-open-text" style={{ fontSize: '4rem', opacity: 0.1, marginBottom: '2rem' }}></i>
                <p style={{ fontWeight: 900, color: 'var(--muted)', letterSpacing: '0.1em' }}>ARCHÍV JE PRÁZDNY</p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sentMessages.slice().reverse().slice(0, 20).map(n => {
                  const time = new Date(n.createdAt).toLocaleString('sk-SK', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
                  const sevColor = n.severity === 'danger' ? 'var(--red)' : n.severity === 'warning' ? 'var(--orange)' : 'var(--blue)';
                  const sevBg = n.severity === 'danger' ? 'rgba(255,45,85,0.1)' : n.severity === 'warning' ? 'rgba(255,149,0,0.1)' : 'rgba(10,132,255,0.1)';
                  
                  return (
                    <motion.div 
                      key={n.id} 
                      layout
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="glass" 
                      style={{ padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', position: 'relative' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', alignItems: 'center' }}>
                         <span style={{ fontSize: '1.2rem', fontWeight: 950, fontFamily: 'var(--font-d)', color: '#fff', letterSpacing: '0.02em' }}>{n.title.toUpperCase()}</span>
                         <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 800, fontFamily: 'monospace' }}>{time}</span>
                      </div>
                      <div style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: '1.6', position: 'relative', zIndex: 1, marginBottom: '1.2rem' }}>{n.message}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ background: sevBg, color: sevColor, padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em', border: `1px solid ${sevColor}22` }}>
                            <i className={`fas ${n.severity === 'danger' ? 'fa-fire' : n.severity === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`} style={{marginRight: '0.5rem'}}></i>
                            {n.severity}
                         </div>
                         {n.userId && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--purple)', fontWeight: 900, background: 'rgba(191,90,242,0.1)', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
                              <i className="fas fa-lock" style={{marginRight: '0.4rem'}}></i> PRIVÁTNE
                            </div>
                         )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </motion.div>
  );
}
