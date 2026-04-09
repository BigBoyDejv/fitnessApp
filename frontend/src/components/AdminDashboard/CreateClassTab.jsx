import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function CreateClassTab() {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Silový tréning',
    startTime: '',
    durationMinutes: 60,
    capacity: 20,
    location: '',
    description: ''
  });
  
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    authenticatedFetch('/api/admin/profiles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const onlyTrainers = data.filter(u => u.role === 'trainer' && u.active !== false);
          setTrainers(onlyTrainers);
        }
      })
      .catch(e => console.error('Error loading trainers', e));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const { name, type, startTime, durationMinutes, capacity, location, description } = formData;
    
    if (!name.trim() || !startTime) {
      setMsg({ text: 'Prosím, zadajte názov a čas lekcie.', type: 'err' });
      return;
    }
    if (!selectedTrainer) {
      setMsg({ text: 'Priraďte k lekcii trénera.', type: 'err' });
      return;
    }

    setIsSubmitting(true);
    setMsg({ text: '', type: '' });

    const payload = {
      name: name.trim(),
      type,
      startTime,
      durationMinutes: Number(durationMinutes) || 60,
      capacity: Number(capacity) || 20,
      location: location.trim() || 'Hlavná sála',
      description: description.trim(),
      instructor: selectedTrainer.fullName,
      trainerId: selectedTrainer.id
    };

    try {
      const res = await authenticatedFetch('/api/classes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Nepodarilo sa vytvoriť lekciu');
      }
      
      setMsg({ text: 'Lekcia bola úspešne pridaná do rozvrhu!', type: 'ok' });
      
      setFormData({
        name: '',
        type: 'Silový tréning',
        startTime: '',
        durationMinutes: 60,
        capacity: 20,
        location: '',
        description: ''
      });
      setSelectedTrainer(null);
      
      setTimeout(() => setMsg({ text: '', type: '' }), 5000);
    } catch (e) {
      setMsg({ text: e.message, type: 'err' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTrainers = trainers.filter(t => 
    (t.fullName || '').toLowerCase().includes(search.toLowerCase()) || 
    (t.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (n) => n ? n.split(' ').map(x => x[0]).join('').toUpperCase().substring(0, 2) : '??';

  return (
    <div className="animate-in create-class-responsive-grid" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Container with responsive columns */}
      <div className="layout-content-grid">
        
        {/* Main Form Panel */}
        <div className="panel" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 36, height: 36, background: 'rgba(200,255,0,0.1)', color: 'var(--acid)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-calendar-plus"></i>
              </div>
              <span className="pt">PLÁNOVANIE NOVEJ LEKCIE</span>
            </div>
          </div>
          
          <div className="pb" style={{ padding: 'var(--responsive-padding, 2rem)' }}>
            
            {/* Step 1: Instructor */}
            <div className="fg" style={{ position: 'relative', marginBottom: '2.5rem' }}>
              <label className="fl" style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.8rem', display: 'block' }}>
                <i className="fas fa-user-tie" style={{marginRight: '0.5rem'}}></i> Inštruktor / Tréner *
              </label>
              
              {!selectedTrainer ? (
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-search" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}></i>
                  <input 
                    className="fi" 
                    placeholder="Vyhľadajte meno trénera..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    onFocus={() => setPickerOpen(true)}
                    style={{ paddingLeft: '3rem', height: '56px', borderRadius: '14px', border: '1.5px solid var(--border)' }}
                  />
                  {pickerOpen && (search.length > 0 || filteredTrainers.length > 0) && (
                    <div className="glass shadow-xl" style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 50, borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)', background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(20px)', maxHeight: '200px', overflowY: 'auto' }}>
                      {filteredTrainers.length > 0 ? filteredTrainers.map(t => (
                        <div 
                          key={t.id} 
                          className="hover-bright"
                          style={{ padding: '0.8rem 1.2rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}
                          onClick={() => { setSelectedTrainer(t); setPickerOpen(false); setSearch(''); }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900 }}>
                            {getInitials(t.fullName)}
                          </div>
                          <div>
                             <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{t.fullName}</div>
                             <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{t.email}</div>
                          </div>
                        </div>
                      )) : <div style={{ padding: '1rem', color: 'var(--muted)', textAlign: 'center' }}>Nenašli sa žiadni tréneri</div>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem', background: 'rgba(200,255,0,0.05)', borderRadius: '14px', border: '1px solid rgba(200,255,0,0.2)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--acid)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 950 }}>
                    {getInitials(selectedTrainer.fullName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: 'var(--acid)', fontSize: '1.05rem', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedTrainer.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Certifikovaný inštruktor fitness</div>
                  </div>
                  <button className="btn-icon" onClick={() => setSelectedTrainer(null)} style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <i className="fas fa-sync-alt"></i>
                  </button>
                </div>
              )}
            </div>
            
            {/* Form Fields Grid */}
            <div className="form-responsive-rows">
               {/* Line 1: Name and Type */}
               <div className="form-row-grid split-70-30">
                  <div className="fg">
                     <label className="fl"><i className="fas fa-heading" style={{marginRight:'0.4rem'}}></i> Názov lekcie *</label>
                     <input className="fi" name="name" placeholder="napr. Crossfit" value={formData.name} onChange={handleInputChange} style={{ borderRadius: '12px', height: '52px' }} />
                  </div>
                  <div className="fg">
                     <label className="fl">Typ</label>
                     <select className="fi" name="type" value={formData.type} onChange={handleInputChange} style={{ borderRadius: '12px', height: '52px' }}>
                        <option value="Joga">🧘 Joga</option>
                        <option value="Kardio">⚡ Kardio</option>
                        <option value="Silový tréning">🏋️ Silový</option>
                        <option value="Crossfit">🤸 Crossfit</option>
                        <option value="Pilates">🩰 Pilates</option>
                        <option value="Box">🥊 Box</option>
                        <option value="Iné">🔹 Iné</option>
                     </select>
                  </div>
               </div>

               {/* Line 2: Time and Duration */}
               <div className="form-row-grid split-50-50">
                  <div className="fg">
                     <label className="fl"><i className="fas fa-clock" style={{marginRight:'0.4rem'}}></i> Čas začiatku *</label>
                     <input className="fi" type="datetime-local" name="startTime" value={formData.startTime} onChange={handleInputChange} style={{ borderRadius: '12px', height: '52px', colorScheme: 'dark' }} />
                  </div>
                  <div className="fg">
                     <label className="fl"><i className="fas fa-hourglass-half" style={{marginRight:'0.4rem'}}></i> Trvanie (min)</label>
                     <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input className="fi" type="number" name="durationMinutes" value={formData.durationMinutes} onChange={handleInputChange} style={{ borderRadius: '12px', height: '52px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                           <button className="btn btn-ghost" style={{ padding: '0 8px', height: '24px', fontSize: '0.6rem', borderRadius: '6px' }} onClick={() => setFormData({...formData, durationMinutes: 45})}>45</button>
                           <button className="btn btn-ghost" style={{ padding: '0 8px', height: '24px', fontSize: '0.6rem', borderRadius: '6px' }} onClick={() => setFormData({...formData, durationMinutes: 60})}>60</button>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Line 3: Location and Capacity */}
               <div className="form-row-grid split-70-30">
                  <div className="fg">
                     <label className="fl"><i className="fas fa-map-marker-alt" style={{marginRight:'0.4rem'}}></i> Lokácia</label>
                     <input className="fi" name="location" placeholder="napr. Sála 1" value={formData.location} onChange={handleInputChange} style={{ borderRadius: '12px', height: '52px' }} />
                  </div>
                  <div className="fg">
                     <label className="fl"><i className="fas fa-users" style={{marginRight:'0.4rem'}}></i> Kapacita</label>
                     <input className="fi" type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} style={{ borderRadius: '12px', height: '52px', textAlign: 'center', fontWeight: 900 }} />
                  </div>
               </div>
            </div>

            <div className="fg" style={{ marginBottom: '2.5rem' }}>
               <label className="fl" style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.8rem' }}>Popis lekcie</label>
               <textarea 
                  className="fi" 
                  name="description" 
                  rows="3" 
                  placeholder="Detaily lekcie..." 
                  value={formData.description} 
                  onChange={handleInputChange}
                  style={{ borderRadius: '14px', padding: '1rem', resize: 'none', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
               />
            </div>

            <button className="btn btn-acid btn-block" onClick={handleSubmit} disabled={isSubmitting} style={{ height: '60px', borderRadius: '18px', fontSize: '1.05rem', fontWeight: 950, boxShadow: '0 15px 35px rgba(200,255,0,0.2)' }}>
              {isSubmitting ? <span className="spinner" style={{width: 24, height: 24}}></span> : <><i className="fas fa-calendar-check" style={{marginRight: '0.8rem'}}></i> POTVRDIŤ A ZVEREJNIŤ LEKCIU</>}
            </button>

            {msg.text && (
               <div className={`fm ${msg.type} animate-in`} style={{ marginTop: '1.5rem', borderRadius: '14px', padding: '1.2rem', textAlign: 'center', fontWeight: 700 }}>
                  <i className={`fas fa-${msg.type === 'ok' ? 'check-circle' : 'exclamation-circle'}`} style={{marginRight: '0.6rem'}}></i> {msg.text}
               </div>
            )}
          </div>
        </div>

        {/* Sidebar: Live Preview (Hidden on small screens via CSS) */}
        <div className="preview-sidebar">
           <div className="panel" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', position: 'sticky', top: '1rem', borderRadius: '24px' }}>
              <div className="ph" style={{ justifyContent: 'center' }}>
                 <span className="pt" style={{ fontSize: '0.75rem', opacity: 0.6 }}>NÁHĽAD V ROZVRHU</span>
              </div>
              <div className="pb" style={{ padding: '1.5rem' }}>
                 <div className="glass shadow-2xl" style={{ borderRadius: '22px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ height: '110px', background: 'linear-gradient(135deg, var(--acid) 0%, #a6cc00 100%)', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                       <div style={{ color: '#000', fontSize: '0.62rem', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{formData.type}</div>
                       <div style={{ color: '#000', fontSize: '1.3rem', fontWeight: 950, fontFamily: 'var(--font-d)', lineHeight: 1.1 }}>{formData.name || 'Názov lekcie'}</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.5)' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, border: '1px solid var(--border)' }}>
                             {getInitials(selectedTrainer?.fullName)}
                          </div>
                          <div>
                             <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{selectedTrainer?.fullName || 'Vyberte trénera'}</div>
                             <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>Hlavný inštruktor</div>
                          </div>
                       </div>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <div>
                             <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.2rem', fontWeight: 800 }}>ČAS</div>
                             <div style={{ fontSize: '0.85rem', fontWeight: 900 }}>{formData.startTime ? new Date(formData.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</div>
                          </div>
                          <div>
                             <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.2rem', fontWeight: 800 }}>KAPACITA</div>
                             <div style={{ fontSize: '0.85rem', fontWeight: 900 }}>0 / {formData.capacity}</div>
                          </div>
                       </div>
                    </div>
                 </div>
                 
                 <div style={{ marginTop: '2rem', padding: '1.2rem', background: 'rgba(200,255,0,0.03)', borderRadius: '16px', border: '1px dashed rgba(200,255,0,0.2)', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                    <i className="fas fa-info-circle" style={{ color: 'var(--acid)', marginRight: '0.5rem' }}></i>
                    Po vytvorení bude lekcia okamžite zverejnená členom fitness centra.
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
