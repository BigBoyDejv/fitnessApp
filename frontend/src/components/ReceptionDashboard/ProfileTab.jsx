import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authenticatedFetch } from "../../utils/api";
import Toast from "../Toast";

export default function ProfileTab({ user, setUser }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
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
    try {
      const res = await authenticatedFetch("/api/auth/me");
      if (res.ok) {
        const d = await res.json();
        setName(d.fullName || "");
        setPhone(d.phone || "");
        setAvatarUrl(d.avatarUrl || "");
      }
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) return showToast("Meno je povinné", "err");
    const uid = user?.id || user?.userId;
    if (!uid) return showToast("Chyba ID používateľa", "err");

    try {
      const res = await authenticatedFetch(`/api/users/${uid}`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: name.trim(),
          phone: phone.trim(),
          avatarUrl: avatarUrl.trim() || null
        })
      });
      if (!res.ok) throw new Error("Chyba uloženia profilu");
      showToast("Profil aktualizovaný!", "ok");
      const upd = { ...user, fullName: name.trim(), phone: phone.trim(), avatarUrl: avatarUrl.trim() || null };
      localStorage.setItem("fp_user", JSON.stringify(upd));
      setUser(upd);
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  const changePassword = async () => {
    if (!curPass) return showToast("Zadaj aktuálne heslo", "err");
    if (newPass.length < 6) return showToast("Nové heslo musí mať min. 6 znakov", "err");
    if (newPass !== newPass2) return showToast("Heslá sa nezhodujú", "err");

    const uid = user?.id || user?.userId;
    try {
      const res = await authenticatedFetch(`/api/users/${uid}/password`, {
        method: "PUT",
        body: JSON.stringify({ currentPassword: curPass, newPassword: newPass })
      });
      if (!res.ok) throw new Error("Zlé heslo alebo chyba servera");
      showToast("Heslo úspešne zmenené!", "ok");
      setCurPass("");
      setNewPass("");
      setNewPass2("");
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
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid-2 profile-reception">
      <motion.div variants={itemVariants} className="panel glass-panel">
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="neon-icon yellow" style={{ width: 32, height: 32, background: 'rgba(255,149,0,0.1)', color: 'var(--orange)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-user-edit"></i>
            </div>
            <span className="pt">Osobné informácie</span>
          </div>
          <span className="method m-orange">EDIT_MODE</span>
        </div>
        <div className="pb" style={{ padding: '2rem' }}>
          <div style={{ display: "flex", gap: "2rem", alignItems: "center", marginBottom: "2rem" }}>
             <div style={{ position: "relative" }}>
                <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "2px solid var(--orange)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", fontWeight: 900, color: "var(--orange)" }}>
                   {avatarUrl ? <img src={avatarUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name.charAt(0).toUpperCase()}
                </div>
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, background: "var(--orange)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", border: "4px solid #121212" }}>
                   <i className="fas fa-camera" style={{ fontSize: "0.8rem" }}></i>
                </div>
             </div>
             <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 900, marginBottom: "0.2rem" }}>{name || "Profil recepcie"}</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>ID: {user?.id?.substring(0,8) || "UNSET"}</p>
             </div>
          </div>

          <div className="fg" style={{ marginBottom: "1.2rem" }}>
            <label className="fl" style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "0.6rem" }}>CELÉ MENO</label>
            <div style={{ position: "relative" }}>
              <i className="fas fa-signature" style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", color: "var(--orange)", zIndex: 1 }}></i>
              <input className="fi" type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ paddingLeft: "3.2rem", borderRadius: "14px", height: "52px", border: "1px solid var(--border)" }} />
            </div>
          </div>
          <div className="fg" style={{ marginBottom: "1.2rem" }}>
            <label className="fl" style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "0.6rem" }}>TELEFÓNNE ČÍSLO</label>
            <div style={{ position: "relative" }}>
              <i className="fas fa-phone" style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", color: "var(--orange)", zIndex: 1 }}></i>
              <input className="fi" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ paddingLeft: "3.2rem", borderRadius: "14px", height: "52px", border: "1px solid var(--border)" }} />
            </div>
          </div>
          <div className="fg" style={{ marginBottom: "2rem" }}>
            <label className="fl" style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "0.6rem" }}>AVATAR URL</label>
            <div style={{ position: "relative" }}>
              <i className="fas fa-link" style={{ position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)", color: "var(--orange)", zIndex: 1 }}></i>
              <input className="fi" type="text" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} style={{ paddingLeft: "3.2rem", borderRadius: "14px", height: "52px", border: "1px solid var(--border)" }} />
            </div>
          </div>
          <button className="btn btn-acid btn-block" style={{ height: "60px", borderRadius: "16px", fontWeight: 950, letterSpacing: "0.1em", boxShadow: "0 10px 20px rgba(200,255,0,0.1)" }} onClick={saveProfile}>
            <i className="fas fa-save" style={{marginRight: "0.8rem"}}></i> ULOŽIŤ PROFIL
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="panel glass-panel">
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="neon-icon cyan" style={{ width: 32, height: 32, background: 'rgba(0,123,255,0.1)', color: 'var(--blue)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-key"></i>
            </div>
            <span className="pt">Zabezpečenie účtu</span>
          </div>
          <span className="method m-frozen">SECURE_AUTH</span>
        </div>
        <div className="pb" style={{ padding: '2rem' }}>
          <div className="fg" style={{ marginBottom: "1.2rem" }}>
            <label className="fl" style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "0.6rem" }}>AKTUÁLNE HESLO</label>
            <input className="fi" type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} style={{ borderRadius: "14px", height: "52px", border: "1px solid var(--border)" }} />
          </div>
          <div className="fg" style={{ marginBottom: "1.2rem" }}>
            <label className="fl" style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "0.6rem" }}>NOVÉ HESLO</label>
            <input className="fi" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} style={{ borderRadius: "14px", height: "52px", border: "1px solid var(--border)" }} />
          </div>
          <div className="fg" style={{ marginBottom: "2rem" }}>
            <label className="fl" style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "0.6rem" }}>ZOPAKOVAŤ NOVÉ HESLO</label>
            <input className="fi" type="password" value={newPass2} onChange={(e) => setNewPass2(e.target.value)} style={{ borderRadius: "14px", height: "52px", border: "1px solid var(--border)" }} />
          </div>
          <button className="btn btn-purple btn-block" style={{ height: "60px", borderRadius: "16px", fontWeight: 950, letterSpacing: "0.1em", boxShadow: "0 10px 20px rgba(191,90,242,0.1)" }} onClick={changePassword}>
            <i className="fas fa-shield-alt" style={{marginRight: "0.8rem"}}></i> AKTUALIZOVAŤ HESLO
          </button>
        </div>
      </motion.div>
      
      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </motion.div>
  );
}
