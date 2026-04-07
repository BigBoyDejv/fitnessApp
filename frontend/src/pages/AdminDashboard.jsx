import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/common/SEO';
import OverviewTab from '../components/AdminDashboard/OverviewTab';
import UsersTab from '../components/AdminDashboard/UsersTab';
import MembershipsTab from '../components/AdminDashboard/MembershipsTab';
import ClassesAdminTab from '../components/AdminDashboard/ClassesAdminTab';
import CreateClassTab from '../components/AdminDashboard/CreateClassTab';
import ProfileTab from '../components/AdminDashboard/ProfileTab';
import MessagesTab from '../components/AdminDashboard/MessagesTab';
import InventoryTab from '../components/AdminDashboard/InventoryTab';
import StatsTab from '../components/AdminDashboard/StatsTab';

import './AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(sessionStorage.getItem('admin_active_tab') || 'overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [expandedSections, setExpandedSections] = useState({ prehlady: true, sprava: true, analytika: true, nastavenia: true });
  
  // Pull to refresh
  const [pulling, setPulling] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const touchStart = React.useRef(0);
  const maxPull = 80;

  useEffect(() => {
    // Auth check
    const token = localStorage.getItem('fp_token');
    const u = JSON.parse(localStorage.getItem('fp_user') || 'null');
    if (!token || !u) {
      navigate('/');
    } else {
      setUser(u);
      if (u.role !== 'admin') {
        console.warn('User is not an admin, role:', u.role);
        // navigate('/' + u.role); // if we want strict redirect
      }
    }
  }, [navigate]);

  useEffect(() => {
    sessionStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const logout = () => {
    localStorage.removeItem('fp_token');
    localStorage.removeItem('fp_user');
    navigate('/');
  };

  const toggleSection = (sec) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleTouchStart = (e) => {
    if (!isMobile || window.scrollY > 0) return;
    touchStart.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e) => {
    if (!isMobile || window.scrollY > 0) return;
    const currentY = e.touches[0].clientY;
    const dist = currentY - touchStart.current;
    if (dist > 0) {
      setPulling(true);
      setPullDist(Math.min(dist * 0.5, maxPull));
    }
  };
  const handleTouchEnd = () => {
    if (pullDist >= maxPull - 10) window.location.reload();
    setPulling(false);
    setPullDist(0);
  };

  const dashboardSections = [
    {
      id: 'prehlady',
      label: 'Prehľad',
      icon: 'fa-chart-pie',
      items: [
        { id: 'overview', icon: 'fa-chart-line', label: 'Dashboard' },
      ]
    },
    {
      id: 'sprava',
      label: 'Správa',
      icon: 'fa-tasks',
      items: [
        { id: 'users', icon: 'fa-users', label: 'Profily' },
        { id: 'messages', icon: 'fa-envelope', label: 'Správy členom' },
        { id: 'memberships', icon: 'fa-id-card', label: 'Predplatné' },
        { id: 'classes-admin', icon: 'fa-calendar-alt', label: 'Lekcie' },
        { id: 'create-class', icon: 'fa-plus-circle', label: 'Nová lekcia' },
      ]
    },
    {
      id: 'analytika',
      label: 'Analytika',
      icon: 'fa-microchip',
      items: [
        { id: 'stats', icon: 'fa-chart-bar', label: 'Štatistiky' },
        { id: 'inventory', icon: 'fa-boxes', label: 'Sklad' },
      ]
    },
    {
      id: 'nastavenia',
      label: 'Nastavenia',
      icon: 'fa-cog',
      items: [
        { id: 'profile', icon: 'fa-user-cog', label: 'Môj profil' },
      ]
    }
  ];


  const pageTitle = dashboardSections.flatMap(s => s.items).find(i => i.id === activeTab)?.label || 'Dashboard';

  let avatarContent = <>{user?.fullName ? user.fullName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'A'}</>;
  if (user?.avatarUrl) {
    avatarContent = <img src={user.avatarUrl} alt="Avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />;
  }

  return (
    <div
      className="admin-dashboard"
      style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%' }}
    >
      <SEO title={`${pageTitle} — Admin Panel`} />
      {/* ── Overlay (mobile) ───────────────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99, backdropFilter: "blur(3px)" }}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
      >
        <div className="sidebar-logo">
          <div className="logo">FITNESS <span>PRO</span></div>
          <div className="role-tag"><i className="fas fa-shield-alt"></i> Admin panel</div>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{avatarContent}</div>
          <div className="user-info">
            <div className="name">{user?.fullName || 'Admin'}</div>
            <div className="email">{user?.email || '—'}</div>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, overflowY: "auto" }}>
          <div className="sidebar-nav-v2">
            {dashboardSections.map(sec => {
              const isOpen = expandedSections[sec.id];
              return (
                <div key={sec.id} className={`nav-group ${isOpen ? 'open' : ''}`}>
                  <button className="nav-group-header" onClick={() => toggleSection(sec.id)}>
                    <i className={`fas ${sec.icon}`} /> <span>{sec.label}</span>
                    <i className="fas fa-chevron-right arrow" />
                  </button>
                  <div className="nav-group-content">
                    {sec.items.map(item => (
                      <button 
                        key={item.id} 
                        className={`nav-item sub ${activeTab === item.id ? 'active' : ''}`} 
                        onClick={() => { setActiveTab(item.id); if (isMobile) setSidebarOpen(false); }}
                      >
                        <i className={`fas ${item.icon}`} /> <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <i className="fas fa-sign-out-alt"></i> Odhlásiť sa
          </button>
        </div>
      </aside>

      {/* ── Hlavná oblasť ──────────────────────────────────────────────── */}
      <main
        className="main"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          marginLeft: isMobile ? 0 : '256px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0,
          width: isMobile ? '100%' : 'calc(100% - 256px)',
          transition: 'margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative'
        }}
      >
        {isMobile && pulling && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: pullDist,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 999,
            background: 'rgba(255,45,85,0.05)', borderBottom: '1px solid rgba(255,45,85,0.2)'
          }}>
            <i className={`fas fa-sync-alt ${pullDist >= maxPull - 10 ? 'fa-spin' : ''}`} style={{
              color: 'var(--red)', opacity: pullDist/maxPull, transform: `rotate(${pullDist * 3}deg)`
            }} />
          </div>
        )}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            {isMobile && (
              <button
                className={`hamburger ${sidebarOpen ? 'open' : ''}`}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Menu"
              >
                <span></span><span></span><span></span>
              </button>
            )}
            <div className="page-title">{pageTitle}</div>
          </div>
          <div className="topbar-right">
            {isMobile && (
              <button className="top-logout-btn" onClick={logout} style={{ marginRight: '0.8rem' }}>
                <i className="fas fa-sign-out-alt"></i>
              </button>
            )}
            <span className="admin-badge"><i className="fas fa-shield-alt"></i> Admin</span>
          </div>
        </header>

        <div className="content" style={{ paddingBottom: isMobile ? '100px' : '2rem', position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {activeTab === 'overview' && <OverviewTab user={user} />}
              {activeTab === 'users' && <UsersTab />}
              {activeTab === 'memberships' && <MembershipsTab />}
              {activeTab === 'classes-admin' && <ClassesAdminTab />}
              {activeTab === 'create-class' && <CreateClassTab />}
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'messages' && <MessagesTab />}
              {activeTab === 'inventory' && <InventoryTab />}
              {activeTab === 'stats' && <StatsTab />}

              {!['overview', 'users', 'memberships', 'classes-admin', 'create-class', 'profile', 'messages', 'inventory', 'stats'].includes(activeTab) && (
                <div className="empty-state">
                  <i className="fas fa-tools"></i>
                  <p>Sekcia {pageTitle} bude čoskoro pridaná (migrácia z admin.html prebieha).</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {isMobile && (
          <nav className="mobile-bottom-dock">
            <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-chart-line" />
              <span>DOMOV</span>
            </button>
            <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-users" />
              <span>PROFILY</span>
            </button>
            <button className="nav-action-btn" onClick={() => setActiveTab('create-class')}>
              <i className="fas fa-plus" />
            </button>
            <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-chart-bar" />
              <span>STATS</span>
            </button>
            <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-user-cog" />
              <span>ÚČET</span>
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}
