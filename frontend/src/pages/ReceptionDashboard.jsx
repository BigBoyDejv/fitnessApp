import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import SEO from "../components/common/SEO";
import OverviewTab from "../components/ReceptionDashboard/OverviewTab";
import CheckInTab from "../components/ReceptionDashboard/CheckInTab";
import MembersTab from "../components/ReceptionDashboard/MembersTab";
import ClassesTab from "../components/ReceptionDashboard/ClassesTab";
import KasaTab from "../components/ReceptionDashboard/KasaTab";
import MusicTab from "../components/ReceptionDashboard/MusicTab";
import SkladTab from "../components/ReceptionDashboard/SkladTab";
import MessagesTab from "../components/ReceptionDashboard/MessagesTab";
import ProfileTab from "../components/ReceptionDashboard/ProfileTab";

import "./ReceptionDashboard.css";

export default function ReceptionDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clock, setClock] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [expandedSections, setExpandedSections] = useState({ hlavne: true, operacie: true, ucet: true });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("fp_token");
    const storedUser = JSON.parse(localStorage.getItem("fp_user") || "null");

    if (!token || !storedUser) {
      navigate("/");
      return;
    }

    if (storedUser.role !== "reception") {
      const map = { member: "/member", trainer: "/trainer", admin: "/admin" };
      navigate(map[storedUser.role] || "/");
      return;
    }

    setUser(storedUser);

    const timer = setInterval(() => {
      const n = new Date();
      setClock(
        n.toLocaleTimeString("sk-SK", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("fp_token");
    localStorage.removeItem("fp_user");
    navigate("/");
  };

  const pageTitles = {
    overview: "Prehľad",
    checkin: "Check-in",
    members: "Členovia",
    messages: "Správy členom",
    classes: "Lekcie",
    kasa: "Pokladňa",
    music: "Hudba",
    sklad: "Sklad",
    profile: "Môj profil",
  };

  const getInitials = (name) => {
    if (!name) return "R";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab onNavigate={setActiveTab} />;
      case "checkin":
        return <CheckInTab />;
      case "members": return <MembersTab />;
      case "messages": return <MessagesTab />;
      case "classes": return <ClassesTab />;
      case "kasa": return <KasaTab />;
      case "music": return <MusicTab />;
      case "sklad": return <SkladTab />;
      case "profile": return <ProfileTab user={user} setUser={setUser} />;
      default:
        return (
          <div className="empty-state">
            Záložka vo výstavbe
          </div>
        );
    }
  };

  if (!user) return null;

  return (
    <div className="reception-dashboard">
      <SEO title={`${pageTitles[activeTab]} — Recepcia`} />
      {/* ── Overlay (mobile) ───────────────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo">
            FITNESS <span>PRO</span>
          </div>
          <div className="role-tag">
            <i className="fas fa-concierge-bell"></i> Recepcia
          </div>
        </div>

        <div className="sidebar-user">
          <div className="avatar">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" />
            ) : (
              getInitials(user.fullName)
            )}
          </div>
          <div className="user-info">
            <div className="name">{user.fullName || "Recepcia"}</div>
            <div className="email">{user.email || "—"}</div>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, overflowY: "auto" }}>
          <div className="sidebar-nav-v2">
            {/* HLAVNE */}
            <div className={`nav-group ${expandedSections.hlavne ? 'open' : ''}`}>
              <button className="nav-group-header" onClick={() => setExpandedSections(p => ({...p, hlavne: !p.hlavne}))}>
                <i className="fas fa-home" /> <span>Hlavné</span>
                <i className="fas fa-chevron-right arrow" />
              </button>
              <div className="nav-group-content">
                <button className={`nav-item sub ${activeTab === "overview" ? "active" : ""}`} onClick={() => { setActiveTab("overview"); if (isMobile) setSidebarOpen(false); }}>
                  <i className="fas fa-home"></i> <span>Prehľad</span>
                </button>
              </div>
            </div>

            {/* OPERACIE */}
            <div className={`nav-group ${expandedSections.operacie ? 'open' : ''}`}>
              <button className="nav-group-header" onClick={() => setExpandedSections(p => ({...p, operacie: !p.operacie}))}>
                <i className="fas fa-concierge-bell" /> <span>Operácie</span>
                <i className="fas fa-chevron-right arrow" />
              </button>
              <div className="nav-group-content">
                <button className={`nav-item sub ${activeTab === "checkin" ? "active" : ""}`} onClick={() => { setActiveTab("checkin"); if (isMobile) setSidebarOpen(false); }}>
                  <i className="fas fa-qrcode"></i> <span>Check-in</span>
                </button>
                <button className={`nav-item sub ${activeTab === "members" ? "active" : ""}`} onClick={() => { setActiveTab("members"); if (isMobile) setSidebarOpen(false); }}>
                  <i className="fas fa-users"></i> <span>Členovia</span>
                </button>
                <button className={`nav-item sub ${activeTab === "messages" ? "active" : ""}`} onClick={() => { setActiveTab("messages"); if (isMobile) setSidebarOpen(false); }}>
                  <i className="fas fa-envelope"></i> <span>Správy členom</span>
                </button>
                <button className={`nav-item sub ${activeTab === "classes" ? "active" : ""}`} onClick={() => { setActiveTab("classes"); if (isMobile) setSidebarOpen(false); }}>
                  <i className="fas fa-calendar-alt"></i> <span>Lekcie</span>
                </button>
                <button className={`nav-item sub ${activeTab === "kasa" ? "active" : ""}`} onClick={() => { setActiveTab("kasa"); if (isMobile) setSidebarOpen(false); }}>
                  <i className="fas fa-cash-register"></i> <span>Pokladňa</span>
                </button>
                <button className={`nav-item sub ${activeTab === "music" ? "active" : ""}`} onClick={() => { setActiveTab("music"); if (isMobile) setSidebarOpen(false); }}>
                  <i className="fas fa-music"></i> <span>Hudba</span>
                </button>
                <button className={`nav-item sub ${activeTab === "sklad" ? "active" : ""}`} onClick={() => { setActiveTab("sklad"); if (isMobile) setSidebarOpen(false); }}>
                  <i className="fas fa-boxes"></i> <span>Sklad</span>
                </button>
              </div>
            </div>

            {/* UCET */}
            <div className={`nav-group ${expandedSections.ucet ? 'open' : ''}`}>
              <button className="nav-group-header" onClick={() => setExpandedSections(p => ({...p, ucet: !p.ucet}))}>
                <i className="fas fa-user-circle" /> <span>Účet</span>
                <i className="fas fa-chevron-right arrow" />
              </button>
              <div className="nav-group-content">
                <button className={`nav-item sub ${activeTab === "profile" ? "active" : ""}`} onClick={() => { setActiveTab("profile"); if (isMobile) setSidebarOpen(false); }}>
                  <i className="fas fa-user"></i> <span>Môj profil</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Odhlásiť sa
          </button>
        </div>
      </aside>

      {/* ── Hlavná oblasť ──────────────────────────────────────────────── */}
      <main className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            {isMobile && (
              <button
                className={`hamburger ${sidebarOpen ? 'open' : ''}`}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Menu"
              >
                <span></span><span></span><span></span>
              </button>
            )}
            <div className="page-title">{pageTitles[activeTab]}</div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isMobile && (
              <button className="top-logout-btn" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i>
              </button>
            )}
            <span style={{ fontFamily: "var(--font-d)", fontSize: "1.1rem", color: "var(--muted)" }}>
              {clock}
            </span>
            {!isMobile && (
              <div className="reception-badge">
                <i className="fas fa-concierge-bell"></i> recepcia
              </div>
            )}
            <button 
              className={`topbar-avatar ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: activeTab === 'profile' ? 'var(--purple)' : 'var(--surface3)',
                border: activeTab === 'profile' ? '2px solid var(--purple)' : '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                overflow: 'hidden',
                padding: 0,
                boxShadow: activeTab === 'profile' ? '0 0 15px rgba(191, 90, 242, 0.4)' : 'none',
                color: '#fff',
                fontFamily: 'var(--font-d)',
                fontWeight: 900
              }}
            >
              {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(user.fullName)}
            </button>
          </div>
        </header>

        <div className="content" style={{ paddingBottom: isMobile ? '100px' : '2rem', position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {isMobile && (
          <nav className="mobile-bottom-dock">
            <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-home" />
              <span>DOMOV</span>
            </button>
            <button className={activeTab === 'checkin' ? 'active' : ''} onClick={() => setActiveTab('checkin')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-qrcode" />
              <span>CHECKIN</span>
            </button>
            <button className="nav-action-btn" onClick={() => setActiveTab('kasa')}>
              <i className="fas fa-cash-register" />
            </button>
            <button className={activeTab === 'members' ? 'active' : ''} onClick={() => setActiveTab('members')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-users" />
              <span>ČLENOVIA</span>
            </button>
            <button className={activeTab === 'music' ? 'active' : ''} onClick={() => setActiveTab('music')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-music" />
              <span>HUDBA</span>
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}
