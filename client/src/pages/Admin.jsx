import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { api, inr, dateFmt, STATUS_LABEL, ORDER_FLOW } from '../lib/api.js';
import { Page, Alert, Spinner, Badge, Modal, Field, EmptyState } from '../components/ui.jsx';
import ProductImage from '../components/ProductImage.jsx';

export default function Admin() {
  const { user, authReady, toast } = useStore();
  const nav = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [otpFor, setOtpFor] = useState(null);
  const [deliveryOtp, setDeliveryOtp] = useState('');

  useEffect(() => { if (authReady && !user) nav('/login?next=/admin', { replace: true }); }, [authReady, user, nav]);

  const load = () => api('/admin/orders').then(setOrders).catch((e) => setError(e.message));
  useEffect(() => { if (user?.isAdmin) load(); }, [user]);

  if (!user) return <Page><div className="container center-pad"><Spinner size={28} /></div></Page>;
  if (!user.isAdmin) {
    return <Page><div className="container">
      <EmptyState icon="🔒" title="Admin access required"
        body="The first account created on this Stashify instance becomes the administrator."
        action={<Link to="/" className="btn btn-coral">Back to store</Link>} />
    </div></Page>;
  }

  const advance = async (o, otp) => {
    setBusy(o.id); setError('');
    try {
      await api(`/orders/${o.id}/advance`, { method: 'POST', body: { deliveryOtp: otp } });
      await load();
      setOtpFor(null); setDeliveryOtp('');
      toast(`${o.id} moved forward`, 'success');
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const nextStatus = (o) => ORDER_FLOW[ORDER_FLOW.indexOf(o.status) + 1];
  const revenue = (orders || []).filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);

  return (
    <Page className="admin">
      <div className="container">
        <div className="page-head">
          <h1>Fulfilment console</h1>
          <p className="muted">Advance orders through the delivery pipeline. Delivery requires the customer's OTP.</p>
        </div>

        {error && <Alert tone="error" onDismiss={() => setError('')}>{error}</Alert>}

        <div className="account-stats">
          <div className="stat-card"><b>{orders?.length ?? '—'}</b><span>Total orders</span></div>
          <div className="stat-card"><b>{inr(revenue)}</b><span>Revenue</span></div>
          <div className="stat-card"><b>{orders?.filter((o) => o.status === 'delivered').length ?? 0}</b><span>Delivered</span></div>
          <div className="stat-card"><b>{orders?.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length ?? 0}</b><span>In pipeline</span></div>
        </div>

        {!orders ? <div className="center-pad"><Spinner size={28} /></div> : orders.length === 0 ? (
          <EmptyState icon="🗂" title="No orders yet" body="Place a test order from the storefront and it will appear here." />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Delivery OTP</th><th>Action</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link to={`/orders/${o.id}`} className="mono">{o.id}</Link><small>{dateFmt(o.createdAt)}</small></td>
                    <td><b>{o.customer?.name}</b><small>{o.customer?.email}</small></td>
                    <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                    <td><b>{inr(o.total)}</b></td>
                    <td><Badge tone={o.status === 'delivered' ? 'navy' : o.status === 'cancelled' ? 'cream' : 'coral'}>{STATUS_LABEL[o.status]}</Badge></td>
                    <td className="mono">{o.deliveryOtp}</td>
                    <td>
                      {['delivered', 'cancelled'].includes(o.status) ? <span className="muted-sm">Complete</span> : (
                        <button className="btn btn-navy btn-sm" disabled={busy === o.id}
                          onClick={() => nextStatus(o) === 'delivered' ? setOtpFor(o) : advance(o)}>
                          {busy === o.id ? <Spinner size={14} /> : `→ ${STATUS_LABEL[nextStatus(o)]}`}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!otpFor} onClose={() => setOtpFor(null)} title="Confirm delivery" width={420}>
        <div className="stack pad">
          <p className="muted">Ask the customer for the 4-digit delivery OTP shown on their order page, then enter it to mark <b>{otpFor?.id}</b> delivered.</p>
          <Field label="Delivery OTP">
            <input className="input mono" inputMode="numeric" maxLength={4} value={deliveryOtp}
              onChange={(e) => setDeliveryOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <button className="btn btn-coral btn-block" disabled={deliveryOtp.length !== 4 || busy}
            onClick={() => advance(otpFor, deliveryOtp)}>Mark delivered</button>
          <p className="muted-sm">For this demo the expected code is <b className="mono">{otpFor?.deliveryOtp}</b>.</p>
        </div>
      </Modal>
    </Page>
  );
}
