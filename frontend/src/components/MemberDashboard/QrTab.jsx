import React, { useState } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function QrTab() {
  const [qrUrl, setQrUrl] = useState('');
  const [qrNote, setQrNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const genQR = async () => {
    setLoading(true);
    setQrUrl('');
    setQrNote('');
    setError(null);
    try {
      const res = await authenticatedFetch('/api/auth/qr-code');
      if (!res.ok) throw new Error('Chyba pri generovaní');
      const blob = await res.blob();
      setQrUrl(URL.createObjectURL(blob));
      setQrNote('Vygenerované: ' + new Date().toLocaleString('sk-SK'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ps active" id="pg-qr">
      <div className="panel" style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div className="ph"><span className="pt">QR Vstupný kód</span></div>
        <div className="pb" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '1.4rem', lineHeight: 1.7 }}>
            Jednorazový QR kód pre vstup do centra. Obsahuje tvoje ID a časové razítko. Platí 24 hodín.
          </p>
          <button className="btn btn-acid" id="qrBtn" onClick={genQR} disabled={loading}>
            {loading ? <><span className="spin"></span> Generujem...</> : <><i className="fas fa-qrcode"></i> Generovať QR kód</>}
          </button>
          <div style={{ marginTop: '1.4rem' }}>
            {qrUrl && (
              <img 
                id="qrImg" 
                src={qrUrl} 
                alt="QR kód" 
                style={{ display: 'block', maxWidth: '190px', border: '3px solid var(--acid)', borderRadius: '6px', margin: '0 auto' }} 
              />
            )}
          </div>
          <p id="qrNote" style={{ fontSize: '0.73rem', color: 'var(--muted)', marginTop: '0.9rem' }}>
            {qrNote}
          </p>
          {error && <div className="fm err show" style={{ marginTop: '1rem' }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}
