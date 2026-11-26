import { useEffect, useState } from 'react';
import { api, inr, timeFmt, STATUS_LABEL } from '../../lib/api.js';
import { EmptyState } from '../../components/ui.jsx';

export default function SellerOrders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { api('/seller/orders').then(setOrders).catch(() => setOrders([])); }, []);
  if (!orders) return <div className="route-loading"><span className="spinner" /></div>;

  return (
    <div className="container">
      <div className="seller-head"><div><h1>Orders</h1><p>Orders that include your products.</p></div></div>
      {orders.length === 0 ? (
        <EmptyState icon="🧾" title="No orders yet" body="When buyers purchase your products, the orders will show up here." />
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="seller-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Status</th><th style={{ textAlign: 'right' }}>Your total</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.orderId}>
                    <td><b style={{ fontSize: 12 }}>{o.orderId}</b><br /><small style={{ opacity: .5 }}>{timeFmt(o.at)}</small></td>
                    <td>{o.customer}<br /><small style={{ opacity: .5 }}>{o.city}</small></td>
                    <td>{o.items.map((it, i) => <div key={i} style={{ fontSize: 12 }}>{it.qty}× {it.name} <small style={{ opacity: .5 }}>({it.color})</small></div>)}</td>
                    <td><span className={`status-pill ${o.status === 'delivered' ? 'active' : o.status === 'cancelled' ? 'archived' : 'draft'}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
