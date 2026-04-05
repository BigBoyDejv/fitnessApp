import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export function CheckinTab({ user }) {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (user?.id) loadCheckins(user.id);
    else setLoading(false);
  }, [user]);

  const loadCheckins = async (userId) => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/checkin/history/${userId}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Checkin load fail:', e);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (m) => ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'][m];

  return (
    <div className="panel animate-in">
      <div className="ph">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
           <span className="pt">História vstupov</span>
           <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prehľad tvojich návštev fitka</span>
        </div>
        {user?.id && (
          <button className="btn btn-ghost btn-sm" onClick={() => loadCheckins(user.id)}>
            <i className="fas fa-sync-alt" />
          </button>
        )}
      </div>
      <div className="pb">
        {loading ? (
          <div className="empty-state">
            <span className="spin" />
            <p>Sťahujem tvoju históriu...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <div className="illustration"><i className="fas fa-door-open" /></div>
            <p>Zatiaľ nemáš žiadne zaznamenané vstupy.</p>
            <button className="btn btn-acid btn-sm" onClick={() => (window.location.hash = '#qr')}>ZÍSKAŤ QR VSTUP</button>
          </div>
        ) : (
          <div className="ci-list-modern">
            {history.map((c, i) => {
              const dt = new Date(c.checkedInAt || c.createdAt);
              const mShort = getMonthName(dt.getMonth());
              const method = c.method || 'qr';
              const icon = method === 'nfc' ? 'fa-id-card' : 'fa-qrcode';
              
              return (
                <div key={c.id || i} className="ci-row-modern">
                  <div className={`ci-type-icon ${method}`}>
                    <i className={`fas ${icon}`} />
                  </div>
                  <div className="ci-info">
                    <div className="ci-date">{dt.getDate()}. {mShort} {dt.getFullYear()}</div>
                    <div className="ci-time">
                       <i className="far fa-clock" /> {dt.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="ci-method-tag">{method}</div>
                  {c.durationMinutes > 0 && (
                    <div className="ci-duration">
                       <i className="fas fa-hourglass-half" /> {c.durationMinutes} min
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CheckinTab;