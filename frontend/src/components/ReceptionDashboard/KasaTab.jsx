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
  const [activeCat, setActiveCat] = useState("Všetky");
  const [sortOption, setSortOption] = useState("pop");
  const [popStats, setPopStats] = useState({}); // { name: count }

  useEffect(() => {
    loadProducts();
    loadMembers();
    loadTodaySales();
    loadPopularity();
  }, []);

  const loadPopularity = async () => {
    try {
      const res = await authenticatedFetch("/api/products/popular");
      if (res.ok) {
        const data = await res.json();
        console.log("Popularita data loaded:", data);
        const map = {};
        data.forEach(item => {
          map[item.name] = item.count;
        });
        setPopStats(map);
      }
    } catch (e) {
      console.warn("Popularita stats failed:", e);
    }
  };

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
        const data = await res.json();
        console.log("Today sales data:", data);
        // Backend returns { transactions: [...], totalEuros: ... }
        setTodaySales({
          items: data.transactions || [],
          totalEuros: data.totalEuros || 0
        });
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
      memberId: selectedMember || null
    };

    try {
      const res = await authenticatedFetch("/api/sales/transaction", {
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
    <div className="dashboard-grid animate-in">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Rýchly výber */}
        <div className="panel animate-in">
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(255,149,0,0.1)', color: 'var(--orange)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-th-large"></i>
              </div>
              <span className="pt">Katalóg položiek</span>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-sort-amount-down" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1, fontSize: '0.8rem' }}></i>
                <select className="fi" value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{ paddingLeft: '2.2rem', borderRadius: '8px', height: '36px', fontSize: '0.75rem', width: '160px', background: 'var(--surface2)' }}>
                   <option value="pop">Zoradiť: Populárne</option>
                   <option value="name">Zoradiť: Názov</option>
                   <option value="price">Zoradiť: Cena</option>
                </select>
              </div>
            </div>
          </div>
          <div className="pb" style={{ padding: '1rem' }}>
            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
              {["Všetky", ...new Set(products.map(p => p.category).filter(Boolean))].map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  style={{ 
                    padding: '0.45rem 1.1rem', 
                    borderRadius: '20px', 
                    border: '1px solid', 
                    borderColor: activeCat === cat ? 'var(--acid)' : 'var(--border)', 
                    background: activeCat === cat ? 'var(--acid)' : 'rgba(255,255,255,0.02)', 
                    color: activeCat === cat ? '#000' : 'var(--muted)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {products.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem' }}>
                <i className="fas fa-box-open" style={{fontSize: '3rem', opacity: 0.1, marginBottom: '1rem'}}></i>
                Žiadne aktívne produkty v systéme
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
                {products
                  .filter(p => activeCat === "Všetky" || p.category === activeCat)
                  .sort((a, b) => {
                    if (sortOption === "name") return (a.name || "").localeCompare(b.name || "");
                    if (sortOption === "price") return b.priceCents - a.priceCents;
                    if (sortOption === "pop") {
                      const countA = popStats[a.name] || 0;
                      const countB = popStats[b.name] || 0;
                      if (countA !== countB) return countB - countA;
                      return b.stock - a.stock; // secondary tie-break
                    }
                    return 0;
                  })
                  .map(p => {
                    const outOfStock = p.stock <= 0;
                    const salesCount = popStats[p.name] || 0;
                    return (
                      <div 
                        key={p.id} 
                        className={`glass highlight ${outOfStock ? 'muted' : 'acid'}`}
                        onClick={() => !outOfStock && addToCart(p)}
                        style={{ 
                          padding: '1.2rem 1rem', 
                          borderRadius: '16px', 
                          cursor: outOfStock ? 'not-allowed' : 'pointer', 
                          textAlign: 'center', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '0.4rem',
                          transition: 'all 0.2s',
                          border: '1px solid var(--border)',
                          background: outOfStock ? 'rgba(255,255,255,0.02)' : 'rgba(200,255,0,0.02)',
                          opacity: outOfStock ? 0.5 : 1,
                          position: 'relative'
                        }}
                        onMouseEnter={e => { if(!outOfStock) { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = 'rgba(200,255,0,0.06)'; } }}
                        onMouseLeave={e => { if(!outOfStock) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(200,255,0,0.02)'; } }}
                      >
                        {salesCount > 0 && (
                          <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--orange)', color: '#000', fontSize: '0.6rem', fontWeight: 900, padding: '2px 6px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(255,149,0,0.3)', zIndex: 1 }}>
                            TOP: {salesCount}
                          </div>
                        )}
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'var(--font-d)', letterSpacing: '0.02em', minHeight: '2.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.name}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: outOfStock ? 'var(--muted)' : 'var(--acid)', fontFamily: 'var(--font-d)' }}>{(p.priceCents / 100).toFixed(2)} €</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: outOfStock ? 'var(--red)' : 'var(--muted)', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.6rem', borderRadius: '4px', alignSelf: 'center' }}>
                        {outOfStock ? 'VYPREDANÉ' : `SKLADOM: ${p.stock}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Vlastná položka */}
        <div className="panel animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="ph">
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.1)', color: 'var(--text)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-keyboard"></i>
              </div>
              <span className="pt">Manuálny dopyt</span>
            </div>
          </div>
          <div className="pb">
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <i className="fas fa-tag" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
                <input 
                  className="fi" 
                  type="text" 
                  placeholder="Názov služby / tovaru..." 
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{ paddingLeft: '2.8rem', borderRadius: '10px', height: '52px' }}
                />
              </div>
              <div style={{ width: "120px", position: 'relative' }}>
                <i className="fas fa-euro-sign" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
                <input 
                  className="fi" 
                  type="number" 
                  placeholder="0.00" 
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  style={{ paddingLeft: '2.5rem', borderRadius: '10px', height: '52px', textAlign: 'right' }}
                  step="0.5"
                  min="0"
                />
              </div>
              <button className="btn btn-acid" onClick={addCustomToCart} style={{ borderRadius: '10px', width: '52px', height: '52px', padding: 0 }} title="Pridať do košíka">
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Účet / Košík */}
        <div className="panel animate-in" style={{ display: "flex", flexDirection: "column", minHeight: "500px", animationDelay: '0.05s', border: '1px solid rgba(200,255,0,0.1)' }}>
          <div className="ph" style={{ justifyContent: "space-between", background: 'rgba(200,255,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(200,255,0,0.1)', color: 'var(--acid)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-shopping-cart"></i>
              </div>
              <span className="pt">Aktuálna objednávka</span>
            </div>
            <button className="btn btn-ghost btn-xs" onClick={() => setCart([])} disabled={cart.length === 0} style={{ borderRadius: '6px' }}>
              <i className="fas fa-trash-alt"></i> VYMAZAŤ
            </button>
          </div>
          
          <div className="pb" style={{ flex: 1, padding: "1.5rem", overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.2 }}>
                <i className="fas fa-cart-plus" style={{fontSize: '4rem', marginBottom: '1.5rem'}}></i>
                <p style={{ fontWeight: 700, letterSpacing: '0.05em' }}>KOŠÍK JE PRÁZDNY</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {cart.map((c, i) => (
                  <div key={i} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{(c.priceCents / 100).toFixed(2)} € / ks</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                      <button style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.2rem' }} onClick={() => updateQty(i, -1)}><i className="fas fa-minus" style={{fontSize: '0.7rem'}}></i></button>
                      <span style={{ fontFamily: 'var(--font-d)', fontWeight: 900, fontSize: '1.1rem', minWidth: '20px', textAlign: 'center' }}>{c.qty}</span>
                      <button style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.2rem' }} onClick={() => updateQty(i, 1)}><i className="fas fa-plus" style={{fontSize: '0.7rem'}}></i></button>
                    </div>
                    <div style={{ minWidth: '70px', textAlign: 'right', fontFamily: 'var(--font-d)', fontWeight: 900, color: 'var(--acid)', fontSize: '1.1rem' }}>
                      {((c.priceCents * c.qty) / 100).toFixed(2)} €
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ borderTop: "1px solid var(--border)", padding: "1.5rem", background: "rgba(0,0,0,0.2)" }}>
            <div className="fg" style={{ marginBottom: "1.5rem" }}>
              <label className="fl" style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: '0.1em', fontWeight: 800 }}>Zákazník (Pripísať na účet)</label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-user-circle" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}></i>
                <select className="fi" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} style={{ paddingLeft: '2.8rem', borderRadius: '10px' }}>
                  <option value="">Anonymný predaj</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.email})</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
               <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Dnešná tržba</div>
                  <div style={{ fontFamily: "var(--font-d)", fontSize: "1.2rem", fontWeight: 900, color: "var(--orange)" }}>
                     {(todaySales.totalEuros || 0).toFixed(2)} €
                  </div>
               </div>
               <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>Spolu</div>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '2.4rem', fontWeight: 950, color: 'var(--acid)', lineHeight: 1 }}>{cartEuros} €</div>
               </div>
            </div>
            
            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                className="btn btn-acid btn-block" 
                style={{ flex: 1, height: '52px', borderRadius: '12px', fontWeight: 900, gap: '0.8rem' }}
                onClick={() => checkout("cash")}
                disabled={cart.length === 0}
              >
                <i className="fas fa-coins" style={{fontSize: '1.2rem'}}></i> HOTOVOSŤ
              </button>
              <button 
                className={`btn ${cart.length > 0 ? 'btn-purple' : 'btn-ghost'} btn-block`}
                style={{ flex: 1, height: '52px', borderRadius: '12px', fontWeight: 900, gap: '0.8rem' }}
                onClick={() => checkout("card")}
                disabled={cart.length === 0}
              >
                <i className="fas fa-credit-card" style={{fontSize: '1.2rem'}}></i> KARTOU
              </button>
            </div>
          </div>
        </div>

        {/* Prezretie dnešných predajov */}
        <div className="panel animate-in" style={{ animationDelay: '0.15s' }}>
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)', color: 'var(--text)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-history"></i>
              </div>
              <span className="pt">História predajov dnes</span>
            </div>
          </div>
          <div className="pb" style={{ padding: '0.5rem' }}>
            <div style={{ maxHeight: "280px", overflowY: 'auto', padding: '0.5rem' }}>
              {(!todaySales.items || todaySales.items.length === 0) ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', opacity: 0.5 }}>Zatiaľ neboli realizované žiadne predaje</div>
              ) : (
                todaySales.items.slice().reverse().map((t, idx) => (
                  <div key={idx} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem', borderRadius: '10px', marginBottom: '0.4rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 900, fontFamily: 'var(--font-d)', color: 'var(--muted)', width: '45px' }}>
                      {new Date(t.createdAt).toLocaleTimeString("sk-SK", { hour: "2-digit", minute:"2-digit"})}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                        {t.items.map(i => `${i.quantity}x ${i.productName || 'Položka'}`).join(", ")}
                      </div>
                      {t.userName && <div style={{ fontSize: "0.68rem", color: "var(--acid)", display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}><i className="fas fa-user-check"></i> {t.userName}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <i className={`fas ${t.paymentMethod === 'card' ? 'fa-credit-card' : 'fa-coins'}`} style={{ color: "var(--muted)", fontSize: "0.8rem" }}></i>
                      <div style={{ fontFamily: 'var(--font-d)', fontWeight: 900, color: 'var(--text)', fontSize: '1rem', minWidth: '60px', textAlign: 'right' }}>
                        {(t.totalEuros || 0).toFixed(2)} €
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
