import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authenticatedFetch } from "../../utils/api";
import Toast from "../Toast";

export default function KasaTab() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");

  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const [todaySales, setTodaySales] = useState({ items: [], totalEuros: 0 });
  const [activeCat, setActiveCat] = useState("Všetky");
  const [sortOption, setSortOption] = useState("pop");
  const [popStats, setPopStats] = useState({});

  const [toastMsg, setToastMsg] = useState(null);

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
        const map = {};
        data.forEach(item => { map[item.name] = item.count; });
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
        productName: c.id ? null : c.name,
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
      loadProducts();
      loadPopularity();
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.priceCents * item.qty), 0);
  const cartEuros = (cartTotal / 100).toFixed(2);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="dashboard-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <motion.div variants={itemVariants} className="panel glass-panel">
          <div className="ph">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div className="neon-icon yellow" style={{ width: 32, height: 32, background: 'rgba(255,149,0,0.1)', color: 'var(--orange)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-th-large"></i>
              </div>
              <span className="pt">Katalóg položiek</span>
            </div>
            <div style={{ position: 'relative' }}>
              <select className="fi" value={sortOption} onChange={(e) => setSortOption(e.target.value)} style={{ paddingLeft: '2.5rem', borderRadius: '10px', height: '36px', fontSize: '0.75rem', width: '180px', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none', cursor: 'pointer', appearance: 'none' }}>
                <option value="pop" style={{ background: '#1a1a1e', color: '#fff', padding: '10px' }}>🔥 Populárne</option>
                <option value="name" style={{ background: '#1a1a1e', color: '#fff', padding: '10px' }}>🔤 Podľa názvu</option>
                <option value="price" style={{ background: '#1a1a1e', color: '#fff', padding: '10px' }}>💰 Podľa ceny</option>
              </select>
              <i className="fas fa-sort" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--orange)', fontSize: '0.8rem', pointerEvents: 'none' }}></i>
              <i className="fas fa-chevron-down" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.7rem', pointerEvents: 'none' }}></i>
            </div>
          </div>
          <div className="pb" style={{ padding: '1.2rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.8rem', overflowX: 'auto', paddingBottom: '0.6rem', scrollbarWidth: 'none' }}>
              {["Všetky", ...new Set(products.map(p => p.category).filter(Boolean))].map(cat => (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  style={{
                    padding: '0.5rem 1.2rem', borderRadius: '25px', border: '1px solid',
                    borderColor: activeCat === cat ? 'var(--orange)' : 'var(--border)',
                    background: activeCat === cat ? 'var(--orange)' : 'rgba(255,149,0,0.05)',
                    color: activeCat === cat ? '#000' : 'var(--muted)',
                    fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </motion.button>
              ))}
            </div>

            <motion.div layout className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1.2rem' }}>
              <AnimatePresence>
                {products
                  .filter(p => activeCat === "Všetky" || p.category === activeCat)
                  .sort((a, b) => {
                    if (sortOption === "name") return (a.name || "").localeCompare(b.name || "");
                    if (sortOption === "price") return b.priceCents - a.priceCents;
                    if (sortOption === "pop") {
                      const countA = popStats[a.name] || 0;
                      const countB = popStats[b.name] || 0;
                      return countB !== countA ? countB - countA : b.stock - a.stock;
                    }
                    return 0;
                  })
                  .map(p => {
                    const outOfStock = p.stock <= 0;
                    const salesCount = popStats[p.name] || 0;
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={!outOfStock ? { y: -5, boxShadow: '0 10px 25px rgba(255,149,0,0.15)' } : {}}
                        onClick={() => !outOfStock && addToCart(p)}
                        className="glass"
                        style={{
                          padding: '1.5rem 1rem', borderRadius: '20px', cursor: outOfStock ? 'not-allowed' : 'pointer',
                          textAlign: 'center', border: '1px solid var(--border)',
                          background: outOfStock ? 'rgba(0,0,0,0.4)' : 'rgba(255,149,0,0.01)',
                          position: 'relative', overflow: 'hidden'
                        }}
                      >
                        {salesCount > 0 && !outOfStock && (
                          <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--orange)', color: '#000', fontSize: '0.6rem', fontWeight: 950, padding: '2px 8px', borderBottomLeftRadius: '10px' }}>
                            TOP {salesCount}
                          </div>
                        )}
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'var(--font-d)', letterSpacing: '0.02em', minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: outOfStock ? 'var(--muted)' : '#fff' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 950, color: outOfStock ? 'var(--muted)' : 'var(--orange)', fontFamily: 'var(--font-d)', marginTop: '0.5rem' }}>
                          {(p.priceCents / 100).toFixed(2)} €
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: outOfStock ? 'var(--red)' : 'var(--muted)', background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.6rem', borderRadius: '8px', marginTop: '0.8rem', display: 'inline-block' }}>
                          {outOfStock ? 'VYPREDANÉ' : `SKLADOM: ${p.stock}`}
                        </div>
                        {!outOfStock && (
                          <div className="add-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(255,149,0,0.1)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}>
                            <i className="fas fa-plus-circle" style={{ fontSize: '2rem', color: 'var(--orange)' }} />
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                }
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="panel glass-panel">
          <div className="ph"><span className="pt"><i className="fas fa-pen-nib" style={{ marginRight: '0.8rem' }} />Manuálna položka</span></div>
          <div className="pb" style={{ padding: '1.2rem' }}>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <i className="fas fa-edit" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
                <input className="fi" type="text" placeholder="Názov služby / tovaru..." value={customName} onChange={(e) => setCustomName(e.target.value)} style={{ paddingLeft: '2.8rem', borderRadius: '12px', height: '52px' }} />
              </div>
              <div style={{ width: "130px", position: 'relative' }}>
                <i className="fas fa-euro-sign" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
                <input className="fi" type="number" placeholder="0.00" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} style={{ paddingLeft: '2.5rem', borderRadius: '12px', height: '52px', textAlign: 'right' }} />
              </div>
              <button className="btn btn-acid" onClick={addCustomToCart} style={{ borderRadius: '12px', width: '52px', height: '52px', padding: 0 }}><i className="fas fa-plus"></i></button>
            </div>
          </div>
        </motion.div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <motion.div variants={itemVariants} className="panel glass-panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "600px", border: '1px solid rgba(200,255,0,0.15)' }}>
          <div className="ph" style={{ justifyContent: "space-between", background: 'rgba(200,255,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div className="neon-icon yellow" style={{ width: 32, height: 32, background: 'rgba(200,255,0,0.1)', color: 'var(--acid)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-shopping-basket"></i>
              </div>
              <span className="pt">Aktuálny košík</span>
            </div>
            <button className="btn btn-ghost btn-xs" onClick={() => setCart([])} disabled={cart.length === 0} style={{ borderRadius: '8px' }}>VYMAZAŤ</button>
          </div>

          <div className="pb" style={{ flex: 1, padding: "1.5rem", overflowY: 'auto' }}>
            <AnimatePresence mode="popLayout">
              {cart.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.1 }}>
                  <i className="fas fa-cart-arrow-down" style={{ fontSize: '5rem', marginBottom: '1.5rem' }} />
                  <p style={{ fontWeight: 900, letterSpacing: '0.2em' }}>KOŠÍK JE PRÁZDNY</p>
                </motion.div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {cart.map((c, i) => (
                    <motion.div
                      key={i}
                      layout
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      className="glass"
                      style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.4rem', borderRadius: '16px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800 }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{(c.priceCents / 100).toFixed(2)} € / ks</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '10px' }}>
                        <button className="btn-qty" onClick={() => updateQty(i, -1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><i className="fas fa-minus"></i></button>
                        <span style={{ fontFamily: 'var(--font-d)', fontWeight: 950, fontSize: '1.2rem', minWidth: '24px', textAlign: 'center' }}>{c.qty}</span>
                        <button className="btn-qty" onClick={() => updateQty(i, 1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><i className="fas fa-plus"></i></button>
                      </div>
                      <div style={{ minWidth: '80px', textAlign: 'right', fontFamily: 'var(--font-d)', fontWeight: 950, color: 'var(--acid)', fontSize: '1.2rem' }}>
                        {((c.priceCents * c.qty) / 100).toFixed(2)} €
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="cart-footer" style={{ borderTop: "1px solid var(--border)", padding: "1.8rem", background: "rgba(0,0,0,0.3)" }}>
            <div className="fg" style={{ marginBottom: "1.8rem" }}>
              <label className="fl" style={{ fontSize: "0.65rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: '0.15em', fontWeight: 900, marginBottom: '0.6rem' }}>Pripísať členovi (voliteľné)</label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-user-tag" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1, pointerEvents: 'none' }}></i>
                <select className="fi" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} style={{ paddingLeft: '3.2rem', borderRadius: '12px', height: '52px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', outline: 'none', cursor: 'pointer', appearance: 'none', width: '100%' }}>
                  <option value="" style={{ background: '#1a1a1e', color: '#fff' }}>🛒 Anonymný nákup (Hotovosť / Karta)</option>
                  {members.map(m => <option key={m.id} value={m.id} style={{ background: '#1a1a1e', color: '#fff' }}>{m.fullName} ({m.email})</option>)}
                </select>
                <i className="fas fa-chevron-down" style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}></i>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 900, marginBottom: '0.3rem' }}>Tržba dnes</div>
                <div style={{ fontFamily: "var(--font-d)", fontSize: "1.4rem", fontWeight: 950, color: "var(--orange)" }}>{(todaySales.totalEuros || 0).toFixed(2)} €</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 900, marginBottom: '0.3rem' }}>Celkom k úhrade</div>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '3rem', fontWeight: 950, color: 'var(--acid)', lineHeight: 0.9 }}>{cartEuros} €</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-acid btn-block" style={{ flex: 1, height: '60px', borderRadius: '16px', fontWeight: 950, fontSize: '1rem', letterSpacing: '0.05em' }} onClick={() => checkout("cash")} disabled={cart.length === 0}>
                <i className="fas fa-coins" style={{ marginRight: '0.8rem' }} /> HOTOVOSŤ
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-purple btn-block" style={{ flex: 1, height: '60px', borderRadius: '16px', fontWeight: 950, fontSize: '1rem', letterSpacing: '0.05em' }} onClick={() => checkout("card")} disabled={cart.length === 0}>
                <i className="fas fa-credit-card" style={{ marginRight: '0.8rem' }} /> KARTOU
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="panel glass-panel">
          <div className="ph" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="pt"><i className="fas fa-history" style={{ marginRight: '0.8rem', color: 'var(--muted)' }} />Nedávne predaje</span>
          </div>
          <div className="pb" style={{ padding: '0.8rem' }}>
            <div style={{ maxHeight: "300px", overflowY: 'auto' }}>
              <AnimatePresence>
                {(!todaySales.items || todaySales.items.length === 0) ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>Dnes zatiaľ žiadne operácie</div>
                ) : (
                  todaySales.items.slice().reverse().map((t, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass"
                      style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1.2rem', borderRadius: '12px', marginBottom: '0.6rem', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div style={{ fontSize: "0.8rem", fontWeight: 950, fontFamily: 'var(--font-d)', color: 'var(--muted)', width: '50px' }}>
                        {new Date(t.createdAt).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 800 }}>{t.items.map(i => `${i.quantity}x ${i.productName || 'Položka'}`).join(", ")}</div>
                        {t.userName && <div style={{ fontSize: "0.68rem", color: "var(--acid)", fontWeight: 700, marginTop: '0.2rem' }}><i className="fas fa-user-tag" /> {t.userName}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <i className={`fas ${t.paymentMethod === 'card' ? 'fa-credit-card' : 'fa-coins'}`} style={{ color: "var(--muted)", fontSize: "0.85rem" }}></i>
                        <div style={{ fontFamily: 'var(--font-d)', fontWeight: 950, color: '#fff', fontSize: '1.1rem', textAlign: 'right' }}>{(t.totalEuros || 0).toFixed(2)} €</div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </motion.div>
  );
}
