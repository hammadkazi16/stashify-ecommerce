import { useState } from 'react';
import { NavLink, Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../../lib/store.jsx';
import { api } from '../../lib/api.js';
import { Spinner } from '../../components/ui.jsx';

function Onboarding() {
  const { user, setUser, toast } = useStore();
  const [form, setForm] = useState({ storeName: '', gstin: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await api('/seller/apply', { method: 'POST', body: form });
      setUser(r.user);
      toast('Your store is live. Add your first product!', 'success');
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  };

  if (!user.emailVerified) {
    return (
      <div className="seller-empty">
        <div className="big">✉️</div>
        <h2>Verify your email first</h2>
        <p>For everyone's safety, sellers need a verified email before opening a store.</p>
        <Link to="/verify" className="btn btn-coral">Verify email →</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 620, paddingTop: 40 }}>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="panel">
        <span className="eyebrow">Sell on Stashify</span>
        <h1 style={{ fontSize: 28, margin: '6px 0 8px' }}>Open your store</h1>
        <p style={{ opacity: .65, marginBottom: 22 }}>List products with real photos, track orders and grow your brand. It takes a minute.</p>
        {err && <div className="alert warn">{err}</div>}
        <form onSubmit={submit} className="form-grid">
          <div className="field full">
            <label>Store name *</label>
            <input value={form.storeName} onChange={set('storeName')} placeholder="e.g. Aurora Audio" required minLength={3} maxLength={60} />
            <div className="hint">This is the brand buyers see on your listings.</div>
          </div>
          <div className="field full">
            <label>GSTIN (optional)</label>
            <input value={form.gstin} onChange={set('gstin')} placeholder="22AAAAA0000A1Z5" maxLength={15} style={{ textTransform: 'uppercase' }} />
            <div className="hint">Leave blank if you don't have one yet.</div>
          </div>
          <div className="field full">
            <label>About your store</label>
            <textarea value={form.description} onChange={set('description')} placeholder="What do you sell? What makes it special?" maxLength={600} />
          </div>
          <div className="full">
            <button className="btn btn-coral btn-lg" disabled={busy} style={{ width: '100%' }}>
              {busy ? <Spinner /> : 'Create my store →'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function SellerLayout() {
  const { user, authReady } = useStore();
  const location = useLocation();
  if (!authReady) return <div className="route-loading"><span className="spinner" /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;

  const tabs = [
    { to: '/seller', label: 'Overview', end: true },
    { to: '/seller/products', label: 'Products' },
    { to: '/seller/orders', label: 'Orders' },
    { to: '/seller/settings', label: 'Store settings' }
  ];

  return (
    <div className="seller-shell">
      <header className="seller-top">
        <div className="container">
          <div className="seller-brand">
            <Link to="/" className="logo" aria-label="Stashify home">
              <svg viewBox="0 0 64 64" width="30" height="30"><rect width="64" height="64" rx="16" fill="#FF6B5B"/><path d="M20 23h24l-2.4 27a3 3 0 0 1-3 2.7H25.4a3 3 0 0 1-3-2.7Z" fill="#F4EDE0"/><path d="M25 23v-2.5a7 7 0 0 1 14 0V23" fill="none" stroke="#14213D" strokeWidth="3.2" strokeLinecap="round"/></svg>
            </Link>
            <div>
              <b>{user.seller?.storeName || 'Seller Central'}</b>
              <small>Stashify Seller</small>
            </div>
          </div>
          {user.seller && (
            <nav className="seller-nav">
              {tabs.map((t) => (
                <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'on' : '')}>{t.label}</NavLink>
              ))}
              <Link to="/">← Storefront</Link>
            </nav>
          )}
        </div>
      </header>
      <main className="seller-main">
        {user.seller ? <Outlet /> : <Onboarding />}
      </main>
    </div>
  );
}
