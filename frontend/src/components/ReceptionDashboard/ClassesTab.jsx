import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../utils/api";

export default function ClassesTab() {
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/api/classes");
      if (res.ok) {
        const data = await res.json();
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        setClasses(sorted);
        applyFilters(sorted, search, timeFilter);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data, q, f) => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tmr = new Date(today);
    tmr.setDate(today.getDate() + 1);

    const filtered = data.filter((c) => {
      const matchQ = !q || (c.name || "").toLowerCase().includes(q.toLowerCase()) || (c.instructor || "").toLowerCase().includes(q.toLowerCase());
      const d = new Date(c.startTime);
      const matchF = !f || (f === "today" && d >= today && d < tmr) || (f === "upcoming" && d >= now);
      return matchQ && matchF;
    });
    setFilteredClasses(filtered);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    applyFilters(classes, e.target.value, timeFilter);
  };

  const handleFilterChange = (e) => {
    setTimeFilter(e.target.value);
    applyFilters(classes, search, e.target.value);
  };

  const fmtTime = (dt) => {
    return dt ? new Date(dt).toLocaleString("sk-SK", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
  };

  return (
    <div className="panel">
      <div className="ph" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <span className="pt">Rozvrh lekcií</span>
        <div style={{ display: "flex", gap: "0.7rem", alignItems: "center", flexWrap: "wrap" }}>
          <span className="method m-get">GET /api/classes</span>
          <button className="btn btn-ghost btn-sm" onClick={loadClasses}>
            <i className="fas fa-sync-alt"></i> Obnoviť
          </button>
        </div>
      </div>
      <div className="pb">
        <div className="search-bar" style={{ display: "flex", gap: "0.7rem", marginBottom: "1rem" }}>
          <input 
            className="fi" 
            type="text" 
            placeholder="Hľadaj lekciu alebo trénera..." 
            value={search}
            onChange={handleSearchChange}
            style={{ flex: 1 }}
          />
          <select 
            className="fi" 
            value={timeFilter}
            onChange={handleFilterChange}
            style={{ maxWidth: "160px" }}
          >
            <option value="">Všetky</option>
            <option value="today">Dnes</option>
            <option value="upcoming">Nadchádzajúce</option>
          </select>
        </div>
        
        {loading ? (
          <div className="empty-state"><span className="spinner"></span></div>
        ) : filteredClasses.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-times"></i>
            <p>Žiadne lekcie</p>
          </div>
        ) : (
          <table className="dt">
            <thead>
              <tr>
                <th>Lekcia</th>
                <th>Tréner</th>
                <th>Čas</th>
                <th>Miesto</th>
                <th>Obsadenosť</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map(c => {
                const b = c.booked || 0;
                const cap = c.capacity || 0;
                const pct = cap ? Math.round((b / cap) * 100) : 0;
                const bc = pct >= 90 ? "var(--red)" : pct >= 60 ? "var(--orange)" : "var(--acid)";
                
                const isPast = new Date(c.startTime) < new Date();
                const d = new Date(c.startTime);
                const t = new Date();
                const isToday = d.toDateString() === t.toDateString();

                return (
                  <tr key={c.id}>
                    <td><b>{c.name || "—"}</b></td>
                    <td style={{ color: "var(--muted)" }}>{c.instructor || "—"}</td>
                    <td style={{ color: "var(--muted)" }}>{fmtTime(c.startTime)}</td>
                    <td>
                      <span className="badge b-grey">{c.location || "—"}</span>
                    </td>
                    <td>
                      <div className="occ-bar">
                        <div className="occ-track">
                          <div className="occ-fill" style={{ width: `${pct}%`, background: bc }}></div>
                        </div>
                        <span style={{ fontSize: "0.73rem", color: "var(--muted)" }}>{b}/{cap || "—"}</span>
                      </div>
                    </td>
                    <td>
                      {isPast ? (
                        <span className="badge b-grey">Prebehla</span>
                      ) : isToday ? (
                        <span className="badge b-purple">Dnes</span>
                      ) : (
                        <span className="badge b-acid">Nadchádzajúca</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
