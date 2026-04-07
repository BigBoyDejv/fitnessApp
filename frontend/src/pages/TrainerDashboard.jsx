import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import OverviewTab from '../components/TrainerDashboard/OverviewTab';
import MyClassesTab from '../components/TrainerDashboard/MyClassesTab';
import ScheduleTab from '../components/TrainerDashboard/ScheduleTab';
import ClientsTab from '../components/TrainerDashboard/ClientsTab';
import MessagesTab from '../components/TrainerDashboard/MessagesTab';
import ProfileTab from '../components/TrainerDashboard/ProfileTab';

// we will import others later
// import ClientsTab from '../components/TrainerDashboard/ClientsTab';
// import MessagesTab from '../components/TrainerDashboard/MessagesTab';
// import ProfileTab from '../components/TrainerDashboard/ProfileTab';

import './TrainerDashboard.css';

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [expandedSections, setExpandedSections] = useState({ hlavne: true, treningy: true, klienti: true, ucet: true });

  useEffect(() => {
    // Auth check
    const token = localStorage.getItem('fp_token');
    const u = JSON.parse(localStorage.getItem('fp_user') || 'null');
    if (!token || !u) {
      navigate('/');
    } else {
      setUser(u);
      if (u.role !== 'trainer') {
        console.warn('User is not a trainer, role:', u.role);
        // navigate('/member'); // if we want strict redirect
      }
    }
  }, [navigate]);

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

  const dashboardSections = [
    {
      id: 'hlavne',
      label: 'Hlavné',
      icon: 'fa-home',
      items: [
        { id: 'overview', icon: 'fa-home', label: 'Prehľad' },
      ]
    },
    {
      id: 'treningy',
      label: 'Tréningy',
      icon: 'fa-dumbbell',
      items: [
        { id: 'my-classes', icon: 'fa-calendar-alt', label: 'Moje lekcie' },
        { id: 'schedule', icon: 'fa-clock', label: 'Týždenný rozvrh' },
      ]
    },
    {
      id: 'klienti',
      label: 'Klienti',
      icon: 'fa-users',
      items: [
        { id: 'clients', icon: 'fa-users', label: 'Moji klienti' },
        { id: 'messages', icon: 'fa-comments', label: 'Správy' },
      ]
    },
    {
      id: 'ucet',
      label: 'Účet',
      icon: 'fa-user-circle',
      items: [
        { id: 'profile', icon: 'fa-user', label: 'Môj profil' },
      ]
    }
  ];


  const pageTitle = dashboardSections.flatMap(s => s.items).find(i => i.id === activeTab)?.label || 'Prehľad';

  let avatarContent = <>{user?.fullName ? user.fullName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'T'}</>;
  if (user?.avatarUrl) {
    avatarContent = <img src={user.avatarUrl} alt="Avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />;
  }

  return (
    <div
      className="trainer-dashboard"
      style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%' }}
    >
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
          <div className="role-tag"><i className="fas fa-dumbbell"></i> Tréner</div>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{avatarContent}</div>
          <div className="user-info">
            <div className="name">{user?.fullName || 'Načítavam...'}</div>
            <div className="email">{user?.email || '—'}</div>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
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
        style={{
          marginLeft: isMobile ? 0 : '256px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0,
          width: isMobile ? '100%' : 'calc(100% - 256px)',
          transition: 'margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
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
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isMobile && (
              <button className="top-logout-btn" onClick={logout}>
                <i className="fas fa-sign-out-alt"></i>
              </button>
            )}
            {!isMobile && <span className="trainer-badge"><i className="fas fa-dumbbell"></i> Tréner panel</span>}
            <button 
              className={`topbar-avatar ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: activeTab === 'profile' ? 'var(--blue)' : 'var(--surface3)',
                border: activeTab === 'profile' ? '2px solid var(--blue)' : '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                overflow: 'hidden',
                padding: 0,
                boxShadow: activeTab === 'profile' ? '0 0 15px rgba(10, 132, 255, 0.4)' : 'none'
              }}
            >
              {avatarContent}
            </button>
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
              {activeTab === 'my-classes' && <MyClassesTab />}
              {activeTab === 'schedule' && <ScheduleTab />}
              {activeTab === 'clients' && <ClientsTab />}
              {activeTab === 'messages' && <MessagesTab user={user} />}
              {activeTab === 'profile' && <ProfileTab user={user} updateUser={setUser} />}

              {!['overview', 'my-classes', 'schedule', 'clients', 'messages', 'profile'].includes(activeTab) && (
                <div className="empty-state">
                  <i className="fas fa-tools"></i>
                  <p>Sekcia {pageTitle} bude čoskoro pridaná (migrácia z trainer.html prebieha).</p>
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
              <i className="fas fa-home" />
              <span>DOMOV</span>
            </button>
            <button className={activeTab === 'my-classes' ? 'active' : ''} onClick={() => setActiveTab('my-classes')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-calendar-alt" />
              <span>LEKCIE</span>
            </button>
            <button className="nav-action-btn" onClick={() => setActiveTab('schedule')}>
              <i className="fas fa-clock" />
            </button>
            <button className={activeTab === 'clients' ? 'active' : ''} onClick={() => setActiveTab('clients')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-users" />
              <span>KLIENTI</span>
            </button>
            <button className={activeTab === 'messages' ? 'active' : ''} onClick={() => setActiveTab('messages')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-comments" />
              <span>SPRÁVY</span>
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}
