import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedFetch } from '../utils/api';

/* Tab Components */
import OverviewTab from '../components/MemberDashboard/OverviewTab';
import ProfileTab from '../components/MemberDashboard/ProfileTab';
import NotificationsTab from '../components/MemberDashboard/NotificationsTab';
import PricingTab from '../components/MemberDashboard/PricingTab';
import MembershipTab from '../components/MemberDashboard/MembershipTab';
import ClassesTab from '../components/MemberDashboard/ClassesTab';
import BookClassTab from '../components/MemberDashboard/BookClassTab';
import QrTab from '../components/MemberDashboard/QrTab';
import StatsTab from '../components/MemberDashboard/StatsTab';
import TrainersTab from '../components/MemberDashboard/TrainersTab';
import CheckinTab from '../components/MemberDashboard/CheckinTab';
import MessagesTab from '../components/MemberDashboard/MessagesTab';
import WorkoutTab from '../components/MemberDashboard/WorkoutTab';
import RulesTab from '../components/MemberDashboard/RulesTab';
import TrainerHubTab from '../components/MemberDashboard/TrainerHubTab';

import './MemberDashboard.css';

const SIDEBAR_W = 255;

const NAV_ITEMS = [
  { id: 'overview', icon: 'fa-home', label: 'Prehľad', section: 'Hlavné' },
  { id: 'profile', icon: 'fa-user', label: 'Môj profil' },
  { id: 'notifications', icon: 'fa-bell', label: 'Notifikácie' },
  { id: 'membership', icon: 'fa-id-card', label: 'Moje členstvo', section: 'Členstvo' },
  { id: 'pricing', icon: 'fa-tag', label: 'Cenník' },
  { id: 'classes', icon: 'fa-calendar-alt', label: 'Moje lekcie', section: 'Tréning' },
  { id: 'book', icon: 'fa-plus-circle', label: 'Rezervovať lekciu' },
  { id: 'workout', icon: 'fa-dumbbell', label: 'Denník tréningov' },
  { id: 'trainer-hub', icon: 'fa-user-tie', label: 'Môj Tréner', section: 'Tréning' },
  { id: 'classes', icon: 'fa-calendar-alt', label: 'Moje lekcie' },
  { id: 'trainers', icon: 'fa-users', label: 'Naši tréneri', section: 'Klub' },
  { id: 'messages', icon: 'fa-comments', label: 'Správy' },
  { id: 'qr', icon: 'fa-qrcode', label: 'QR Vstupný kód', section: 'Vstup & Štatistiky' },
  { id: 'checkin', icon: 'fa-history', label: 'História vstupov' },
  { id: 'stats', icon: 'fa-chart-bar', label: 'Moje štatistiky' },
  { id: 'rules', icon: 'fa-book', label: 'Pravidlá centra', section: 'Info' },
];

export default function MemberDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('member_dashboard_active_tab') || 'overview');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSecs, setExpandedSecs] = useState({ training: true, club: false, profile: false });
  const [fabOpen, setFabOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  // Pull to refresh state
  const [pulling, setPulling] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const touchStart = React.useRef(0);
  const maxPull = 80;

  const toggleSec = (sec) => {
    setExpandedSecs(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // ── Auth check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('fp_token');
    const u = JSON.parse(localStorage.getItem('fp_user') || 'null');
    if (!token || !u) { navigate('/'); return; }
    if (u.role && u.role !== 'member') {
      const map = { admin: '/admin', trainer: '/trainer', reception: '/reception' };
      navigate(map[u.role] || '/');
      return;
    }
    setUser(u);
    loadNotifCount();
    const interval = setInterval(loadNotifCount, 60000); // Každú minútu skontroluj notifikácie
    return () => clearInterval(interval);
  }, [navigate]);

  const loadNotifCount = async () => {
    try {
      const res = await authenticatedFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        // Backend vracia { notifications: [], unreadCount: X }
        setNotifCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.warn('Failed to load notif count', e.message);
    }
  };

  // ── Resize listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768; // Zjednotené s CSS (768px)
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleTabChange = (id) => {
    setActiveTab(id);
    localStorage.setItem('member_dashboard_active_tab', id);
    setSidebarOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('fp_token');
    localStorage.removeItem('fp_user');
    localStorage.removeItem('member_dashboard_active_tab');
    navigate('/');
  };

  const updateUser = (updated) => {
    setUser(updated);
    localStorage.setItem('fp_user', JSON.stringify(updated));
  };

  // ── Pull to Refresh Handlers ────────────────────────────────────────────────
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
    if (pullDist >= maxPull - 10) {
      window.location.reload();
    }
    setPulling(false);
    setPullDist(0);
  };

  const avatarInitials = user?.fullName
    ? user.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const renderNav = () => {
    const sections = [
      { id: 'overview', icon: 'fa-th-large', label: 'Domov', section: 'root' },
      {
        id: 'training', label: 'Tréning', section: 'group', icon: 'fa-dumbbell', items: [
          { id: 'workout', icon: 'fa-book', label: 'Denník tréningov' },
          { id: 'trainer-hub', icon: 'fa-user-tie', label: 'Môj Tréner' },
          { id: 'classes', icon: 'fa-calendar-alt', label: 'Moje lekcie' },
          { id: 'stats', icon: 'fa-chart-line', label: 'Štatistiky' },
        ]
      },
      {
        id: 'club', label: 'Klub', section: 'group', icon: 'fa-house-user', items: [
          { id: 'membership', icon: 'fa-id-card', label: 'Moje členstvo' },
          { id: 'pricing', icon: 'fa-tags', label: 'Cenník členstva' },
          { id: 'book-class', icon: 'fa-plus-circle', label: 'Rezervácia lekcie' },
          { id: 'trainers', icon: 'fa-users', label: 'Naši tréneri' },
        ]
      },
      {
        id: 'profile-grp', label: 'Osobné', section: 'group', icon: 'fa-user-circle', items: [
          { id: 'profile', icon: 'fa-user-edit', label: 'Môj profil' },
          { id: 'messages', icon: 'fa-envelope', label: 'Správy' },
          { id: 'qr', icon: 'fa-qrcode', label: 'Môj QR kód' },
          { id: 'rules', icon: 'fa-shield-alt', label: 'Pravidlá fitness' },
        ]
      }
    ];

    return (
      <div className="sidebar-nav-v2">
        {sections.map(sec => {
          if (sec.section === 'root') {
            return (
              <button key={sec.id} className={`nav-item ${activeTab === sec.id ? 'active' : ''}`} onClick={() => { setActiveTab(sec.id); if (isMobile) setSidebarOpen(false); }}>
                <i className={`fas ${sec.icon}`} /> <span>{sec.label}</span>
              </button>
            );
          }

          const isOpen = expandedSecs[sec.id] || false;
          return (
            <div key={sec.id} className={`nav-group ${isOpen ? 'open' : ''}`}>
              <button className="nav-group-header" onClick={() => toggleSec(sec.id)}>
                <i className={`fas ${sec.icon}`} /> <span>{sec.label}</span>
                <i className={`fas fa-chevron-right arrow`} />
              </button>
              <div className="nav-group-content">
                {sec.items.map(sub => (
                  <button key={sub.id} className={`nav-item sub ${activeTab === sub.id ? 'active' : ''}`} onClick={() => handleTabChange(sub.id)}>
                    <i className={`fas ${sub.icon}`} /> <span>{sub.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const pageTitle = NAV_ITEMS.find(i => i.id === activeTab)?.label || 'Prehľad';

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab user={user} setActiveTab={handleTabChange} />;
      case 'profile': return <ProfileTab user={user} updateUser={updateUser} />;
      case 'notifications': return <NotificationsTab onUnreadCountChange={setNotifCount} />;
      case 'membership': return <MembershipTab setActiveTab={handleTabChange} />;
      case 'pricing': return <PricingTab setActiveTab={handleTabChange} />;
      case 'classes': return <ClassesTab setActiveTab={handleTabChange} />;
      case 'book-class': return <BookClassTab setActiveTab={handleTabChange} />;
      case 'trainer-hub': return <TrainerHubTab />;
      case 'trainers': return <TrainersTab />;
      case 'qr': return <QrTab />;
      case 'stats': return <StatsTab />;
      case 'checkin': return <CheckinTab user={user} />;
      case 'messages': return <MessagesTab user={user} />;
      case 'workout': return <WorkoutTab user={user} />;
      case 'rules': return <RulesTab />;
      default: return (
        <div className="empty">
          <i className="fas fa-tools" />
          <p>Sekcia <b>{pageTitle}</b> bude čoskoro pridaná.</p>
        </div>
      );
    }
  };

  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0A0A0A' }}>
      <div style={{ width: 28, height: 28, border: '3px solid rgba(200,255,0,0.2)', borderTopColor: '#C8FF00', borderRadius: '50%', animation: 'sp 0.7s linear infinite' }} />
    </div>
  );

  const mainMargin = isMobile ? 0 : SIDEBAR_W;

  return (
    <div
      className="member-dashboard"
      style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', width: '100%' }}
    >
      {/* ── Overlay (mobile) ───────────────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99, backdropFilter: 'blur(3px)' }}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className="sidebar"
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: SIDEBAR_W,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          transform: isMobile && !sidebarOpen ? `translateX(-${SIDEBAR_W}px)` : 'translateX(0)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
        }}
      >
        <div className="sidebar-logo">
          <div className="logo">FITNESS PRO</div>
          <div className="role-tag"><i className="fas fa-user" /> Člen</div>
        </div>

        <div className="sidebar-user">
          <div className="avatar">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : avatarInitials
            }
          </div>
          <div className="user-info">
            <div className="name">{user.fullName || '—'}</div>
            <div className="email">{user.email || '—'}</div>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
          {renderNav()}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <i className="fas fa-sign-out-alt" /> Odhlásiť sa
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
          marginLeft: mainMargin,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0,
          width: isMobile ? '100%' : `calc(100% - ${SIDEBAR_W}px)`,
          transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)',
          position: 'relative',
        }}
      >
        {/* Pull to refresh indicator */}
        {isMobile && pulling && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: pullDist,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            zIndex: 999,
            background: 'rgba(200,255,0,0.05)',
            borderBottom: '1px solid rgba(200,255,0,0.2)',
            transition: pulling ? 'none' : 'height 0.3s ease-out'
          }}>
            <i className={`fas fa-sync-alt ${pullDist >= maxPull - 10 ? 'fa-spin' : ''}`} style={{
              color: 'var(--acid)',
              opacity: pullDist / maxPull,
              transform: `rotate(${pullDist * 3}deg)`
            }} />
          </div>
        )}

        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="page-header-info">
              <h1 className="page-title">{pageTitle}</h1>
              <div className="page-subtitle">Personalizovaný prehľad vášho progresu</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            {isMobile && (
              <button className="top-logout-btn" onClick={logout}>
                <i className="fas fa-sign-out-alt"></i>
              </button>
            )}
            <button className="top-notif-btn" onClick={() => setActiveTab('notifications')}>
              <i className="fas fa-bell" />
              {notifCount > 0 && <span className="dot" />}
            </button>
            {isMobile && (
              <div className="header-user-mini" onClick={() => setActiveTab('profile')}>
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : avatarInitials}
              </div>
            )}
          </div>
        </header>

        <section className="cont" style={{ flex: 1, padding: isMobile ? '1rem' : '1.5rem', paddingBottom: isMobile ? '80px' : '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ height: '100%' }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </section>

        {isMobile && (
          <>
            <nav className="mobile-bottom-dock">
              <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => handleTabChange('overview')}>
                <div className="nav-indicator" />
                <div className="nav-spotlight" />
                <i className="fas fa-home" />
                <span>DOMOV</span>
              </button>
              <button className={activeTab === 'workout' ? 'active' : ''} onClick={() => handleTabChange('workout')}>
                <div className="nav-indicator" />
                <div className="nav-spotlight" />
                <i className="fas fa-dumbbell" />
                <span>TRÉNING</span>
              </button>
              <button className="nav-action-btn" onClick={() => setFabOpen(!fabOpen)}>
                <i className="fas fa-plus" />
              </button>
              <button className={activeTab === 'messages' ? 'active' : ''} onClick={() => handleTabChange('messages')}>
                <div className="nav-indicator" />
                <div className="nav-spotlight" />
                <i className="fas fa-comments" />
                {notifCount > 0 && <span className="notif-dot" />}
                <span>SPRÁVY</span>
              </button>
              <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => handleTabChange('profile')}>
                <div className="nav-indicator" />
                <div className="nav-spotlight" />
                <i className="fas fa-user" />
                <span>PROFIL</span>
              </button>
            </nav>
          </>
        )}
      </main>
    </div>
  );
}
