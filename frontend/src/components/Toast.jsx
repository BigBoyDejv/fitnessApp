import React, { useEffect } from 'react';

export default function Toast({ message, type = 'ok', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose, message, type]);

  if (!message) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem',
      background: type === 'ok' ? 'var(--acid)' : 'var(--red)',
      color: type === 'ok' ? '#000' : '#fff',
      padding: '0.8rem 1.2rem',
      borderRadius: '6px',
      fontSize: '0.9rem',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '0.8rem',
      boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
      zIndex: 9999,
      animation: 'fadeInSlideUp 0.3s ease'
    }}>
      <i className={`fas ${type === 'ok' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
      {message}
    </div>
  );
}
