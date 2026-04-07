import React, { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function MessagesTab({ user }) {
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeClient, setActiveClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState({ clients: true, chat: false });
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 850);

  const chatContainerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 850);
    window.addEventListener('resize', handleResize);
    loadClients();
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading.chat]);

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
      const res = await authenticatedFetch('/api/messages/conversations');
      const data = await res.json();
      if (res.ok) {
        setClients(Array.isArray(data) ? data : []);
      }
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
      const res = await authenticatedFetch(`/api/messages/chat?otherUser=${clientId}`);
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

  const showList = !activeClient || !isMobile;
  const showChat = !!activeClient;

  return (
    <div className="messages-layout animate-in" style={{ display: 'flex', height: 'calc(100vh - 160px)', gap: '1rem', overflow: 'hidden' }}>
      
      {/* Client List */}
      {showList && (
        <aside className="panel msg-sidebar" style={{ width: isMobile ? '100%' : '320px', display: 'flex', flexDirection: 'column', background: 'var(--surface2)', borderRadius: '24px' }}>
          <div className="ph" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
             <h3 style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-d)' }}>Konverzácie</h3>
             <div style={{ position: 'relative', marginTop: '1rem', width: '100%' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3, fontSize: '0.8rem' }} />
                <input 
                  className="fi" 
                  placeholder="Hľadať klienta..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.4rem', borderRadius: '12px', height: '40px', fontSize: '0.85rem' }} 
                />
             </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
             {loading.clients ? (
               <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner"></span></div>
             ) : filteredClients.length === 0 ? (
               <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.3 }}>Žiadni klienti.</div>
             ) : (
               filteredClients.map(c => (
                 <div 
                   key={c.id} 
                   className={`trainer-msg-item ${activeClient?.id === c.id ? 'active' : ''}`}
                   onClick={() => setActiveClient(c)}
                 >
                    <div className="avatar-mini">
                       {getInitials(c.fullName)}
                    </div>
                    <div className="info">
                       <div className="name">{c.fullName}</div>
                       <div className="spec">Klient</div>
                    </div>
                    <i className="fas fa-chevron-right" style={{ opacity: 0.2, fontSize: '0.7rem' }} />
                 </div>
               ))
             )}
          </div>
        </aside>
      )}

      {/* Chat Window */}
      {showChat && (
        <main className="panel msg-chat-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRadius: '24px', position: 'relative' }}>
           <div className="ph" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', width: '100%' }}>
                 {isMobile && (
                   <button className="btn btn-ghost btn-sm" onClick={() => setActiveClient(null)} style={{ width: '40px', padding: 0 }}>
                      <i className="fas fa-arrow-left" />
                   </button>
                 )}
                 <div className="avatar-mini" style={{ width: 36, height: 36 }}>
                    {getInitials(activeClient.fullName)}
                 </div>
                 <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: 'var(--font-d)' }}>{activeClient.fullName}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--acid2)', fontWeight: 800 }}>{activeClient.role === 'member' ? 'MÔJ KLIENT' : 'KONTAKT'}</div>
                 </div>
                 {!isMobile && (
                   <button className="btn btn-ghost btn-sm" onClick={() => loadMessages(activeClient.id)}>
                      <i className="fas fa-sync-alt" />
                   </button>
                 )}
              </div>
           </div>

           <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.1)' }}>
              {loading.chat ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner"></span></div>
              ) : messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.3 }}>
                   <i className="fas fa-history" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                   <p>Začnite konverzáciu s klientom...</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMe = m.senderId === user.id;
                  return (
                    <div key={m.id || idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                       <div style={{ 
                           background: isMe ? 'rgba(10,132,255,0.85)' : 'var(--surface2)', 
                           color: '#fff',
                           padding: '0.8rem 1.1rem',
                           borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                           fontSize: '0.9rem',
                           boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                           border: isMe ? 'none' : '1px solid var(--border)',
                           lineHeight: 1.5
                       }}>
                          {m.text || m.content}
                          <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '0.4rem', textAlign: 'right', fontWeight: 700 }}>{formatTime(m.createdAt)}</div>
                       </div>
                    </div>
                  );
                })
              )}
           </div>

           <div className="chat-input-row" style={{ padding: '1.2rem', borderTop: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', gap: '0.8rem' }}>
              <input 
                type="text" 
                className="fi" 
                placeholder="Vaša správa..." 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                style={{ flex: 1, height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)' }}
              />
              <button 
                className="btn btn-blue" 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || sending}
                style={{ height: '48px', width: '48px', borderRadius: '14px', padding: 0 }}
              >
                 {sending ? <span className="spinner" style={{width: 20, height: 20}} /> : <i className="fas fa-paper-plane" />}
              </button>
           </div>
        </main>
      )}

      {/* Welcome Desktop State */}
      {!activeClient && !isMobile && (
        <div className="panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: '24px' }}>
           <div style={{ textAlign: 'center', opacity: 0.3 }}>
              <i className="fas fa-comments" style={{ fontSize: '4rem', marginBottom: '1.5rem' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-d)' }}>KLIENTSKÉ CENTRUM</div>
              <p>Vyberte klienta zo zoznamu pre začatie konverzácie.</p>
           </div>
        </div>
      )}
    </div>
  );
}
