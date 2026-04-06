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
  const [listOpen, setListOpen] = useState(true);

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
        <div className="ph" style={{ flexWrap: "wrap", gap: "0.5rem", cursor: 'pointer' }} onClick={() => setListOpen(!listOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)', color: 'var(--text)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-users"></i>
            </div>
            <span className="pt">Aktívni členovia systému</span>
          </div>
          <div style={{ display: "flex", gap: "0.7rem", alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); loadMembers(); }}>
              <i className="fas fa-sync-alt"></i> OBNOVIŤ
            </button>
            <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--muted)', transition: 'all 0.3s', transform: listOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}>
               <i className="fas fa-chevron-up"></i>
            </div>
          </div>
        </div>
        {listOpen && (
        <div className="pb" style={{ animation: 'slideDown 0.3s ease' }}>
          <div className="search-bar" style={{ display: "flex", gap: "0.7rem", marginBottom: "1rem", background: 'rgba(0,0,0,0.1)', padding: '0.6rem', borderRadius: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
              <input 
                className="fi" 
                type="text" 
                placeholder="Hľadať meno, email alebo ID člena..." 
                value={search}
                onChange={handleSearchChange}
                style={{ paddingLeft: '2.8rem', borderRadius: '10px' }}
              />
            </div>
            <select 
              className="fi" 
              value={statusFilter}
              onChange={handleStatusChange}
              style={{ maxWidth: "160px", borderRadius: '10px' }}
            >
              <option value="">Všetci členovia</option>
              <option value="active">Len aktívni</option>
              <option value="frozen">Len zmrazení</option>
            </select>
          </div>
          
          <div>
            {filteredMembers.length === 0 ? (
              <div className="empty-state" style={{ padding: '4rem' }}>
                <i className="fas fa-user-slash" style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '1rem' }}></i>
                <p style={{ opacity: 0.5 }}>Žiadni členovia nezodpovedajú filtrom</p>
              </div>
            ) : (
            <table className="dt">
              <thead>
                <tr>
                  <th>Meno klienta</th>
                  <th>Kontaktné údaje</th>
                  <th>Stav účtu</th>
                  <th style={{ textAlign: 'right' }}>Akcie</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(m => (
                  <tr key={m.id} className={!m.active ? "frozen-row" : ""} style={{ transition: 'all 0.2s' }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        <div className="avatar" style={{ border: m.active ? '2px solid var(--acid)' : '2px solid var(--border)' }}>
                          {m.avatarUrl ? <img src={m.avatarUrl} alt="" /> : getInitials(m.fullName)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{m.fullName || "—"}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID: {m.id.substring(0,8)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{m.email}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{m.phone || "Bez telefónu"}</div>
                    </td>
                    <td>
                      {m.active ? (
                        <span className="badge b-acid" style={{ fontSize: '0.65rem' }}>AKTÍVNY</span>
                      ) : (
                        <span className="badge b-frozen" style={{ fontSize: '0.65rem' }}><i className="fas fa-snowflake"></i> ZMRAZENÝ</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openDrawer(m.id)} style={{ borderRadius: '8px' }}>
                        <i className="fas fa-id-card"></i> PROFIL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
        )}
      </div>

      <div className="grid-2 animate-in" style={{ animationDelay: '0.1s' }}>
        {/* Správa prístupu */}
        <div className="panel" style={{ border: '1px solid rgba(0,210,255,0.1)' }}>
          <div className="ph" style={{ borderBottom: '1px solid rgba(0,210,255,0.05)', background: 'rgba(0,210,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(0,210,255,0.1)', color: 'var(--cyan)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-shield-alt"></i>
              </div>
              <span className="pt">Ochrana a prístup</span>
            </div>
            <span className="method m-put">PROFILES_STATUS</span>
          </div>
          <div className="pb" style={{ padding: '1.5rem' }}>
            <div className="glass" style={{ padding: '0.8rem 1rem', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
               <i className="fas fa-info-circle" style={{ color: 'var(--cyan)', fontSize: '1rem' }}></i>
               <div><b>Zmrazenie účtu</b> okamžite znemožní používateľovi prihlásiť sa do aplikácie a vstupovať do fitka.</div>
            </div>
            
            <div className="fg" style={{ marginBottom: "1.2rem" }}>
              <label className="fl" style={{ fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: "0.4rem" }}>Hľadaný užívateľ</label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-user-tag" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}></i>
                <select className="fi" value={freezeSelect} onChange={(e) => setFreezeSelect(e.target.value)} style={{ paddingLeft: '2.8rem', borderRadius: '10px', height: '48px' }}>
                  <option value="">— vyberte člena zo zoznamu —</option>
                  {allMembers.map(m => <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                className="btn btn-cyan btn-block" 
                onClick={() => setMemberStatus(true)}
                style={{ flex: 1, height: '48px', borderRadius: '10px', fontWeight: 800, gap: '0.6rem' }}
              >
                <i className="fas fa-user-check"></i> AKTIVOVAŤ VSTUP
              </button>
              <button 
                className="btn btn-frozen btn-block" 
                onClick={() => setMemberStatus(false)}
                style={{ flex: 1, height: '48px', borderRadius: '10px', fontWeight: 800, gap: '0.6rem' }}
              >
                <i className="fas fa-snowflake"></i> ZMRAZIŤ ÚČET
              </button>
            </div>
          </div>
        </div>

        {/* Priradiť permanentku */}
        <div className="panel" style={{ border: '1px solid rgba(179,0,255,0.1)' }}>
          <div className="ph" style={{ borderBottom: '1px solid rgba(179,0,255,0.05)', background: 'rgba(179,0,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(179,0,255,0.1)', color: 'var(--purple)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-id-card"></i>
              </div>
              <span className="pt">Nové predplatné</span>
            </div>
            <span className="method m-purple">MEMBERSHIPS_ASSIGN</span>
          </div>
          <div className="pb" style={{ padding: '1.5rem' }}>
            <div className="fg" style={{ marginBottom: "1.2rem" }}>
              <label className="fl" style={{ fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: "0.4rem" }}>Vyberte člena</label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-user-plus" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}></i>
                <select className="fi" value={assignMember} onChange={(e) => setAssignMember(e.target.value)} style={{ paddingLeft: '2.8rem', borderRadius: '10px', height: '44px' }}>
                  <option value="">— vyhľadajte užívateľa —</option>
                  {allMembers.map(m => <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="fg">
                <label className="fl" style={{ fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: "0.4rem" }}>Typ členstva</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-tags" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}></i>
                  <select className="fi" value={assignType} onChange={(e) => setAssignType(e.target.value)} style={{ paddingLeft: '2.8rem', borderRadius: '10px', height: '44px' }}>
                    <option value="">— ponuka služieb —</option>
                    {membershipTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({(t.priceCents / 100).toFixed(2)} €)</option>)}
                  </select>
                </div>
              </div>
              <div className="fg">
                <label className="fl" style={{ fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: "0.4rem" }}>Začiatok (dnes?)</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-calendar-day" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}></i>
                  <input className="fi" type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} style={{ paddingLeft: '2.8rem', borderRadius: '10px', height: '44px' }} />
                </div>
              </div>
            </div>

            <button className="btn btn-acid btn-block" onClick={assignMembership} style={{ height: '52px', borderRadius: '12px', fontWeight: 900, letterSpacing: '0.02em', gap: '0.8rem' }}>
              <i className="fas fa-id-card-alt" style={{ fontSize: '1.2rem' }}></i> PRIRADIŤ PERMANENTKU
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
