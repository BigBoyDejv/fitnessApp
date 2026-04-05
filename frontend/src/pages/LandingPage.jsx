import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <div className={`toast ${toast.type === 'ok' ? 't-ok' : 't-err'} ${toast.show ? 'show' : ''}`} id="toast">
        {toast.type === 'ok' ? <i className="fas fa-check-circle"></i> : <i className="fas fa-exclamation-circle"></i>} {toast.msg}
      </div>

      <nav>
        <div className="logo">FITNESS PRO</div>
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

      {navOpen && (
        <div className="mobile-menu open">
          <a href="#programy" onClick={() => setNavOpen(false)}>Programy</a>
          <a href="#cennik" onClick={() => setNavOpen(false)}>Cenník</a>
          <a href="#rozvrh" onClick={() => setNavOpen(false)}>Rozvrh</a>
          <a href="#kontakt" onClick={() => setNavOpen(false)}>Kontakt</a>
          <a href="#" onClick={(e) => { e.preventDefault(); focusLogin(); }} style={{ color: 'var(--text)' }}>Prihlásiť sa</a>
          <a href="#" onClick={(e) => { e.preventDefault(); focusRegister(); }} style={{ color: 'var(--acid)' }}>Registrovať</a>
        </div>
      )}

      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-grid-bg"></div>
        <div className="hero-glow"></div>

        <div className="hero-left">
          <div className="hero-tag">Košice • Est. 2026</div>
          <h1>
            PREMEN SA<br />
            <span className="line2">NA NAJLEPŠIU</span>
            <span className="line3">VERZIU SEBA</span>
          </h1>
          <p className="hero-sub">Profesionálne vybavenie, špičkový tréning a komunita, ktorá ťa posunie ďalej. Prvý tréning úplne zdarma.</p>
          <div className="hero-cta">
            <button className="btn btn-acid btn-lg" onClick={focusRegister}>Začať zadarmo</button>
            <a href="#programy" className="btn btn-ghost btn-lg">Naše programy</a>
          </div>
          <div className="hero-stats">
            <div><div className="stat-num">1200+</div><div className="stat-label">Aktívnych členov</div></div>
            <div><div className="stat-num">40+</div><div className="stat-label">Skupin. lekcií</div></div>
            <div><div className="stat-num">12</div><div className="stat-label">Certif. tréneri</div></div>
          </div>
        </div>

        {/* AUTH PANEL */}
        <div className="auth-panel" ref={authPanelRef}>
          <div className="auth-panel-header">
            <div className="auth-panel-title">{authMode === 'login' ? 'Vitaj späť' : 'Vytvor účet'}</div>
            <div className="auth-panel-sub">{authMode === 'login' ? 'Prihlásiť sa do svojho účtu' : 'Registrácia je zadarmo'}</div>
          </div>
          <div className="tabs">
            <button className={`tab-btn ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>Prihlásiť sa</button>
            <button className={`tab-btn ${authMode === 'register' ? 'active' : ''}`} onClick={() => setAuthMode('register')}>Registrácia</button>
          </div>

          {/* LOGIN */}
          {authMode === 'login' && (
            <div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="tvoj@email.sk" autoComplete="email" />
              </div>
              <div className="form-group">
                <label className="form-label">Heslo</label>
                <input className="form-input" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }} />
              </div>
              <button className="btn btn-acid btn-block" disabled={loading} onClick={doLogin}>
                {loading ? <><span className="spinner"></span> Načítavam...</> : 'Prihlásiť sa'}
              </button>
              {loginMsg.text && (
                <div className={`form-msg ${loginMsg.type === 'err' ? 'show-err' : 'show-ok'}`}>
                  {loginMsg.text}
                </div>
              )}
            </div>
          )}

          {/* REGISTER */}
          {authMode === 'register' && (
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Celé meno *</label>
                  <input className="form-input" type="text" value={rName} onChange={e => setRName(e.target.value)} placeholder="Ján Novák" />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefón</label>
                  <input className="form-input" type="tel" value={rPhone} onChange={e => setRPhone(e.target.value)} placeholder="+421..." />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={rEmail} onChange={e => setREmail(e.target.value)} placeholder="tvoj@email.sk" />
              </div>
              <div className="form-group">
                <label className="form-label">Heslo *</label>
                <input className="form-input" type="password" value={rPass} onChange={e => setRPass(e.target.value)} placeholder="Minimálne 6 znakov" />
              </div>
              <button className="btn btn-acid btn-block" disabled={loading} onClick={doRegister}>
                {loading ? <><span className="spinner"></span> Načítavam...</> : 'Vytvoriť účet'}
              </button>
              {regMsg.text && (
                <div className={`form-msg ${regMsg.type === 'err' ? 'show-err' : 'show-ok'}`}>
                  {regMsg.text}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* PROGRAMY */}
      <section className="section" id="programy">
        <div className="container">
          <span className="section-label">Čo ponúkame</span>
          <h2 className="section-title">VYBER SI SVOJ <em>PROGRAM</em></h2>
          <div className="prog-grid">
            <div className="prog-card">
              <div className="prog-num">01</div>
              <div className="prog-name">Osobný tréning</div>
              <p className="prog-desc">Individuálny plán navrhnutý presne pre tvoje ciele a fyzickú kondíciu. Korekcia techniky a garantované výsledky s certifikovaným trénerom.</p>
              <div className="prog-price">35€ <span>/ 60 min</span></div>
            </div>
            <div className="prog-card">
              <div className="prog-num">02</div>
              <div className="prog-name">Skupinové lekcie</div>
              <p className="prog-desc">CrossFit, Joga, Body Pump, HIIT, Boxing — každý deň nová výzva a energia. Tréning v skupinovej dynamike, ktorá ťa ťahá vpred.</p>
              <div className="prog-price">od 29€ <span>/ mesiac</span></div>
            </div>
            <div className="prog-card">
              <div className="prog-num">03</div>
              <div className="prog-name">Online coaching</div>
              <p className="prog-desc">Tréningový a stravovací plán na mieru, pravidelná kontrola pokroku a podpora 24/7 priamo na tvojom telefóne. Kdekoľvek, kedykoľvek.</p>
              <div className="prog-price">79€ <span>/ mesiac</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ROZVRH */}
      <section className="section" style={{ paddingTop: 0 }} id="rozvrh">
        <div className="container">
          <span className="section-label">Týždenný plán</span>
          <h2 className="section-title">ROZVRH <em>LEKCIÍ</em></h2>
          <table className="sched-table">
            <thead><tr><th>Čas</th><th>Pondelok</th><th>Utorok</th><th>Streda</th><th>Štvrtok</th><th>Piatok</th></tr></thead>
            <tbody>
              <tr><td>07:00</td><td><span className="badge b-acid">CrossFit</span></td><td>—</td><td><span className="badge b-acid">CrossFit</span></td><td>—</td><td><span className="badge b-acid">CrossFit</span></td></tr>
              <tr><td>09:00</td><td>—</td><td><span className="badge b-cyan">Joga</span></td><td>—</td><td><span className="badge b-cyan">Joga</span></td><td>—</td></tr>
              <tr><td>12:00</td><td><span className="badge b-red">Boxing</span></td><td><span className="badge b-red">Boxing</span></td><td>—</td><td><span className="badge b-red">Boxing</span></td><td><span className="badge b-red">Boxing</span></td></tr>
              <tr><td>17:00</td><td><span className="badge b-cyan">Body Pump</span></td><td>—</td><td><span className="badge b-cyan">Body Pump</span></td><td>—</td><td><span className="badge b-cyan">Body Pump</span></td></tr>
              <tr><td>19:00</td><td><span className="badge b-acid">HIIT</span></td><td><span className="badge b-acid">HIIT</span></td><td><span className="badge b-acid">HIIT</span></td><td><span className="badge b-acid">HIIT</span></td><td>—</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* CENNIK */}
      <section className="section" id="cennik">
        <div className="container">
          <span className="section-label">Investuj do seba</span>
          <h2 className="section-title">CENNÍK <em>ČLENSTVA</em></h2>
          <div className="price-grid">
            <div className="price-card">
              <div className="price-name">Študentske</div>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Zľavnené pre študentov ISIC</p>
              <div className="price-amount"><sup>€</sup>29<sub>/mes</sub></div>
              <ul className="price-features">
                <li><i className="fas fa-check"></i> Neobmedzený prístup 24/7</li>
                <li><i className="fas fa-check"></i> QR vstupný kód</li>
                <li className="off"><i className="fas fa-times"></i> 4 skupinové lekcie / mes</li>
                <li className="off"><i className="fas fa-times"></i> Vstupná konzultácia</li>
                <li className="off"><i className="fas fa-times"></i> Osobný tréner</li>
                <li className="off"><i className="fas fa-times"></i> Výživový plán</li>
              </ul>
              <button className="btn btn-ghost btn-block" onClick={focusRegister}>Začať</button>
            </div>
            <div className="price-card featured">
              <div className="price-featured-tag">Najpopulárnejší</div>
              <div className="price-name">Štandard</div>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Najpoužívanejšie členstvo</p>
              <div className="price-amount"><sup>€</sup>49<sub>/mes</sub></div>
              <ul className="price-features">
                <li><i className="fas fa-check"></i> Neobmedzený prístup 24/7</li>
                <li><i className="fas fa-check"></i> Neobmedzené skupinové lekcie</li>
                <li><i className="fas fa-check"></i> 2× osobný tréner / mes</li>
                <li><i className="fas fa-check"></i> QR vstupný kód</li>
                <li className="off"><i className="fas fa-times"></i> Výživový plán</li>
                <br /><br />
              </ul>
              <button className="btn btn-acid btn-block" onClick={focusRegister}>Začať</button>
            </div>
            <div className="price-card">
              <div className="price-name">Premium</div>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Neobmedzený vstup + sauna + solárium</p>
              <div className="price-amount"><sup>€</sup>79<sub>/mes</sub></div>
              <ul className="price-features">
                <li><i className="fas fa-check"></i> Všetko z Štandard</li>
                <li><i className="fas fa-check"></i> 8× osobný tréner / mes</li>
                <li><i className="fas fa-check"></i> Dedikovaný tréner</li>
                <li><i className="fas fa-check"></i> Online coaching 24/7</li>
                <li><i className="fas fa-check"></i> Prioritná rezervácia</li>
                <li><i className="fas fa-check"></i> Výživový plán</li>
              </ul>
              <button className="btn btn-ghost btn-block" onClick={focusRegister}>Začať</button>
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
              <div className="contact-item"><div className="c-icon"><i className="fas fa-map-marker-alt"></i></div><div className="c-text"><h4>Adresa</h4><p>Jedlíkova 9<br />040 01 Košice</p></div></div>
              <div className="contact-item"><div className="c-icon"><i className="fas fa-clock"></i></div><div className="c-text"><h4>Otváracie hodiny</h4><p>Po – Pi: 6:00 – 22:00<br />So – Ne: 8:00 – 20:00</p></div></div>
              <div className="contact-item"><div className="c-icon"><i className="fas fa-phone"></i></div><div className="c-text"><h4>Telefón</h4><p>+421 905 123 456</p></div></div>
              <div className="contact-item"><div className="c-icon"><i className="fas fa-envelope"></i></div><div className="c-text"><h4>Email</h4><p>info@fitnesspro.sk</p></div></div>
            </div>
            <div className="contact-form">
              <div className="contact-form-header"><h3>Napíšte nám</h3></div>
              <div className="contact-form-body">
                <div className="form-group"><label className="form-label">Meno</label><input className="form-input" type="text" placeholder="Ján Novák" /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="jan@example.sk" /></div>
                <div className="form-group"><label className="form-label">Správa</label><textarea className="form-input" rows="4" placeholder="Vaša správa..."></textarea></div>
                <button className="btn btn-acid btn-block" onClick={() => showToast('Správa odoslaná!', 'ok')}>Odoslať správu</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">FITNESS PRO</div>
            <p>Profesionálne fitness centrum na juhu Košíc. Tréningy, ktoré menia životy od roku 2026.</p>
          </div>
          <div className="footer-col"><h4>Navigácia</h4><ul><li><a href="#programy">Programy</a></li><li><a href="#cennik">Cenník</a></li><li><a href="#rozvrh">Rozvrh</a></li><li><a href="#kontakt">Kontakt</a></li></ul></div>
          <div className="footer-col"><h4>Programy</h4><ul><li><a href="#">CrossFit</a></li><li><a href="#">Joga</a></li><li><a href="#">Boxing</a></li><li><a href="#">HIIT</a></li></ul></div>
          <div className="footer-col"><h4>Účet</h4><ul><li><a href="#" onClick={(e) => { e.preventDefault(); focusLogin(); }}>Prihlásiť sa</a></li><li><a href="#" onClick={(e) => { e.preventDefault(); focusRegister(); }}>Registrácia</a></li></ul></div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Fitness Pro. Všetky práva vyhradené.</p>
          <div className="socials">
            <a href="#"><i className="fab fa-instagram"></i></a>
            <a href="#"><i className="fab fa-facebook-f"></i></a>
            <a href="#"><i className="fab fa-tiktok"></i></a>
            <a href="#"><i className="fab fa-youtube"></i></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
