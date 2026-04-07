import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function TrainersTab({ onMessage }) {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [curSlide, setCurSlide] = useState(0);

  const staticTrainers = [
      { id: 's1', fullName: 'Martin Horváth', specialization: 'CrossFit & Silový tréning', bio: 'Certifikovaný CrossFit tréner s 8 rokmi skúseností. Špecializuje sa na funkčný tréning a budovanie sily.', grad: '135deg,#C8FF00,#00FFD1' },
      { id: 's2', fullName: 'Lucia Kováčová', specialization: 'Joga & Pilates', bio: 'Inštruktorka jogy a pilates. Pomáha klientom nájsť rovnováhu medzi telom a mysľou.', grad: '135deg,#FF2D55,#FF9500' },
      { id: 's3', fullName: 'Peter Varga', specialization: 'Box & Bojové umenia', bio: 'Profesionálny boxer a tréner bojových umení. 10 rokov v ringu, teraz odovzdáva skúsenosti ďalej.', grad: '135deg,#0A84FF,#00FFD1' },
      { id: 's4', fullName: 'Zuzana Novák', specialization: 'Body Pump & Výživa', bio: 'Odborníčka na skupinové cvičenie a výživové poradenstvo. Pomáha dosiahnuť ciele zdravo a trvalo.', grad: '135deg,#C8FF00,#FF9500' },
      { id: 's5', fullName: 'Tomáš Sloboda', specialization: 'HIIT & Funkčný tréning', bio: 'HIIT špecialista s vášňou pre funkčný tréning. Každý tréning je iný — nikdy sa nenudíš.', grad: '135deg,#FF2D55,#C8FF00' },
      { id: 's6', fullName: 'Andrea Blaho', specialization: 'Spinning & Kardio', bio: 'Spinning inštruktorka a kardio nadšenkyňa. Jej hodiny sú plné energie a motivácie.', grad: '135deg,#0A84FF,#FF2D55' },
  ];

  useEffect(() => {
    loadTrainers();
  }, []);

  const loadTrainers = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/trainer/list?active=true');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          const merged = data.map((t, i) => ({
             ...t,
             bio: t.bio && t.bio.trim() ? t.bio : (staticTrainers[i % staticTrainers.length]?.bio || 'Špičkový tréner s individuálnym prístupom.'),
             grad: staticTrainers[i % staticTrainers.length]?.grad || '135deg,#C8FF00,#00FFD1'
          }));
          setTrainers(merged);
        } else {
          setTrainers(staticTrainers);
        }
      } else {
        setTrainers(staticTrainers);
      }
    } catch {
      setTrainers(staticTrainers);
    } finally {
      setLoading(false);
      setCurSlide(0);
    }
  };

  const nextSlide = () => {
    if (!trainers.length) return;
    setCurSlide(v => (v + 1) % trainers.length);
  };

  const prevSlide = () => {
    if (!trainers.length) return;
    setCurSlide(v => (v - 1 + trainers.length) % trainers.length);
  };

  return (
    <div className="ps active" id="pg-trainers">
      <div className="panel">
        <div className="ph">
          <span className="pt">Naši tréneri</span>
          <button className="btn btn-ghost btn-sm" onClick={loadTrainers}><i className="fas fa-sync-alt" /></button>
        </div>
        <div className="pb" style={{ padding: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <div className="trainer-carousel-wrap" id="trainerCarousel">
              <div 
                className="trainer-carousel-track" 
                id="trainerTrack"
                style={{ transform: `translateX(-${curSlide * 100}%)` }}
              >
                {loading ? (
                  <div style={{ padding: '2rem', width: '100%', textAlign: 'center' }}><span className="spin"></span></div>
                ) : trainers.map((t, i) => {
                  const ini = (t.fullName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const bgStyle = t.avatarUrl
                      ? { backgroundImage: `url('${t.avatarUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: `linear-gradient(${t.grad || '135deg,#C8FF00,#00FFD1'})` };
                  
                  return (
                    <div key={t.id || i} className="trainer-slide" onClick={(e) => e.currentTarget.classList.toggle('expanded')}>
                       <div className="trainer-slide-bg" style={bgStyle} />
                       {!t.avatarUrl && <div className="trainer-slide-initials">{ini}</div>}
                       <div className="trainer-slide-overlay" />
                       <div className="trainer-slide-content">
                          <div className="trainer-slide-name">{t.fullName || '—'}</div>
                           <div className="trainer-slide-spec">{t.specialization || 'Tréner'}</div>
                           <div className="trainer-slide-bio">{t.bio}</div>
                           <div style={{ marginTop: '1.2rem' }}>
                              <button 
                                className="btn btn-acid btn-sm" 
                                style={{ borderRadius: '8px', padding: '0.6rem 1.2rem', textTransform: 'uppercase', fontWeight: 800, fontSize: '0.7rem' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onMessage) onMessage(t.id);
                                }}
                              >
                                <i className="fas fa-paper-plane" style={{ marginRight: '0.6rem' }} /> Napísať správu
                              </button>
                           </div>
                       </div>
                    </div>
                  );
                })}
              </div>
              <button className="trainer-carousel-btn trainer-carousel-prev" onClick={prevSlide}><i className="fas fa-chevron-left"></i></button>
              <button className="trainer-carousel-btn trainer-carousel-next" onClick={nextSlide}><i className="fas fa-chevron-right"></i></button>
              <div className="trainer-carousel-dots" id="trainerDots">
                {trainers.map((_, i) => (
                  <div 
                    key={i} 
                    className={`trainer-dot ${i === curSlide ? 'active' : ''}`} 
                    onClick={() => setCurSlide(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
