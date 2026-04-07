import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/common/SEO';
import './LandingPage.css';

const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8080'
  : 'https://fitnessapp-5ogv.onrender.com';

export default function LandingPage() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [navOpen, setNavOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginMsg, setLoginMsg] = useState({ text: '', type: '' });

  // Register form states
  const [rName, setRName] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPass, setRPass] = useState('');
  const [regMsg, setRegMsg] = useState({ text: '', type: '' });

  // Toast
  const [toast, setToast] = useState({ show: false, msg: '', type: 'ok' });
  const authPanelRef = useRef(null);

  useEffect(() => {
    // Check if already logged in
    const existingToken = localStorage.getItem('fp_token');
    const existingUser = JSON.parse(localStorage.getItem('fp_user') || 'null');
    if (existingToken && existingUser) {
      redirectByRole(existingUser.role);
    }
  }, []);

  const redirectByRole = (role) => {
    const map = { admin: '/admin', trainer: '/trainer', member: '/member', reception: '/reception' };
    navigate(map[role] || '/member');
  };

  const showToast = (msg, type = 'ok') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  };

  const focusLogin = () => {
    setAuthMode('login');
    authPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNavOpen(false);
  };

  const focusRegister = () => {
    setAuthMode('register');
    authPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNavOpen(false);
  };

  const doLogin = async () => {
    if (!loginEmail) return setLoginMsg({ text: 'Zadaj email', type: 'err' });
    if (!loginPass) return setLoginMsg({ text: 'Zadaj heslo', type: 'err' });

    setLoading(true);
    setLoginMsg({ text: '', type: '' });

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass })
      });

      if (!res.ok) {
        let errorMessage = 'Prihlásenie zlyhalo';
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          errorMessage = data.error || data.message || errorMessage;
        } catch (e) {
          if (text.trim()) errorMessage = text.trim().substring(0, 120);
          else errorMessage = `Zlý email alebo heslo.`;
        }

        if (res.status === 401) errorMessage = 'Nesprávny email alebo heslo';
        else if (res.status === 400) errorMessage = 'Neplatné údaje';
        else if (res.status === 429) errorMessage = 'Príliš veľa pokusov – skús neskôr';

        throw new Error(errorMessage);
      }

      const data = await res.json();
      localStorage.setItem('fp_token', data.token);
      localStorage.setItem('fp_user', JSON.stringify(data));
      showToast('Vitaj, ' + (data.fullName || 'user') + '!', 'ok');
      setTimeout(() => redirectByRole(data.role), 700);

    } catch (e) {
      setLoginMsg({ text: e.message || 'Neočakávaná chyba pri prihlásení', type: 'err' });
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async () => {
    if (!rName || !rEmail || !rPass) return setRegMsg({ text: 'Vyplň povinné polia', type: 'err' });

    setLoading(true);
    setRegMsg({ text: '', type: '' });

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rEmail, password: rPass, fullName: rName, phone: rPhone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Registrácia zlyhala');

      localStorage.setItem('fp_token', data.token);
      localStorage.setItem('fp_user', JSON.stringify(data));
      showToast('Účet vytvorený! Vitaj ' + data.fullName, 'ok');
      setTimeout(() => redirectByRole(data.role), 700);
    } catch (e) {
      setRegMsg({ text: e.message, type: 'err' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <SEO 
        title="Najlepšie fitko v Košiciach" 
        description="Vstúp do sveta profesionálneho coachingu a špičkového vybavenia v Košiciach. Ponúkame osobný tréning, skupinové lekcie, CrossFit a mnoho iného."
      />
      <div className={`toast ${toast.type === 'ok' ? 't-ok' : 't-err'} ${toast.show ? 'show' : ''}`} id="toast">
        {toast.type === 'ok' ? <i className="fas fa-check-circle"></i> : <i className="fas fa-exclamation-circle"></i>} {toast.msg}
      </div>

      <nav>
        <a href="#home" className="logo" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <span>FITNESS</span>PRO
        </a>
        <div className="nav-links">
          <a href="#programy">Programy</a>
          <a href="#cennik">Cenník</a>
          <a href="#rozvrh">Rozvrh</a>
          <a href="#kontakt">Kontakt</a>
        </div>
        <div className="nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={focusLogin}>Prihlásiť</button>
          <button className="btn btn-acid btn-sm" onClick={focusRegister}>Registrovať</button>
        </div>
        <button className={`nav-hamburger ${navOpen ? 'open' : ''}`} onClick={() => setNavOpen(!navOpen)}>
          <span></span><span></span><span></span>
        </button>
      </nav>

      <div className={`mobile-menu ${navOpen ? 'open' : ''}`}>
        <a href="#programy" onClick={() => setNavOpen(false)}>Programy</a>
        <a href="#cennik" onClick={() => setNavOpen(false)}>Cenník</a>
        <a href="#rozvrh" onClick={() => setNavOpen(false)}>Rozvrh</a>
        <a href="#kontakt" onClick={() => setNavOpen(false)}>Kontakt</a>
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button className="btn btn-ghost btn-lg" onClick={focusLogin}>Prihlásiť sa</button>
          <button className="btn btn-acid btn-lg" onClick={focusRegister}>Registrovať</button>
        </div>
      </div>

      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-content">
          <motion.div
            className="hero-left"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="hero-tag">
              <i className="fas fa-crown"></i> Najlepšie fitko v Košiciach
            </div>
            <h1>
              POSUŇ SVOJE<br />
              <span className="highlight">HRANICE</span>
            </h1>
            <p className="hero-sub">Vstúp do sveta profesionálneho coachingu a špičkového vybavenia. Tvoja cesta k premene začína tu.</p>
            <div className="hero-cta">
              <button className="btn btn-acid btn-lg" onClick={focusRegister}>Vytvoriť účet</button>
              <a href="#programy" className="btn btn-ghost btn-lg">Naša ponuka</a>
            </div>
          </motion.div>

          {/* AUTH PANEL */}
          <motion.div
            className="auth-panel"
            ref={authPanelRef}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="auth-panel-header">
              <div className="auth-panel-title">{authMode === 'login' ? 'Vitaj späť' : 'Vytvor účet'}</div>
              <div className="auth-panel-sub">{authMode === 'login' ? 'Prihlás sa do svojho profilu' : 'Registrácia zaberie len minútu'}</div>
            </div>
            <div className="tabs">
              <button className={`tab-btn ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>
                {authMode === 'login' && <motion.div layoutId="auth-tab" className="tab-pill" />}
                <span className="tab-text">Prihlásiť sa</span>
              </button>
              <button className={`tab-btn ${authMode === 'register' ? 'active' : ''}`} onClick={() => setAuthMode('register')}>
                {authMode === 'register' && <motion.div layoutId="auth-tab" className="tab-pill" />}
                <span className="tab-text">Registrovať sa</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* LOGIN */}
              {authMode === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <input className="form-input" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Tvoj email" autoComplete="email" />
                  <input className="form-input" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="Tvoje heslo" onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }} />
                  <button className="btn btn-acid btn-block btn-lg" style={{ marginTop: '1rem' }} disabled={loading} onClick={doLogin}>
                    {loading ? 'Spracovávam...' : 'Prihlásiť sa'}
                  </button>
                  {loginMsg.text && <div className="form-msg show-err" style={{ marginTop: '1rem' }}>{loginMsg.text}</div>}
                </motion.div>
              )}

              {/* REGISTER */}
              {authMode === 'register' && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <input className="form-input" type="text" value={rName} onChange={e => setRName(e.target.value)} placeholder="Meno a priezvisko" />
                  <input className="form-input" type="email" value={rEmail} onChange={e => setREmail(e.target.value)} placeholder="Tvoj email" />
                  <input className="form-input" type="password" value={rPass} onChange={e => setRPass(e.target.value)} placeholder="Tvoje heslo" />
                  <button className="btn btn-acid btn-block btn-lg" style={{ marginTop: '1rem' }} disabled={loading} onClick={doRegister}>
                    {loading ? 'Registrujem...' : 'Začať trénovať'}
                  </button>
                  {regMsg.text && <div className="form-msg show-err" style={{ marginTop: '1rem' }}>{regMsg.text}</div>}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* PROGRAMY */}
      <section className="section" id="programy">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Naša ponuka</span>
            <h2 className="section-title">PROGRAMY PODĽA<br />TVOJICH PREDSTÁV</h2>
          </div>
          <div className="prog-grid">
            <div className="prog-card large">
              <div className="prog-num">01</div>
              <div className="prog-name">Osobný tréning</div>
              <p className="prog-desc">Individuálny prístup trénera, ktorý ťa prevedie každým jedným pohybom pre maximálne výsledky bez zranení.</p>
              <button className="btn btn-acid" style={{ width: 'fit-content' }}>Zistiť viac</button>
            </div>
            <div className="prog-card">
              <div className="prog-num">02</div>
              <div className="prog-name">Skupinové lekcie</div>
              <p className="prog-desc">Energia kolektívu, ktorá ťa nenechá prestať. CrossFit, Joga, Pilates a mnoho iného.</p>
            </div>
            <div className="prog-card">
              <div className="prog-num">03</div>
              <div className="prog-name">Online coaching</div>
              <p className="prog-desc">Trénuj kdekoľvek s plnou podporou profesionála cez našu mobilnú aplikáciu.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ROZVRH */}
      <section className="section" style={{ background: '#080808' }} id="rozvrh">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Plán lekcií</span>
            <h2 className="section-title">ROZVRH TÝŽDŇA</h2>
          </div>
          <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px solid var(--border)', padding: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#888' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1.5rem', textAlign: 'left', color: 'var(--accent)' }}>Čas</th>
                  <th style={{ padding: '1.5rem', textAlign: 'left' }}>Pondelok</th>
                  <th style={{ padding: '1.5rem', textAlign: 'left' }}>Utorok</th>
                  <th style={{ padding: '1.5rem', textAlign: 'left' }}>Streda</th>
                  <th style={{ padding: '1.5rem', textAlign: 'left' }}>Štvrtok</th>
                  <th style={{ padding: '1.5rem', textAlign: 'left' }}>Piatok</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1.5rem', fontWeight: '800' }}>07:00</td>
                  <td style={{ padding: '1.5rem' }}><span style={{ color: '#FFF' }}>CrossFit</span></td>
                  <td style={{ padding: '1.5rem' }}>—</td>
                  <td style={{ padding: '1.5rem' }}><span style={{ color: '#FFF' }}>CrossFit</span></td>
                  <td style={{ padding: '1.5rem' }}>—</td>
                  <td style={{ padding: '1.5rem' }}><span style={{ color: '#FFF' }}>CrossFit</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1.5rem', fontWeight: '800' }}>12:00</td>
                  <td style={{ padding: '1.5rem' }}>—</td>
                  <td style={{ padding: '1.5rem' }}><span style={{ color: '#FFF' }}>Boxing</span></td>
                  <td style={{ padding: '1.5rem' }}>—</td>
                  <td style={{ padding: '1.5rem' }}><span style={{ color: '#FFF' }}>Boxing</span></td>
                  <td style={{ padding: '1.5rem' }}>—</td>
                </tr>
                <tr>
                  <td style={{ padding: '1.5rem', fontWeight: '800' }}>18:00</td>
                  <td style={{ padding: '1.5rem' }}><span style={{ color: '#FFF' }}>HIIT</span></td>
                  <td style={{ padding: '1.5rem' }}><span style={{ color: '#FFF' }}>Yoga</span></td>
                  <td style={{ padding: '1.5rem' }}><span style={{ color: '#FFF' }}>HIIT</span></td>
                  <td style={{ padding: '1.5rem' }}><span style={{ color: '#FFF' }}>Yoga</span></td>
                  <td style={{ padding: '1.5rem' }}><span style={{ color: '#FFF' }}>HIIT</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section" id="cennik">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Investuj do seba</span>
            <h2 className="section-title">CENNÍK ČLENSTVA</h2>
          </div>
          <div className="price-grid">
            <div className="price-card">
              <div className="price-name">Študentske</div>
              <p style={{ color: '#888', fontSize: '0.85rem' }}>Zľavnené pre študentov ISIC</p>
              <div className="price-amount"><sup>€</sup>29<sub>/mes</sub></div>
              <ul className="price-features" style={{ listStyle: 'none', padding: 0 }}>
                <li><i className="fas fa-check"></i> Neobmedzený prístup 24/7</li>
                <li><i className="fas fa-check"></i> QR vstupný kód</li>
                <li style={{ opacity: 0.4 }}><i className="fas fa-times"></i> 4 skupinové lekcie / mes</li>
                <li style={{ opacity: 0.4 }}><i className="fas fa-times"></i> Vstupná konzultácia</li>
                <li style={{ opacity: 0.4 }}><i className="fas fa-times"></i> Osobný tréner</li>
              </ul>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 'auto' }} onClick={focusRegister}>Začať</button>
            </div>
            <div className="price-card featured">
              <div className="price-featured-tag">Najpopulárnejší</div>
              <div className="price-name">Štandard</div>
              <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.85rem' }}>Najpoužívanejšie členstvo</p>
              <div className="price-amount"><sup>€</sup>49<sub>/mes</sub></div>
              <ul className="price-features" style={{ listStyle: 'none', padding: 0 }}>
                <li><i className="fas fa-check"></i> Neobmedzený prístup 24/7</li>
                <li><i className="fas fa-check"></i> Neobmedzené skupinové lekcie</li>
                <li><i className="fas fa-check"></i> 2× osobný tréner / mes</li>
                <li><i className="fas fa-check"></i> QR vstupný kód</li>
                <br />
              </ul>
              <button className="btn btn-acid btn-block" style={{ marginTop: 'auto', background: '#000', color: '#E0FF00' }} onClick={focusRegister}>Začať</button>
            </div>
            <div className="price-card">
              <div className="price-name">Premium</div>
              <p style={{ color: '#888', fontSize: '0.85rem' }}>Neobmedzený vstup + sauna</p>
              <div className="price-amount"><sup>€</sup>79<sub>/mes</sub></div>
              <ul className="price-features" style={{ listStyle: 'none', padding: 0 }}>
                <li><i className="fas fa-check"></i> Všetko zo Standard</li>
                <li><i className="fas fa-check"></i> 8× osobný tréner / mes</li>
                <li><i className="fas fa-check"></i> Dedikovaný tréner</li>
                <li><i className="fas fa-check"></i> Online coaching 24/7</li>
              </ul>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 'auto' }} onClick={focusRegister}>Začať</button>
            </div>
          </div>
        </div>
      </section>

      {/* KONTAKT */}
      <section className="section" id="kontakt">
        <div className="container">
          <span className="section-label">Nájdi nás</span>
          <h2 className="section-title">KONTAKT</h2>
          <div className="contact-grid">
            <div className="contact-items">
              <div className="contact-item">
                <div className="c-icon"><i className="fa-solid fa-house"></i></div>
                <div className="c-text"><h4>Adresa</h4><p>Jedlíkova 9, 040 01 Košice</p></div>
              </div>
              <div className="contact-item">
                <div className="c-icon"><i className="fa-solid fa-clock"></i></div>
                <div className="c-text"><h4>Otváracie hodiny</h4><p>Po — Pi: 6:00 – 22:00<br />So — Ne: 8:00 – 20:00</p></div>
              </div>
              <div className="contact-item">
                <div className="c-icon"><i className="fa-solid fa-phone"></i></div>
                <div className="c-text"><h4>Telefón</h4><p>+421 905 123 456</p></div>
              </div>
              <div className="contact-item">
                <div className="c-icon"><i className="fa-solid fa-envelope"></i></div>
                <div className="c-text"><h4>Email</h4><p>info@fitnesspro.sk</p></div>
              </div>
            </div>
            <div className="contact-form">
              <h3>Napíšte nám</h3>
              <div className="form-group">
                <label className="form-label"><i className="fas fa-user-gear" style={{ marginRight: '0.8rem' }}></i>Meno</label>
                <input className="form-input" placeholder="Ján Novák" />
              </div>
              <div className="form-group">
                <label className="form-label"><i className="fas fa-paper-plane" style={{ marginRight: '0.8rem' }}></i>Email</label>
                <input className="form-input" placeholder="tvoj@email.sk" />
              </div>
              <div className="form-group">
                <label className="form-label"><i className="fas fa-message" style={{ marginRight: '0.8rem' }}></i>Správa</label>
                <textarea className="form-input" rows="4" placeholder="Vaša správa..."></textarea>
              </div>
              <button className="btn btn-acid btn-block btn-lg" style={{ marginTop: '1rem' }} onClick={() => showToast('Správa odoslaná!', 'ok')}>
                <i className="fas fa-paper-plane" style={{ marginRight: '0.8rem' }}></i>Odoslať správu
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo"><span>FITNESS</span>PRO</div>
            <p>Profesionálne fitness centrum na juhu Košíc. Tréningy, ktoré menia životy od roku 2026.</p>
          </div>
          <div className="footer-col">
            <h4>Navigácia</h4>
            <ul>
              <li><a href="#programy"><i className="fas fa-chevron-right" style={{ fontSize: '0.7rem', marginRight: '0.8rem', color: 'var(--accent)' }}></i>Programy</a></li>
              <li><a href="#cennik"><i className="fas fa-chevron-right" style={{ fontSize: '0.7rem', marginRight: '0.8rem', color: 'var(--accent)' }}></i>Cenník</a></li>
              <li><a href="#rozvrh"><i className="fas fa-chevron-right" style={{ fontSize: '0.7rem', marginRight: '0.8rem', color: 'var(--accent)' }}></i>Rozvrh</a></li>
              <li><a href="#kontakt"><i className="fas fa-chevron-right" style={{ fontSize: '0.7rem', marginRight: '0.8rem', color: 'var(--accent)' }}></i>Kontakt</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Programy</h4>
            <ul>
              <li><a href="#"><i className="fas fa-caret-right" style={{ fontSize: '0.7rem', marginRight: '0.8rem', color: 'var(--accent)' }}></i>CrossFit</a></li>
              <li><a href="#"><i className="fas fa-caret-right" style={{ fontSize: '0.7rem', marginRight: '0.8rem', color: 'var(--accent)' }}></i>Boxing</a></li>
              <li><a href="#"><i className="fas fa-caret-right" style={{ fontSize: '0.7rem', marginRight: '0.8rem', color: 'var(--accent)' }}></i>Yoga</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Účet</h4>
            <ul>
              <li><a href="#" onClick={(e) => { e.preventDefault(); focusLogin(); }}><i className="fas fa-user" style={{ fontSize: '0.8rem', marginRight: '0.8rem' }}></i>Prihlásiť sa</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); focusRegister(); }}><i className="fas fa-user-plus" style={{ fontSize: '0.8rem', marginRight: '0.8rem' }}></i>Registrácia</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Fitness Pro. Všetky práva vyhradené.</p>
          <div className="socials">
            <a href="#" aria-label="Instagram"><i className="fa-brands fa-instagram"></i></a>
            <a href="#" aria-label="Facebook"><i className="fa-brands fa-facebook-f"></i></a>
            <a href="#" aria-label="TikTok"><i className="fa-brands fa-tiktok"></i></a>
            <a href="#" aria-label="YouTube"><i className="fa-brands fa-youtube"></i></a>
            <a href="#" aria-label="X (Twitter)"><i className="fa-brands fa-x-twitter"></i></a>
            <a href="#" aria-label="LinkedIn"><i className="fa-brands fa-linkedin-in"></i></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
