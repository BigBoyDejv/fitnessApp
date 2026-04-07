import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authenticatedFetch } from "../../utils/api";
import Toast from "../Toast";

export default function SkladTab() {
  const [products, setProducts] = useState([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOption, setSortOption] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const [toastMsg, setToastMsg] = useState(null);

  // Produkt Modal
  const [productModal, setProductModal] = useState({ open: false, isEdit: false });
  const [pForm, setPForm] = useState({
    id: null, name: "", price: "", stock: "", category: "Ostatné", description: "", active: true
  });

  // Zásoby Modal
  const [stockModal, setStockModal] = useState({ open: false, id: null, name: "", current: 0 });
  const [stockDelta, setStockDelta] = useState(10);

  useEffect(() => {
    loadProducts();
  }, []);

  const showToast = (msg, type = "ok") => {
    setToastMsg({ msg, type });
  };

  const loadProducts = async () => {
    try {
      const res = await authenticatedFetch("/api/products/all");
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (e) {
      showToast("Chyba načítania produktov", "err");
    }
  };

  const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const filteredProducts = products
    .filter(p => {
      const matchQ = (p.name || "").toLowerCase().includes(filterSearch.toLowerCase());
      const matchC = !filterCat || p.category === filterCat;
      let matchS = true;
      if (filterStatus === "active") matchS = p.active;
      if (filterStatus === "low") matchS = p.active && p.stock > 0 && p.stock <= 5;
      if (filterStatus === "out") matchS = p.active && p.stock === 0;
      return matchQ && matchC && matchS;
    })
    .sort((a, b) => {
      let res = 0;
      if (sortOption === "name") res = (a.name || "").localeCompare(b.name || "");
      else if (sortOption === "stock") res = a.stock - b.stock;
      else if (sortOption === "price") res = a.priceCents - b.priceCents;
      else if (sortOption === "category") res = (a.category || "").localeCompare(b.category || "");
      
      return sortDir === "asc" ? res : -res;
    });

  const handleSort = (option) => {
    if (sortOption === option) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortOption(option);
      setSortDir("asc");
    }
  };

  const active = products.filter(p => p.active);
  const low = active.filter(p => p.stock > 0 && p.stock <= 5);
  const out = active.filter(p => p.stock === 0);
  const totalVal = active.reduce((s, p) => s + (p.priceCents / 100) * p.stock, 0);

  const openProductModal = (p = null) => {
    if (p) {
      setPForm({
        id: p.id,
        name: p.name || "",
        price: (p.priceCents / 100).toFixed(2),
        stock: p.stock || 0,
        category: p.category || "",
        description: p.description || "",
        active: p.active
      });
      setProductModal({ open: true, isEdit: true });
    } else {
      setPForm({
        id: null, name: "", price: "", stock: 0, category: "Suplementy", description: "", active: true
      });
      setProductModal({ open: true, isEdit: false });
    }
  };

  const saveProduct = async () => {
    if (!pForm.name.trim()) return showToast("Názov je povinný", "err");
    const pPrice = parseFloat(pForm.price);
    if (isNaN(pPrice) || pPrice < 0) return showToast("Zadaj platnú cenu", "err");

    const payload = {
      name: pForm.name.trim(),
      price: pPrice,
      stock: parseInt(pForm.stock) || 0,
      category: pForm.category.trim() || "Ostatné",
      description: pForm.description.trim(),
      active: pForm.active
    };

    try {
      const url = pForm.id ? `/api/products/${pForm.id}` : `/api/products`;
      const method = pForm.id ? "PUT" : "POST";
      const res = await authenticatedFetch(url, { method, body: JSON.stringify(payload) });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Chyba");
      }
      showToast(`Produkt ${pForm.id ? 'upravený' : 'vytvorený'}`, "ok");
      setProductModal({ open: false, isEdit: false });
      loadProducts();
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  const openStockModal = (p) => {
    setStockModal({ open: true, id: p.id, name: p.name, current: p.stock });
    setStockDelta(10);
  };

  const saveStock = async () => {
    const delta = parseInt(stockDelta);
    if (isNaN(delta) || delta <= 0) return showToast("Zadaj kladné číslo", "err");
    try {
      const res = await authenticatedFetch(`/api/products/${stockModal.id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ delta })
      });
      if (!res.ok) throw new Error("Chyba dopĺňania zásob");
      showToast(`Zásoby doplnené (+${delta})`, "ok");
      setStockModal({ open: false, id: null, name: "", current: 0 });
      loadProducts();
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  const toggleActive = async (id, currentVal) => {
    if (!window.confirm(currentVal ? "Deaktivovať produkt?" : "Aktivovať produkt?")) return;
    try {
      const res = await authenticatedFetch(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({ active: !currentVal })
      });
      if (!res.ok) throw new Error("Chyba");
      showToast(currentVal ? "Produkt deaktivovaný" : "Produkt aktívny", "ok");
      loadProducts();
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="sklad-tab-reception">
      <div className="dashboard-grid" style={{ marginBottom: "2.5rem", gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <motion.div variants={itemVariants} className="kpi-card-v2">
          <div className="kpi-icon-v2" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}><i className="fas fa-boxes" /></div>
          <div className="kpi-content-v2">
             <div className="kpi-label-v2">AKTÍVNE DOPLNKY</div>
             <div className="kpi-value-v2">{active.length}</div>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="kpi-card-v2">
          <div className="kpi-icon-v2" style={{ background: 'rgba(255,149,0,0.1)', color: 'var(--orange)' }}><i className="fas fa-exclamation-triangle" /></div>
          <div className="kpi-content-v2">
             <div className="kpi-label-v2">NÍZKY STAV</div>
             <div className="kpi-value-v2">{low.length}</div>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="kpi-card-v2">
          <div className="kpi-icon-v2" style={{ background: 'rgba(255,45,85,0.1)', color: 'var(--red)' }}><i className="fas fa-times-circle" /></div>
          <div className="kpi-content-v2">
             <div className="kpi-label-v2">VYPREDANÉ</div>
             <div className="kpi-value-v2">{out.length}</div>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="kpi-card-v2">
          <div className="kpi-icon-v2" style={{ background: 'rgba(0,123,255,0.1)', color: 'var(--blue)' }}><i className="fas fa-wallet" /></div>
          <div className="kpi-content-v2">
             <div className="kpi-label-v2">HODNOTA SKLADU</div>
             <div className="kpi-value-v2">{totalVal.toFixed(0)} €</div>
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="panel glass-panel">
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="neon-icon yellow" style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(255,149,0,0.1)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-warehouse"></i>
            </div>
            <span className="pt">Centrálny sklad</span>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
             <button className="btn btn-ghost btn-xs" onClick={loadProducts}><i className="fas fa-sync-alt"></i></button>
             <button className="btn btn-acid btn-xs" onClick={() => openProductModal(null)} style={{ borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: 900 }}>
               <i className="fas fa-plus-circle" style={{marginRight: '0.4rem'}}></i> NOVÝ PRODUKT
             </button>
          </div>
        </div>
        <div className="pb" style={{ padding: '1.5rem' }}>
          <div className="search-bar glass-panel" style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 2, minWidth: '240px' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
              <input className="fi" type="text" placeholder="Hľadať produkt..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} style={{ paddingLeft: '2.8rem', borderRadius: '12px', height: '48px' }} />
            </div>
            <select className="fi" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ flex: 1, minWidth: '150px', borderRadius: '12px', height: '48px' }}>
              <option value="">Všetky kategórie</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="fi" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: 1, minWidth: '150px', borderRadius: '12px', height: '48px' }}>
              <option value="all">Všetky stavy</option>
              <option value="active">Aktívne</option>
              <option value="low">Nízky stav</option>
              <option value="out">Vypredané</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '20px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
            {filteredProducts.length === 0 ? (
              <div className="empty-state" style={{ padding: '5rem' }}>
                <i className="fas fa-boxes" style={{ fontSize: '4rem', opacity: 0.1, marginBottom: '1.5rem' }}></i>
                <p style={{ fontWeight: 900, color: 'var(--muted)' }}>SKLAD JE PRÁZDNY</p>
              </div>
            ) : (
              <table className="dt">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>PRODUKT {sortOption === 'name' && <i className={`fas fa-chevron-${sortDir === 'asc' ? 'up' : 'down'}`} />}</th>
                    <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>KATEGÓRIA</th>
                    <th onClick={() => handleSort('stock')} style={{ cursor: 'pointer', textAlign: 'center' }}>STAV</th>
                    <th onClick={() => handleSort('price')} style={{ cursor: 'pointer', textAlign: 'right' }}>CENA</th>
                    <th style={{ textAlign: 'right' }}>AKCIE</th>
                  </tr>
                </thead>
                <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                  {filteredProducts.map(p => {
                    const isOut = p.stock === 0;
                    const isLow = p.stock > 0 && p.stock <= 5;
                    const stockColor = isOut ? 'var(--red)' : isLow ? 'var(--orange)' : 'var(--acid)';
                    return (
                      <motion.tr key={p.id} variants={itemVariants} style={{ opacity: p.active ? 1 : 0.4 }}>
                        <td style={{ paddingLeft: '1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '10px', background: isOut ? 'rgba(255,45,85,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: isOut ? 'var(--red)' : 'var(--muted)', border: '1px solid var(--border)' }}>{p.name.charAt(0)}</div>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{p.name}</div>
                          </div>
                        </td>
                        <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', fontSize: '0.65rem' }}>{p.category}</span></td>
                        <td style={{ textAlign: 'center' }}>
                           <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${stockColor}33` }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: stockColor, boxShadow: `0 0 10px ${stockColor}` }} />
                              <span style={{ fontWeight: 950, color: stockColor, fontFamily: 'monospace', fontSize: '1rem' }}>{p.stock}ks</span>
                           </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 950, color: 'var(--blue)', fontFamily: 'var(--font-d)', fontSize: '1.1rem' }}>{(p.priceCents / 100).toFixed(2)}€</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                             <button className="btn btn-ghost btn-sm" onClick={() => openStockModal(p)} style={{ width: 36, padding: 0 }}><i className="fas fa-plus-square" /></button>
                             <button className="btn btn-ghost btn-sm" onClick={() => openProductModal(p)} style={{ width: 36, padding: 0 }}><i className="fas fa-edit" /></button>
                             <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(p.id, p.active)} style={{ width: 36, padding: 0, color: p.active ? 'var(--red)' : 'var(--acid2)' }}><i className={p.active ? "fas fa-eye-slash" : "fas fa-eye"} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modals with AnimatePresence */}
      <AnimatePresence>
        {productModal.open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setProductModal({ open: false })} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000 }} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="panel glass-panel" style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '540px', zIndex: 1001, border: '1px solid var(--border)' }}>
              <div className="ph" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <span className="pt" style={{ fontFamily: 'var(--font-d)', fontWeight: 950, letterSpacing: '0.1em' }}>{productModal.isEdit ? "UPRAVIŤ" : "NOVÝ PRODUKT"}</span>
                <button className="btn btn-ghost" onClick={() => setProductModal({ open: false })}><i className="fas fa-times" /></button>
              </div>
              <div className="pb" style={{ padding: '2rem' }}>
                <div className="fg" style={{ marginBottom: '1.5rem' }}>
                  <label className="fl">NÁZOV PRODUKTU</label>
                  <input className="fi" type="text" value={pForm.name} onChange={e => setPForm({...pForm, name: e.target.value})} style={{ borderRadius: '12px', height: '52px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="fg">
                    <label className="fl">CENA (€)</label>
                    <input className="fi" type="number" step="0.5" value={pForm.price} onChange={e => setPForm({...pForm, price: e.target.value})} style={{ borderRadius: '12px', height: '52px' }} />
                  </div>
                  <div className="fg">
                    <label className="fl">KATEGÓRIA</label>
                    <input className="fi" type="text" value={pForm.category} onChange={e => setPForm({...pForm, category: e.target.value})} style={{ borderRadius: '12px', height: '52px' }} />
                  </div>
                </div>
                <div className="fg" style={{ marginBottom: '2rem' }}>
                   <label className="fl">POPIS</label>
                   <textarea className="fi" rows="3" value={pForm.description} onChange={e => setPForm({...pForm, description: e.target.value})} style={{ borderRadius: '12px', resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                   <button className="btn btn-ghost btn-block" onClick={() => setProductModal({ open: false })} style={{ height: '56px', borderRadius: '14px' }}>Zrušiť</button>
                   <button className="btn btn-blue btn-block" onClick={saveProduct} style={{ flex: 2, height: '56px', borderRadius: '14px', fontWeight: 950, letterSpacing: '0.1em' }}><i className="fas fa-save" style={{marginRight: '0.8rem'}} />ULOŽIŤ ZMENY</button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {stockModal.open && (
           <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setStockModal({ open: false })} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000 }} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="panel glass-panel" style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '360px', zIndex: 1001, textAlign: 'center' }}>
              <div className="pb" style={{ padding: '3rem 2rem' }}>
                 <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(191,90,242,0.1)', color: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem' }}><i className="fas fa-plus-square" /></div>
                 <div style={{ fontSize: '1.4rem', fontWeight: 950, fontFamily: 'var(--font-d)', color: '#fff', marginBottom: '0.5rem' }}>{stockModal.name}</div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '2rem' }}>AKTUÁLNE: {stockModal.current} KS</div>
                 <div className="fg" style={{ marginBottom: '2rem' }}>
                    <input className="fi" type="number" value={stockDelta} onChange={e => setStockDelta(e.target.value)} style={{ textAlign: 'center', fontSize: '2.5rem', height: '80px', borderRadius: '16px', fontWeight: 950, fontFamily: 'var(--font-d)', border: '2px solid var(--purple)' }} />
                 </div>
                 <button className="btn btn-purple btn-block" onClick={saveStock} style={{ height: '60px', borderRadius: '16px', fontWeight: 950, letterSpacing: '0.1em' }}>DOPLNIŤ ZÁSOBY</button>
              </div>
            </motion.div>
           </>
        )}
      </AnimatePresence>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </motion.div>
  );
}
