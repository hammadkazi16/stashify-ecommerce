import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { inr } from '../lib/api.js';
import { EmptyState } from './ui.jsx';
import ProductImage from '../components/ProductImage.jsx';

export default function CartDrawer() {
  const { cartOpen, setCartOpen, cartLines, cartSubtotal, setQty, removeFromCart, saveForLater, cartCount } = useStore();
  const nav = useNavigate();
  const toFree = Math.max(0, 499 - cartSubtotal);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div className="drawer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCartOpen(false)} />
          <motion.aside
            className="drawer"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            aria-label="Shopping bag"
          >
            <div className="drawer-head">
              <h3>Your bag <span className="muted">({cartCount})</span></h3>
              <button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Close bag">✕</button>
            </div>

            {cartLines.length === 0 ? (
              <div className="drawer-empty">
                <EmptyState
                  icon="🛍️"
                  title="Your bag is empty"
                  body="Browse the stash and add your favourites here."
                  action={<button className="btn btn-coral" onClick={() => { setCartOpen(false); nav('/shop'); }}>Start shopping</button>}
                />
              </div>
            ) : (
              <>
                <div className="free-ship">
                  {toFree > 0
                    ? <span>Add <b>{inr(toFree)}</b> more for free delivery</span>
                    : <span>🎉 You've unlocked <b>free delivery</b></span>}
                  <div className="free-bar"><i style={{ width: `${Math.min(100, (cartSubtotal / 499) * 100)}%` }} /></div>
                </div>

                <div className="drawer-body">
                  {cartLines.map((l) => (
                    <motion.div key={l.productId + l.color} className="dline" layout exit={{ opacity: 0, x: 30 }}>
                      <Link to={`/product/${l.productId}`} onClick={() => setCartOpen(false)} className="dline-img">
                        <ProductImage product={l.product} />
                      </Link>
                      <div className="dline-meta">
                        <Link to={`/product/${l.productId}`} onClick={() => setCartOpen(false)}>{l.product.name}</Link>
                        <small>{l.color}</small>
                        <div className="dline-row">
                          <div className="qty">
                            <button onClick={() => setQty(l.productId, l.color, l.qty - 1)} aria-label="Decrease">−</button>
                            <span>{l.qty}</span>
                            <button onClick={() => setQty(l.productId, l.color, l.qty + 1)} aria-label="Increase">+</button>
                          </div>
                          <b>{inr(l.lineTotal)}</b>
                        </div>
                        <div className="dline-actions">
                          <button onClick={() => saveForLater(l.productId, l.color)}>Save for later</button>
                          <button onClick={() => removeFromCart(l.productId, l.color)}>Remove</button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="drawer-foot">
                  <div className="drawer-total"><span>Subtotal</span><b>{inr(cartSubtotal)}</b></div>
                  <p className="muted-sm">Taxes included. Delivery and coupons calculated at checkout.</p>
                  <button className="btn btn-coral btn-block" onClick={() => { setCartOpen(false); nav('/checkout'); }}>Checkout →</button>
                  <button className="btn btn-ghost btn-block" onClick={() => { setCartOpen(false); nav('/cart'); }}>View full bag</button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
