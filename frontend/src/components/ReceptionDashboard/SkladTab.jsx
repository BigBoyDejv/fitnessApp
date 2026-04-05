import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../utils/api";
import Toast from "../Toast";

export default function SkladTab() {
  const [products, setProducts] = useState([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

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

  const filteredProducts = products.filter(p => {
    const matchQ = !filterSearch || (p.name || "").toLowerCase().includes(filterSearch.toLowerCase()) || (p.category || "").toLowerCase().includes(filterSearch.toLowerCase());
    const matchC = !filterCat || p.category === filterCat;
    const matchS = filterStatus === "all" ? true :
                   filterStatus === "active" ? p.active :
                   filterStatus === "low" ? (p.active && p.stock > 0 && p.stock <= 5) :
                   filterStatus === "out" ? (p.active && p.stock === 0) : true;
    return matchQ && matchC && matchS;
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
    <div>
      <div className="kpi-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="kpi-card" style={{ "--kpi-color": "var(--acid2)" }}>
           <div className="kpi-icon"><i className="fas fa-box-open"></i></div>
           <div className="kpi-val">{active.length}</div>
           <div className="kpi-lbl">Aktívne produkty</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "var(--orange)" }}>
           <div className="kpi-icon"><i className="fas fa-exclamation-triangle"></i></div>
           <div className="kpi-val">{low.length}</div>
           <div className="kpi-lbl">Nízke zásoby (&le;5)</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "var(--red)" }}>
           <div className="kpi-icon"><i className="fas fa-times-circle"></i></div>
           <div className="kpi-val">{out.length}</div>
           <div className="kpi-lbl">Vypredané</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "var(--purple)" }}>
           <div className="kpi-icon"><i className="fas fa-euro-sign"></i></div>
           <div className="kpi-val">{val.toFixed(2)}</div>
           <div className="kpi-lbl">Hodnota skladu</div>
        </div>
      </div>

      <div className="panel">
        <div className="ph" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <span className="pt">Sklad a inventár</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
             <button className="btn btn-ghost btn-sm" onClick={loadProducts}><i className="fas fa-sync-alt"></i> Obnoviť</button>
             <button className="btn btn-acid btn-sm" onClick={() => openProductModal(null)}>
               <i className="fas fa-plus"></i> Nový produkt
             </button>
          </div>
        </div>
        <div className="pb">
          <div className="search-bar">
            <input 
              className="fi" 
              type="text" 
              placeholder="Hľadaj produkt..." 
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
            <select className="fi" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ maxWidth: "160px" }}>
              <option value="">Všetky kategórie</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="fi" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ maxWidth: "160px" }}>
              <option value="all">Všetky stavy</option>
              <option value="active">Aktívne</option>
              <option value="low">Nízka zásoba</option>
              <option value="out">Vypredané</option>
            </select>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-boxes"></i>
              <p>Žiadne produkty v sklade</p>
            </div>
          ) : (
            <div className="sklad-grid">
              {filteredProducts.map(p => {
                const stockColor = p.stock === 0 ? 'var(--red)' : p.stock <= 5 ? 'var(--orange)' : 'var(--acid)';
                return (
                  <div key={p.id} className={`sklad-item ${p.stock === 0 ? 'out-of-stock' : ''} ${!p.active ? 'inactive' : ''}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.2rem" }}>
                      <div className="sk-name">{p.name}</div>
                      {!p.active && <span className="badge b-grey" style={{ fontSize: "0.55rem" }}>OFF</span>}
                    </div>
                    <div className="sk-cat">{p.category || "—"}</div>
                    <div className="sk-price">
                      {(p.priceCents / 100).toFixed(2)} €
                    </div>
                    
                    <div className="sk-stock" style={{ color: stockColor }}>
                      <i className={`fas ${p.stock === 0 ? 'fa-times-circle' : 'fa-check-circle'}`}></i>
                      <b>{p.stock === 0 ? "Vypredané" : `${p.stock} ks skladom`}</b>
                    </div>

                    <div className="sk-actions">
                      <button className="btn btn-purple btn-sm" onClick={() => openStockModal(p)}>
                        <i className="fas fa-plus"></i> Zásoby
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openProductModal(p)}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className={`btn ${p.active ? 'btn-red' : 'btn-acid2'} btn-sm`} onClick={() => toggleActive(p.id, p.active)}>
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
        <div className="sklad-modal-overlay" onClick={() => setProductModal({ open: false })}>
          <div className="sklad-modal" onClick={e => e.stopPropagation()}>
            <div className="sklad-modal-head">
              <h3>{productModal.isEdit ? "Upraviť produkt" : "Nový produkt"}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setProductModal({ open: false })}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="sklad-modal-body">
              <div className="fg">
                <label className="fl">Názov *</label>
                <input className="fi" type="text" value={pForm.name} onChange={e => setPForm({...pForm, name: e.target.value})} autoFocus />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="fg">
                  <label className="fl">Cena (€) *</label>
                  <input className="fi" type="number" step="0.5" min="0" value={pForm.price} onChange={e => setPForm({...pForm, price: e.target.value})} />
                </div>
                <div className="fg">
                  <label className="fl">Zásoba (ks) *</label>
                  <input className="fi" type="number" min="0" value={pForm.stock} onChange={e => setPForm({...pForm, stock: e.target.value})} disabled={productModal.isEdit} style={{ opacity: productModal.isEdit ? 0.6 : 1 }} title={productModal.isEdit ? "Na zmenu použi tlačidlo Zásoby" : ""} />
                </div>
              </div>
              <div className="fg">
                <label className="fl">Kategória</label>
                <input className="fi" type="text" value={pForm.category} onChange={e => setPForm({...pForm, category: e.target.value})} list="cats-list" />
                <datalist id="cats-list">
                  {cats.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="fg">
                <label className="fl">Popis</label>
                <textarea className="fi" rows="2" value={pForm.description} onChange={e => setPForm({...pForm, description: e.target.value})}></textarea>
              </div>
              {productModal.isEdit && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                  <input type="checkbox" id="chkActive" checked={pForm.active} onChange={e => setPForm({...pForm, active: e.target.checked})} />
                  <label htmlFor="chkActive" style={{ fontSize: "0.85rem", cursor: "pointer" }}>Produkt je aktívny</label>
                </div>
              )}
            </div>
            <div className="sklad-modal-foot">
              <button className="btn btn-ghost" onClick={() => setProductModal({ open: false })}>Zrušiť</button>
              <button className="btn btn-acid" onClick={saveProduct}><i className="fas fa-save"></i> Uložiť produkt</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {stockModal.open && (
        <div className="sklad-modal-overlay" onClick={() => setStockModal({ open: false })}>
          <div className="sklad-modal" style={{ maxWidth: "340px" }} onClick={e => e.stopPropagation()}>
            <div className="sklad-modal-head">
              <h3>Doplniť zásoby</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setStockModal({ open: false })}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="sklad-modal-body">
              <div style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.2rem" }}>{stockModal.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface2)", padding: "0.8rem 1rem", borderRadius: "4px", marginBottom: "1.2rem" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Aktuálny stav:</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-d)" }}>{stockModal.current} ks</span>
              </div>
              <div className="fg">
                <label className="fl">Pridať množstvo (+)</label>
                <input className="fi" type="number" min="1" autoFocus value={stockDelta} onChange={e => setStockDelta(e.target.value)} style={{ fontSize: "1.2rem", textAlign: "center" }} />
              </div>
            </div>
            <div className="sklad-modal-foot">
              <button className="btn btn-ghost" onClick={() => setStockModal({ open: false })}>Zrušiť</button>
              <button className="btn btn-purple" onClick={saveStock}><i className="fas fa-plus"></i> Doplniť zásoby</button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
