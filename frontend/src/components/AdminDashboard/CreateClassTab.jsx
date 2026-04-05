import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function CreateClassTab() {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Joga',
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
    // Load trainers
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
      setMsg({ text: 'Vyplňte polia Názov a Čas.', type: 'err' });
      return;
    }
    if (!selectedTrainer) {
      setMsg({ text: 'Vyberte trénera.', type: 'err' });
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
      location: location.trim(),
      description: description.trim(),
      instructor: selectedTrainer.fullName,
      trainerId: selectedTrainer.id
    };

    try {
      const res = await authenticatedFetch('/api/classes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) throw new Error(data.message || 'Nepodarilo sa vytvoriť lekciu');
      
      setMsg({ text: 'Lekcia úspešne vytvorená!', type: 'ok' });
      
      // Reset form
      setFormData({
        name: '',
        type: 'Joga',
        startTime: '',
        durationMinutes: 60,
        capacity: 20,
        location: '',
        description: ''
      });
      setSelectedTrainer(null);
      
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

  return (
    <div className="panel" style={{ maxWidth: '700px' }}>
      <div className="ph">
        <span className="pt">Vytvoriť novú skupinovú lekciu</span>
        <span className="method m-post" style={{ textTransform: 'none', letterSpacing: 0, padding: '0.18rem 0.55rem' }}>POST /api/classes</span>
      </div>
      <div className="pb">
        <div className="fg" style={{ position: 'relative' }}>
          <label className="fl">Tréner / Inštruktor *</label>
          {!selectedTrainer ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="fi" type="text" placeholder="Hľadaj trénera..." value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setPickerOpen(true)} />
              <button className="btn btn-ghost btn-sm" onClick={() => setPickerOpen(!pickerOpen)}>
                <i className="fas fa-chevron-down"></i>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.15)', borderRadius: 3 }}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--acid)', fontSize: '0.85rem' }}>{selectedTrainer.fullName || '—'}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{selectedTrainer.email || '—'}</div>
              </div>
              <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }} onClick={() => setSelectedTrainer(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          
          {pickerOpen && !selectedTrainer && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 3, zIndex: 200, maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
              {filteredTrainers.length > 0 ? filteredTrainers.map(t => (
                <div key={t.id} style={{ padding: '0.6rem 0.9rem', cursor: 'pointer', fontSize: '0.83rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between' }} onClick={() => { setSelectedTrainer(t); setPickerOpen(false); }}>
                  <span>{t.fullName || '—'} <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>&lt;{t.email}&gt;</span></span>
                </div>
              )) : (
                <div style={{ padding: '0.6rem', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  {trainers.length === 0 ? 'Načítavam trénerov alebo žiadni nie sú dostupní.' : 'Žiadny tréner nenájdený.'}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="fg">
          <label className="fl">Názov lekcie *</label>
          <input className="fi" type="text" name="name" placeholder="napr. Ranná power joga" value={formData.name} onChange={handleInputChange} />
        </div>

        <div className="fr">
          <div className="fg">
             <label className="fl">Kategória / Typ</label>
             <select className="fi" name="type" value={formData.type} onChange={handleInputChange}>
                <option value="Joga">Joga</option>
                <option value="Kardio">Kardio</option>
                <option value="Silový tréning">Silový tréning</option>
                <option value="Crossfit">Crossfit</option>
                <option value="Pilates">Pilates</option>
                <option value="Iné">Iné</option>
             </select>
          </div>
          <div className="fg">
             <label className="fl">Dátum a čas *</label>
             <input className="fi" type="datetime-local" name="startTime" value={formData.startTime} onChange={handleInputChange} />
          </div>
        </div>

        <div className="fr">
          <div className="fg">
             <label className="fl">Trvanie (minúty) *</label>
             <input className="fi" type="number" name="durationMinutes" value={formData.durationMinutes} onChange={handleInputChange} min="15" step="5" />
          </div>
          <div className="fg">
             <label className="fl">Kapacita *</label>
             <input className="fi" type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} min="1" />
          </div>
        </div>

        <div className="fg">
          <label className="fl">Miestnosť / Lokácia</label>
          <input className="fi" type="text" name="location" placeholder="Miestnosť 1, Aerobic sála..." value={formData.location} onChange={handleInputChange} />
        </div>

        <div className="fg">
          <label className="fl">Popis</label>
          <textarea className="fi" name="description" rows="3" style={{resize:'vertical', fontFamily:'var(--font-b)'}} placeholder="Pár slov k lekcii pre členov..." value={formData.description} onChange={handleInputChange}></textarea>
        </div>

        <button className="btn btn-acid btn-block" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <span className="spinner" style={{width: 14, height: 14, marginRight: 6}}></span> : <i className="fas fa-check"></i>} Vytvoriť lekciu
        </button>

        {msg.text && (
           <div className={`fm ${msg.type}`} style={{ marginTop: '0.8rem' }}>{msg.text}</div>
        )}
      </div>
    </div>
  );
}
