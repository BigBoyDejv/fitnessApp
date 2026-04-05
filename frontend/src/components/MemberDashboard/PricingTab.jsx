import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function PricingTab({ setActiveTab }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyMsg, setBuyMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const res = await authenticatedFetch('/api/memberships/types');
      if (!res.ok) throw new Error('Chyba načítania');
      const data = await res.json();
      setTypes(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const buyMem = async (typeId) => {
    setBuyMsg({ text: 'Spracovávam...', type: '' });
    try {
      const res = await authenticatedFetch('/api/memberships/purchase', {
        method: 'POST',
        body: JSON.stringify({ membershipTypeId: typeId })
      });
      let d;
      try { d = await res.json(); } catch { d = {}; }
      if (!res.ok) throw new Error(d.message || 'Chyba servera');
      setBuyMsg({ text: 'Členstvo zakúpené! Platné do: ' + d.endDate, type: 'ok' });
      setTimeout(() => {
        if (setActiveTab) setActiveTab('membership');
      }, 1400);
    } catch (e) {
      setBuyMsg({ text: e.message, type: 'err' });
    }
  };

  const staticFeats = [
    ['Prístup 6:00–22:00', '4 skupinové lekcie', 'Osobný tréner', 'Sauna & solárium'],
    ['Prístup 6:00–22:00', 'Neobmedzené lekcie', '1× osobný tréner', 'Sauna & solárium'],
    ['Prístup 24/7', 'Neobmedzené lekcie', '4× osobný tréner', 'Sauna & solárium'],
    ['Všetko z Premium', 'Prioritná rezervácia', 'Výživový plán', 'Ušetríš 449€']
  ];

  const colors = ['btn-ghost', 'btn-ghost', 'btn-acid', 'btn-ghost'];

  return (
    <div className="ps active" id="pg-pricing">
      <div className="panel">
        <div className="ph"><span className="pt">Cenník členstva</span></div>
        <div className="pb">
          {loading ? <div className="empty"><span className="spin" /></div> :
           error ? <div className="empty">❌ {error}</div> :
             <>
               {buyMsg.text && (
                   <div className={`fm ${buyMsg.type === 'err' ? 'err' : 'ok'} show`} style={{marginBottom: '1rem'}}>
                     {buyMsg.text}
                   </div>
               )}
               <div className="pricing-grid">
                 {types.map((t, i) => {
                   const feat = i === 2;
                   const price = t.priceCents ? Math.round(t.priceCents / 100) : (t.price || '?');
                   let per = t.durationDays === 1 ? 'deň' : (t.durationDays >= 300 ? 'rok' : 'mes');
                   const feats = staticFeats[i] || [];
                   
                   return (
                     <div key={t.id} className={`pc ${feat ? 'feat' : ''}`}>
                       {feat && <div className="feat-tag">Najpopulárnejší</div>}
                       <div className="pc-name">{t.name}</div>
                       <div className="pc-sub">{t.description || 'Pre členov'}</div>
                       <div className="pc-price">{price}€<sub>/{per}</sub></div>
                       
                       <ul className="pc-feats">
                         {feats.map((f, fi) => {
                           const on = (i === 0 && fi < 2) || (i === 1 && fi < 3) || (i >= 2);
                           return (
                             <li key={fi} className={on ? 'on' : 'off'}>
                               <i className={`fas ${on ? 'fa-check' : 'fa-times'}`} />
                               {f}
                             </li>
                           );
                         })}
                       </ul>

                       <button className={`btn ${colors[i] || 'btn-ghost'} btn-block btn-sm`} onClick={() => buyMem(t.id)}>Kúpiť</button>
                     </div>
                   );
                 })}
               </div>
             </>
          }
        </div>
      </div>
    </div>
  );
}
