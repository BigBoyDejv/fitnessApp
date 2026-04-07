import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticatedFetch } from '../../utils/api';

export default function InventoryTab() {
  const [inventory, setInventory] = useState({ items: [], totalProducts: 0, outOfStock: 0, lowStock: 0, totalValue: 0 });
  const [loading, setLoading] = useState(true);
  
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOption, setSortOption] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [listOpen, setListOpen] = useState(true);

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
  ).sort((a, b) => {
    let res = 0;
    if (sortOption === 'name') res = (a.name || '').localeCompare(b.name || '');
    else if (sortOption === 'category') res = (a.category || '').localeCompare(b.category || '');
    else if (sortOption === 'price') res = (a.price || 0) - (b.price || 0);
    else if (sortOption === 'stock') res = (a.stock || 0) - (b.stock || 0);
    else if (sortOption === 'value') res = (a.value || 0) - (b.value || 0);
    else if (sortOption === 'status') res = (a.status || '').localeCompare(b.status || '');
    
    return sortDir === 'asc' ? res : -res;
  });

  const handleSort = (option) => {
    if (sortOption === option) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortDir('asc');
    }
  };

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inventory-admin-tab"
    >
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="kpi-grid" 
        style={{ marginBottom: '2.5rem' }}
      >
        <motion.div variants={itemVariants} className="kpi-card" style={{ '--kpi-color': 'var(--text)' }}>
          <div className="kpi-icon"><i className="fas fa-box-open"></i></div>
          <div className="kpi-val">{inventory.totalProducts}</div>
          <div className="kpi-lbl">Typov produktov</div>
        </motion.div>
        <motion.div variants={itemVariants} className="kpi-card" style={{ '--kpi-color': 'var(--blue)' }}>
          <div className="kpi-icon"><i className="fas fa-euro-sign"></i></div>
          <div className="kpi-val">{(inventory.totalValue).toFixed(0)} <span style={{fontSize:'1.2rem'}}>€</span></div>
          <div className="kpi-lbl">Hodnota skladu</div>
        </motion.div>
        <motion.div variants={itemVariants} className="kpi-card-v2" style={{ background: 'rgba(255,149,0,0.05)', border: '1px solid rgba(255,149,0,0.1)' }}>
          <div className="kpi-icon-v2" style={{ color: 'var(--orange)' }}><i className="fas fa-exclamation-triangle"></i></div>
          <div className="kpi-content-v2">
            <div className="kpi-label-v2">NÍZKE ZÁSOBY</div>
            <div className="kpi-value-v2">{inventory.lowStock}</div>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="kpi-card-v2" style={{ background: 'rgba(255,45,85,0.05)', border: '1px solid rgba(255,45,85,0.1)' }}>
          <div className="kpi-icon-v2" style={{ color: 'var(--red)' }}><i className="fas fa-times-circle"></i></div>
          <div className="kpi-content-v2">
            <div className="kpi-label-v2">VYPREDANÉ</div>
            <div className="kpi-value-v2">{inventory.outOfStock}</div>
          </div>
        </motion.div>
      </motion.div>

      <div className="panel glass-panel">
        <div className="ph" style={{ flexWrap: 'wrap', gap: '1rem', cursor: 'pointer' }} onClick={() => setListOpen(!listOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="neon-icon yellow" style={{ width: 32, height: 32, background: 'rgba(255,200,0,0.05)', color: 'var(--orange)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-box"></i>
            </div>
            <span className="pt">Prehľad skladu (Admin)</span>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); loadInventory(); }}>
              <i className="fas fa-sync-alt"></i> OBNOVIŤ
            </button>
            <motion.div 
               animate={{ rotate: listOpen ? 0 : 180 }}
               style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}
            >
               <i className="fas fa-chevron-up"></i>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {listOpen && (
            <motion.div 
              className="pb" 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '1.2rem' }}>
                <div className="search-bar glass-panel" style={{ display: 'flex', gap: '1rem', padding: '0.8rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                  <select className="fi" style={{ flex: 1 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="">Všetky kategórie</option>
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="fi" style={{ flex: 1 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">Všetky stavy</option>
                    <option value="ok">Skladom (OK)</option>
                    <option value="low">Málo zásob</option>
                    <option value="out">Vypredané</option>
                  </select>
                </div>
                
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                  {loading ? (
                    <div className="empty-state" style={{ minHeight: 200 }}><span className="spinner"></span></div>
                  ) : filteredItems.length > 0 ? (
                    <table className="dt dt-compact">
                      <thead>
                        <tr style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                          <th onClick={() => handleSort('name')}>
                            PRODUKT {sortOption === 'name' && <i className={`fas fa-chevron-${sortDir === 'asc' ? 'up' : 'down'}`} style={{fontSize:'0.7rem', color:'var(--acid)'}}></i>}
                          </th>
                          <th onClick={() => handleSort('category')}>
                            KATEGÓRIA {sortOption === 'category' && <i className={`fas fa-chevron-${sortDir === 'asc' ? 'up' : 'down'}`} style={{fontSize:'0.7rem', color:'var(--acid)'}}></i>}
                          </th>
                          <th onClick={() => handleSort('price')} style={{ textAlign: 'right' }}>
                            CENA {sortOption === 'price' && <i className={`fas fa-chevron-${sortDir === 'asc' ? 'up' : 'down'}`} style={{fontSize:'0.7rem', color:'var(--acid)'}}></i>}
                          </th>
                          <th onClick={() => handleSort('stock')} style={{ textAlign: 'center' }}>
                            SKLAD {sortOption === 'stock' && <i className={`fas fa-chevron-${sortDir === 'asc' ? 'up' : 'down'}`} style={{fontSize:'0.7rem', color:'var(--acid)'}}></i>}
                          </th>
                          <th onClick={() => handleSort('value')} style={{ textAlign: 'right' }}>
                            HODNOTA {sortOption === 'value' && <i className={`fas fa-chevron-${sortDir === 'asc' ? 'up' : 'down'}`} style={{fontSize:'0.7rem', color:'var(--acid)'}}></i>}
                          </th>
                          <th onClick={() => handleSort('status')} style={{ textAlign: 'center' }}>
                            STATUS {sortOption === 'status' && <i className={`fas fa-chevron-${sortDir === 'asc' ? 'up' : 'down'}`} style={{fontSize:'0.7rem', color:'var(--acid)'}}></i>}
                          </th>
                        </tr>
                      </thead>
                      <motion.tbody 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {filteredItems.map((p, idx) => (
                          <motion.tr key={idx} variants={itemVariants} style={{ transition: 'all 0.2s' }}>
                            <td><b style={{ fontWeight: 800 }}>{p.name}</b></td>
                            <td>
                              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                                {p.category || '—'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-d)', fontWeight: 700 }}>{p.price?.toFixed(2) || '0.00'} €</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: `${getStockColor(p.status)}11`, padding: '0.3rem 0.7rem', borderRadius: '8px' }}>
                                <span style={{ fontFamily: 'var(--font-d)', fontSize: '1rem', fontWeight: 950, color: getStockColor(p.status) }}>{p.stock}</span>
                                <span style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase' }}>ks</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-d)', color: 'var(--blue)', fontWeight: 800 }}>{p.value?.toFixed(2) || '0.00'} €</td>
                            <td style={{ textAlign: 'center' }}>{getStatusBadge(p.status)}</td>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    </table>
                  ) : (
                    <div className="empty-state">
                      <i className="fas fa-box-open" style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '1rem' }}></i>
                      <p style={{ fontWeight: 800 }}>Žiadne produkty v danej kategórii</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
