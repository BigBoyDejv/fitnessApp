import React, { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function MessagesTab({ user }) {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);
  
  const messagesEndRef = useRef(null);
  
  const loadClients = async () => {
    try {
      const res = await authenticatedFetch('/api/trainer/clients');
      const data = await res.json();
      if (res.ok) setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadMessages = async (clientId) => {
    if (!clientId) return;
    try {
      const res = await authenticatedFetch(`/api/messages/chat?user1=${user.id}&user2=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (activeClient) {
      loadMessages(activeClient.id);
      const interval = setInterval(() => loadMessages(activeClient.id), 3000);
      return () => clearInterval(interval);
    }
  }, [activeClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeClient) return;

    try {
      const payload = {
        senderId: user.id,
        receiverId: activeClient.id,
        text: newMessage.trim()
      };

      const res = await authenticatedFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      setNewMessage('');
      loadMessages(activeClient.id);
    } catch (e) {
      alert('Chyba pri odosielaní: ' + e.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="panel">
      <div className="ph">
        <span className="pt">Správy s klientmi</span>
      </div>
      <div className="pb" style={{ padding: 0 }}>
        <div style={{ display: 'flex', height: '500px' }}>
          
          {/* Sidebar - Clients */}
          <div style={{ width: '250px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Moji klienti
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingClients ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner"></span></div>
              ) : clients.length > 0 ? (
                clients.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => setActiveClient(c)}
                    style={{ 
                      padding: '1rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.8rem', 
                      cursor: 'pointer', 
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                      background: activeClient?.id === c.id ? 'rgba(10,132,255,0.08)' : 'transparent',
                      borderLeft: activeClient?.id === c.id ? '3px solid var(--blue)' : '3px solid transparent'
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--border2),var(--surface3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {getInitials(c.fullName)}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: activeClient?.id === c.id ? 'var(--blue)' : 'var(--text)' }}>
                        {c.fullName || '—'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Nemáš priradených žiadnych klientov.
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            {!activeClient ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--muted)', gap: '1rem' }}>
                <i className="fas fa-comments" style={{ fontSize: '3rem', opacity: 0.2 }}></i>
                <p>Vyber si klienta vľavo pre začatie konverzácie</p>
              </div>
            ) : (
              <>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>
                    {getInitials(activeClient.fullName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{activeClient.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Klient</div>
                  </div>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem', fontSize: '0.85rem' }}>
                      Zatiaľ žiadne správy v tejto konverzácii. Začni písať zospodu.
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMe = m.senderId === user.id;
                      return (
                        <div key={idx} style={{ 
                          maxWidth: '75%', 
                          padding: '0.75rem 1rem', 
                          borderRadius: '12px', 
                          fontSize: '0.9rem',
                          lineHeight: 1.4,
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          background: isMe ? 'var(--blue)' : 'var(--surface2)',
                          color: isMe ? '#fff' : 'var(--text)',
                          borderBottomRightRadius: isMe ? '4px' : '12px',
                          borderBottomLeftRadius: !isMe ? '4px' : '12px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {isMe ? 'Ty' : activeClient.fullName.split(' ')[0]}
                          </div>
                          <div style={{ wordBreak: 'break-word' }}>{m.text}</div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="fi" 
                      placeholder="Napíš správu..." 
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                      style={{ background: 'var(--bg)', borderRadius: '20px', paddingLeft: '1.2rem' }}
                    />
                    <button 
                      onClick={handleSendMessage}
                      style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--blue)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#0070e6'}
                      onMouseOut={e => e.currentTarget.style.background = 'var(--blue)'}
                    >
                      <i className="fas fa-paper-plane" style={{ marginLeft: '-2px' }}></i>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
