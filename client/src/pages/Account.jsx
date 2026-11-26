import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { api, dateFmt } from '../lib/api.js';
import { Page, Alert, Spinner, Field, OtpInput, Modal } from '../components/ui.jsx';

export default function Account() {
  const { user, authReady, refreshUser, logout, toast, wishlist, cartCount, config, manageAccount } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [phoneModal, setPhoneModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [orders, setOrders] = useState([]);
  const [addr, setAddr] = useState(null);

  useEffect(() => { if (authReady && !user) nav('/login?next=/account', { replace: true }); }, [authReady, user, nav]);
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone || '');
    api('/orders').then(setOrders).catch(() => {});
  }, [user]);

  if (!user) return <Page><div className="container center-pad"><Spinner size={28} /></div></Page>;

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api('/me', { method: 'PUT', body: { name } }); await refreshUser(); toast('Profile updated', 'success'); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const sendOtp = async () => {
    setBusy(true); setError('');
    try {
      const r = await api('/phone/send', { method: 'POST', body: { phone } });
      setSent(true); setDevCode(r.devCode || ''); setOtp('');
      toast(`Code sent to +91 ${r.phone}`, 'success');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const verify = async (code) => {
    const pin = code || otp;
    if (pin.length !== 6) return;
    setBusy(true); setError('');
    try {
      await api('/phone/verify', { method: 'POST', body: { phone, code: pin } });
      await refreshUser();
      setPhoneModal(false); setSent(false); setOtp('');
      toast('Mobile verified ✓', 'success');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const addAddress = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/addresses', { method: 'POST', body: addr });
      await refreshUser();
      setAddr(null);
      toast('Address added', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <Page className="account">
      <div className="container">
        <div className="page-head">
          <h1>Your account</h1>
          <p className="muted">Member since {dateFmt(user.createdAt)}</p>
        </div>

        <div className="account-stats">
          <Link to="/orders" className="stat-card"><b>{orders.length}</b><span>Orders placed</span></Link>
          <Link to="/wishlist" className="stat-card"><b>{wishlist.length}</b><span>Wishlist items</span></Link>
          <Link to="/cart" className="stat-card"><b>{cartCount}</b><span>In your bag</span></Link>
          <div className="stat-card">
            <b>{user.emailVerified && user.phoneVerified ? '2/2' : user.emailVerified || user.phoneVerified ? '1/2' : '0/2'}</b>
            <span>Verifications</span>
          </div>
        </div>

        <div className="account-grid">
          <section className="panel">
            <h3>Profile</h3>
            {error && !phoneModal && <Alert tone="error">{error}</Alert>}
            <form onSubmit={saveProfile} className="stack">
              <Field label="Full name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Email address">
                <div className="verified-field">
                  <input className="input" value={user.email} disabled />
                  <span className={`verify-chip ${user.emailVerified ? 'ok' : 'warn'}`}>{user.emailVerified ? '✓ Verified' : 'Unverified'}</span>
                </div>
              </Field>
              {!user.emailVerified && config.authProvider !== 'clerk' && <Link to={`/verify?email=${encodeURIComponent(user.email)}`} className="btn btn-coral btn-sm">Verify email now</Link>}
              {manageAccount && <button type="button" className="btn btn-ghost btn-sm" onClick={() => manageAccount()}>Manage login & security</button>}
              <Field label="Mobile number">
                <div className="verified-field">
                  <input className="input" value={user.phone ? `+91 ${user.phone}` : 'Not added'} disabled />
                  <span className={`verify-chip ${user.phoneVerified ? 'ok' : 'warn'}`}>{user.phoneVerified ? '✓ Verified' : 'Unverified'}</span>
                </div>
              </Field>
              <div className="form-actions">
                <button className="btn btn-coral" disabled={busy}>{busy ? <Spinner /> : 'Save changes'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setPhoneModal(true); setSent(false); setError(''); }}>
                  {user.phoneVerified ? 'Change mobile' : 'Verify mobile'}
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <h3>Addresses</h3>
            <div className="addr-list">
              {(user.addresses || []).map((a) => (
                <div key={a.id} className="addr-card static">
                  <div>
                    <b>{a.name} <span className="addr-label">{a.label}</span>{a.isDefault && <span className="addr-label default">Default</span>}</b>
                    <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} — {a.pincode}</p>
                    <small>📱 +91 {a.phone}</small>
                  </div>
                  <button className="link-btn danger" onClick={async () => { await api(`/addresses/${a.id}`, { method: 'DELETE' }); await refreshUser(); }}>Delete</button>
                </div>
              ))}
              {(user.addresses || []).length === 0 && <p className="muted">No addresses saved yet.</p>}
            </div>

            {addr ? (
              <form className="addr-form" onSubmit={addAddress}>
                <div className="form-row">
                  <Field label="Name"><input className="input" required value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} /></Field>
                  <Field label="Label"><select className="input" value={addr.label} onChange={(e) => setAddr({ ...addr, label: e.target.value })}><option>Home</option><option>Work</option><option>Other</option></select></Field>
                </div>
                <Field label="Street"><input className="input" required value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} /></Field>
                <div className="form-row three">
                  <Field label="City"><input className="input" required value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} /></Field>
                  <Field label="State"><input className="input" required value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} /></Field>
                  <Field label="Pincode"><input className="input" required value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} /></Field>
                </div>
                <div className="form-actions">
                  <button className="btn btn-coral" disabled={busy}>{busy ? <Spinner /> : 'Save address'}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setAddr(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <button className="btn btn-ghost" onClick={() => setAddr({ label: 'Home', name: user.name, line1: '', city: '', state: '', pincode: '', phone: user.phone })}>+ Add address</button>
            )}
          </section>

          <section className="panel">
            <h3>Security & session</h3>
            <div className="security-list">
              <div><span>Email verification</span><b className={user.emailVerified ? 'ok-text' : 'warn-text'}>{user.emailVerified ? 'Verified' : 'Pending'}</b></div>
              <div><span>Mobile verification</span><b className={user.phoneVerified ? 'ok-text' : 'warn-text'}>{user.phoneVerified ? 'Verified' : 'Pending'}</b></div>
              <div><span>Password</span><b>{config.authProvider === 'clerk' ? 'Managed by Clerk' : 'bcrypt hashed · 10 rounds'}</b></div>
              <div><span>Session</span><b>{config.authProvider === 'clerk' ? 'Clerk secure session' : 'JWT · 30-day expiry'}</b></div>
              <div><span>Payments</span><b>{config.razorpayEnabled ? 'Razorpay live' : 'Razorpay Test Mode (simulated)'}</b></div>
              {user.isAdmin && <div><span>Role</span><b>Administrator</b></div>}
            </div>
            <div className="form-actions">
              {user.isAdmin && <Link to="/admin" className="btn btn-navy">Fulfilment console</Link>}
              <button className="btn btn-ghost danger" onClick={() => { logout(); nav('/'); }}>Sign out</button>
            </div>
          </section>
        </div>
      </div>

      <Modal open={phoneModal} onClose={() => setPhoneModal(false)} title="Verify mobile number" width={460}>
        <div className="stack pad">
          {error && <Alert tone="error">{error}</Alert>}
          {!sent ? (
            <>
              <Field label="Mobile number" hint="We'll send a 6-digit code. Valid 10 minutes.">
                <div className="phone-row">
                  <span className="phone-prefix">+91</span>
                  <input className="input" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </div>
              </Field>
              <button className="btn btn-coral btn-block" onClick={sendOtp} disabled={busy || phone.length !== 10}>{busy ? <Spinner /> : 'Send OTP'}</button>
            </>
          ) : (
            <>
              <p className="otp-sent">Code sent to <b>+91 {phone}</b></p>
              {devCode && <div className="dev-code" role="button" tabIndex={0} onClick={() => setOtp(devCode)}><span>Demo SMS code</span><b>{devCode}</b><small>tap to fill</small></div>}
              <OtpInput value={otp} onChange={setOtp} onComplete={verify} disabled={busy} />
              <button className="btn btn-coral btn-block" onClick={() => verify()} disabled={busy || otp.length !== 6}>{busy ? <Spinner /> : 'Verify'}</button>
              <button className="btn btn-ghost btn-block" onClick={sendOtp} disabled={busy}>Resend code</button>
            </>
          )}
        </div>
      </Modal>
    </Page>
  );
}
