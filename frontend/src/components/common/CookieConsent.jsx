import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '2rem',
            right: '2rem',
            maxWidth: '600px',
            margin: '0 auto',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '1.5rem 2rem',
            zIndex: 10000,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            backdropFilter: 'blur(20px)'
          }}
        >
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--acid2)' }}>
              🍪 Používame cookies
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Tento web používa nevyhnutné súbory cookies na zabezpečenie správneho fungovania a analytické cookies na zlepšenie používateľského zážitku.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShow(false)}>ODMIETNUŤ</button>
            <button className="btn btn-acid btn-sm" onClick={accept} style={{ minWidth: '120px' }}>PRIJAŤ VŠETKO</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
