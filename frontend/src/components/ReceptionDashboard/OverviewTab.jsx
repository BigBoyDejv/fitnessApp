import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../utils/api";

export default function OverviewTab({ onNavigate }) {
  const [stats, setStats] = useState({
    checkins: "—",
    members: "—",
    classes: "—",
    revenue: "0,00 €",
    frozen: "—",
  });
  const [todayClasses, setTodayClasses] = useState([]);
  const [quickCheckinQr, setQuickCheckinQr] = useState("");
  const [quickCheckinResult, setQuickCheckinResult] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    setLoadingClasses(true);
    try {
      const [membersRes, classesRes, checkinsRes, salesRes] = await Promise.all([
        authenticatedFetch("/api/admin/profiles").catch(() => null),
        authenticatedFetch("/api/classes").catch(() => null),
        authenticatedFetch("/api/checkin/today").catch(() => null),
        authenticatedFetch("/api/sales/today").catch(() => null),
      ]);

      let membersData = membersRes?.ok ? await membersRes.json() : [];
      let classesData = classesRes?.ok ? await classesRes.json() : [];
      let checkinsData = checkinsRes?.ok ? await checkinsRes.json() : [];
      let salesData = salesRes?.ok ? await salesRes.json() : { totalEuros: 0 };

      if (!Array.isArray(membersData)) membersData = [];
      if (!Array.isArray(classesData)) classesData = [];

      const activeMembersCount = membersData.filter((m) => m.active && m.role === "member").length;
      const frozenMembersCount = membersData.filter((m) => !m.active && m.role === "member").length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tmr = new Date(today);
      tmr.setDate(today.getDate() + 1);

      const todayCls = classesData.filter((c) => {
        const d = new Date(c.startTime);
        return d >= today && d < tmr;
      });

      setTodayClasses(todayCls);

      setStats({
        checkins: Array.isArray(checkinsData) ? checkinsData.length : 0,
        members: activeMembersCount,
        classes: todayCls.length,
        revenue: (salesData.totalEuros || 0).toFixed(2).replace(".", ",") + " €",
        frozen: frozenMembersCount,
      });
    } catch (e) {
      console.error("Error loading overview data:", e);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleQuickCheckin = async () => {
    const val = quickCheckinQr.trim();
    if (!val) return;

    try {
      // Very basic implementation, real details logic is in CheckInTab
      const resM = await authenticatedFetch(`/api/admin/memberships/user/${val}`);
      if (!resM.ok) {
        setQuickCheckinResult({
          type: "err",
          message: "Žiadna aktívna permanentka",
        });
        setTimeout(() => setQuickCheckinResult(null), 4000);
        return;
      }
      const mem = await resM.json();
      if (mem.status !== "active") {
        setQuickCheckinResult({
          type: "err",
          message: "Permanentka vypršala",
        });
        setTimeout(() => setQuickCheckinResult(null), 4000);
        return;
      }

      const res = await authenticatedFetch("/api/checkin/scan", {
        method: "POST",
        body: JSON.stringify({ userId: val }),
      });
      const d = await res.json();

      if (res.ok) {
        setQuickCheckinResult({
          type: "ok",
          message: `<b>${d.fullName || "Člen"}</b> — vstup potvrdený`,
        });
        setQuickCheckinQr("");
        // Refresh checkins KPI
        loadOverviewData();
      } else {
        setQuickCheckinResult({
          type: "err",
          message: d.message || "Chyba pri check-ine",
        });
      }
    } catch (e) {
      setQuickCheckinResult({
        type: "err",
        message: e.message || "Chyba zo siete",
      });
    }

    setTimeout(() => setQuickCheckinResult(null), 4000);
  };

  return (
    <div className="animate-in">
      {/* ── Reception Hero Section ─────────────────────────────────────── */}
      <div className="overview-hero reception">
        <div className="hero-content">
          <h1>Dobré ráno, Recepcia! 👋</h1>
          <p>Dnes je rušný deň. Nezabudnite skontrolovať členstvá pri vstupe.</p>
          <div className="hero-actions">
            <button className="btn btn-purple btn-sm" onClick={() => onNavigate("checkin")}>
              <i className="fas fa-qrcode"></i> Skenovať QR kód
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate("kasa")}>
              <i className="fas fa-cash-register"></i> Otvoriť kasu
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <i className="fas fa-id-card" />
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: "2.5rem", gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0s' }}>
          <div className="kpi-icon-v2" style={{ background: 'rgba(191,90,242,0.1)', color: 'var(--purple)' }}><i className="fas fa-sign-in-alt"></i></div>
          <div className="kpi-content-v2">
             <div className="kpi-label-v2">CHECK-IN DNES</div>
             <div className="kpi-value-v2">{stats.checkins}</div>
          </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.05s' }}>
          <div className="kpi-icon-v2" style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--acid)' }}><i className="fas fa-users"></i></div>
          <div className="kpi-content-v2">
             <div className="kpi-label-v2">AKTÍVNI ČLENOVIA</div>
             <div className="kpi-value-v2">{stats.members}</div>
          </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="kpi-icon-v2" style={{ background: 'rgba(0,255,209,0.1)', color: 'var(--acid2)' }}><i className="fas fa-calendar-check"></i></div>
          <div className="kpi-content-v2">
             <div className="kpi-label-v2">LEKCIE DNES</div>
             <div className="kpi-value-v2">{stats.classes}</div>
          </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.15s' }}>
          <div className="kpi-icon-v2" style={{ background: 'rgba(255,149,0,0.1)', color: 'var(--orange)' }}><i className="fas fa-euro-sign"></i></div>
          <div className="kpi-content-v2">
             <div className="kpi-label-v2">TRŽBA DNES</div>
             <div className="kpi-value-v2">{stats.revenue}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="panel animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="ph">
            <span className="pt">Rýchly check-in</span>
            <button className="btn btn-ghost btn-xs" onClick={() => onNavigate("checkin")}>
              SKENER <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          <div className="pb">
            <div className="fg" style={{ marginBottom: '0.5rem' }}>
              <label className="fl">QR kód / ID člena</label>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <input
                  className="fi"
                  type="text"
                  placeholder="Zadaj QR kód..."
                  value={quickCheckinQr}
                  onChange={(e) => setQuickCheckinQr(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuickCheckin()}
                  style={{ borderRadius: '8px' }}
                />
                <button className="btn btn-purple" onClick={handleQuickCheckin} style={{ borderRadius: '8px' }}>
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
            {quickCheckinResult && (
              <div className={`fm ${quickCheckinResult.type === 'ok' ? 'ok' : 'err'}`} style={{ borderRadius: '8px', padding: '0.8rem' }}>
                <i className={`fas ${quickCheckinResult.type === "ok" ? "fa-check-circle" : "fa-exclamation-triangle"}`}></i>{" "}
                <span dangerouslySetInnerHTML={{ __html: quickCheckinResult.message }}></span>
              </div>
            )}
            <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.8rem' }}>
              <i className="fas fa-info-circle"></i> Zadajte ID užívateľa alebo naskenujte kód.
            </p>
          </div>
        </div>

        <div className="panel animate-in" style={{ animationDelay: '0.2s' }}>
          <div className="ph">
            <span className="pt">Dnešné lekcie</span>
            <button className="btn btn-ghost btn-xs" onClick={loadOverviewData}>
              OBNOVIŤ <i className="fas fa-sync-alt"></i>
            </button>
          </div>
          <div className="pb" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {loadingClasses ? (
              <div className="empty-state"><span className="spinner"></span></div>
            ) : todayClasses.length === 0 ? (
              <div className="empty-state" style={{ padding: "1.5rem" }}>
                <i className="fas fa-calendar-times" style={{ opacity: 0.1 }}></i>
                <p>Žiadne lekcie dnes</p>
              </div>
            ) : (
              todayClasses.map((c, i) => {
                const b = c.booked || 0;
                const cap = c.capacity || 0;
                const pct = cap ? Math.round((b / cap) * 100) : 0;
                const bc = pct >= 90 ? "var(--red)" : pct >= 60 ? "var(--orange)" : "var(--acid)";

                return (
                  <div key={i} style={{ padding: "0.8rem", background: 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '0.6rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 800 }}>{c.name || "—"}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{c.instructor || 'Tím fitness'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: "0.85rem", color: "var(--text)", fontWeight: 700 }}>
                          {new Date(c.startTime).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: 'uppercase' }}>Štart</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                      <div className="occ-track" style={{ flex: 1, height: "6px", background: "var(--border2)", borderRadius: "3px", overflow: 'hidden' }}>
                        <div className="occ-fill" style={{ width: `${pct}%`, background: bc, height: "100%", transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, minWidth: '35px' }}>{b}/{cap}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
