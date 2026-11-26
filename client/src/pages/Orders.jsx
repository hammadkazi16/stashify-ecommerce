import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, inr, dateFmt, timeFmt, STATUS_LABEL, ORDER_FLOW } from '../lib/api.js';
import { useStore } from '../lib/store.jsx';
import { Page, EmptyState, Spinner, Alert, Badge } from '../components/ui.jsx';
import ProductImage from '../components/ProductImage.jsx';

function Timeline({ order }) {
  if (order.status === 'cancelled') {
    return (
      <div className="timeline cancelled">
        <div className="tl-step done"><span className="tl-dot">✕</span><div><b>Order cancelled</b><small>Refund initiated · 3–5 business days</small></div></div>
      </div>
    );
  }
  const idx = ORDER_FLOW.indexOf(order.status);
  return (
    <div className="timeline">
      {ORDER_FLOW.map((s, i) => {
        const entry = order.timeline.find((t) => t.status === s);
        const done = i <= idx;
        return (
          <div key={s} className={`tl-step ${done ? 'done' : ''} ${i === idx ? 'current' : ''}`}>
            <span className="tl-dot">{done ? '✓' : ''}</span>
            <div>
              <b>{STATUS_LABEL[s]}</b>
              <small>{entry ? timeFmt(entry.at) : i === idx + 1 ? 'Up next' : '—'}</small>
              {entry?.note && <p>{entry.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Orders() {
  const { user, authReady, byId } = useStore();
  const nav = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { if (authReady && !user) nav('/login?next=/orders', { replace: true }); }, [authReady, user, nav]);
  useEffect(() => {
    if (!user) return;
    api('/orders').then(setOrders).catch((e) => setError(e.message));
  }, [user]);

  if (!user) return <Page><div className="container center-pad"><Spinner size={28} /></div></Page>;

  return (
    <Page className="orders-page">
      <div className="container">
        <div className="page-head">
          <h1>Your orders</h1>
          <p className="muted">Track every stash from confirmation to doorstep.</p>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        {!orders ? <div className="center-pad"><Spinner size={28} /></div>
          : orders.length === 0 ? (
            <EmptyState icon="📦" title="No orders yet" body="When you place an order it will appear here with live tracking."
              action={<Link to="/shop" className="btn btn-coral btn-lg">Start shopping</Link>} />
          ) : (
            <div className="order-list">
              {orders.map((o, i) => (
                <motion.div key={o.id} className="order-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="oc-head">
                    <div><small>Order placed</small><b>{dateFmt(o.createdAt)}</b></div>
                    <div><small>Total</small><b>{inr(o.total)}</b></div>
                    <div><small>Order ID</small><b className="mono">{o.id}</b></div>
                    <Badge tone={o.status === 'delivered' ? 'navy' : o.status === 'cancelled' ? 'cream' : 'coral'}>{STATUS_LABEL[o.status]}</Badge>
                  </div>
                  <div className="oc-body">
                    <div className="oc-thumbs">
                      {o.items.slice(0, 4).map((it) => (
                        <ProductImage key={it.productId + it.color} product={byId[it.productId] || it} alt={it.name} />
                      ))}
                    </div>
                    <div className="oc-meta">
                      <b>{o.items[0].name}{o.items.length > 1 ? ` + ${o.items.length - 1} more` : ''}</b>
                      <small>{o.status === 'delivered' ? 'Delivered' : o.status === 'cancelled' ? 'Cancelled' : `Arriving by ${dateFmt(o.eta)}`}</small>
                    </div>
                    <Link to={`/orders/${o.id}`} className="btn btn-ghost">Track & details →</Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
      </div>
    </Page>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const { user, authReady, byId, addToCart, toast } = useStore();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (authReady && !user) nav(`/login?next=/orders/${id}`, { replace: true }); }, [authReady, user, nav, id]);
  useEffect(() => { if (user) api(`/orders/${id}`).then(setOrder).catch((e) => setError(e.message)); }, [user, id]);

  const cancel = async () => {
    if (!confirm('Cancel this order? Any payment will be refunded in 3–5 business days.')) return;
    setBusy(true);
    try { setOrder(await api(`/orders/${id}/cancel`, { method: 'POST' })); toast('Order cancelled', 'info'); }
    catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const reorder = () => {
    order.items.forEach((it) => {
      const p = byId[it.productId];
      if (p) addToCart(p, it.qty, it.color, { silent: true });
    });
    toast('Items added back to your bag', 'success');
    nav('/cart');
  };

  if (!user || (!order && !error)) return <Page><div className="container center-pad"><Spinner size={28} /></div></Page>;
  if (error) return <Page><div className="container"><EmptyState icon="🔍" title="Order not found" body={error} action={<Link to="/orders" className="btn btn-coral">Back to orders</Link>} /></div></Page>;

  return (
    <Page className="order-detail">
      <div className="container">
        <nav className="crumbs"><Link to="/orders">Orders</Link> <i>/</i> <span className="mono">{order.id}</span></nav>
        <div className="page-head row">
          <div>
            <h1>Order {order.id}</h1>
            <p className="muted">Placed {dateFmt(order.createdAt)} · {order.items.length} item{order.items.length === 1 ? '' : 's'}</p>
          </div>
          <Badge tone={order.status === 'delivered' ? 'navy' : order.status === 'cancelled' ? 'cream' : 'coral'}>{STATUS_LABEL[order.status]}</Badge>
        </div>

        <div className="od-grid">
          <div className="od-main">
            <section className="panel">
              <h3>Tracking</h3>
              <Timeline order={order} />
              {order.status === 'out_for_delivery' && (
                <div className="delivery-otp">
                  <div><b>Delivery OTP</b><small>Share this with the agent to complete delivery.</small></div>
                  <span className="dotp">{order.deliveryOtp}</span>
                </div>
              )}
            </section>

            <section className="panel">
              <h3>Items in this order</h3>
              <div className="review-lines">
                {order.items.map((it) => (
                  <Link key={it.productId + it.color} to={`/product/${it.productId}`} className="review-line">
                    <ProductImage product={byId[it.productId] || it} />
                    <div><b>{it.name}</b><small>{it.color} · Qty {it.qty}</small></div>
                    <span>{inr(it.price * it.qty)}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="od-side">
            <section className="panel">
              <h3>Payment</h3>
              <div className="summary-rows">
                <div><span>Subtotal</span><b>{inr(order.totals.subtotal)}</b></div>
                {order.totals.discount > 0 && <div className="save"><span>Coupon {order.totals.coupon?.code}</span><b>−{inr(order.totals.discount)}</b></div>}
                <div><span>Delivery</span><b>{order.totals.shipping === 0 ? 'FREE' : inr(order.totals.shipping)}</b></div>
                <div className="summary-total"><span>Total paid</span><b>{inr(order.total)}</b></div>
              </div>
              <div className="pay-facts">
                <small>Gateway</small><b className="cap">{order.payment.gateway || 'razorpay'}</b>
                <small>Razorpay order ID</small><b className="mono">{order.payment.orderId}</b>
                <small>Razorpay payment ID</small><b className="mono">{order.payment.paymentId}</b>
                <small>Method</small><b className="cap">{order.payment.method}</b>
                <small>Mode</small><b className="cap">{order.payment.mode === 'live' ? 'Live' : 'Test / Simulated'} · signature verified ✓</b>
              </div>
            </section>

            <section className="panel">
              <h3>Delivery address</h3>
              <p className="addr-block">
                <b>{order.address.name}</b><br />
                {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}<br />
                {order.address.city}, {order.address.state} — {order.address.pincode}<br />
                📱 +91 {order.address.phone}
              </p>
            </section>

            <div className="od-actions">
              {!['shipped', 'delivered', 'cancelled'].includes(order.status) && (
                <button className="btn btn-ghost btn-block danger" onClick={cancel} disabled={busy}>{busy ? <Spinner /> : 'Cancel order'}</button>
              )}
              <button className="btn btn-navy btn-block" onClick={reorder}>Buy these again</button>
              <button className="btn btn-ghost btn-block" onClick={() => window.print()}>Print invoice</button>
            </div>
          </aside>
        </div>
      </div>
    </Page>
  );
}
