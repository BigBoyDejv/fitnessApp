import React, { useState, useEffect, useRef } from "react";
import { authenticatedFetch } from "../../utils/api";
// Importing jsQR requires it to be available. Assuming it is correctly linked from public/Jsqr.js.
// We will access it via window.jsQR
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

  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, type = "ok") => {
    setToastMsg({ msg, type });
  };

  useEffect(() => {
    loadTodayCheckins();
    return () => stopCamera(); // Cleanup camera on unmount
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

  // QR Camera logic
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
      // Re-use admin profiles endpoint since reception can see it
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
          msg: "Člen nemá aktívnu permanentku",
        });
        showToast("Zamietnutý: Člen nemá aktívnu permanentku", "err");
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

  const renderTodayCheckins = () => {
    if (!todayCheckins) return <div className="empty-state"><span className="spinner"></span></div>;
    if (todayCheckins.length === 0) return <div className="empty-state" style={{ padding: "1.5rem" }}><i className="fas fa-sign-in-alt"></i><p>Zatiaľ žiadne vstupy dnes</p></div>;

    return todayCheckins.slice(0, 20).map((c, i) => {
      const ini = (c.fullName || "?").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
      const t = c.checkedAt ? new Date(c.checkedAt).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" }) : "—";
      return (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.8rem", padding: "0.6rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, var(--purple), var(--blue))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-d)", fontSize: "0.9rem", fontWeight: "700", flexShrink: 0 }}>
            {ini}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.84rem", fontWeight: 500 }}>{c.fullName || "—"}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{c.email || ""}</div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{t}</div>
        </div>
      );
    });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const [historyOpen, setHistoryOpen] = useState(true);

  return (
    <div className="dashboard-grid animate-in">
      <div className="panel animate-in">
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(191,90,242,0.1)', color: 'var(--purple)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-sign-in-alt"></i>
            </div>
            <span className="pt">Odbavenie vstupu</span>
          </div>
          <span className="method m-purple">API: CHECKIN_SCAN</span>
        </div>
        <div className="pb">
          {/* Tabs */}
          <div className="checkin-tabs" style={{ background: 'var(--surface2)', padding: '0.4rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '0.4rem' }}>
            <button 
              className={`ctab ${activeTab === "qr" ? "active" : ""}`} 
              onClick={() => setActiveTab("qr")}
              style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none', background: activeTab === 'qr' ? 'var(--purple)' : 'transparent', color: activeTab === 'qr' ? '#fff' : 'var(--muted)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', transition: 'all 0.2s' }}
            >
              <i className="fas fa-qrcode"></i> QR SKENER
            </button>
            <button 
              className={`ctab ${activeTab === "name" ? "active" : ""}`}
              onClick={() => setActiveTab("name")}
              style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none', background: activeTab === 'name' ? 'var(--purple)' : 'transparent', color: activeTab === 'name' ? '#fff' : 'var(--muted)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', transition: 'all 0.2s' }}
            >
              <i className="fas fa-search"></i> MANUÁLNE
            </button>
          </div>

          {/* QR Tab */}
          {activeTab === "qr" && (
            <div className="animate-in">
              <div className="fg">
                <label className="fl">QR kód / Identifikátor</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-barcode" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
                  <input 
                    className="fi" 
                    type="text" 
                    placeholder="Zadajte kód alebo skenujte..." 
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && processCheckin(qrInput, null)}
                    style={{ paddingLeft: '2.8rem', borderRadius: '10px', height: '52px', fontSize: '1rem' }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.5rem" }}>
                <button className="btn btn-purple" onClick={() => processCheckin(qrInput, null)} style={{ flex: 1, height: '52px', borderRadius: '10px', fontWeight: 800 }}>
                  <i className="fas fa-sign-in-alt" style={{marginRight: '0.6rem'}}></i> OVERIŤ VSTUP
                </button>
                <button className={`btn ${cameraStream ? 'btn-red' : 'btn-ghost'}`} onClick={toggleCamera} style={{ borderRadius: '10px', width: '52px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fas fa-${cameraStream ? 'times' : 'camera'}`}></i>
                </button>
              </div>
              
              {/* Camera Wrap */}
              {cameraStream && (
                <div className="animate-in" style={{ marginTop: "0.8rem", background: "#000", border: "1px solid var(--purple)", borderRadius: "16px", overflow: "hidden", position: "relative", boxShadow: '0 0 30px rgba(191,90,242,0.2)' }}>
                  <video ref={videoRef} style={{ width: "100%", display: "block", maxHeight: "350px", objectFit: "cover" }} autoPlay playsInline muted></video>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <div style={{ width: "240px", height: "240px", border: "2px solid var(--purple)", borderRadius: "20px", boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)", position: "relative", overflow: "hidden" }}>
                      <div className="camera-scanning" style={{ position: "absolute", left: 0, width: "100%", height: "2px", background: "linear-gradient(90deg,transparent,var(--purple),transparent)", animation: "scan 2s linear infinite", boxShadow: '0 0 15px var(--purple)' }}></div>
                    </div>
                  </div>
                  <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
                    <button className="btn btn-red btn-xs" onClick={stopCamera} style={{borderRadius: '20px', padding: '0.4rem 0.8rem'}}><i className="fas fa-times"></i></button>
                  </div>
                  <div style={{ position: "absolute", bottom: "1rem", left: 0, right: 0, textAlign: "center", fontSize: "0.7rem", color: "#fff", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <i className="fas fa-sync fa-spin" style={{marginRight: '0.5rem'}}></i> Hľadám QR kód...
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Name Tab */}
          {activeTab === "name" && (
            <div className="animate-in">
              <div className="fg">
                <label className="fl">Search Client Database</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-user-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
                  <input 
                    className="fi" 
                    type="text" 
                    placeholder="Meno, priezvisko alebo email..." 
                    value={nameSearch}
                    onChange={(e) => handleNameSearch(e.target.value)}
                    style={{ paddingLeft: '2.8rem', borderRadius: '10px' }}
                  />
                </div>
              </div>
              <div className="name-results" style={{ background: 'rgba(255,255,255,0.02)', border: "1px solid var(--border)", borderRadius: "12px", maxHeight: "250px", overflowY: "auto", padding: '0.5rem' }}>
                {nameSearch.length < 2 ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
                    <i className="fas fa-keyboard" style={{display: 'block', marginBottom: '0.5rem', opacity: 0.2}}></i>
                    Zadajte aspoň 2 znaky pre vyhľadávanie
                  </div>
                ) : nameResults.length === 0 ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
                    Nenašli sa žiadne výsledky
                  </div>
                ) : (
                  nameResults.map((m, idx) => (
                    <div 
                      key={idx} 
                      style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.8rem 1rem", borderRadius: '8px', cursor: "pointer", transition: "all 0.2s", marginBottom: '4px' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateX(5px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; }}
                      onClick={() => doCheckinById(m.id, m.fullName)}
                    >
                      <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, var(--purple), var(--blue))", border: '1px solid rgba(255,255,255,0.1)', display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-d)", fontSize: "0.85rem", fontWeight: "900", color: "#fff", flexShrink: 0 }}>
                        {m.avatarUrl ? <img src={m.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "10px", objectFit: "cover" }} /> : getInitials(m.fullName)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.92rem", fontWeight: 800 }}>{m.fullName || "—"}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{m.email || ""}</div>
                      </div>
                      <span className={`badge ${m.active ? "b-acid" : "b-frozen"}`} style={{ fontSize: "0.6rem" }}>
                        {m.active ? "AKTÍVNY" : "ZMRAZENÝ"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Results Display */}
          {checkinResult && (
            <div className={`checkin-result ${checkinResult.type} animate-in`} style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: '16px', border: '1px solid', borderColor: checkinResult.type === 'ok' ? 'rgba(200,255,0,0.2)' : 'rgba(255,45,85,0.2)', background: checkinResult.type === 'ok' ? 'rgba(200,255,0,0.05)' : 'rgba(255,45,85,0.05)' }}>
              {checkinResult.type === "ok" ? (
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                   <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--acid)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                    <i className="fas fa-check"></i>
                   </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-d)", fontSize: "1.6rem", fontWeight: 900, color: "var(--acid)", textTransform: 'uppercase', lineHeight: 1 }}>
                      Vstup povolený
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: "0.3rem" }}>
                      {checkinResult.data.fullName || "Člen"}
                    </div>
                    <div style={{ display: "flex", gap: '0.8rem', marginTop: "0.8rem" }}>
                      <span className="badge b-acid" style={{borderRadius: '4px'}}>
                         {checkinResult.mem.membershipTypeName || "Paušál"}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                        Zostatok: <b>{checkinResult.mem.daysRemaining} dní</b>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                   <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
                    <i className="fas fa-times"></i>
                   </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-d)", fontSize: "1.6rem", fontWeight: 900, color: "var(--red)", textTransform: 'uppercase', lineHeight: 1 }}>
                      Vstup zamietnutý
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 400, marginTop: "0.3rem", color: 'var(--muted)' }}>
                      Pre: {checkinResult.name}
                    </div>
                    <div style={{ fontSize: "0.88rem", color: "var(--red)", marginTop: "0.6rem", fontWeight: 600 }}>
                      <i className="fas fa-ban"></i> {checkinResult.msg}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <div className="panel animate-in" style={{ animationDelay: '0.1s' }}>
        <div className="ph" onClick={() => setHistoryOpen(!historyOpen)} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(0,255,209,0.1)', color: 'var(--acid2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-history"></i>
            </div>
            <span className="pt">História dnes</span>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            {historyOpen && (
              <button 
                className="btn btn-ghost btn-xs" 
                onClick={(e) => { e.stopPropagation(); loadTodayCheckins(); }}
                style={{ borderRadius: '6px' }}
              >
                OBNOVIŤ <i className="fas fa-sync-alt"></i>
              </button>
            )}
            <i className={`fas fa-chevron-${historyOpen ? 'up' : 'down'}`} style={{ color: 'var(--muted)', fontSize: '0.9rem' }}></i>
          </div>
        </div>
        {historyOpen && (
          <div className="pb animate-in" style={{ maxHeight: "650px", overflowY: "auto" }}>
            {renderTodayCheckins()}
          </div>
        )}
      </div>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}

      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}
