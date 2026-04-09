import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authenticatedFetch } from "../../utils/api";
import Toast from "../Toast";

export default function CheckInTab() {
  const [activeTab, setActiveTab] = useState("qr"); // qr or name
  
  const [cameraStream, setCameraStream] = useState(null);
  const [scanningActive, setScanningActive] = useState(false);
  const videoRef = useRef(null);

  const [qrInput, setQrInput] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [nameResults, setNameResults] = useState([]);
  
  const [checkinResult, setCheckinResult] = useState(null);
  const [todayCheckins, setTodayCheckins] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(true);

  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, type = "ok") => {
    setToastMsg({ msg, type });
  };

  useEffect(() => {
    loadTodayCheckins();
    return () => stopCamera();
  }, []);

  const loadTodayCheckins = async () => {
    try {
      const res = await authenticatedFetch("/api/checkin/today");
      if (res.ok) {
        const data = await res.json();
        setTodayCheckins(Array.isArray(data) ? data : []);
      } else {
        setTodayCheckins([]);
      }
    } catch (e) {
      setTodayCheckins([]);
    }
  };

  const toggleCamera = async () => {
    if (cameraStream) {
      stopCamera();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanningActive(true);
      showToast("Kamera zapnutá — namier na QR kód", "ok");
    } catch (e) {
      showToast("Kamera nedostupná: " + e.message, "err");
    }
  };

  const stopCamera = () => {
    setScanningActive(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (scanningActive && videoRef.current) {
      const video = videoRef.current;
      video.addEventListener('loadedmetadata', startQrScan, { once: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanningActive]);

  const startQrScan = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const scan = () => {
      if (!scanningActive) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (window.jsQR) {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth"
          });
          if (code) {
            setScanningActive(false);
            stopCamera();
            let userId = code.data;
            if (userId.startsWith("gym-entry:")) {
              userId = userId.split(":")[1];
            }
            setQrInput(userId);
            showToast("✓ QR naskenovaný", "ok");
            processCheckin(userId, null);
            return;
          }
        }
      }
      requestAnimationFrame(scan);
    };
    scan();
  };

  const handleNameSearch = async (val) => {
    setNameSearch(val);
    if (val.length < 2) {
      setNameResults([]);
      return;
    }
    try {
      const res = await authenticatedFetch("/api/admin/profiles");
      if (res.ok) {
        const members = await res.json();
        const results = members
          .filter(m => m.role === "member")
          .filter(m => (m.fullName || "").toLowerCase().includes(val.toLowerCase()) || (m.email || "").toLowerCase().includes(val.toLowerCase()))
          .slice(0, 8);
        setNameResults(results);
      }
    } catch {
      setNameResults([]);
    }
  };

  const doCheckinById = async (userId, name) => {
    setNameSearch("");
    setNameResults([]);
    await processCheckin(userId, name);
  };

  const processCheckin = async (userId, displayName) => {
    if (!userId) return;
    setCheckinResult(null);

    try {
      const resM = await authenticatedFetch(`/api/admin/memberships/user/${userId}`);
      if (!resM.ok) {
        setCheckinResult({
          type: "err",
          name: displayName || userId,
          msg: "Člen nemá aktívnu permanentka",
        });
        showToast("Zamietnutý: Člen nemá aktívnu permanentka", "err");
        return;
      }
      const mem = await resM.json();
      if (mem.status !== "active") {
        setCheckinResult({
          type: "err",
          name: displayName || userId,
          msg: `Permanentka vypršala (${mem.endDate || "—"})`,
        });
        showToast("Zamietnutý: Permanentka vypršala", "err");
        return;
      }

      const res = await authenticatedFetch("/api/checkin/scan", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      const d = await res.json();

      if (res.ok) {
        setCheckinResult({
          type: "ok",
          data: d,
          mem: mem,
        });
        showToast("✓ Vstup: " + (d.fullName || displayName), "ok");
        loadTodayCheckins();
        setQrInput("");
      } else {
        setCheckinResult({
          type: "err",
          name: displayName || userId,
          msg: d.message || "Chyba servera",
        });
        showToast("Zamietnutý: " + (d.message || "Chyba servera"), "err");
      }
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  const renderTodayCheckins = () => {
    if (!todayCheckins) return <div className="empty-state"><span className="spinner"></span></div>;
    if (todayCheckins.length === 0) return (
      <div className="empty-state" style={{ padding: "3rem" }}>
        <i className="fas fa-sign-in-alt neon-text-purple" style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '1rem' }} />
        <p style={{ fontWeight: 800 }}>Zatiaľ žiadne vstupy dnes</p>
      </div>
    );

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ padding: '0 1rem' }}>
        {todayCheckins.slice(0, 20).map((c, i) => {
          const ini = getInitials(c.fullName);
          const t = c.checkedAt ? new Date(c.checkedAt).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" }) : "—";
          return (
            <motion.div 
              key={i} 
              variants={itemVariants}
              className="glass"
              style={{ display: "flex", alignItems: "center", gap: "0.8rem", padding: "0.8rem 1rem", border: "1px solid var(--border)", borderRadius: '12px', marginBottom: '0.6rem', background: 'rgba(255,255,255,0.01)' }}
            >
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, var(--purple), var(--blue))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-d)", fontSize: "0.9rem", fontWeight: "950", color: "#fff", flexShrink: 0 }}>
                {ini}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 800 }}>{c.fullName || "—"}</div>
                <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>{c.email || ""}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: "0.85rem", color: "var(--acid2)", fontWeight: 900 }}>{t}</div>
                <div style={{ fontSize: "0.6rem", color: "var(--muted)", textTransform: 'uppercase' }}>Čas</div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="dashboard-grid">
      <motion.div variants={itemVariants} className="panel glass-panel">
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="neon-icon purple" style={{ width: 32, height: 32, background: 'rgba(191,90,242,0.1)', color: 'var(--purple)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-id-card-alt"></i>
            </div>
            <span className="pt">Odbavenie vstupu</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0.5rem 0 0 3.2rem', fontWeight: 500, lineHeight: '1.4' }}>
            Hlavný terminál pre zaznamenávanie príchodov. Podporuje automatické skenovanie QR kódov alebo manuálne vyhľadávanie v databáze.
          </p>
        </div>
        <div className="pb" style={{ padding: '1.2rem' }}>
          <div className="checkin-tabs" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.4rem', borderRadius: '14px', marginBottom: '1.5rem', display: 'flex', gap: '0.4rem', border: '1px solid var(--border)' }}>
            <button 
              className={`ctab ${activeTab === "qr" ? "active" : ""}`} 
              onClick={() => setActiveTab("qr")}
              style={{ flex: 1, padding: '0.9rem', borderRadius: '10px', border: 'none', background: activeTab === 'qr' ? 'var(--purple)' : 'transparent', color: activeTab === 'qr' ? '#fff' : 'var(--muted)', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', transition: 'all 0.3s' }}
            >
              <i className="fas fa-qrcode"></i> QR SKENER
            </button>
            <button 
              className={`ctab ${activeTab === "name" ? "active" : ""}`}
              onClick={() => setActiveTab("name")}
              style={{ flex: 1, padding: '0.9rem', borderRadius: '10px', border: 'none', background: activeTab === 'name' ? 'var(--purple)' : 'transparent', color: activeTab === 'name' ? '#fff' : 'var(--muted)', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', transition: 'all 0.3s' }}
            >
              <i className="fas fa-search"></i> MANUÁLNE
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "qr" ? (
              <motion.div key="qr" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <div className="fg">
                  <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.6rem' }}>QR kód alebo Identifikátor</label>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-barcode" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--purple)' }}></i>
                    <input 
                      className="fi" 
                      type="text" 
                      placeholder="Zadaj kód manuálne..." 
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && processCheckin(qrInput, null)}
                      style={{ paddingLeft: '3.2rem', borderRadius: '12px', height: '56px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.02)' }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.5rem" }}>
                  <button className="btn btn-purple" onClick={() => processCheckin(qrInput, null)} style={{ flex: 1, height: '56px', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', boxShadow: '0 10px 20px rgba(191,90,242,0.15)' }}>
                    <i className="fas fa-sign-in-alt" style={{marginRight: '0.8rem'}}></i> OVERIŤ VSTUP
                  </button>
                  <button className={`btn ${cameraStream ? 'btn-red' : 'btn-ghost'}`} onClick={toggleCamera} style={{ borderRadius: '12px', width: '56px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    <i className={`fas fa-${cameraStream ? 'times' : 'camera'}`}></i>
                  </button>
                </div>
                
                {cameraStream && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ marginTop: "1rem" }}>
                    <div className="camera-wrap" style={{ background: "#000", border: "2px solid var(--purple)", borderRadius: "20px", overflow: "hidden", position: "relative", boxShadow: '0 0 40px rgba(191,90,242,0.3)' }}>
                      <video ref={videoRef} style={{ width: "100%", display: "block", maxHeight: "350px", objectFit: "cover" }} autoPlay playsInline muted></video>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                        <div style={{ width: "240px", height: "240px", border: "2px solid var(--purple)", borderRadius: "24px", boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)", position: "relative" }}>
                          <motion.div 
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            style={{ position: "absolute", left: '5%', width: "90%", height: "2px", background: "var(--purple)", boxShadow: '0 0 15px var(--purple), 0 0 30px var(--purple)' }}
                          />
                        </div>
                      </div>
                      <div style={{ position: "absolute", top: "1.2rem", right: "1.2rem" }}>
                        <button className="btn btn-red btn-xs" onClick={stopCamera} style={{borderRadius: '12px', width: 32, height: 32, padding: 0}}><i className="fas fa-times"></i></button>
                      </div>
                      <div style={{ position: "absolute", bottom: "1.2rem", left: 0, right: 0, textAlign: "center", fontSize: "0.75rem", color: "#fff", textTransform: 'uppercase', letterSpacing: '0.15em', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '0.4rem', margin: '0 2rem', borderRadius: '10px' }}>
                        <i className="fas fa-spinner fa-spin" style={{marginRight: '0.6rem', color: 'var(--purple)'}}></i> Živý skener aktívny...
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div key="name" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div className="fg">
                  <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.6rem' }}>Search Client Database</label>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-user-search" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--purple)' }}></i>
                    <input 
                      className="fi" 
                      type="text" 
                      placeholder="Meno, priezvisko alebo email..." 
                      value={nameSearch}
                      onChange={(e) => handleNameSearch(e.target.value)}
                      style={{ paddingLeft: '3.2rem', borderRadius: '12px', height: '56px', background: 'rgba(255,255,255,0.02)' }}
                    />
                  </div>
                </div>
                <div className="name-results glass" style={{ background: 'rgba(0,0,0,0.2)', border: "1px solid var(--border)", borderRadius: "16px", maxHeight: "350px", overflowY: "auto", padding: '0.6rem' }}>
                  {nameSearch.length < 2 ? (
                    <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "0.88rem" }}>
                      <i className="fas fa-keyboard" style={{display: 'block', fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.1}}></i>
                      Zadajte aspoň 2 znaky pre vyhľadávanie
                    </div>
                  ) : nameResults.length === 0 ? (
                    <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "0.88rem" }}>
                      <i className="fas fa-search-minus" style={{display: 'block', fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.1}}></i>
                      Nenašli sa žiadne výsledky
                    </div>
                  ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                      {nameResults.map((m, idx) => (
                        <motion.div 
                          key={idx} 
                          variants={itemVariants}
                          style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.8rem 1rem", borderRadius: '12px', cursor: "pointer", transition: "all 0.2s", marginBottom: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid transparent' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(191,90,242,0.2)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; e.currentTarget.style.borderColor = 'transparent'; }}
                          onClick={() => doCheckinById(m.id, m.fullName)}
                        >
                          <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg, var(--purple), var(--blue))", border: '1px solid rgba(255,255,255,0.1)', display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-d)", fontSize: "0.95rem", fontWeight: "950", color: "#fff", flexShrink: 0 }}>
                            {getInitials(m.fullName)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.95rem", fontWeight: 800 }}>{m.fullName || "—"}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{m.email || ""}</div>
                          </div>
                          <span className={`badge ${m.active ? "b-acid" : "b-frozen"}`} style={{ fontSize: "0.62rem", padding: '0.3rem 0.6rem' }}>
                            {m.active ? "AKTÍVNY" : "ZMRAZENÝ"}
                          </span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {checkinResult && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`checkin-result ${checkinResult.type}`} 
                style={{ marginTop: '2rem', padding: '1.8rem', borderRadius: '20px', border: '2px solid', borderColor: checkinResult.type === 'ok' ? 'rgba(200,255,0,0.3)' : 'rgba(255,45,85,0.3)', background: checkinResult.type === 'ok' ? 'rgba(200,255,0,0.08)' : 'rgba(255,45,85,0.08)', boxShadow: checkinResult.type === 'ok' ? '0 15px 35px rgba(200,255,0,0.1)' : '0 15px 35px rgba(255,45,85,0.1)' }}
              >
                {checkinResult.type === "ok" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "1.8rem" }}>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--acid)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', boxShadow: '0 0 20px var(--acid)' }}>
                      <i className="fas fa-check"></i>
                    </motion.div>
                    <div>
                      <div style={{ fontFamily: "var(--font-d)", fontSize: "1.8rem", fontWeight: 950, color: "var(--acid)", textTransform: 'uppercase', lineHeight: 1, letterSpacing: '0.05em' }}>
                        Vstup povolený
                      </div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.5rem", color: '#fff' }}>
                        {checkinResult.data.fullName || "Člen"}
                      </div>
                      <div style={{ display: "flex", gap: '0.8rem', marginTop: "1rem", alignItems: 'center' }}>
                        <span className="badge b-acid" style={{ border: 'none', background: 'rgba(200,255,0,0.2)', color: 'var(--acid)', fontWeight: 800 }}>
                           {checkinResult.mem.membershipTypeName || "Paušál"}
                        </span>
                        <div style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 600 }}>
                          Zostatok: <span style={{ color: 'var(--text)' }}>{checkinResult.mem.daysRemaining} dní</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "1.8rem" }}>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }} style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 0 20px rgba(255,45,85,0.4)' }}>
                      <i className="fas fa-times"></i>
                    </motion.div>
                    <div>
                      <div style={{ fontFamily: "var(--font-d)", fontSize: "1.8rem", fontWeight: 950, color: "var(--red)", textTransform: 'uppercase', lineHeight: 1, letterSpacing: '0.05em' }}>
                        Vstup zamietnutý
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: 600, marginTop: "0.4rem", color: 'rgba(255,255,255,0.6)' }}>
                        ID/Meno: {checkinResult.name}
                      </div>
                      <div style={{ fontSize: "0.92rem", color: "var(--red)", marginTop: "0.8rem", fontWeight: 700, padding: '0.4rem 0.8rem', background: 'rgba(255,45,85,0.1)', borderRadius: '8px', display: 'inline-block' }}>
                        <i className="fas fa-exclamation-circle" style={{marginRight: '0.5rem'}}></i> {checkinResult.msg}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="panel glass-panel">
        <div className="ph" onClick={() => setHistoryOpen(!historyOpen)} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="neon-icon cyan" style={{ width: 32, height: 32, background: 'rgba(0,255,209,0.1)', color: 'var(--acid2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-history"></i>
            </div>
            <span className="pt">História dnes</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.5rem 0 0 3.2rem', fontWeight: 500 }}>
             Posledných 20 úspešných check-inov za dnešný deň.
          </p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); loadTodayCheckins(); }} style={{ borderRadius: '6px' }}>
              <i className="fas fa-sync-alt"></i>
            </button>
            <motion.i animate={{ rotate: historyOpen ? 0 : 180 }} className="fas fa-chevron-up" style={{ color: 'var(--muted)', fontSize: '0.8rem' }} />
          </div>
        </div>
        <AnimatePresence>
          {historyOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="pb" style={{ maxHeight: "650px", overflowY: "auto", paddingBottom: '1.5rem' }}>
                {renderTodayCheckins()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </motion.div>
  );
}
