import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store.jsx';
import { api, inr } from '../lib/api.js';
import { Page, EmptyState, Alert, Spinner } from '../components/ui.jsx';
import ProductImage from '../components/ProductImage.jsx';

export default function Cart() {
  const {
    cartLines, cartSubtotal, setQty, removeFromCart, saveForLater,
    saved, moveToCart, setSaved, byId, coupon, setCoupon, toast, config
  } = useStore();
  const nav = useNavigate();
  const [quote, setQuote] = useState(null);
  const [code, setCode] = useState(coupon);
  const [busy, setBusy] = useState(false);
  const [coupons, setCoupons] = useState([]);

  useEffect(() => { api('/coupons', { auth: false }).then(setCoupons).catch(() => {}); }, []);

  useEffect(() => {
    if (!cartLines.length) { setQuote(null); return; }
    let alive = true;
    setBusy(true);
    api('/cart/quote', {
      method: 'POST', auth: false,
      body: { items: cartLines.map((l) => ({ productId: l.productId, qty: l.qty, color: l.color })), coupon }
    }).then((q) => alive && setQuote(q)).catch((e) => alive && toast(e.message, 'error')).finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [cartLines, coupon, toast]);

  const applyCoupon = (c) => {
    const value = (c ?? code).toUpperCase().trim();
    if (!value) { setCoupon(''); return; }
    setCoupon(value);
    setCode(value);
  };

  const savedLines = saved.map((s) => ({ ...s, product: byId[s.productId] })).filter((s) => s.product);

  return (
    <Page className="cart-page">
      <div className="container">
        <div className="page-head">
          <h1>Your bag</h1>
          <p className="muted">{cartLines.length} line item{cartLines.length === 1 ? '' : 's'} · prices verified server-side</p>
        </div>

        {cartLines.length === 0 ? (
          <EmptyState icon="🛍️" title="Your bag is empty"
            body="Everything you add shows real photos, so you know exactly what's coming."
            action={<Link to="/shop" className="btn btn-coral btn-lg">Browse the stash</Link>} />
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {cartLines.map((l) => {
                const hex = l.product.colors.find((c) => c.name === l.color)?.hex || l.product.colors[0].hex;
                return (
                  <motion.div key={l.productId + l.color} className="cart-item" layout exit={{ opacity: 0, x: -20 }}>
                    <Link to={`/product/${l.productId}`} className="ci-media">
                      <ProductImage product={l.product} alt={l.product.name} />
                    </Link>
                    <div className="ci-body">
                      <Link to={`/product/${l.productId}`} className="ci-name">{l.product.name}</Link>
                      <span className="ci-meta">{l.product.brand} · {l.color}</span>
                      <span className="ci-stock">In stock · Free returns for 7 days</span>
                      <div className="ci-actions">
                        <div className="qty">
                          <button onClick={() => setQty(l.productId, l.color, l.qty - 1)} aria-label="Decrease">−</button>
                          <span>{l.qty}</span>
                          <button onClick={() => setQty(l.productId, l.color, l.qty + 1)} aria-label="Increase">+</button>
                        </div>
                        <button className="link-btn" onClick={() => saveForLater(l.productId, l.color)}>Save for later</button>
                        <button className="link-btn danger" onClick={() => removeFromCart(l.productId, l.color)}>Remove</button>
                      </div>
                    </div>
                    <div className="ci-price">
                      <b>{inr(l.lineTotal)}</b>
                      {l.qty > 1 && <small>{inr(l.product.price)} each</small>}
                      <small className="ci-mrp">{inr(l.product.mrp * l.qty)}</small>
                    </div>
                  </motion.div>
                );
              })}

              {savedLines.length > 0 && (
                <div className="saved-block">
                  <h3>Saved for later ({savedLines.length})</h3>
                  <div className="saved-grid">
                    {savedLines.map((s) => (
                      <div key={s.productId + s.color} className="saved-card">
                        <ProductImage product={s.product} />
                        <b>{s.product.name}</b>
                        <small>{s.color} · {inr(s.product.price)}</small>
                        <div className="saved-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => moveToCart(s.productId, s.color)}>Move to bag</button>
                          <button className="link-btn danger" onClick={() => setSaved((list) => list.filter((x) => !(x.productId === s.productId && x.color === s.color)))}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="summary">
              <h3>Order summary</h3>

              <div className="coupon-box">
                <div className="coupon-row">
                  <input className="input" placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                  <button className="btn btn-navy" onClick={() => applyCoupon()} disabled={busy}>{busy ? <Spinner /> : 'Apply'}</button>
                </div>
                {quote?.coupon && <Alert tone="success">{quote.coupon.code} applied — you saved {inr(quote.discount)} <button className="link-btn" onClick={() => { setCoupon(''); setCode(''); }}>remove</button></Alert>}
                {quote?.couponError && <Alert tone="error">{quote.couponError}</Alert>}
                <div className="coupon-list">
                  {coupons.map((c) => (
                    <button key={c.code} className="coupon-chip" onClick={() => applyCoupon(c.code)}>
                      <b>{c.code}</b><small>{c.label}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="summary-rows">
                <div><span>Subtotal</span><b>{inr(quote?.subtotal ?? cartSubtotal)}</b></div>
                {quote?.savings > 0 && <div className="save"><span>Launch savings</span><b>−{inr(quote.savings)}</b></div>}
                {quote?.discount > 0 && <div className="save"><span>Coupon ({quote.coupon.code})</span><b>−{inr(quote.discount)}</b></div>}
                <div><span>Delivery</span><b>{quote?.shipping === 0 ? 'FREE' : inr(quote?.shipping ?? 49)}</b></div>
                <div className="summary-total"><span>Total payable</span><b>{inr(quote?.total ?? cartSubtotal)}</b></div>
              </div>

              <button className="btn btn-coral btn-block btn-lg" onClick={() => nav('/checkout')} disabled={busy}>
                Proceed to checkout →
              </button>
              <p className="summary-note">🔒 Email + mobile OTP verification, then {config.razorpayEnabled ? 'Razorpay' : 'a Razorpay-style'} payment.</p>
              <Link to="/shop" className="btn btn-ghost btn-block">Continue shopping</Link>
            </aside>
          </div>
        )}
      </div>
    </Page>
  );
}
