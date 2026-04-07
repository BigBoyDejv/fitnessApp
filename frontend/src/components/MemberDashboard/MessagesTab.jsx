import React, { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function MessagesTab({ user, preselectedId, clearPreselected }) {
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const chatBottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    loadAllTrainers();
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(pollRef.current);
    };
  }, []);

  // Ak príde preselectedId (z inej tabuľky), automaticky ho vyber
  useEffect(() => {
    if (preselectedId && trainers.length > 0) {
      const t = trainers.find(x => x.id === preselectedId || x.id == preselectedId);
      if (t) {
        setSelectedTrainer(t);
        if (clearPreselected) clearPreselected();
      }
    }
  }, [preselectedId, trainers]);

  // Keď vyberieme trénera, načítame správy a spustíme polling
  useEffect(() => {
    if (selectedTrainer) {
      loadMessages(selectedTrainer.id);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => loadMessages(selectedTrainer.id), 5000);
    } else {
      setMessages([]);
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [selectedTrainer]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadAllTrainers = async () => {
    try {
      const res = await authenticatedFetch('/api/trainer/list?active=true');
      if (res.ok) {
        const data = await res.json();
        setTrainers(Array.isArray(data) ? data : []);

        // Ak nemáme preselected, skúsme načítaj priradeného trénera ako default
        if (!preselectedId) {
          const meRes = await authenticatedFetch('/api/auth/me');
          const me = await meRes.json();
          if (me.trainerId) {
            const t = data.find(x => x.id === me.trainerId);
            if (t) setSelectedTrainer(t);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (tId) => {
    if (!tId) return;
    try {
      const res = await authenticatedFetch(`/api/messages/chat?otherUser=${tId}`);
      if (res.ok) setMessages(await res.json());
    } catch (e) { console.error(e); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTrainer?.id || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      const res = await authenticatedFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ senderId: user.id, receiverId: selectedTrainer.id, text })
      });
      if (!res.ok) throw new Error('Chyba');
      await loadMessages(selectedTrainer.id);
    } catch (e) {
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="panel" style={{ padding: '4rem', textAlign: 'center' }}><span className="spinner"></span></div>;

  const showList = !selectedTrainer || !isMobile;
  const showChat = selectedTrainer;

  return (
    <div className="messages-layout animate-in" style={{ display: 'flex', height: 'calc(100vh - 150px)', gap: '1rem' }}>

      {/* Sidebar - Zoznam trénerov */}
      {showList && (
        <div className="panel msg-sidebar" style={{ width: isMobile ? '100%' : '320px', display: 'flex', flexDirection: 'column' }}>
          <div className="ph"><span className="pt">Tréneri</span></div>
          <div className="trainer-list-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {trainers.length === 0 ? (
              <div className="empty" style={{ padding: '2rem' }}>Žiadni tréneri online.</div>
            ) : trainers.map(t => (
              <div
                key={t.id}
                className={`trainer-msg-item ${selectedTrainer?.id === t.id ? 'active' : ''}`}
                onClick={() => setSelectedTrainer(t)}
              >
                <div className="avatar-mini">
                  {t.avatarUrl ? <img src={t.avatarUrl} alt="" /> : getInitials(t.fullName)}
                </div>
                <div className="info">
                  <div className="name">{t.fullName}</div>
                  <div className="spec">{t.specialization || 'Inštruktor'}</div>
                </div>
                <i className="fas fa-chevron-right" style={{ opacity: 0.3, fontSize: '0.7rem' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      {showChat && (
        <div className="panel msg-chat-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Header */}
          <div className="ph" style={{ padding: '0.8rem 1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              {isMobile && (
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTrainer(null)} style={{ padding: '0.5rem 0.8rem' }}>
                  <i className="fas fa-arrow-left" />
                </button>
              )}
              <div className="avatar-mini" style={{ width: 32, height: 32 }}>
                {selectedTrainer.avatarUrl ? <img src={selectedTrainer.avatarUrl} alt="" /> : getInitials(selectedTrainer.fullName)}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>{selectedTrainer.fullName}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--acid)', fontWeight: 700 }}>ONLINE</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-bubble-container" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.1)' }}>
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.4 }}>
                <i className="fas fa-comment-dots" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                <p>Začni konverzáciu správou...</p>
              </div>
            ) : messages.map((m, i) => {
              const isMe = m.senderId === user.id;
              return (
                <div key={m.id || i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{
                    background: isMe ? 'var(--acid)' : 'var(--surface2)',
                    color: isMe ? '#000' : 'var(--text)',
                    padding: '0.75rem 1rem',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    position: 'relative'
                  }}>
                    {m.text || m.content}
                    <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '0.4rem', textAlign: 'right' }}>{formatTime(m.createdAt)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="chat-input-row" style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: '0.8rem' }}>
            <input
              type="text"
              className="fi"
              placeholder="Tvoja správa..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1, background: 'rgba(255,255,255,0.03)' }}
            />
            <button className="btn btn-acid" onClick={sendMessage} disabled={!newMessage.trim() || sending}>
              {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <i className="fas fa-paper-plane" />}
            </button>
          </div>
        </div>
      )}

      {/* Prázdny stav pre Desktop */}
      {!showChat && !isMobile && (
        <div className="panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-comments" style={{ fontSize: '4rem', marginBottom: '1.5rem' }} />
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>VYBER SI TRÉNERA NA ČET</div>
          </div>
        </div>
      )}
    </div>
  );
}