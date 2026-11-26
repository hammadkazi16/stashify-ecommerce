import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store.jsx';
import { api, inr, dateFmt } from '../lib/api.js';
import ProductImage from '../components/ProductImage.jsx';
import PaymentSheet from '../components/PaymentSheet.jsx';
import { Page, Alert, Spinner, Field, OtpInput, EmptyState } from '../components/ui.jsx';

const STEPS = ['Address', 'Verify mobile', 'Payment'];

/* Pure-CSS celebration (no 3D). */
function Confetti() {
  const colors = ['#FF6B5B', '#F4EDE0', '#FFD166', '#5BC0EB', '#FF6B5B', '#F4EDE0'];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }).map((_, i) => (
        <span key={i} style={{
          left: `${(i * 37) % 100}%`,
          background: colors[i % colors.length],
          animationDelay: `${(i % 9) * 0.18}s`,
          animationDuration: `${2.4 + (i % 5) * 0.4}s`,
          transform: `rotate(${(i * 47) % 360}deg)`
        }} />
      ))}
    </div>
  );
}

export default function Checkout() {
  const { user, authReady, cartLines, cartSubtotal, coupon, clearCart, refreshUser, toast, config } = useStore();
  const nav = useNavigate();

  const [step, setStep] = useState(0);
  const [addressId, setAddressId] = useState(null);
  const [showAddr, setShowAddr] = useState(false);
  const [addr, setAddr] = useState({ label: 'Home', name: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '' });
  const [addrBusy, setAddrBusy] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [otp, setOtp] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [payBusy, setPayBusy] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    if (authReady && !user) nav('/login?next=/checkout', { replace: true });
  }, [authReady, user, nav]);

  useEffect(() => {
    if (!user) return;
    setPhone(user.phone || '');
    const def = (user.addresses || []).find((a) => a.isDefault) || (user.addresses || [])[0];
    if (def) setAddressId(def.id);
    else setShowAddr(true);
    if (user.phoneVerified) setStep((s) => (s === 0 && def ? 1 : s));
  }, [user]);

  useEffect(() => {
    if (!cartLines.length || placed) return;
    api('/cart/quote', {
      method: 'POST',
      body: { items: cartLines.map((l) => ({ productId: l.productId, qty: l.qty, color: l.color })), coupon }
    }).then(setQuote).catch(() => {});
  }, [cartLines, coupon, placed]);

  useEffect(() => {
    if (placed) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [placed]);

  const total = quote?.total ?? cartSubtotal;

  /* ------------------------------ address ------------------------------ */
  const saveAddress = async (e) => {
    e.preventDefault();
    setAddrBusy(true); setError('');
    try {
      const me = await api('/addresses', { method: 'POST', body: addr });
      const newest = me.addresses[me.addresses.length - 1];
      setAddressId(newest.id);
      setShowAddr(false);
      setAddr({ label: 'Home', name: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '' });
      await refreshUser();
      toast('Address saved', 'success');
    } catch (e) { setError(e.message); }
    finally { setAddrBusy(false); }
  };

  const removeAddress = async (id) => {
    try {
      await api(`/addresses/${id}`, { method: 'DELETE' });
      await refreshUser();
      if (addressId === id) setAddressId(null);
    } catch (e) { toast(e.message, 'error'); }
  };

  /* -------------------------------- phone ------------------------------- */
  const sendOtp = async () => {
    setError(''); setOtpBusy(true);
    try {
      const r = await api('/phone/send', { method: 'POST', body: { phone } });
      setOtpSent(true);
      setDevCode(r.devCode || '');
      setOtp('');
      toast(`Code sent to +91 ${r.phone}`, 'success');
    } catch (e) { setError(e.message); }
    finally { setOtpBusy(false); }
  };

  const verifyPhone = async (code) => {
    const pin = code || otp;
    if (pin.length !== 6) { setError('Enter all 6 digits.'); return; }
    setOtpBusy(true); setError('');
    try {
      await api('/phone/verify', { method: 'POST', body: { phone, code: pin } });
      await refreshUser();
      setOtpSent(false);
      setStep(2);
      toast('Mobile verified ✓', 'success');
    } catch (e) { setError(e.message); }
    finally { setOtpBusy(false); }
  };

  /* ------------------------------- payment ------------------------------ */
  const startPayment = async () => {
    setPayBusy(true); setError('');
    try {
      const s = await api('/payments/create', {
        method: 'POST',
        body: {
          addressId, coupon,
          items: cartLines.map((l) => ({ productId: l.productId, qty: l.qty, color: l.color }))
        }
      });
      setSession(s);
    } catch (e) {
      setError(e.message);
      if (e.data?.needsPhone) setStep(1);
    } finally { setPayBusy(false); }
  };

  const onPaid = async (order) => {
    setSession(null);
    setPlaced(order);
    clearCart();
    await refreshUser();
  };

  /* ------------------------------- success ------------------------------ */
  if (placed) {
    return (
      <Page className="success-page">
        <div className="container">
          <div className="success-card">
            <div className="success-stage"><Confetti /></div>
            <motion.div className="success-copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <span className="success-tick">✓</span>
              <div className="rzp-success-badge">Razorpay · {placed.payment.mode === 'live' ? 'Live' : 'Test Mode'}</div>
              <h1>Payment successful!</h1>
              <p>Thanks {user?.name?.split(' ')[0]} — your order is confirmed. A payment-success email has been sent to <b>{user?.email}</b>.</p>
              <div className="success-meta">
                <div><small>Order ID</small><b>{placed.id}</b></div>
                <div><small>Amount paid</small><b>{inr(placed.total)}</b></div>
                <div><small>Arriving by</small><b>{dateFmt(placed.eta)}</b></div>
              </div>
              <div className="delivery-otp">
                <div>
                  <b>Delivery OTP</b>
                  <small>Share this 4-digit code with the delivery agent to receive your parcel.</small>
                </div>
                <span className="dotp">{placed.deliveryOtp}</span>
              </div>
              <div className="success-actions">
                <Link to={`/orders/${placed.id}`} className="btn btn-coral btn-lg">Track this order →</Link>
                <Link to="/shop" className="btn btn-ghost btn-lg">Keep shopping</Link>
              </div>
              <p className="muted-sm">Razorpay order {placed.payment.orderId} · payment {placed.payment.paymentId} · signature verified server-side</p>
            </motion.div>
          </div>
        </div>
      </Page>
    );
  }

  if (!user) return <Page><div className="container center-pad"><Spinner size={28} /></div></Page>;

  if (!cartLines.length) {
    return (
      <Page><div className="container">
        <EmptyState icon="🛍️" title="Nothing to check out" body="Add something to your bag first."
          action={<Link to="/shop" className="btn btn-coral btn-lg">Browse products</Link>} />
      </div></Page>
    );
  }

  const addresses = user.addresses || [];
  const canPay = addressId && user.phoneVerified;

  return (
    <Page className="checkout">
      <div className="container">
        <div className="page-head">
          <h1>Checkout</h1>
          <p className="muted">Three quick steps. Nothing is charged until the signature checks out.</p>
        </div>

        <div className="steps">
          {STEPS.map((s, i) => (
            <button key={s} className={`step ${step === i ? 'on' : ''} ${step > i ? 'done' : ''}`}
              onClick={() => (i === 0 || (i === 1 && addressId) || (i === 2 && canPay)) && setStep(i)}>
              <span className="step-num">{step > i ? '✓' : i + 1}</span>{s}
            </button>
          ))}
        </div>

        <div className="checkout-grid">
          <div className="checkout-main">
            {error && <Alert tone="error" onDismiss={() => setError('')}>{error}</Alert>}

            {/* ------------------------ STEP 1 ------------------------ */}
            {step === 0 && (
              <motion.section className="panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <h3>Where should we deliver?</h3>
                {!user.emailVerified && <Alert tone="warn">Your email isn't verified yet. <Link to={`/verify?email=${encodeURIComponent(user.email)}`}>Verify now</Link> to place an order.</Alert>}

                <div className="addr-list">
                  {addresses.map((a) => (
                    <label key={a.id} className={`addr-card ${addressId === a.id ? 'on' : ''}`}>
                      <input type="radio" name="addr" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                      <div>
                        <b>{a.name} <span className="addr-label">{a.label}</span></b>
                        <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} — {a.pincode}</p>
                        <small>📱 +91 {a.phone || user.phone || '—'}</small>
                      </div>
                      <button type="button" className="link-btn danger" onClick={(e) => { e.preventDefault(); removeAddress(a.id); }}>Delete</button>
                    </label>
                  ))}
                </div>

                {showAddr ? (
                  <form className="addr-form" onSubmit={saveAddress}>
                    <div className="form-row">
                      <Field label="Full name"><input className="input" required value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} placeholder="Recipient name" /></Field>
                      <Field label="Label"><select className="input" value={addr.label} onChange={(e) => setAddr({ ...addr, label: e.target.value })}><option>Home</option><option>Work</option><option>Other</option></select></Field>
                    </div>
                    <Field label="Flat, house, street"><input className="input" required value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} /></Field>
                    <Field label="Area, landmark (optional)"><input className="input" value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} /></Field>
                    <div className="form-row three">
                      <Field label="City"><input className="input" required value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} /></Field>
                      <Field label="State"><input className="input" required value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} /></Field>
                      <Field label="Pincode"><input className="input" required inputMode="numeric" value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} /></Field>
                    </div>
                    <Field label="Mobile for this address"><input className="input" inputMode="numeric" placeholder="10-digit number" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></Field>
                    <div className="form-actions">
                      <button className="btn btn-coral" disabled={addrBusy}>{addrBusy ? <Spinner /> : 'Save address'}</button>
                      {addresses.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => setShowAddr(false)}>Cancel</button>}
                    </div>
                  </form>
                ) : (
                  <button className="btn btn-ghost" onClick={() => setShowAddr(true)}>+ Add a new address</button>
                )}

                <div className="panel-foot">
                  <button className="btn btn-coral btn-lg" disabled={!addressId}
                    onClick={() => setStep(user.phoneVerified ? 2 : 1)}>
                    Continue {user.phoneVerified ? 'to payment' : 'to verification'} →
                  </button>
                </div>
              </motion.section>
            )}

            {/* ------------------------ STEP 2 ------------------------ */}
            {step === 1 && (
              <motion.section className="panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <h3>Verify your mobile number</h3>
                {user.phoneVerified ? (
                  <>
                    <Alert tone="success">+91 {user.phone} is verified ✓</Alert>
                    <div className="panel-foot"><button className="btn btn-coral btn-lg" onClick={() => setStep(2)}>Continue to payment →</button></div>
                  </>
                ) : (
                  <>
                    <p className="muted">We send a 6-digit code so the delivery agent can reach you. Codes expire in 10 minutes.</p>
                    {!otpSent ? (
                      <>
                        <Field label="Mobile number" hint="Indian 10-digit number starting 6–9">
                          <div className="phone-row">
                            <span className="phone-prefix">+91</span>
                            <input className="input" inputMode="numeric" value={phone} placeholder="98765 43210"
                              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
                          </div>
                        </Field>
                        <button className="btn btn-coral" onClick={sendOtp} disabled={otpBusy || phone.length !== 10}>
                          {otpBusy ? <Spinner /> : 'Send OTP'}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="otp-sent">Code sent to <b>+91 {phone}</b></p>
                        {devCode && (
                          <div className="dev-code" role="button" tabIndex={0} onClick={() => setOtp(devCode)}>
                            <span>Demo SMS code</span><b>{devCode}</b><small>tap to fill</small>
                          </div>
                        )}
                        <OtpInput value={otp} onChange={setOtp} onComplete={verifyPhone} disabled={otpBusy} />
                        <div className="form-actions">
                          <button className="btn btn-coral" onClick={() => verifyPhone()} disabled={otpBusy || otp.length !== 6}>
                            {otpBusy ? <Spinner /> : 'Verify & continue'}
                          </button>
                          <button className="btn btn-ghost" onClick={sendOtp} disabled={otpBusy}>Resend code</button>
                          <button className="btn btn-ghost" onClick={() => { setOtpSent(false); setOtp(''); }}>Change number</button>
                        </div>
                        <p className="muted-sm">Demo mode: the SMS is delivered to the Demo Inbox button at the bottom-right.</p>
                      </>
                    )}
                  </>
                )}
              </motion.section>
            )}

            {/* ------------------------ STEP 3 ------------------------ */}
            {step === 2 && (
              <motion.section className="panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <h3>Review & pay</h3>
                <div className="review-lines">
                  {cartLines.map((l) => (
                    <div key={l.productId + l.color} className="review-line">
                      <ProductImage product={l.product} />
                      <div><b>{l.product.name}</b><small>{l.color} · Qty {l.qty}</small></div>
                      <span>{inr(l.lineTotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="review-facts">
                  <div><small>Deliver to</small><b>{addresses.find((a) => a.id === addressId)?.label}</b>
                    <p>{addresses.find((a) => a.id === addressId)?.line1}, {addresses.find((a) => a.id === addressId)?.city}</p></div>
                  <div><small>Verified mobile</small><b>+91 {user.phone}</b><p className="ok-text">✓ OTP verified</p></div>
                  <div><small>Payment method</small><b>{config.razorpayEnabled ? 'Razorpay Checkout' : 'Razorpay Checkout (Test Mode)'}</b><p>Card · UPI · Netbanking</p></div>
                </div>

                <Alert tone="info">
                  {config.razorpayEnabled
                    ? 'You will be redirected to Razorpay Checkout. Your order is only created after the payment signature is verified.'
                    : 'Razorpay Checkout (Test Mode): a simulated Razorpay payment sheet will open and the payment will be marked successful. No real money moves.'}
                </Alert>

                <div className="panel-foot">
                  <button className="btn btn-coral btn-lg" onClick={startPayment} disabled={payBusy || !canPay}>
                    {payBusy ? <Spinner /> : `Pay ${inr(total)} securely`}
                  </button>
                </div>
              </motion.section>
            )}
          </div>

          {/* --------------------------- SUMMARY --------------------------- */}
          <aside className="summary sticky">
            <h3>Order summary</h3>
            <div className="summary-rows">
              <div><span>Items ({cartLines.reduce((s, l) => s + l.qty, 0)})</span><b>{inr(quote?.subtotal ?? cartSubtotal)}</b></div>
              {quote?.discount > 0 && <div className="save"><span>Coupon {quote.coupon.code}</span><b>−{inr(quote.discount)}</b></div>}
              <div><span>Delivery</span><b>{quote?.shipping === 0 ? 'FREE' : inr(quote?.shipping ?? 49)}</b></div>
              <div className="summary-total"><span>Total</span><b>{inr(total)}</b></div>
            </div>
            <div className="trust-list">
              <span>✓ Email verified</span>
              <span className={user.phoneVerified ? '' : 'pending'}>{user.phoneVerified ? '✓' : '○'} Mobile verified</span>
              <span>✓ HMAC signature check</span>
              <span>✓ 7-day easy returns</span>
            </div>
            <Link to="/cart" className="btn btn-ghost btn-block">Edit bag</Link>
          </aside>
        </div>
      </div>

      <PaymentSheet session={session} onClose={() => setSession(null)} onSuccess={onPaid} />
    </Page>
  );
}
