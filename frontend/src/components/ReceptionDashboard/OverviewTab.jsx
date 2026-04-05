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
    <div>
      <div className="kpi-grid">
        <div className="kpi-card" style={{ "--kpi-color": "var(--purple)" }}>
          <div className="kpi-icon"><i className="fas fa-sign-in-alt"></i></div>
          <div className="kpi-val">{stats.checkins}</div>
          <div className="kpi-lbl">Check-in dnes</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "var(--acid)" }}>
          <div className="kpi-icon"><i className="fas fa-users"></i></div>
          <div className="kpi-val">{stats.members}</div>
          <div className="kpi-lbl">Aktívni členovia</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "var(--acid2)" }}>
          <div className="kpi-icon"><i className="fas fa-calendar-check"></i></div>
          <div className="kpi-val">{stats.classes}</div>
          <div className="kpi-lbl">Lekcie dnes</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "var(--orange)" }}>
          <div className="kpi-icon"><i className="fas fa-euro-sign"></i></div>
          <div className="kpi-val">{stats.revenue}</div>
          <div className="kpi-lbl">Tržba dnes</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "var(--red)" }}>
          <div className="kpi-icon"><i className="fas fa-snowflake"></i></div>
          <div className="kpi-val">{stats.frozen}</div>
          <div className="kpi-lbl">Zmrazené účty</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="ph">
            <span className="pt">Rýchly check-in</span>
            <button className="btn btn-purple btn-sm" onClick={() => onNavigate("checkin")}>
              <i className="fas fa-qrcode"></i> Otvoriť
            </button>
          </div>
          <div className="pb">
            <div className="fg">
              <label className="fl">QR kód / ID člena</label>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <input
                  className="fi"
                  type="text"
                  placeholder="Zadaj QR kód..."
                  value={quickCheckinQr}
                  onChange={(e) => setQuickCheckinQr(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuickCheckin()}
                />
                <button className="btn btn-purple" onClick={handleQuickCheckin}>
                  <i className="fas fa-sign-in-alt"></i>
                </button>
              </div>
            </div>
            {quickCheckinResult && (
              <div className={`fm ${quickCheckinResult.type === 'ok' ? 'ok' : 'err'}`}>
                <i className={`fas ${quickCheckinResult.type === "ok" ? "fa-check" : "fa-times"}`}></i>{" "}
                <span dangerouslySetInnerHTML={{ __html: quickCheckinResult.message }}></span>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <span className="pt">Dnešné lekcie</span>
            <button className="btn btn-ghost btn-sm" onClick={loadOverviewData}>
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
          <div className="pb">
            {loadingClasses ? (
              <div className="empty-state"><span className="spinner"></span></div>
            ) : todayClasses.length === 0 ? (
              <div className="empty-state" style={{ padding: "1.5rem" }}>
                <i className="fas fa-calendar-times"></i>
                <p>Žiadne lekcie dnes</p>
              </div>
            ) : (
              todayClasses.map((c, i) => {
                const b = c.booked || 0;
                const cap = c.capacity || 0;
                const pct = cap ? Math.round((b / cap) * 100) : 0;
                const bc = pct >= 90 ? "var(--red)" : pct >= 60 ? "var(--orange)" : "var(--acid)";
                
                return (
                  <div key={i} style={{ padding: "0.6rem 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <b style={{ fontSize: "0.85rem" }}>{c.name || "—"}</b>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {new Date(c.startTime).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div className="occ-track" style={{ flex: 1, height: "4px", background: "var(--border2)", borderRadius: "2px" }}>
                        <div className="occ-fill" style={{ width: `${pct}%`, background: bc, height: "4px", borderRadius: "2px" }}></div>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{b}/{cap}</span>
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
