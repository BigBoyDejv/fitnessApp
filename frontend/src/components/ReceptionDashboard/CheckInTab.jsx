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

  return (
    <div className="grid-2">
      <div className="panel">
        <div className="ph">
          <span className="pt">Check-in člena</span>
          <span className="method m-purple">POST /api/checkin/scan</span>
        </div>
        <div className="pb">
          {/* Tabs */}
          <div className="checkin-tabs">
            <button 
              className={`ctab ${activeTab === "qr" ? "active" : ""}`} 
              onClick={() => setActiveTab("qr")}
            >
              <i className="fas fa-qrcode"></i> QR skener
            </button>
            <button 
              className={`ctab ${activeTab === "name" ? "active" : ""}`}
              onClick={() => setActiveTab("name")}
            >
              <i className="fas fa-search"></i> Podľa mena
            </button>
          </div>

          {/* QR Tab */}
          {activeTab === "qr" && (
            <div>
              <div className="fg">
                <label className="fl">QR kód / ID člena</label>
                <input 
                  className="fi" 
                  type="text" 
                  placeholder="Naskenuj alebo zadaj ručne..." 
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && processCheckin(qrInput, null)}
                  style={{ fontSize: "1rem", padding: "0.9rem" }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.8rem" }}>
                <button className="btn btn-purple" onClick={() => processCheckin(qrInput, null)} style={{ flex: 1 }}>
                  <i className="fas fa-sign-in-alt"></i> Potvrdiť vstup
                </button>
                <button className="btn btn-ghost" onClick={toggleCamera}>
                  {!scanningActive ? <><i className="fas fa-camera"></i> Skener</> : <><i className="fas fa-camera" style={{ color: "var(--purple)" }}></i> Aktívny</>}
                </button>
              </div>
              
              {/* Camera Wrap */}
              {cameraStream && (
                <div style={{ marginTop: "0.8rem", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
                  <video ref={videoRef} style={{ width: "100%", display: "block", maxHeight: "320px", objectFit: "cover" }} autoPlay playsInline muted></video>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <div style={{ width: "260px", height: "260px", border: "3px solid var(--purple)", borderRadius: "8px", boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)", position: "relative", overflow: "hidden" }}>
                      <div className="camera-scanning" style={{ position: "absolute", left: '50%', transform: "translate(-50%,-50%)", width: "196px", height: "2px", background: "linear-gradient(90deg,transparent,var(--purple),transparent)", animation: "scan 2s linear infinite" }}></div>
                    </div>
                  </div>
                  <div style={{ position: "absolute", top: "0.6rem", right: "0.6rem" }}>
                    <button className="btn btn-red btn-sm" onClick={stopCamera}><i className="fas fa-times"></i> Zatvoriť</button>
                  </div>
                  <div style={{ position: "absolute", bottom: "0.6rem", left: 0, right: 0, textAlign: "center", fontSize: "0.72rem", color: "rgba(255,255,255,0.7)" }}>
                    <i className="fas fa-info-circle"></i> Namier kameru na QR kód člena
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Name Tab */}
          {activeTab === "name" && (
            <div>
              <div className="fg">
                <label className="fl">Hľadaj podľa mena alebo emailu</label>
                <input 
                  className="fi" 
                  type="text" 
                  placeholder="Zadaj meno alebo email..." 
                  value={nameSearch}
                  onChange={(e) => handleNameSearch(e.target.value)}
                />
              </div>
              <div className="name-results" style={{ border: "1px solid var(--border)", borderRadius: "4px", maxHeight: "220px", overflowY: "auto" }}>
                {nameSearch.length < 2 ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "var(--muted)", fontSize: "0.82rem" }}>
                    Začni písať meno... (min 2 znaky)
                  </div>
                ) : nameResults.length === 0 ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "var(--muted)", fontSize: "0.82rem" }}>
                    Žiadny člen nenájdený
                  </div>
                ) : (
                  nameResults.map((m, idx) => (
                    <div 
                      key={idx} 
                      style={{ display: "flex", alignItems: "center", gap: "0.8rem", padding: "0.7rem 0.9rem", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(191,90,242,0.08)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      onClick={() => doCheckinById(m.id, m.fullName)}
                    >
                      <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg, var(--purple), var(--blue))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-d)", fontSize: "0.8rem", fontWeight: "700", color: "#fff", flexShrink: 0 }}>
                        {m.avatarUrl ? <img src={m.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : getInitials(m.fullName)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{m.fullName || "—"}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{m.email || ""}</div>
                      </div>
                      <span className={`badge ${m.active ? "b-acid" : "b-frozen"}`} style={{ fontSize: "0.6rem" }}>
                        {m.active ? "Aktívny" : "Zmrazený"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Results Display */}
          {checkinResult && (
            <div className={`checkin-result ${checkinResult.type}`}>
              {checkinResult.type === "ok" ? (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <i className="fas fa-check-circle" style={{ fontSize: "2.5rem", color: "var(--acid)" }}></i>
                  <div>
                    <div style={{ fontFamily: "var(--font-d)", fontSize: "1.4rem", fontWeight: 900, color: "var(--acid)" }}>
                      {checkinResult.data.fullName || "Člen"}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                      {checkinResult.data.email || ""}
                    </div>
                    <div style={{ marginTop: "0.5rem" }}>
                      <span className="badge b-acid">
                        <i className="fas fa-id-card"></i> {checkinResult.mem.membershipTypeName || "Permanentka"}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "0.5rem" }}>
                        {checkinResult.mem.daysRemaining} dní zostatok
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <i className="fas fa-times-circle" style={{ fontSize: "2.5rem", color: "var(--red)" }}></i>
                  <div>
                    <div style={{ fontFamily: "var(--font-d)", fontSize: "1.2rem", fontWeight: 900, color: "var(--red)" }}>
                      Vstup zamietnutý
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                      {checkinResult.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--red)", marginTop: "0.3rem" }}>
                      <i className="fas fa-exclamation-triangle"></i> {checkinResult.msg}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <div className="panel">
        <div className="ph">
          <span className="pt">Vstupy dnes</span>
          <button className="btn btn-ghost btn-sm" onClick={loadTodayCheckins}>
            <i className="fas fa-sync-alt"></i> Obnoviť
          </button>
        </div>
        <div className="pb" style={{ maxHeight: "600px", overflowY: "auto" }}>
          {renderTodayCheckins()}
        </div>
      </div>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}

      <style>{`
        @keyframes scan {
          0% { top: calc(50% - 98px); }
          100% { top: calc(50% + 98px); }
        }
      `}</style>
    </div>
  );
}
