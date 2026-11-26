import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, inr, timeFmt, STATUS_LABEL } from '../../lib/api.js';
import { Spinner } from '../../components/ui.jsx';

const Stat = ({ label, value, sub, accent, delay = 0 }) => (
  <motion.div className={`stat-card ${accent ? 'accent' : ''}`} initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: .4 }}>
    <small>{label}</small><b>{value}</b>{sub && <div className="sub">{sub}</div>}
  </motion.div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    api('/seller/me').then(setData).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  if (err) return <div className="container"><div className="alert warn">{err}</div></div>;
  if (!data) return <div className="route-loading"><span className="spinner" /></div>;
  const s = data.stats;

  return (
    <div className="container">
      <div className="seller-head">
        <div>
          <h1>Welcome back 👋</h1>
          <p>Here's how {data.seller.storeName} is doing.</p>
        </div>
        <Link to="/seller/products/new" className="btn btn-coral">+ Add product</Link>
      </div>

      <div className="stat-grid">
        <Stat label="Revenue" value={inr(s.revenue)} sub={`${s.units} units sold`} accent delay={0} />
        <Stat label="Orders" value={s.orderCount} sub="with your products" delay={.05} />
        <Stat label="Products" value={s.productCount} sub={`${s.activeCount} live · ${s.draftCount} draft`} delay={.1} />
        <Stat label="Photos" value={s.photoCount} sub={s.missingPhotos ? `${s.missingPhotos} need photos` : 'all listings covered'} delay={.15} />
      </div>

      {(s.lowStock > 0 || s.outOfStock > 0 || s.missingPhotos > 0) && (
        <div className="alert warn">
          {s.outOfStock > 0 && <span><b>{s.outOfStock}</b> out of stock. </span>}
          {s.lowStock > 0 && <span><b>{s.lowStock}</b> running low (≤5). </span>}
          {s.missingPhotos > 0 && <span><b>{s.missingPhotos}</b> listing{s.missingPhotos > 1 ? 's' : ''} without photos.</span>}
          {' '}<Link to="/seller/products" style={{ color: 'inherit', fontWeight: 700 }}>Review →</Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 22 }}>
        <div className="panel">
          <div className="panel-head"><h2>Recent orders</h2><Link to="/seller/orders" className="btn btn-ghost btn-sm">View all</Link></div>
          {s.recentOrders.length === 0 ? (
            <p style={{ opacity: .6, fontSize: 14 }}>No orders yet. Share your listings to get your first sale.</p>
          ) : (
            <table className="seller-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
              <tbody>
                {s.recentOrders.slice(0, 6).map((o) => (
                  <tr key={o.orderId}>
                    <td><b style={{ fontSize: 12 }}>{o.orderId}</b><br /><small style={{ opacity: .5 }}>{timeFmt(o.at)}</small></td>
                    <td>{o.customer}<br /><small style={{ opacity: .5 }}>{o.city}</small></td>
                    <td><span className={`status-pill ${o.status === 'delivered' ? 'active' : 'draft'}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Top products</h2></div>
          {s.topProducts.length === 0 ? (
            <p style={{ opacity: .6, fontSize: 14 }}>Sales will appear here once orders come in.</p>
          ) : (
            <table className="seller-table">
              <thead><tr><th>Product</th><th style={{ textAlign: 'right' }}>Units</th><th style={{ textAlign: 'right' }}>Revenue</th></tr></thead>
              <tbody>
                {s.topProducts.map((p) => (
                  <tr key={p.productId}>
                    <td><Link to={`/seller/products/${p.productId}`} style={{ color: 'var(--navy)', fontWeight: 600 }}>{p.name}</Link></td>
                    <td style={{ textAlign: 'right' }}>{p.units}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
