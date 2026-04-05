import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../utils/api";
import Toast from "../Toast";

export default function MembersTab() {
  const [allMembers, setAllMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const [membershipTypes, setMembershipTypes] = useState([]);
  const [freezeSelect, setFreezeSelect] = useState("");
  
  const [assignMember, setAssignMember] = useState("");
  const [assignType, setAssignType] = useState("");
  const [assignDate, setAssignDate] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerMembership, setDrawerMembership] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    loadMembers();
    loadMembershipTypes();
  }, []);

  const loadMembers = async () => {
    try {
      const res = await authenticatedFetch("/api/admin/profiles");
      if (res.ok) {
        let data = await res.json();
        data = Array.isArray(data) ? data.filter(m => m.role === "member") : [];
        setAllMembers(data);
        applyFilters(data, search, statusFilter);
      }
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  const loadMembershipTypes = async () => {
    try {
      const res = await authenticatedFetch("/api/memberships/types");
      if (res.ok) {
        setMembershipTypes(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const applyFilters = (members, q, status) => {
    const lowerQ = q.toLowerCase();
    const filtered = members.filter(m => {
      const matchQ = !q || (m.fullName || "").toLowerCase().includes(lowerQ) || (m.email || "").toLowerCase().includes(lowerQ);
      const matchS = !status || (status === "active" && m.active) || (status === "frozen" && !m.active);
      return matchQ && matchS;
    });
    setFilteredMembers(filtered);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    applyFilters(allMembers, e.target.value, statusFilter);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    applyFilters(allMembers, search, e.target.value);
  };

  const showToast = (msg, type = "ok") => {
    setToastMsg({ msg, type });
  };

  const setMemberStatus = async (isActive) => {
    const id = freezeSelect;
    if (!id) return showToast("Vyber člena", "err");
    
    const u = allMembers.find(m => m.id === id);
    if (!isActive && !window.confirm(`Zmraziť účet pre ${u?.fullName}?`)) return;

    try {
      const res = await authenticatedFetch(`/api/admin/profiles/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ active: isActive })
      });
      if (!res.ok) throw new Error("Chyba zmeny stavu");
      
      showToast(isActive ? "Účet aktivovaný" : "Účet zmrazený", isActive ? "ok" : "err");
      loadMembers();
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  const assignMembership = async () => {
    if (!assignMember) return showToast("Vyber člena", "err");
    if (!assignType) return showToast("Vyber typ členstva", "err");

    try {
      const res = await authenticatedFetch("/api/admin/memberships/assign", {
        method: "POST",
        body: JSON.stringify({
          userId: assignMember,
          membershipTypeId: parseInt(assignType),
          startDate: assignDate || null
        })
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Chyba");
      }
      showToast("Permanentka priradená", "ok");
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  };

  const openDrawer = async (userId) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerUser(null);
    setDrawerMembership(null);

    try {
      const res = await authenticatedFetch(`/api/users/${userId}`);
      if (res.ok) {
        setDrawerUser(await res.json());
      }
      
      const resM = await authenticatedFetch(`/api/admin/memberships/user/${userId}`);
      if (resM.ok) {
        setDrawerMembership(await resM.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDrawerLoading(false);
    }
  };

  const quickToggleStatus = async (id, currentActive) => {
    try {
      const res = await authenticatedFetch(`/api/admin/profiles/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ active: !currentActive })
      });
      if (res.ok) {
        showToast(!currentActive ? "Účet aktivovaný" : "Účet zmrazený", !currentActive ? "ok" : "err");
        setDrawerOpen(false);
        loadMembers();
      } else {
        showToast("Chyba zmeny stavu", "err");
      }
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  return (
    <div>
      <div className="panel">
        <div className="ph" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <span className="pt">Členovia</span>
          <div style={{ display: "flex", gap: "0.7rem", alignItems: "center", flexWrap: "wrap" }}>
            <span className="method m-get">GET /api/admin/profiles</span>
            <button className="btn btn-ghost btn-sm" onClick={loadMembers}>
              <i className="fas fa-sync-alt"></i> Obnoviť
            </button>
          </div>
        </div>
        <div className="pb">
          <div className="search-bar" style={{ display: "flex", gap: "0.7rem", marginBottom: "1rem" }}>
            <input 
              className="fi" 
              type="text" 
              placeholder="Hľadaj meno alebo email..." 
              value={search}
              onChange={handleSearchChange}
              style={{ flex: 1 }}
            />
            <select 
              className="fi" 
              value={statusFilter}
              onChange={handleStatusChange}
              style={{ maxWidth: "160px" }}
            >
              <option value="">Všetci</option>
              <option value="active">Aktívni</option>
              <option value="frozen">Zmrazení</option>
            </select>
          </div>
          
          <div>
            {filteredMembers.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-users"></i>
                <p>Žiadni členovia</p>
              </div>
            ) : (
            <table className="dt">
              <thead>
                <tr>
                  <th>Meno</th>
                  <th>Email</th>
                  <th>Telefón</th>
                  <th>Stav</th>
                  <th>Akcie</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(m => (
                  <tr key={m.id} className={!m.active ? "frozen-row" : ""}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div className="avatar">
                          {m.avatarUrl ? <img src={m.avatarUrl} alt="" /> : getInitials(m.fullName)}
                        </div>
                        <b>{m.fullName || "—"}</b>
                      </div>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{m.email || "—"}</td>
                    <td style={{ color: "var(--muted)" }}>{m.phone || "—"}</td>
                    <td>
                      {m.active ? <span className="badge b-acid">Aktívny</span> : <span className="badge b-frozen"><i className="fas fa-snowflake"></i> Zmrazený</span>}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openDrawer(m.id)}>
                        <i className="fas fa-eye"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="ph">
            <span className="pt">Správa prístupu</span>
            <span className="method m-put">PUT /api/admin/.../status</span>
          </div>
          <div className="pb">
            <div className="frozen-banner">
              <i className="fas fa-snowflake"></i> <b>Zmrazený účet</b> = používateľ sa nevie prihlásiť.
            </div>
            <div className="fg" style={{ marginBottom: "1rem" }}>
              <label className="fl" style={{ display: "block", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.3rem" }}>Vyber člena</label>
              <select className="fi" value={freezeSelect} onChange={(e) => setFreezeSelect(e.target.value)}>
                <option value="">— vyber člena —</option>
                {allMembers.map(m => <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button className="btn btn-cyan" onClick={() => setMemberStatus(true)}>
                <i className="fas fa-user-check"></i> Aktivovať
              </button>
              <button className="btn btn-frozen" onClick={() => setMemberStatus(false)}>
                <i className="fas fa-snowflake"></i> Zmraziť
              </button>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="ph">
            <span className="pt">Priradiť permanentku</span>
            <span className="method m-purple">POST /api/admin/memberships/assign</span>
          </div>
          <div className="pb">
            <div className="fg" style={{ marginBottom: "1rem" }}>
              <label className="fl" style={{ display: "block", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.3rem" }}>Vyber člena</label>
              <select className="fi" value={assignMember} onChange={(e) => setAssignMember(e.target.value)}>
                <option value="">— vyber člena —</option>
                {allMembers.map(m => <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>)}
              </select>
            </div>
            <div className="fg" style={{ marginBottom: "1rem" }}>
              <label className="fl" style={{ display: "block", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.3rem" }}>Typ členstva</label>
              <select className="fi" value={assignType} onChange={(e) => setAssignType(e.target.value)}>
                <option value="">— načítavam... —</option>
                {membershipTypes.map(t => <option key={t.id} value={t.id}>{t.name} — {(t.priceCents / 100).toFixed(2)} €</option>)}
              </select>
            </div>
            <div className="fg" style={{ marginBottom: "1rem" }}>
              <label className="fl" style={{ display: "block", fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.3rem" }}>Dátum začiatku (voliteľné)</label>
              <input className="fi" type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} />
            </div>
            <button className="btn btn-acid" onClick={assignMembership}>
              <i className="fas fa-id-card"></i> Priradiť permanentku
            </button>
          </div>
        </div>
      </div>

      {/* Drawer Overlay */}
      <div 
        className={`drawer-overlay ${drawerOpen ? "open" : ""}`} 
        onClick={() => setDrawerOpen(false)} 
      ></div>
      
      {/* Drawer Content */}
      <div className={`drawer ${drawerOpen ? "open" : ""}`}>
        <div className="drawer-head">
          <h3>{drawerUser ? drawerUser.fullName : "Detail profilu"}</h3>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="drawer-body">
          {drawerLoading ? (
            <div className="empty-state"><span className="spinner"></span></div>
          ) : drawerUser ? (
            <>
              <div className="drawer-section">
                <div className="drawer-section-title">Základné info</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.15rem" }}>Meno</div>
                    <div style={{ fontSize: "0.85rem" }}>{drawerUser.fullName || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.15rem" }}>Email</div>
                    <div style={{ fontSize: "0.78rem" }}>{drawerUser.email || "—"}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.15rem" }}>Telefón</div>
                    <div style={{ fontSize: "0.83rem" }}>{drawerUser.phone || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.15rem" }}>Stav</div>
                    <div>{drawerUser.active ? <span className="badge b-acid">Aktívny</span> : <span className="badge b-frozen"><i className="fas fa-snowflake"></i> Zmrazený</span>}</div>
                  </div>
                </div>
              </div>

              <div className="drawer-section">
                <div className="drawer-section-title">Predplatné</div>
                {drawerMembership ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "1rem" }}>
                      <div>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.15rem" }}>Typ</div>
                        <div style={{ fontSize: "0.83rem" }}>{drawerMembership.membershipTypeName || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.15rem" }}>Status</div>
                        <span className={`badge ${drawerMembership.status === 'active' ? 'b-acid' : 'b-red'}`}>{drawerMembership.status}</span>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                      <div>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.15rem" }}>Platí do</div>
                        <div style={{ fontSize: "0.83rem" }}>{drawerMembership.endDate || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.15rem" }}>Zostatok</div>
                        <div style={{ fontSize: "0.83rem" }}>{drawerMembership.daysRemaining} dní</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: "var(--muted)", fontSize: "0.83rem" }}>Žiadne aktívne predplatné</div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state"><p>Chyba načítania používateľa</p></div>
          )}
        </div>

        <div className="drawer-actions">
          {drawerUser && (
             <button 
               className={`btn ${drawerUser.active ? 'btn-frozen' : 'btn-cyan'} btn-block`} 
               onClick={() => quickToggleStatus(drawerUser.id, drawerUser.active)}
             >
               <i className={`fas ${drawerUser.active ? 'fa-snowflake' : 'fa-user-check'}`}></i> {drawerUser.active ? 'Zmraziť účet' : 'Aktivovať účet'}
             </button>
          )}
        </div>
      </div>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
