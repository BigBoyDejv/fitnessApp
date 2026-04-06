import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../utils/api";
import Toast from "../Toast";

export default function SkladTab() {
  const [products, setProducts] = useState([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortOption, setSortOption] = useState("name");

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
      if (sortOption === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortOption === "stock") return a.stock - b.stock;
      if (sortOption === "price") return b.priceCents - a.priceCents;
      return 0;
    });

  const active = products.filter(p => p.active);
  const low = active.filter(p => p.stock > 0 && p.stock <= 5);
  const out = active.filter(p => p.stock === 0);
  const val = active.reduce((s, p) => s + (p.priceCents / 100) * p.stock, 0);

  // Modals Actions
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
        id: null, name: "", price: "", stock: 0, category: "Snacky", description: "", active: true
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
      
      const res = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      
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

  return (
    <div className="animate-in">
      <div className="dashboard-grid" style={{ marginBottom: "2.5rem", gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0s' }}>
           <div className="kpi-icon-v2" style={{ background: 'rgba(200,255,0,0.1)', color: 'var(--acid)' }}><i className="fas fa-boxes"></i></div>
           <div className="kpi-content-v2">
              <div className="kpi-label-v2">AKTÍVNE DOPLNKY</div>
              <div className="kpi-value-v2">{active.length}</div>
           </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.05s' }}>
           <div className="kpi-icon-v2" style={{ background: 'rgba(255,149,0,0.1)', color: 'var(--orange)' }}><i className="fas fa-exclamation-triangle"></i></div>
           <div className="kpi-content-v2">
              <div className="kpi-label-v2">NÍZKY STAV</div>
              <div className="kpi-value-v2">{low.length}</div>
           </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.1s' }}>
           <div className="kpi-icon-v2" style={{ background: 'rgba(255,45,85,0.1)', color: 'var(--red)' }}><i className="fas fa-times-circle"></i></div>
           <div className="kpi-content-v2">
              <div className="kpi-label-v2">VYPREDANÉ</div>
              <div className="kpi-value-v2">{out.length}</div>
           </div>
        </div>
        <div className="kpi-card-v2 animate-in" style={{ animationDelay: '0.15s' }}>
           <div className="kpi-icon-v2" style={{ background: 'rgba(10,132,255,0.1)', color: 'var(--blue)' }}><i className="fas fa-euro-sign"></i></div>
           <div className="kpi-content-v2">
              <div className="kpi-label-v2">HODNOTA SKLADU</div>
              <div className="kpi-value-v2">{val.toFixed(0)} <span style={{fontSize: '1rem'}}>€</span></div>
           </div>
        </div>
      </div>

      <div className="panel animate-in" style={{ animationDelay: '0.2s' }}>
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)', color: 'var(--text)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-warehouse"></i>
            </div>
            <span className="pt">Centrálny sklad</span>
          </div>
          <div style={{ display: "flex", gap: "0.8rem" }}>
             <button className="btn btn-ghost btn-xs" onClick={loadProducts}><i className="fas fa-sync-alt"></i> OBNOVIŤ</button>
             <button className="btn btn-blue btn-xs" onClick={() => openProductModal(null)} style={{ borderRadius: '6px', fontWeight: 800 }}>
               <i className="fas fa-plus-circle" style={{marginRight: '0.4rem'}}></i> NOVÝ PRODUKT
             </button>
          </div>
        </div>
        <div className="pb">
          {/* Enhanced Premium Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 2, minWidth: '240px' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.9rem' }}></i>
              <input 
                className="fi" 
                type="text" 
                placeholder="Rýchle hľadanie produktu..." 
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{ paddingLeft: '3rem', borderRadius: '10px', height: '48px', border: '1px solid var(--border)' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.6rem', flex: 3, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                <i className="fas fa-tag" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}></i>
                <select className="fi" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ paddingLeft: '2.5rem', borderRadius: '10px', height: '48px' }}>
                  <option value="">Všetky kategórie</option>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                <i className="fas fa-toggle-on" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}></i>
                <select className="fi" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ paddingLeft: '2.5rem', borderRadius: '10px', height: '48px' }}>
                  <option value="all">Všetky stavy</option>
                  <option value="active">Len aktívne</option>
                  <option value="low">Nízka zásoba</option>
                  <option value="out">Vypredané</option>
                </select>
              </div>

              <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                <i className="fas fa-sort-amount-down" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}></i>
                <select className="fi" value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{ paddingLeft: '2.5rem', borderRadius: '10px', height: '48px' }}>
                   <option value="name">Zoradiť: Názov</option>
                   <option value="stock">Zoradiť: Sklad</option>
                   <option value="price">Zoradiť: Cena</option>
                </select>
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state" style={{ padding: '5rem' }}>
              <i className="fas fa-boxes" style={{ fontSize: '3.5rem', opacity: 0.1, marginBottom: '1rem' }}></i>
              <p style={{ fontWeight: 700 }}>Neboli nájdené žiadne položky</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Skúste upraviť filtre alebo pridať nový produkt.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {filteredProducts.map(p => {
                const stockColor = p.stock === 0 ? 'var(--red)' : p.stock <= 5 ? 'var(--orange)' : 'var(--acid)';
                const stockBg = p.stock === 0 ? 'rgba(255,45,85,0.05)' : p.stock <= 5 ? 'rgba(255,149,0,0.05)' : 'rgba(200,255,0,0.05)';
                return (
                  <div key={p.id} className="glass animate-in" style={{ 
                    padding: '1.2rem', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border)', 
                    background: p.active ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.3)',
                    opacity: p.active ? 1 : 0.6,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, fontFamily: 'var(--font-d)', letterSpacing: '0.02em', color: p.active ? 'var(--text)' : 'var(--muted)' }}>{p.name}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem' }}>{p.category || "ŽIADNA KATEGÓRIA"}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: 950, fontFamily: 'var(--font-d)', color: 'var(--blue)' }}>{(p.priceCents / 100).toFixed(2)} €</div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      background: stockBg, 
                      padding: '0.8rem 1rem', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.8rem',
                      marginBottom: '1.2rem',
                      border: `1px solid ${stockColor}22`
                    }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stockColor, boxShadow: `0 0 10px ${stockColor}` }}></div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: stockColor, fontFamily: 'var(--font-d)' }}>
                        {p.stock === 0 ? "AKTUALNE VYPREDANÉ" : `${p.stock} KS NA SKLADE`}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-purple btn-xs" onClick={() => openStockModal(p)} style={{ flex: 1, borderRadius: '8px' }}>
                        <i className="fas fa-plus"></i> DOPLNIŤ
                      </button>
                      <button className="btn btn-ghost btn-xs" onClick={() => openProductModal(p)} style={{ borderRadius: '8px', width: '36px', padding: 0 }}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className={`btn ${p.active ? 'btn-red' : 'btn-acid'} btn-xs`} onClick={() => toggleActive(p.id, p.active)} style={{ borderRadius: '8px', width: '36px', padding: 0 }}>
                        <i className={`fas ${p.active ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {productModal.open && (
        <div style={{ position: 'fixed', inset: 0, zEnvironment: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} onClick={() => setProductModal({ open: false })}></div>
          <div className="panel animate-in" style={{ position: 'relative', width: '100%', maxWidth: '500px', zIndex: 1001, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div className="ph" style={{ background: 'var(--surface2)' }}>
              <span className="pt">{productModal.isEdit ? "UPRAVIŤ POLOŽKU" : "NOVÁ POLOŽKA"}</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setProductModal({ open: false })} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="pb" style={{ padding: '2rem' }}>
              <div className="fg">
                <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Názov produktu</label>
                <input className="fi" type="text" value={pForm.name} onChange={e => setPForm({...pForm, name: e.target.value})} autoFocus style={{ borderRadius: '10px' }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div className="fg">
                  <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cena (€)</label>
                  <input className="fi" type="number" step="0.5" min="0" value={pForm.price} onChange={e => setPForm({...pForm, price: e.target.value})} style={{ borderRadius: '10px' }} />
                </div>
                <div className="fg">
                  <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Počiatočný stav</label>
                  <input className="fi" type="number" min="0" value={pForm.stock} onChange={e => setPForm({...pForm, stock: e.target.value})} disabled={productModal.isEdit} style={{ opacity: productModal.isEdit ? 0.5 : 1, borderRadius: '10px' }} />
                </div>
              </div>
              <div className="fg">
                <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kategória</label>
                <input className="fi" type="text" value={pForm.category} onChange={e => setPForm({...pForm, category: e.target.value})} list="cats-list" style={{ borderRadius: '10px' }} />
                <datalist id="cats-list">
                  {cats.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="fg">
                <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Popis / Detaily</label>
                <textarea className="fi" rows="3" value={pForm.description} onChange={e => setPForm({...pForm, description: e.target.value})} style={{ borderRadius: '10px', resize: 'none' }}></textarea>
              </div>
              {productModal.isEdit && (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                  <input type="checkbox" id="chkActive" checked={pForm.active} onChange={e => setPForm({...pForm, active: e.target.checked})} style={{ width: '20px', height: '20px' }} />
                  <label htmlFor="chkActive" style={{ fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>PRODUKT JE AKTÍVNY A DOSTUPNÝ</label>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                <button className="btn btn-ghost btn-block" onClick={() => setProductModal({ open: false })} style={{ height: '48px', borderRadius: '10px' }}>ZRUŠIŤ</button>
                <button className="btn btn-blue btn-block" onClick={saveProduct} style={{ height: '48px', borderRadius: '10px', fontWeight: 900 }}>
                  <i className="fas fa-save" style={{marginRight: '0.6rem'}}></i> ULOŽIŤ ZMENY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {stockModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} onClick={() => setStockModal({ open: false })}></div>
          <div className="panel animate-in" style={{ position: 'relative', width: '100%', maxWidth: '380px', zIndex: 1001, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div className="ph" style={{ background: 'var(--surface2)' }}>
              <span className="pt">DOPLNIŤ ZÁSOBY</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setStockModal({ open: false })} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="pb" style={{ padding: '2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 950, fontFamily: 'var(--font-d)', marginBottom: '0.4rem' }}>{stockModal.name}</div>
                <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.05)", padding: "0.6rem 1.2rem", borderRadius: "10px", fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 600 }}>
                  Aktuálny stav: <span style={{ marginLeft: '0.5rem', color: 'var(--text)', fontWeight: 900 }}>{stockModal.current} KS</span>
                </div>
              </div>
              
              <div className="fg">
                <label className="fl" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', display: 'block' }}>Množstvo na pridanie</label>
                <input 
                  className="fi" 
                  type="number" 
                  min="1" 
                  autoFocus 
                  value={stockDelta} 
                  onChange={e => setStockDelta(e.target.value)} 
                  style={{ fontSize: "1.8rem", textAlign: "center", height: '70px', borderRadius: '15px', fontWeight: 900, fontFamily: 'var(--font-d)', border: '2px solid var(--purple)' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button className="btn btn-ghost btn-block" onClick={() => setStockModal({ open: false })} style={{ height: '48px', borderRadius: '10px' }}>ZRUŠIŤ</button>
                <button className="btn btn-purple btn-block" onClick={saveStock} style={{ height: '48px', borderRadius: '10px', fontWeight: 900 }}>
                  <i className="fas fa-plus-circle" style={{marginRight: '0.6rem'}}></i> PRIDAŤ DO STAVU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
