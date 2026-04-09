import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  const activeCount = allMembers.filter(m => m.active).length;
  const frozenCount = allMembers.filter(m => !m.active).length;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="members-tab-reception">
      <div className="dashboard-grid" style={{ marginBottom: "2rem", gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <motion.div variants={itemVariants} className="kpi-card-v2">
          <div className="kpi-icon-v2" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}><i className="fas fa-users" /></div>
          <div className="kpi-content-v2">
             <div className="kpi-label-v2">CELKOM ČLENOV</div>
             <div className="kpi-value-v2">{allMembers.length}</div>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="kpi-card-v2">
          <div className="kpi-icon-v2" style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--acid)' }}><i className="fas fa-check-circle" /></div>
          <div className="kpi-content-v2">
             <div className="kpi-label-v2">AKTÍVNE PROFILY</div>
             <div className="kpi-value-v2">{activeCount}</div>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="kpi-card-v2">
          <div className="kpi-icon-v2" style={{ background: 'rgba(0,210,255,0.1)', color: 'var(--cyan)' }}><i className="fas fa-snowflake" /></div>
          <div className="kpi-content-v2">
             <div className="kpi-label-v2">ZMRAZENÉ ÚČTY</div>
             <div className="kpi-value-v2">{frozenCount}</div>
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="panel glass-panel">
        <div className="ph" style={{ flexWrap: "wrap", gap: "0.5rem", cursor: 'pointer' }} onClick={() => setListOpen(!listOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="neon-icon blue" style={{ width: 32, height: 32, background: 'rgba(0,123,255,0.1)', color: 'var(--blue)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-address-book"></i>
            </div>
            <span className="pt">Databáza klientov</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0.5rem 0 0 3.2rem', fontWeight: 500, maxWidth: '600px', lineHeight: '1.4' }}>
            Centrálny zoznam všetkých registrovaných členov. Umožňuje vyhľadávanie, filtrovanie podľa stavu a rýchly prístup k detailom profilu a histórii nákupov.
          </p>
          <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
            <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); loadMembers(); }}>
              <i className="fas fa-sync-alt"></i>
            </button>
            <motion.div animate={{ rotate: listOpen ? 0 : 180 }} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>
               <i className="fas fa-chevron-up"></i>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {listOpen && (
            <motion.div 
              className="pb" 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '1.2rem' }}>
                <div className="search-bar glass-panel" style={{ display: "flex", gap: "0.8rem", marginBottom: "1.5rem", background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
                    <input 
                      className="fi" 
                      type="text" 
                      placeholder="Hľadať meno, email alebo ID..." 
                      value={search}
                      onChange={handleSearchChange}
                      style={{ paddingLeft: '2.8rem', borderRadius: '12px' }}
                    />
                  </div>
                  <select className="fi" value={statusFilter} onChange={handleStatusChange} style={{ maxWidth: "160px", borderRadius: '12px' }}>
                    <option value="">Všetci členovia</option>
                    <option value="active">Len aktívni</option>
                    <option value="frozen">Len zmrazení</option>
                  </select>
                </div>
                
                <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                  {filteredMembers.length === 0 ? (
                    <div className="empty-state" style={{ padding: '4rem' }}>
                      <i className="fas fa-user-slash" style={{ fontSize: '3.5rem', opacity: 0.1, marginBottom: '1.2rem' }}></i>
                      <p style={{ fontWeight: 800, color: 'var(--muted)' }}>Žiadni členovia nezodpovedajú filtrom</p>
                    </div>
                  ) : (
                  <table className="dt">
                    <thead>
                      <tr>
                        <th>KLIENT</th>
                        <th>KONTAKT</th>
                        <th>STAV</th>
                        <th style={{ textAlign: 'right' }}>AKCIE</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                      {filteredMembers.map(m => (
                        <motion.tr key={m.id} variants={itemVariants} className={!m.active ? "frozen-row" : ""} style={{ transition: 'all 0.2s' }}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                              <div className="avatar" style={{ border: m.active ? '2px solid var(--acid)' : '2px solid var(--border)', width: 40, height: 40 }}>
                                {getInitials(m.fullName)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{m.fullName || "—"}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'monospace' }}>#{m.id.substring(0,8)}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{m.email}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{m.phone || "Bez telefónu"}</div>
                          </td>
                          <td>
                            {m.active ? (
                              <span className="badge b-acid" style={{ fontSize: '0.62rem', padding: '0.3rem 0.6rem' }}>AKTÍVNY</span>
                            ) : (
                              <span className="badge b-frozen" style={{ fontSize: '0.62rem', padding: '0.3rem 0.6rem' }}><i className="fas fa-snowflake" style={{marginRight: '0.3rem'}}></i> ZMRAZENÝ</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openDrawer(m.id)} style={{ borderRadius: '10px', height: '36px', padding: '0 1rem', fontSize: '0.75rem', fontWeight: 800 }}>
                              <i className="fas fa-id-card-alt" style={{marginRight: '0.5rem'}}></i> DETAIL
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div variants={containerVariants} className="grid-2" style={{ marginTop: '2rem' }}>
        {/* Správa prístupu */}
        <motion.div variants={itemVariants} className="panel glass-panel">
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div className="neon-icon cyan" style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(0,210,255,0.1)', color: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-unlock-alt"></i>
              </div>
              <span className="pt">Ochrana a prístup</span>
            </div>
          </div>
          <div className="pb" style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              <i className="fas fa-info-circle" style={{ color: 'var(--cyan)', marginRight: '0.5rem' }}></i>
              Rýchle ovládanie prístupových práv. <strong>Zmrazenie</strong> zamedzí vstupu do priestorov fitka. <strong>Aktivácia</strong> prístup okamžite obnoví.
            </p>
            <div className="fg" style={{ marginBottom: "1.2rem" }}>
              <label className="fl">Hľadaný užívateľ</label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-user-tag" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cyan)' }}></i>
                <select className="fi" value={freezeSelect} onChange={(e) => setFreezeSelect(e.target.value)} style={{ paddingLeft: '2.8rem', borderRadius: '12px', height: '52px' }}>
                  <option value="">— vyberte člena zo zoznamu —</option>
                  {allMembers.map(m => <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn btn-cyan btn-block" onClick={() => setMemberStatus(true)} style={{ flex: 1, height: '52px', borderRadius: '12px', fontWeight: 900, gap: '0.6rem', boxShadow: '0 8px 20px rgba(0,210,255,0.15)' }}>
                <i className="fas fa-user-check"></i> AKTIVOVAŤ
              </button>
              <button className="btn btn-red btn-block" onClick={() => setMemberStatus(false)} style={{ flex: 1, height: '52px', borderRadius: '12px', fontWeight: 900, gap: '0.6rem', background: 'transparent', color: 'var(--red)', borderColor: 'var(--red)' }}>
                <i className="fas fa-snowflake"></i> ZMRAZIŤ
              </button>
            </div>
          </div>
        </motion.div>

        {/* Priradiť permanentku */}
        <motion.div variants={itemVariants} className="panel glass-panel">
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div className="neon-icon yellow" style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(255,200,0,0.1)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-ticket-alt"></i>
              </div>
              <span className="pt">Nové predplatné</span>
            </div>
          </div>
          <div className="pb" style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              <i className="fas fa-ticket-alt" style={{ color: 'var(--orange)', marginRight: '0.5rem' }}></i>
              Modul pre predaj a priradenie vstupov. Vyberte klienta z databázy a zvoľte typ permanentky pre okamžitú aktualizáciu jeho konta.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="fg">
                <label className="fl">Klient</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-user-plus" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--orange)' }}></i>
                  <select className="fi" value={assignMember} onChange={(e) => setAssignMember(e.target.value)} style={{ paddingLeft: '2.8rem', borderRadius: '12px', height: '48px' }}>
                    <option value="">— vyhľadajte užívateľa —</option>
                    {allMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg">
                <label className="fl">Typ / Cena</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-tags" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--orange)' }}></i>
                  <select className="fi" value={assignType} onChange={(e) => setAssignType(e.target.value)} style={{ paddingLeft: '2.8rem', borderRadius: '12px', height: '48px' }}>
                    <option value="">— ponuka —</option>
                    {membershipTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({(t.priceCents / 100).toFixed(2)}€)</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button className="btn btn-acid btn-block" onClick={assignMembership} style={{ height: '56px', borderRadius: '14px', fontWeight: 950, letterSpacing: '0.04em', gap: '1rem' }}>
              <i className="fas fa-id-card-alt" style={{ fontSize: '1.2rem' }}></i> PRIRADIŤ PERMANENTKU
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Profile Drawer */}
      <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="drawer-overlay open" 
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.8)' }}
            onClick={() => setDrawerOpen(false)} 
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="drawer open"
            style={{ width: 460, maxWidth: '90%', borderLeft: '1px solid var(--border)', background: 'var(--surface)', boxShadow: '-10px 0 50px rgba(0,0,0,0.5)' }}
          >
            <div className="drawer-head" style={{ padding: '1.5rem 2rem', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '1.2rem', fontWeight: 950, color: '#fff', letterSpacing: '0.05em' }}>
                <i className="fas fa-user-circle" style={{marginRight: '0.8rem', color: 'var(--blue)'}}></i>
                {drawerUser ? drawerUser.fullName?.toUpperCase() : "DETAIL PROFILU"}
              </h3>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="drawer-body" style={{ padding: '2rem' }}>
              {drawerLoading ? (
                <div className="empty-state" style={{ height: '200px' }}><span className="spinner"></span></div>
              ) : drawerUser ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'linear-gradient(135deg, var(--blue), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 950, color: '#fff', border: '3px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,123,255,0.2)' }}>
                      {getInitials(drawerUser.fullName)}
                    </div>
                    <div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 950, fontFamily: 'var(--font-d)', lineHeight: 1.1, color: '#fff' }}>{drawerUser.fullName}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span className="badge b-acid" style={{ fontSize: '0.65rem' }}>KLIENT</span>
                        {drawerUser.active ? <span className="badge b-blue" style={{ fontSize: '0.65rem' }}>AKTÍVNY</span> : <span className="badge b-frozen" style={{ fontSize: '0.65rem' }}>ZMRAZENÝ</span>}
                      </div>
                    </div>
                  </div>

                  <div className="drawer-section glass" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border2)', paddingBottom: '0.5rem' }}>
                      <i className="fas fa-info-circle" style={{marginRight: '0.5rem'}}></i> Kontakty
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
                      <div>
                        <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>Email</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{drawerUser.email || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>Telefón</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{drawerUser.phone || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="drawer-section glass" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(200,255,0,0.03)', border: '1px solid rgba(200,255,0,0.1)', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--acid)", marginBottom: "1rem", borderBottom: "1px solid rgba(200,255,0,0.1)", paddingBottom: "0.5rem" }}>
                       <i className="fas fa-ticket-alt" style={{marginRight: '0.5rem'}}></i> Permanentka
                    </div>
                    {drawerMembership ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                          <div>
                            <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>Aktuálny program</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 900, fontFamily: 'var(--font-d)' }}>{drawerMembership.membershipTypeName}</div>
                          </div>
                          <span className={`badge ${drawerMembership.status === 'active' ? 'b-acid' : 'b-red'}`}>{drawerMembership.status}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                          <div>
                            <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>Platnosť do</div>
                            <div style={{ fontSize: "0.9rem", fontWeight: 800 }}>{drawerMembership.endDate || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>Zostatok</div>
                            <div style={{ fontSize: "0.9rem", fontWeight: 950, color: 'var(--acid)' }}>{drawerMembership.daysRemaining} DNÍ</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: "var(--muted)", fontSize: "0.88rem", padding: '1rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                        <i className="fas fa-times-circle" style={{marginRight:'0.5rem'}}></i> Žiadne aktívne predplatné
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="empty-state"><p>Chyba načítania používateľa</p></div>
              )}
            </div>

            <div className="drawer-actions" style={{ padding: '1.5rem 2rem', background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'center', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Administratívne akcie s účtom
              </div>
              {drawerUser && (
                 <button 
                   className={`btn ${drawerUser.active ? 'btn-red' : 'btn-cyan'} btn-block`} 
                   onClick={() => quickToggleStatus(drawerUser.id, drawerUser.active)}
                   style={{ height: '52px', borderRadius: '14px', fontWeight: 900, letterSpacing: '0.04em' }}
                 >
                   {drawerUser.active ? <><i className="fas fa-snowflake" style={{marginRight:'0.7rem'}}></i> ZMRAZIŤ ÚČET</> : <><i className="fas fa-user-check" style={{marginRight:'0.7rem'}}></i> AKTIVOVAŤ ÚČET</>}
                 </button>
              )}
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </motion.div>
  );
}
