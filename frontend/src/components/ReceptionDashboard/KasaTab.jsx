import React, { useState, useEffect } from "react";
import { authenticatedFetch } from "../../utils/api";
import Toast from "../Toast";

export default function KasaTab() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [members, setMembers] = useState([]); // for member assignment to sale
  const [selectedMember, setSelectedMember] = useState("");
  
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const [todaySales, setTodaySales] = useState({ items: [], totalEuros: 0 });
  
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    loadProducts();
    loadMembers();
    loadTodaySales();
  }, []);

  const showToast = (msg, type = "ok") => {
    setToastMsg({ msg, type });
  };

  const loadProducts = async () => {
    try {
      const res = await authenticatedFetch("/api/products");
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMembers = async () => {
    try {
      const res = await authenticatedFetch("/api/admin/profiles");
      if (res.ok) {
        const d = await res.json();
        setMembers(d.filter(m => m.role === "member"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadTodaySales = async () => {
    try {
      const res = await authenticatedFetch("/api/sales/today");
      if (res.ok) {
        setTodaySales(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const exist = prev.find(i => i.id === product.id && i.name === product.name);
      if (exist) {
        return prev.map(i => i.id === product.id && i.name === product.name ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const addCustomToCart = () => {
    const val = parseFloat(customPrice);
    if (!customName.trim() || isNaN(val) || val <= 0) {
      return showToast("Zadaj platný názov a cenu", "err");
    }
    const item = {
      id: null,
      name: customName.trim(),
      priceCents: Math.round(val * 100)
    };
    addToCart(item);
    setCustomName("");
    setCustomPrice("");
  };

  const updateQty = (idx, delta) => {
    setCart(prev => {
      const n = [...prev];
      const newQty = n[idx].qty + delta;
      if (newQty <= 0) {
        n.splice(idx, 1);
      } else {
        n[idx].qty = newQty;
      }
      return n;
    });
  };

  const checkout = async (method) => {
    if (cart.length === 0) return showToast("Košík je prázdny", "err");

    const payload = {
      items: cart.map(c => ({
        productId: c.id || null,
        productName: c.id ? null : c.name, // custom product
        priceCents: c.priceCents,
        quantity: c.qty
      })),
      paymentMethod: method,
      userId: selectedMember || null
    };

    try {
      const res = await authenticatedFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Chyba zúčtovania");
      }
      
      showToast(`Platba úspešná (${method.toUpperCase()})`, "ok");
      setCart([]);
      setSelectedMember("");
      loadTodaySales();
      loadProducts(); // refresh stock
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.priceCents * item.qty), 0);
  const cartEuros = (cartTotal / 100).toFixed(2);

  return (
    <div className="grid-2">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Rýchly výber */}
        <div className="panel">
          <div className="ph"><span className="pt">Katalóg produktov</span></div>
          <div className="pb">
            {products.length === 0 ? (
              <div className="empty-state">Žiadne aktívne produkty v DB</div>
            ) : (
              <div className="product-grid">
                {products.map(p => {
                  const outOfStock = p.stock <= 0;
                  return (
                    <div 
                      key={p.id} 
                      className={`product-btn ${outOfStock ? 'out-of-stock' : ''}`}
                      onClick={() => !outOfStock && addToCart(p)}
                    >
                      <div className="p-name">{p.name}</div>
                      <div className="p-price">{(p.priceCents / 100).toFixed(2)} €</div>
                      {!outOfStock && (
                        <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                          Sklad: {p.stock}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Vlastná položka */}
        <div className="panel">
          <div className="ph"><span className="pt">Vlastná položka</span></div>
          <div className="pb">
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <input 
                className="fi" 
                type="text" 
                placeholder="Názov položky" 
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{ flex: 1 }}
              />
              <input 
                className="fi" 
                type="number" 
                placeholder="Cena €" 
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                style={{ width: "90px" }}
                step="0.5"
                min="0"
              />
              <button className="btn btn-acid" onClick={addCustomToCart}><i className="fas fa-plus"></i></button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Účet / Košík */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", minHeight: "450px" }}>
          <div className="ph" style={{ justifyContent: "space-between" }}>
            <span className="pt">Aktuálny účet</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setCart([])}>
              <i className="fas fa-trash"></i> Vyčistiť
            </button>
          </div>
          
          <div className="pb" style={{ flex: 1, padding: "1rem" }}>
            {cart.length === 0 ? (
              <div className="empty-state" style={{ height: "100%", border: "2px dashed var(--border)" }}>
                Košík je prázdny
              </div>
            ) : (
              <div className="kasa-items">
                {cart.map((c, i) => (
                  <div key={i} className="kasa-item">
                    <div className="kasa-item-name">{c.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <button className="qty-btn" onClick={() => updateQty(i, -1)}><i className="fas fa-minus"></i></button>
                      <span className="qty-val">{c.qty}</span>
                      <button className="qty-btn" onClick={() => updateQty(i, 1)}><i className="fas fa-plus"></i></button>
                    </div>
                    <div className="kasa-item-price">
                      {((c.priceCents * c.qty) / 100).toFixed(2)} €
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ borderTop: "1px solid var(--border)", padding: "1.2rem", background: "var(--surface)" }}>
            <div className="fg" style={{ marginBottom: "1rem" }}>
              <label className="fl" style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase" }}>Priradiť člena k nákupu (voliteľné)</label>
              <select className="fi" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>
                <option value="">— Bez člena (Anonym) —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>
                ))}
              </select>
            </div>
            
            <div className="kasa-total">
              <div>
                <div className="kasa-total-lbl">Celkom k úhrade</div>
                <div className="kasa-total-val">{cartEuros} €</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="kasa-total-lbl">Tržba dnes</div>
                <div style={{ fontFamily: "var(--font-d)", fontSize: "1.1rem", fontWeight: 700, color: "var(--orange)" }}>
                   {(todaySales.totalEuros || 0).toFixed(2)} €
                </div>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "0.8rem" }}>
              <button 
                className="btn btn-acid" 
                style={{ flex: 1, justifyContent: "center", padding: "0.8rem" }}
                onClick={() => checkout("cash")}
                disabled={cart.length === 0}
              >
                <i className="fas fa-coins"></i> Hotovosť
              </button>
              <button 
                className="btn btn-purple" 
                style={{ flex: 1, justifyContent: "center", padding: "0.8rem" }}
                onClick={() => checkout("card")}
                disabled={cart.length === 0}
              >
                <i className="fas fa-credit-card"></i> Karta
              </button>
            </div>
          </div>
        </div>

        {/* Prezretie dnešných predajov */}
        <div className="panel">
          <div className="ph"><span className="pt">Predaje dnes ({(todaySales.totalEuros || 0).toFixed(2)} €)</span></div>
            <div className="kasa-items" style={{ maxHeight: "250px" }}>
              {(!todaySales.items || todaySales.items.length === 0) ? (
                <div className="empty-state" style={{ padding: "1rem" }}>Zatiaľ žiadny predaj</div>
              ) : (
                todaySales.items.slice().reverse().map((t, idx) => (
                  <div key={idx} className="kasa-item">
                    <div style={{ color: "var(--muted)", width: "50px", fontSize: "0.75rem" }}>
                      {new Date(t.createdAt).toLocaleTimeString("sk-SK", { hour: "2-digit", minute:"2-digit"})}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                        {t.items.map(i => `${i.quantity}x ${i.productName || 'Produkt'}`).join(", ")}
                      </div>
                      {t.userName && <div style={{ fontSize: "0.68rem", color: "var(--purple)" }}><i className="fas fa-user"></i> {t.userName}</div>}
                    </div>
                    <i className={`fas ${t.paymentMethod === 'card' ? 'fa-credit-card' : 'fa-coins'}`} style={{ color: "var(--muted)", fontSize: "0.8rem" }}></i>
                    <div className="kasa-item-price" style={{ minWidth: "70px" }}>
                      {(t.totalCents / 100).toFixed(2)} €
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>

      </div>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
