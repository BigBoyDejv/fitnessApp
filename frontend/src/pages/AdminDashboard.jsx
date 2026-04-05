import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      if (u.role !== 'admin') {
        console.warn('User is not an admin, role:', u.role);
        // navigate('/' + u.role); // if we want strict redirect
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
    { id: 'overview', icon: 'fa-chart-line', label: 'Dashboard', section: 'Prehľad' },
    
    { id: 'users', icon: 'fa-users', label: 'Profily', section: 'Správa' },
    { id: 'messages', icon: 'fa-envelope', label: 'Správy členom', section: 'Správa' },
    { id: 'memberships', icon: 'fa-id-card', label: 'Predplatné', section: 'Správa' },
    { id: 'classes-admin', icon: 'fa-calendar-alt', label: 'Lekcie', section: 'Správa' },
    { id: 'create-class', icon: 'fa-plus-circle', label: 'Nová lekcia', section: 'Správa' },
    
    { id: 'stats', icon: 'fa-chart-bar', label: 'Štatistiky', section: 'Analytika' },
    { id: 'inventory', icon: 'fa-boxes', label: 'Sklad', section: 'Analytika' },
    
    { id: 'profile', icon: 'fa-user-cog', label: 'Môj profil', section: 'Nastavenia' }
  ];

  const renderNav = () => {
    let currentSection = null;
    return navItems.map(item => {
      const elements = [];
      if (item.section !== currentSection) {
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

  const pageTitle = navItems.find(i => i.id === activeTab)?.label || 'Dashboard';

  let avatarContent = <>{user?.fullName ? user.fullName.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() : 'A'}</>;
  if (user?.avatarUrl) {
    avatarContent = <img src={user.avatarUrl} alt="Avatar" style={{width:'38px', height:'38px', borderRadius:'50%', objectFit:'cover'}} />;
  }

  return (
    <div 
      className="admin-dashboard" 
      style={{display:'flex', flexDirection:'row', minHeight:'100vh', width:'100%'}}
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
          <div className="role-tag"><i className="fas fa-shield-alt"></i> Admin panel</div>
        </div>
        
        <div className="sb-user">
          <div className="avatar">{avatarContent}</div>
          <div>
            <div className="name">{user?.fullName || 'Admin'}</div>
            <div className="email">{user?.email || '—'}</div>
          </div>
        </div>
        
        <nav className="sb-nav" style={{ flex: 1, overflowY: "auto" }}>
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
          <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
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
            <span className="admin-badge"><i className="fas fa-shield-alt"></i> Admin</span>
          </div>
        </header>

        <div className="content">
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
        </div>
      </main>
    </div>
  );
}
