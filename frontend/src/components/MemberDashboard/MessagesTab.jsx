import React, { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function MessagesTab({ user }) {
  const [trainer, setTrainer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const chatBottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    loadMyTrainer();
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadMyTrainer = async () => {
    try {
      // /api/auth/me vracia trainerId priamo na User entite
      const meRes = await authenticatedFetch('/api/auth/me');
      const me = await meRes.json();

      if (!me.trainerId) {
        setLoading(false);
        return;
      }

      // Načítaj trénera podľa jeho ID — endpoint /api/users/{id} existuje
      const trainerRes = await authenticatedFetch(`/api/users/${me.trainerId}`);
      if (!trainerRes.ok) throw new Error('Tréner nenájdený');
      const tData = await trainerRes.json();

      setTrainer(tData);
      await loadMessages(tData.id);

      // Polling každých 15s
      pollRef.current = setInterval(() => loadMessages(tData.id), 15000);
    } catch (e) {
      console.error('loadMyTrainer:', e);
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
    if (!newMessage.trim() || !trainer?.id || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      const res = await authenticatedFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ senderId: user.id, receiverId: trainer.id, text })
      });
      if (!res.ok) throw new Error('Chyba pri odosielaní');
      await loadMessages(trainer.id);
    } catch (e) {
      setNewMessage(text); // vráť text ak sa nepodarilo
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffH = (now - d) / 3600000;
    if (diffH < 24) return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
    if (diffH < 48) return 'včera ' + d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('sk-SK') + ' ' + d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (loading) return (
    <div className="panel">
      <div className="ph"><span className="pt">Správy s trénerom</span></div>
      <div className="pb" style={{ textAlign: 'center', padding: '3rem' }}><span className="spin" /></div>
    </div>
  );

  if (!trainer) return (
    <div className="panel">
      <div className="ph"><span className="pt">Správy s trénerom</span></div>
      <div className="pb" style={{ textAlign: 'center', padding: '3rem' }}>
        <i className="fas fa-user-slash" style={{ fontSize: '2.5rem', color: 'var(--muted)', marginBottom: '1rem', display: 'block' }} />
        <p style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}>Nemáš priradeného trénera.</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Kontaktuj recepciu alebo počkaj kým ti admin priradí trénera.</p>
      </div>
    </div>
  );

  return (
    <div className="panel" style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {trainer.avatarUrl ? (
            <img src={trainer.avatarUrl} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} alt="" />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,var(--blue),var(--acid2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 900, color: '#fff', flexShrink: 0 }}>
              {getInitials(trainer.fullName)}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{trainer.fullName}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{trainer.specialization || 'Tréner'}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => loadMessages(trainer.id)}>
          <i className="fas fa-sync-alt" />
        </button>
      </div>

      {/* Správy */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg)' }}>
        {messages.length === 0 ? (
          <div className="empty" style={{ margin: 'auto' }}>
            <i className="fas fa-comment-dots" />
            <p>Zatiaľ žiadne správy. Napíš prvú!</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.senderId === user.id;
            return (
              <div key={m.id || i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '0.2rem', textAlign: isMe ? 'right' : 'left' }}>
                  {isMe ? 'Ja' : trainer.fullName} · {formatTime(m.createdAt || m.timestamp)}
                </div>
                <div style={{
                  background: isMe ? 'var(--acid)' : 'var(--surface)',
                  color: isMe ? '#000' : 'var(--text)',
                  padding: '0.6rem 0.9rem',
                  borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  border: isMe ? 'none' : '1px solid var(--border)',
                  fontSize: '0.88rem', lineHeight: 1.5
                }}>
                  {m.text || m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.85rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <input
          type="text"
          className="fi"
          style={{ flex: 1 }}
          placeholder="Napíš správu..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={sending}
        />
        <button className="btn btn-acid" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
          {sending ? <span className="spin" /> : <i className="fas fa-paper-plane" />}
        </button>
      </div>
    </div>
  );
}