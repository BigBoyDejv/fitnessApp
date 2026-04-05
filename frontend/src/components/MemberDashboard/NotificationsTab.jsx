import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

const STATIC_NOTIFS = [
  { id: 's1', type: 'membership_expiry', title: 'Členstvo vyprší za 7 dní', message: 'Obnov si členstvo včas aby si neprerušil prístup.', createdAt: new Date(Date.now() - 86400000).toISOString(), isRead: false },
  { id: 's2', type: 'class_booked',      title: 'Rezervácia potvrdená',      message: 'CrossFit v pondelok 07:00 – miesto zarezervované.',  createdAt: new Date(Date.now() - 172800000).toISOString(), isRead: false },
  { id: 's3', type: 'membership_assigned', title: 'Členstvo aktívne',        message: 'Tvoje Pro členstvo je platné do 15. mája 2026.',       createdAt: new Date(Date.now() - 432000000).toISOString(), isRead: true  },
];

const TYPE_CONFIG = {
  membership_expiry:  { icon: 'fas fa-exclamation-triangle', color: 'var(--orange)' },
  membership_assigned:{ icon: 'fas fa-id-card',              color: 'var(--acid2)' },
  class_booked:       { icon: 'fas fa-calendar-check',       color: 'var(--blue)' },
  class_cancelled:    { icon: 'fas fa-calendar-times',       color: 'var(--red)' },
  system:             { icon: 'fas fa-info-circle',          color: 'var(--acid)' },
};

export default function NotificationsTab({ onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  useEffect(() => {
    if (onUnreadCountChange) {
      const unreadCount = notifications.filter(n => !n.isRead).length;
      onUnreadCountChange(unreadCount);
    }
  }, [notifications, onUnreadCountChange]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/notifications');
      if (!res.ok) throw new Error('not ok');
      const data = await res.json();
      let arr = Array.isArray(data) ? data : (data.notifications || []);
      
      arr.sort((a, b) => (a.isRead === b.isRead ? new Date(b.createdAt) - new Date(a.createdAt) : a.isRead ? 1 : -1));

      if (arr.length > 0) setNotifications(arr);
      else setNotifications(STATIC_NOTIFS);
    } catch {
      setNotifications(STATIC_NOTIFS);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    const n = notifications.find(x => x.id === id);
    if (!n || n.isRead) return;
    try { await authenticatedFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }); } catch {}
    setNotifications(prev => prev.map(x => x.id === id ? { ...x, isRead: true } : x));
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diffH = (Date.now() - d) / 3600000;
    if (diffH < 1) return 'Práve teraz';
    if (diffH < 24) return Math.floor(diffH) + ' h';
    return d.toLocaleDateString('sk-SK');
  };

  return (
    <div className="panel animate-in">
      <div className="ph">
        <span className="pt">Oznámenia</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setNotifications(prev => prev.map(n => ({...n, isRead: true})))} disabled={notifications.every(n => n.isRead)}>
          <i className="fas fa-check-double" /> Všetko prečítané
        </button>
      </div>
      <div className="pb" style={{ padding: '0 1rem 1rem' }}>
        {loading ? (
          <div className="empty-state"><span className="spin" /></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div className="illustration"><i className="fas fa-bell-slash" /></div>
            <p>Momentálne nemáš žiadne správy.</p>
          </div>
        ) : (
          <div className="notif-column">
            {notifications.map((n, i) => {
              const conf = TYPE_CONFIG[n.type] || { icon: 'fas fa-bell', color: 'var(--muted)' };
              return (
                <div key={n.id || i} className={`notif-card ${!n.isRead ? 'unread' : ''}`} onClick={() => markRead(n.id)}>
                   <div className="notif-side" style={{ background: conf.color }} />
                   <div className="notif-body">
                      <div className="notif-header">
                         <span className="notif-title">{n.title}</span>
                         <span className="notif-time">{formatTime(n.createdAt)}</span>
                      </div>
                      <p className="notif-msg">{n.message || n.body}</p>
                   </div>
                   {!n.isRead && <div className="notif-unread-dot" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}