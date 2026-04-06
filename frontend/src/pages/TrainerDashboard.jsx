import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const navItems = [
    { id: 'overview', icon: 'fa-home', label: 'Prehľad', section: 'Hlavné' },
    { id: 'my-classes', icon: 'fa-calendar-alt', label: 'Moje lekcie', section: 'Tréningy' },
    { id: 'schedule', icon: 'fa-clock', label: 'Týždenný rozvrh' },
    { id: 'clients', icon: 'fa-users', label: 'Moji klienti', section: 'Klienti' },
    { id: 'messages', icon: 'fa-comments', label: 'Správy' },
    { id: 'profile', icon: 'fa-user', label: 'Môj profil', section: 'Účet' }
  ];

  const renderNav = () => {
    let currentSection = null;
    return navItems.map(item => {
      const elements = [];
      if (item.section && item.section !== currentSection) {
        currentSection = item.section;
        elements.push(<div key={`sec-${item.id}`} className="nav-section">{item.section}</div>);
      }
      elements.push(
        <a
          key={item.id}
          href="#"
          onClick={(e) => { e.preventDefault(); setActiveTab(item.id); setSidebarOpen(false); }}
          className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
        >
          <i className={`fas ${item.icon}`}></i> {item.label}
        </a>
      );
      return elements;
    });
  };

  const pageTitle = navItems.find(i => i.id === activeTab)?.label || 'Prehľad';

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
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: '256px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          transform: isMobile && !sidebarOpen ? 'translateX(-256px)' : 'translateX(0)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowY: 'auto'
        }}
      >
        <div className="sb-logo">
          <div className="logo">FITNESS<span>PRO</span></div>
          <div className="role-tag"><i className="fas fa-dumbbell"></i> Tréner</div>
        </div>

        <div className="sb-user">
          <div className="avatar">{avatarContent}</div>
          <div>
            <div className="name">{user?.fullName || 'Načítavam...'}</div>
            <div className="email">{user?.email || '—'}</div>
          </div>
        </div>

        <nav className="sb-nav" style={{ flex: 1, overflowY: 'auto' }}>
          {renderNav()}
        </nav>

        <div className="sb-footer">
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
          <div className="topbar-right">
            {isMobile && (
              <button className="top-logout-btn" onClick={logout} style={{ marginRight: '0.8rem' }}>
                <i className="fas fa-sign-out-alt"></i>
              </button>
            )}
            <span className="trainer-badge"><i className="fas fa-dumbbell"></i> Tréner panel</span>
          </div>
        </header>

        <div className="content" style={{ paddingBottom: isMobile ? '100px' : '2rem' }}>
          {activeTab === 'overview' && <OverviewTab user={user} />}
          {activeTab === 'my-classes' && <MyClassesTab />}
          {activeTab === 'schedule' && <ScheduleTab />}
          {activeTab === 'clients' && <ClientsTab />}
          {activeTab === 'messages' && <MessagesTab user={user} />}
          {activeTab === 'profile' && <ProfileTab user={user} updateUser={setUser} />}
          {/* TO DO: add others  */}

          {!['overview', 'my-classes', 'schedule', 'clients', 'messages', 'profile'].includes(activeTab) && (
            <div className="empty-state">
              <i className="fas fa-tools"></i>
              <p>Sekcia {pageTitle} bude čoskoro pridaná (migrácia z trainer.html prebieha).</p>
            </div>
          )}
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
            <button className={activeTab === 'messages' ? 'active' : ''} onClick={() => setActiveTab('messages')}>
              <div className="nav-indicator" />
              <div className="nav-spotlight" />
              <i className="fas fa-comments" />
              <span>SPRÁVY</span>
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
