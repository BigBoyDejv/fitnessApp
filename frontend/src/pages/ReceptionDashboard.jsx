import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
      {/* ── Overlay (mobile) ───────────────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sb-logo">
          <div className="logo">
            FITNESS<span>PRO</span>
          </div>
          <div className="role-tag">
            <i className="fas fa-concierge-bell"></i> Recepcia
          </div>
        </div>

        <div className="sb-user">
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

        <nav className="sb-nav">
          <div className="nav-section">Hlavné</div>
          <button
            className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => { setActiveTab("overview"); setSidebarOpen(false); }}
          >
            <i className="fas fa-home"></i> Prehľad
          </button>

          <div className="nav-section">Operácie</div>
          <button
            className={`nav-item ${activeTab === "checkin" ? "active" : ""}`}
            onClick={() => { setActiveTab("checkin"); setSidebarOpen(false); }}
          >
            <i className="fas fa-qrcode"></i> Check-in
          </button>
          <button
            className={`nav-item ${activeTab === "members" ? "active" : ""}`}
            onClick={() => { setActiveTab("members"); setSidebarOpen(false); }}
          >
            <i className="fas fa-users"></i> Členovia
          </button>
          <button
            className={`nav-item ${activeTab === "messages" ? "active" : ""}`}
            onClick={() => { setActiveTab("messages"); setSidebarOpen(false); }}
          >
            <i className="fas fa-envelope"></i> Správy členom
          </button>
          <button
            className={`nav-item ${activeTab === "classes" ? "active" : ""}`}
            onClick={() => { setActiveTab("classes"); setSidebarOpen(false); }}
          >
            <i className="fas fa-calendar-alt"></i> Lekcie
          </button>
          <button
            className={`nav-item ${activeTab === "kasa" ? "active" : ""}`}
            onClick={() => { setActiveTab("kasa"); setSidebarOpen(false); }}
          >
            <i className="fas fa-cash-register"></i> Pokladňa
          </button>
          <button
            className={`nav-item ${activeTab === "music" ? "active" : ""}`}
            onClick={() => { setActiveTab("music"); setSidebarOpen(false); }}
          >
            <i className="fas fa-music"></i> Hudba
          </button>
          <button
            className={`nav-item ${activeTab === "sklad" ? "active" : ""}`}
            onClick={() => { setActiveTab("sklad"); setSidebarOpen(false); }}
          >
            <i className="fas fa-boxes"></i> Sklad
          </button>

          <div className="nav-section">Účet</div>
          <button
            className={`nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => { setActiveTab("profile"); setSidebarOpen(false); }}
          >
            <i className="fas fa-user"></i> Môj profil
          </button>
        </nav>

        <div className="sb-footer">
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
          <div className="topbar-right">
            {isMobile && (
              <button className="top-logout-btn" onClick={handleLogout} style={{ marginRight: '0.8rem' }}>
                <i className="fas fa-sign-out-alt"></i>
              </button>
            )}
            <span style={{ fontFamily: "var(--font-d)", fontSize: "1.1rem", color: "var(--muted)" }}>
              {clock}
            </span>
            <div className="reception-badge">
              <i className="fas fa-concierge-bell"></i> recepcia
            </div>
          </div>
        </header>

        <div className="content" style={{ paddingBottom: isMobile ? '100px' : '2rem' }}>
          <div className="fade-in">{renderTabContent()}</div>
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
            <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-user" />
              <span>ÚČET</span>
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}
