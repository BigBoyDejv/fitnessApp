import React, { useState, useEffect } from "react";
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

  return (
    <div className="grid-2">
      <div className="panel">
        <div className="ph"><span className="pt">Úprava profilu</span></div>
        <div className="pb">
          <div className="fg" style={{ marginBottom: "1rem" }}>
            <label className="fl" style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase" }}>Meno *</label>
            <input 
              className="fi" 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="fg" style={{ marginBottom: "1rem" }}>
            <label className="fl" style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase" }}>Telefón</label>
            <input 
              className="fi" 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="fg" style={{ marginBottom: "1.5rem" }}>
            <label className="fl" style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase" }}>Fotka (URL)</label>
            <input 
              className="fi" 
              type="text" 
              placeholder="https://..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>
          <button className="btn btn-acid btn-block" style={{ width: "100%", justifyContent: "center" }} onClick={saveProfile}>
            <i className="fas fa-save"></i> Uložiť zmeny
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="ph"><span className="pt">Zmena hesla</span></div>
        <div className="pb">
          <div className="fg" style={{ marginBottom: "1rem" }}>
            <label className="fl" style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase" }}>Aktuálne heslo *</label>
            <input 
              className="fi" 
              type="password" 
              value={curPass}
              onChange={(e) => setCurPass(e.target.value)}
            />
          </div>
          <div className="fg" style={{ marginBottom: "1rem" }}>
            <label className="fl" style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase" }}>Nové heslo *</label>
            <input 
              className="fi" 
              type="password" 
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
          </div>
          <div className="fg" style={{ marginBottom: "1.5rem" }}>
            <label className="fl" style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase" }}>Zopakuj nové heslo *</label>
            <input 
              className="fi" 
              type="password" 
              value={newPass2}
              onChange={(e) => setNewPass2(e.target.value)}
            />
          </div>
          <button className="btn btn-purple btn-block" style={{ width: "100%", justifyContent: "center" }} onClick={changePassword}>
            <i className="fas fa-key"></i> Zmeniť heslo
          </button>
        </div>
      </div>
      
      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
