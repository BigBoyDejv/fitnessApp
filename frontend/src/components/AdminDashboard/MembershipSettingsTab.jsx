import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function MembershipSettingsTab() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', priceEuros: '', durationDays: '', description: '' });
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isSubmitLoading, setSubmitLoading] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', priceEuros: '', durationDays: 30, description: '' });

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/plans-management');
      const data = await res.json();
      if (res.ok) setTypes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setMsg({ text: '', type: '' });
    try {
       const res = await authenticatedFetch('/api/admin/plans-management', {
          method: 'POST',
          body: JSON.stringify(addForm)
       });
       if (!res.ok) throw new Error('Chyba pri vytváraní');
       setMsg({ text: 'Nový balík bol vytvorený.', type: 'ok' });
       setIsAdding(false);
       setAddForm({ name: '', priceEuros: '', durationDays: 30, description: '' });
       loadTypes();
    } catch (err) {
       setMsg({ text: err.message, type: 'err' });
    } finally {
       setSubmitLoading(false);
    }
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditForm({
      name: t.name,
      priceEuros: (t.priceCents / 100).toString(),
      durationDays: t.durationDays,
      description: t.description || ''
    });
    setMsg({ text: '', type: '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', priceEuros: '', durationDays: '', description: '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setMsg({ text: '', type: '' });

    try {
      const res = await authenticatedFetch(`/api/admin/plans-management/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Chyba pri ukladaní');
      }

      setMsg({ text: 'Zmeny boli úspešne uložené.', type: 'ok' });
      setEditingId(null);
      loadTypes();
    } catch (err) {
      setMsg({ text: err.message, type: 'err' });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner"></span></div>;

  return (
    <div className="panel animate-in" style={{ maxWidth: '900px' }}>
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(200,255,0,0.1)', color: 'var(--acid)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-tags"></i>
            </div>
            <span className="pt">Cenník predplatného</span>
          </div>
          <button className="btn btn-acid btn-sm" onClick={() => setIsAdding(!isAdding)}>
            <i className={`fas fa-${isAdding ? 'times' : 'plus'}`} style={{ marginRight: '0.5rem' }}></i>
            {isAdding ? 'ZAVRIEŤ' : 'PRIDAŤ NOVÝ BALÍK'}
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0.5rem 0 0 3.2rem', fontWeight: 500 }}>
          Správa balíčkov a cien predplatného. Zmeny v cenách sa prejavia okamžite pri nákupe nových členstiev.
        </p>
      </div>

      <div className="pb">
        {msg.text && <div className={`fm ${msg.type}`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

        {isAdding && (
          <div className="glass animate-in" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--acid)', background: 'rgba(200,255,0,0.02)', marginBottom: '2rem' }}>
             <div style={{ fontWeight: 800, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--acid)' }}>VYTVORIŤ NOVÝ PROGRAM</div>
             <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
                <div className="fg">
                   <label className="fl">Názov</label>
                   <input className="fi" placeholder="napr. Štandard" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} required />
                </div>
                <div className="fg">
                   <label className="fl">Cena (€)</label>
                   <input className="fi" type="number" step="0.01" placeholder="49.00" value={addForm.priceEuros} onChange={e => setAddForm({...addForm, priceEuros: e.target.value})} required />
                </div>
                <div className="fg">
                   <label className="fl">Trvanie (dni)</label>
                   <input className="fi" type="number" placeholder="30" value={addForm.durationDays} onChange={e => setAddForm({...addForm, durationDays: parseInt(e.target.value)})} required />
                </div>
                <div className="fg" style={{ gridColumn: '1 / -1' }}>
                   <label className="fl">Popis</label>
                   <input className="fi" placeholder="Stručný popis výhod..." value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                   <button type="submit" className="btn btn-acid" disabled={isSubmitLoading}>
                      {isSubmitLoading ? 'Vytváram...' : 'VYTVORIŤ BALÍK'}
                   </button>
                </div>
             </form>
          </div>
        )}

        {types.length === 0 && !isAdding ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed var(--border)' }}>
             <i className="fas fa-tags" style={{ fontSize: '3rem', color: 'var(--muted)', marginBottom: '1.5rem', opacity: 0.3 }}></i>
             <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Zatiaľ nie sú vytvorené žiadne balíčky</div>
             <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Kliknite na tlačidlo vyššie a pridajte prvý program do cenníka.</p>
          </div>
        ) : (
          <div className="membership-types-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {types.map(t => (
            <div key={t.id} className="glass" style={{ 
              padding: '1.5rem', 
              borderRadius: '16px', 
              border: editingId === t.id ? '2px solid var(--acid)' : '1px solid var(--border)',
              background: editingId === t.id ? 'rgba(200,255,0,0.03)' : 'rgba(255,255,255,0.01)',
              position: 'relative',
              transition: 'all 0.3s'
            }}>
              {editingId === t.id ? (
                <form onSubmit={handleUpdate}>
                  <div className="fg" style={{ marginBottom: '1rem' }}>
                    <label className="fl">Názov balíka</label>
                    <input className="fi" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="fg">
                      <label className="fl">Cena (€)</label>
                      <input className="fi" type="number" step="0.01" value={editForm.priceEuros} onChange={e => setEditForm({...editForm, priceEuros: e.target.value})} required />
                    </div>
                    <div className="fg">
                      <label className="fl">Trvanie (dni)</label>
                      <input className="fi" type="number" value={editForm.durationDays} onChange={e => setEditForm({...editForm, durationDays: parseInt(e.target.value)})} required />
                    </div>
                  </div>
                  <div className="fg" style={{ marginBottom: '1.5rem' }}>
                    <label className="fl">Popis</label>
                    <textarea className="fi" rows="2" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button type="submit" className="btn btn-acid btn-sm" disabled={isSubmitLoading} style={{ flex: 1 }}>
                      {isSubmitLoading ? 'Ukladám...' : 'ULOŽIŤ'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>ZRUŠIŤ</button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-d)' }}>{t.name}</div>
                    <div className="badge b-acid">{t.durationDays} dní</div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-d)', color: 'var(--acid)', marginBottom: '0.5rem' }}>
                    {(t.priceCents / 100).toFixed(2)} €
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)', minHeight: '40px', marginBottom: '1.5rem' }}>
                    {t.description || 'Bez popisu.'}
                  </p>
                  <button className="btn btn-ghost btn-sm btn-block" onClick={() => startEdit(t)}>
                    <i className="fas fa-edit" style={{ marginRight: '0.6rem' }}></i> UPRAVIŤ CENU
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
