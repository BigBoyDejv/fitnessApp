import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function InventoryTab() {
  const [inventory, setInventory] = useState({ items: [], totalProducts: 0, outOfStock: 0, lowStock: 0, totalValue: 0 });
  const [loading, setLoading] = useState(true);
  
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/admin/inventory');
      if (res.ok) {
        const data = await res.json();
        setInventory({
          items: Array.isArray(data.items) ? data.items : [],
          totalProducts: data.totalProducts || 0,
          outOfStock: data.outOfStock || 0,
          lowStock: data.lowStock || 0,
          totalValue: data.totalValue || 0
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const cats = [...new Set(inventory.items.map(p => p.category).filter(Boolean))].sort();

  const filteredItems = inventory.items.filter(p => 
    (!catFilter || p.category === catFilter) &&
    (!statusFilter || p.status === statusFilter)
  );

  const getStatusBadge = (s) => {
    if (s === 'out') return <span className="badge b-red"><i className="fas fa-times"></i> Vypredané</span>;
    if (s === 'low') return <span className="badge b-orange"><i className="fas fa-exclamation-triangle"></i> Málo</span>;
    return <span className="badge b-acid"><i className="fas fa-check"></i> OK</span>;
  };
  
  const getStockColor = (s) => {
    if (s === 'out') return 'var(--red)';
    if (s === 'low') return 'var(--orange)';
    return 'var(--acid)';
  };

  return (
    <div>
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--text)' }}>
          <div className="kpi-icon"><i className="fas fa-box-open"></i></div>
          <div className="kpi-val">{inventory.totalProducts}</div>
          <div className="kpi-lbl">Typov produktov</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--acid2)' }}>
          <div className="kpi-icon"><i className="fas fa-euro-sign"></i></div>
          <div className="kpi-val">{(inventory.totalValue).toFixed(2)} €</div>
          <div className="kpi-lbl">Hodnota skladu</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--orange)' }}>
          <div className="kpi-icon"><i className="fas fa-exclamation-triangle"></i></div>
          <div className="kpi-val">{inventory.lowStock}</div>
          <div className="kpi-lbl">Málo zásob</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--red)' }}>
          <div className="kpi-icon"><i className="fas fa-times-circle"></i></div>
          <div className="kpi-val">{inventory.outOfStock}</div>
          <div className="kpi-lbl">Vypredané</div>
        </div>
      </div>

      <div className="panel">
        <div className="ph">
          <span className="pt">Skladové zásoby</span>
          <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="method m-get" style={{textTransform:'none', letterSpacing:0, padding:'0.18rem 0.55rem'}}>GET /api/admin/inventory</span>
            <button className="btn btn-ghost btn-sm" onClick={loadInventory}>
              <i className="fas fa-sync-alt"></i> Obnoviť
            </button>
          </div>
        </div>
        <div className="pb">
           <div className="search-bar">
             <select className="fi" style={{ maxWidth: 200 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
               <option value="">Všetky kategórie</option>
               {cats.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <select className="fi" style={{ maxWidth: 200 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
               <option value="">Všetky stavy</option>
               <option value="ok">Skladom (OK)</option>
               <option value="low">Málo zásob</option>
               <option value="out">Vypredané</option>
             </select>
           </div>
           
           <div style={{ overflowX: 'auto' }}>
             {loading ? (
               <div className="empty-state"><span className="spinner"></span></div>
             ) : filteredItems.length > 0 ? (
               <table className="dt">
                 <thead>
                   <tr>
                     <th>Produkt</th>
                     <th>Kategória</th>
                     <th>Cena</th>
                     <th>Sklad</th>
                     <th>Hodnota</th>
                     <th>Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredItems.map((p, idx) => (
                     <tr key={idx}>
                       <td><b>{p.name}</b></td>
                       <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{p.category || '—'}</td>
                       <td style={{ fontFamily: 'var(--font-d)', fontWeight: 700 }}>{p.price?.toFixed(2) || '0.00'} €</td>
                       <td>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <span style={{ fontFamily: 'var(--font-d)', fontSize: '1.1rem', fontWeight: 900, color: getStockColor(p.status) }}>{p.stock}</span>
                           <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>ks</span>
                         </div>
                       </td>
                       <td style={{ fontFamily: 'var(--font-d)', color: 'var(--acid2)' }}>{p.value?.toFixed(2) || '0.00'} €</td>
                       <td>{getStatusBadge(p.status)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             ) : (
               <div className="empty-state">
                 <i className="fas fa-box-open"></i>
                 <p>Žiadne produkty v danej kategórii</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
