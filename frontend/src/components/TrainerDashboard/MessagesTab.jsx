import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedFetch } from '../../utils/api';

export default function MessagesTab({ user }) {
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeClient, setActiveClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState({ clients: true, chat: false });
  const [sending, setSending] = useState(false);

  const chatContainerRef = useRef(null);
  const pollRef = useRef(null);

  // Initial load
  useEffect(() => {
    loadClients();
    return () => clearInterval(pollRef.current);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading.chat]);

  // Polling logic when client changes
  useEffect(() => {
    if (activeClient) {
      loadMessages(activeClient.id);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => loadMessages(activeClient.id, true), 5000);
      return () => clearInterval(pollRef.current);
    }
  }, [activeClient]);

  const loadClients = async () => {
    try {
      const res = await authenticatedFetch('/api/trainer/clients');
      const data = await res.json();
      if (res.ok) setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('loadClients:', e);
    } finally {
      setLoading(prev => ({ ...prev, clients: false }));
    }
  };

  const loadMessages = async (clientId, isPoll = false) => {
    if (!clientId) return;
    if (!isPoll) setLoading(prev => ({ ...prev, chat: true }));
    try {
      const res = await authenticatedFetch(`/api/messages/chat?user1=${user.id}&user2=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('loadMessages:', e);
    } finally {
      if (!isPoll) setLoading(prev => ({ ...prev, chat: false }));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeClient || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const res = await authenticatedFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          senderId: user.id,
          receiverId: activeClient.id,
          text
        })
      });

      if (!res.ok) throw new Error('Failed');
      await loadMessages(activeClient.id, true);
    } catch (e) {
      setNewMessage(text);
      alert('Chyba pri odosielaní.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const filteredClients = clients.filter(c =>
    (c.fullName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel chat-modern-layout"
      style={{
        height: 'calc(100vh - 145px)',
        display: 'flex',
        background: 'rgba(10, 10, 12, 0.4)',
        backdropFilter: 'blur(30px)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        overflow: 'hidden',
        margin: 0
      }}
    >
      {/* ── Client Sidebar ─────────────────────────────────────────── */}
      <aside className="chat-sidebar" style={{
        width: '320px',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <div className="sidebar-header" style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Konverzácie</h3>
          <div className="search-box" style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.8rem' }} />
            <input
              type="text"
              placeholder="Hľadať klienta..."
              className="fi"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '2.5rem',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border)',
                fontSize: '0.85rem'
              }}
            />
          </div>
        </div>

        <div className="client-list" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loading.clients ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner"></span></div>
          ) : filteredClients.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredClients.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setActiveClient(c)}
                  className={`client-item ${activeClient?.id === c.id ? 'active' : ''}`}
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: activeClient?.id === c.id ? 'rgba(10, 132, 255, 0.12)' : 'transparent',
                    border: activeClient?.id === c.id ? '1px solid rgba(10, 132, 255, 0.2)' : '1px solid transparent'
                  }}
                >
                  <div className="avatar" style={{
                    width: 44, height: 44, borderRadius: '12px',
                    background: activeClient?.id === c.id ? 'var(--blue)' : 'var(--surface3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.9rem', color: '#fff',
                    boxShadow: activeClient?.id === c.id ? '0 4px 12px rgba(10, 132, 255, 0.3)' : 'none'
                  }}>
                    {getInitials(c.fullName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: activeClient?.id === c.id ? '#fff' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.fullName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '2px' }}>Klient</div>
                  </div>
                  {activeClient?.id === c.id && (
                    <motion.div layoutId="active-indicator" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', boxShadow: '0 0 8px var(--blue)' }} />
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
              Žiadni klienti nenájdení.
            </div>
          )}
        </div>
      </aside>

      {/* ── Chat Window ────────────────────────────────────────────── */}
      <main className="chat-window" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {!activeClient ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', opacity: 0.5 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-comment-alt" style={{ fontSize: '2rem' }} />
            </div>
            <div>
              <h4 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>Vyberte konverzáciu</h4>
              <p style={{ fontSize: '0.85rem', maxWidth: '240px' }}>Začnite četovať s vašimi klientmi výberom zo zoznamu vľavo.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
                  {getInitials(activeClient.fullName)}
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem', letterSpacing: '0.02em' }}>{activeClient.fullName}</h4>
                  <div style={{ fontSize: '0.7rem', color: 'var(--acid2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--acid2)' }} /> Online
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => loadMessages(activeClient.id)}>
                  <i className="fas fa-sync-alt" />
                </button>
                <button className="btn btn-ghost btn-sm">
                  <i className="fas fa-ellipsis-v" />
                </button>
              </div>
            </header>

            {/* Messages Area */}
            <div
              ref={chatContainerRef}
              style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {loading.chat ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <span className="spinner" style={{ width: 32, height: 32 }}></span>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.3 }}>
                  <i className="fas fa-history" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                  <p style={{ fontSize: '0.9rem' }}>Pripravený na vašu prvú správu</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMe = m.senderId === user.id;
                  return (
                    <motion.div
                      key={m.id || idx}
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}
                    >
                      <div style={{
                        background: isMe ? 'linear-gradient(135deg, var(--blue), #0056b3)' : 'var(--surface2)',
                        color: '#fff',
                        padding: '0.75rem 1.1rem',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        fontSize: '0.92rem',
                        lineHeight: 1.5,
                        boxShadow: isMe ? '0 4px 15px rgba(10, 132, 255, 0.2)' : '0 4px 15px rgba(0,0,0,0.1)',
                        border: isMe ? 'none' : '1px solid var(--border)'
                      }}>
                        {m.text}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                        {formatTime(m.createdAt || m.timestamp)}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <footer style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button className="btn btn-ghost" style={{ padding: '0.6rem', minWidth: 0, border: 'none' }}>
                  <i className="fas fa-paperclip" style={{ color: 'var(--muted)' }} />
                </button>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Napíšte správu..."
                    className="fi"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    disabled={sending}
                    style={{
                      padding: '0.8rem 1.25rem',
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border)',
                      fontSize: '0.92rem',
                      transition: 'all 0.3s'
                    }}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="btn btn-blue"
                  style={{
                    width: 48, height: 48, borderRadius: '14px', padding: 0, justifyContent: 'center',
                    background: 'var(--blue)', border: 'none', boxShadow: '0 4px 15px rgba(10, 132, 255, 0.3)'
                  }}
                >
                  {sending ? <span className="spinner" style={{ borderColor: 'transparent', borderTopColor: '#fff' }} /> : <i className="fas fa-paper-plane" />}
                </motion.button>
              </div>
            </footer>
          </>
        )}
      </main>
    </motion.div>
  );
}
