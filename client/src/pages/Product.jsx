import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, inr, dateFmt } from '../lib/api.js';
import { useStore } from '../lib/store.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import ProductImage, { productPhoto } from '../components/ProductImage.jsx';
import { Page, Stars, Price, Badge, Alert, Spinner, Field, EmptyState } from '../components/ui.jsx';

export default function Product() {
  const { id } = useParams();
  const nav = useNavigate();
  const { byId, products, addToCart, toggleWishlist, wishlist, markRecent, user, toast, setCartOpen } = useStore();
  const [colorIdx, setColorIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('details');
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [revForm, setRevForm] = useState({ rating: 5, title: '', body: '' });
  const [revBusy, setRevBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [pinInfo, setPinInfo] = useState(null);
  const [zoom, setZoom] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  const product = byId[id];

  useEffect(() => {
    setColorIdx(0); setQty(1); setTab('details'); setPinInfo(null); setPhotoIdx(0); setZoom(false);
    if (id) markRecent(id);
  }, [id, markRecent]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    api(`/products/${id}`, { auth: false }).then((d) => alive && setRelated(d.related)).catch(() => {});
    api(`/products/${id}/reviews`, { auth: false }).then((d) => alive && setReviews(d)).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  const avgRating = useMemo(() => {
    if (!product) return 0;
    if (!reviews.length) return product.rating;
    const userReviews = reviews.filter((r) => !r.id.includes('-seed-'));
    return userReviews.length
      ? Math.round(((product.rating * 20 + userReviews.reduce((s, r) => s + r.rating, 0)) / (20 + userReviews.length)) * 10) / 10
      : product.rating;
  }, [reviews, product]);

  if (!product) {
    return (
      <Page><div className="container">
        <EmptyState icon="🧭" title="Product not found" body="This item may have been removed from the stash."
          action={<Link to="/shop" className="btn btn-coral">Browse all products</Link>} />
      </div></Page>
    );
  }

  const color = product.colors[colorIdx];
  const wished = wishlist.includes(product.id);
  const off = Math.round((1 - product.price / product.mrp) * 100);
  const photos = product.images || [];

  const buyNow = () => {
    addToCart(product, qty, color.name, { silent: true });
    nav('/checkout');
  };

  const checkPin = () => {
    if (!/^\d{6}$/.test(pin)) { setPinInfo({ ok: false, msg: 'Enter a valid 6-digit pincode.' }); return; }
    const days = 2 + (Number(pin[5]) % 4);
    setPinInfo({ ok: true, msg: `Delivers by ${dateFmt(Date.now() + days * 86400000)} · ${product.price >= 499 ? 'Free delivery' : '₹49 delivery'}` });
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) { nav(`/login?next=/product/${id}`); return; }
    setRevBusy(true);
    try {
      const r = await api(`/products/${id}/reviews`, { method: 'POST', body: revForm });
      setReviews((list) => [r, ...list]);
      setRevForm({ rating: 5, title: '', body: '' });
      toast('Thanks — your review is live.', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setRevBusy(false); }
  };

  return (
    <Page className="pdp">
      <div className="container">
        <nav className="crumbs">
          <Link to="/">Home</Link> <i>/</i>
          <Link to={`/shop?category=${product.category}`}>{product.category}</Link> <i>/</i>
          <span>{product.name}</span>
        </nav>

        <div className="pdp-grid">
          {/* ------------------------ PHOTO GALLERY ------------------------ */}
          <div className={`pdp-stage is-photo ${zoom ? 'zoomed' : ''}`}>
            <div className="stage-top">
              <Badge tone="navy">{photos.length} photo{photos.length === 1 ? '' : 's'}</Badge>
              <div className="stage-tools">
                <button className="tool" onClick={() => setZoom((z) => !z)} title="Expand">{zoom ? '✕ Close' : '⤢'}</button>
              </div>
            </div>

            <div className="gallery">
              <div className="gallery-main">
                {photos.length > 0 ? (
                  <>
                    <img src={productPhoto(product, photoIdx, 'full')} alt={`${product.name} — view ${photoIdx + 1}`} />
                    {photos.length > 1 && (
                      <>
                        <button className="gal-nav prev" onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)} aria-label="Previous photo">‹</button>
                        <button className="gal-nav next" onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)} aria-label="Next photo">›</button>
                        <span className="gal-count">{photoIdx + 1} / {photos.length}</span>
                      </>
                    )}
                  </>
                ) : (
                  <div className="gallery-empty">
                    <ProductImage product={product} size="full" />
                    <span>Photos coming soon</span>
                  </div>
                )}
              </div>
              {photos.length > 1 && (
                <div className="gallery-thumbs">
                  {photos.map((im, i) => (
                    <button key={im.id} className={i === photoIdx ? 'on' : ''} onClick={() => setPhotoIdx(i)} aria-label={`Photo ${i + 1}`}>
                      <img src={im.thumb || im.url} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="stage-foot">
              <span className="drag-hint">{photos.length > 1 ? 'Tap a thumbnail to change view' : 'Real product photography'}</span>
              <div className="stage-swatches">
                {product.colors.map((c, i) => (
                  <button key={c.name} className={`swatch lg ${i === colorIdx ? 'on' : ''}`}
                    style={{ background: c.hex }} onClick={() => setColorIdx(i)} title={c.name} aria-label={c.name} />
                ))}
              </div>
            </div>
          </div>

          {/* ------------------------- BUY BOX ------------------------ */}
          <div className="pdp-info">
            <span className="pdp-brand">{product.brand}</span>
            <h1>{product.name}</h1>
            <div className="pdp-rating">
              <Stars value={avgRating} showValue count={product.ratingCount} />
              <button className="link-btn" onClick={() => setTab('reviews')}>{reviews.length} reviews</button>
              {product.badges.map((b) => <Badge key={b} tone={b === 'Deal' ? 'coral' : 'cream'}>{b}</Badge>)}
            </div>

            <div className="pdp-price">
              <Price product={product} size="lg" />
              <span className="muted-sm">Inclusive of all taxes</span>
            </div>

            <p className="pdp-desc">{product.description}</p>

            <div className="pdp-color">
              <span className="label">Colour: <b>{color.name}</b></span>
              <div className="swatch-row">
                {product.colors.map((c, i) => (
                  <button key={c.name} className={`swatch lg ${i === colorIdx ? 'on' : ''}`}
                    style={{ background: c.hex }} onClick={() => setColorIdx(i)} title={c.name} />
                ))}
              </div>
            </div>

            <div className="pdp-offers">
              <b>Offers</b>
              <ul>
                <li><span className="tag">FIRST15</span> 15% off up to ₹3,000 on your first order</li>
                <li><span className="tag">STASH10</span> 10% off up to ₹1,500 over ₹999</li>
                <li>Free delivery on orders over ₹499</li>
              </ul>
            </div>

            <div className="pdp-buy">
              <div className="qty lg">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase quantity">+</button>
              </div>
              <button className="btn btn-coral btn-lg" onClick={() => addToCart(product, qty, color.name)}>Add to bag</button>
              <button className="btn btn-cream btn-lg" onClick={buyNow}>Buy now</button>
              <button className={`heart lg ${wished ? 'on' : ''}`} onClick={() => toggleWishlist(product.id)} aria-label="Wishlist">
                <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9.3A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.7C19 15.6 12 20 12 20z" strokeWidth="1.8" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <div className="pdp-stock">
              <span className={`dot ${product.stock > 5 ? 'ok' : 'low'}`} />
              {product.stock > 5 ? 'In stock' : `Only ${product.stock} left`} · Ships from Stashify fulfilment
            </div>

            <div className="pin-check">
              <Field label="Check delivery">
                <div className="pin-row">
                  <input className="input" placeholder="6-digit pincode" value={pin} inputMode="numeric"
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                  <button className="btn btn-ghost" onClick={checkPin}>Check</button>
                </div>
              </Field>
              {pinInfo && <Alert tone={pinInfo.ok ? 'success' : 'error'}>{pinInfo.msg}</Alert>}
            </div>

            <div className="pdp-assure">
              <span>↩ 7-day returns</span><span>🛡 Warranty included</span><span>🔒 Verified checkout</span>
            </div>
          </div>
        </div>

        {/* ---------------------------- TABS ---------------------------- */}
        <div className="tabs">
          {[['details', 'Highlights'], ['specs', 'Specifications'], ['reviews', `Reviews (${reviews.length})`]].map(([k, label]) => (
            <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        <div className="tab-panel">
          {tab === 'details' && (
            <div className="highlights">
              {product.highlights.map((h) => <div key={h} className="highlight"><span>◆</span>{h}</div>)}
            </div>
          )}

          {tab === 'specs' && (
            <table className="spec-table">
              <tbody>
                {Object.entries(product.specs).map(([k, v]) => (
                  <tr key={k}><th>{k.replace(/_/g, ' ')}</th><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'reviews' && (
            <div className="reviews">
              <div className="reviews-summary">
                <div className="rs-score"><b>{avgRating.toFixed(1)}</b><Stars value={avgRating} size={16} /><small>{product.ratingCount.toLocaleString('en-IN')} ratings</small></div>
                <form className="review-form" onSubmit={submitReview}>
                  <h4>{user ? 'Write a review' : 'Sign in to write a review'}</h4>
                  <div className="rate-picker">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button type="button" key={n} className={revForm.rating >= n ? 'on' : ''}
                        onClick={() => setRevForm({ ...revForm, rating: n })} aria-label={`${n} stars`}>★</button>
                    ))}
                  </div>
                  <input className="input" placeholder="Sum it up in a few words" value={revForm.title}
                    onChange={(e) => setRevForm({ ...revForm, title: e.target.value })} />
                  <textarea className="input" rows={3} placeholder="What did you like or dislike?" value={revForm.body}
                    onChange={(e) => setRevForm({ ...revForm, body: e.target.value })} />
                  <button className="btn btn-coral" disabled={revBusy}>{revBusy ? <Spinner /> : user ? 'Post review' : 'Sign in to review'}</button>
                </form>
              </div>
              <div className="review-list">
                {reviews.map((r) => (
                  <div key={r.id} className="review">
                    <div className="review-head">
                      <span className="avatar">{r.name[0]}</span>
                      <div><b>{r.name}</b>{r.verified && <span className="verified-buy">✓ Verified purchase</span>}</div>
                      <small>{dateFmt(r.createdAt)}</small>
                    </div>
                    <Stars value={r.rating} size={13} />
                    {r.title && <h5>{r.title}</h5>}
                    <p>{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {related.length > 0 && (
          <section className="section">
            <div className="section-head"><div><span className="eyebrow">Goes well with</span><h2>You might also like</h2></div></div>
            <div className="grid-products">
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}
      </div>
    </Page>
  );
}
