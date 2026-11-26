import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { api, inr } from '../lib/api.js';
import { useStore } from '../lib/store.jsx';
import { Modal, OtpInput, Alert, Spinner, Field } from './ui.jsx';
import { Logo } from './Navbar.jsx';

let rzpPromise = null;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (rzpPromise) return rzpPromise;
  rzpPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error('Could not load Razorpay Checkout. Check your connection.'));
    document.body.appendChild(s);
  });
  return rzpPromise;
}

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra'];

function RazorpayBrand() {
  return (
    <span className="rzp-brand" aria-label="Razorpay">
      <span className="rzp-mark">R</span>
      <b>Razorpay</b>
    </span>
  );
}

export default function PaymentSheet({ session, onClose, onSuccess }) {
  const { toast, config } = useStore();
  const [step, setStep] = useState('method');
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '4111 1111 1111 1111', expiry: '12/28', cvv: '123', name: '' });
  const [upi, setUpi] = useState('success@razorpay');
  const [bank, setBank] = useState(BANKS[0]);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const opened = useRef(false);

  /* -------------------------- LIVE RAZORPAY -------------------------- */
  useEffect(() => {
    if (!session || session.demo || opened.current) return;
    opened.current = true;
    let rzp;
    (async () => {
      try {
        const RZP = await loadRazorpay();
        rzp = new RZP({
          key: session.keyId,
          amount: session.amount,
          currency: session.currency,
          name: 'Stashify',
          description: `${session.quote.lines.length} item(s) · Stashify order`,
          order_id: session.razorpayOrderId,
          prefill: session.prefill,
          notes: { internalId: session.internalId },
          theme: { color: '#FF6B5B', backdrop_color: '#14213D' },
          modal: { ondismiss: () => { onClose?.(); } },
          handler: async (resp) => {
            setBusy(true);
            try {
              const out = await api('/payments/verify', {
                method: 'POST',
                body: { internalId: session.internalId, ...resp, method: resp.method || 'razorpay' }
              });
              onSuccess?.(out.order);
            } catch (e) {
              setError(e.message);
              toast(e.message, 'error');
            } finally { setBusy(false); }
          }
        });
        rzp.on('payment.failed', (r) => {
          setError(r.error?.description || 'Payment failed. You have not been charged.');
          onClose?.();
        });
        rzp.open();
      } catch (e) {
        setError(e.message);
        toast(e.message, 'error');
        onClose?.();
      }
    })();
    return () => { try { rzp?.close?.(); } catch { /* noop */ } };
  }, [session, onClose, onSuccess, toast]);

  if (!session) return null;
  if (!session.demo) {
    return (
      <Modal open onClose={onClose} title="Razorpay Checkout" width={460}>
        <div className="pay-live">
          {busy ? <><Spinner size={26} /><p>Verifying your payment signature…</p></>
            : <><Spinner size={26} /><p>Complete your payment in the Razorpay window.</p>
              <small className="muted-sm">If it didn't open, allow pop-ups and retry.</small></>}
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </Modal>
    );
  }

  /* ----------------------------- DEMO SHEET ---------------------------- */
  const amount = session.amount / 100;

  const validate = () => {
    if (method === 'card') {
      const digits = card.number.replace(/\s/g, '');
      if (digits.length !== 16) return 'Enter the 16-digit test card number.';
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return 'Expiry must be MM/YY.';
      if (!/^\d{3}$/.test(card.cvv)) return 'CVV must be 3 digits.';
    }
    if (method === 'upi' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi)) return 'Enter a valid UPI ID, e.g. name@bank.';
    return '';
  };

  const toOtp = () => {
    const v = validate();
    if (v) { setError(v); return; }
    setError('');
    setStep('otp');
  };

  const authorize = async (code) => {
    const pin = code || otp;
    if (pin.length !== 6) { setError('Enter the 6-digit code.'); return; }
    setBusy(true); setError(''); setStep('processing');
    try {
      await new Promise((r) => setTimeout(r, 1400));
      const auth = await api('/payments/demo-authorize', {
        method: 'POST', body: { internalId: session.internalId, otp: pin, method }
      });
      const out = await api('/payments/verify', {
        method: 'POST', body: { internalId: session.internalId, ...auth }
      });
      onSuccess?.(out.order);
    } catch (e) {
      setError(e.message);
      setStep('otp');
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={step === 'processing' ? undefined : onClose} width={470} dismissable={step !== 'processing'}>
      <div className="pay">
        <div className="pay-head">
          <Logo size={26} />
          <div className="pay-amount">
            <small>Amount payable</small>
            <b>{inr(amount)}</b>
          </div>
        </div>

        <div className="rzp-banner">
          <div className="rzp-banner-top">
            <RazorpayBrand />
            <span className="rzp-mode">TEST MODE · SIMULATED</span>
          </div>
          <small>This project demonstrates a Razorpay checkout. No real money moves.</small>
        </div>

        {step === 'method' && (
          <motion.div className="pay-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="pay-methods">
              {[
                { id: 'card', label: 'Card', sub: 'Visa, Mastercard, RuPay', icon: '💳' },
                { id: 'upi', label: 'UPI', sub: 'GPay, PhonePe, Paytm', icon: '📲' },
                { id: 'netbanking', label: 'Netbanking', sub: 'All major banks', icon: '🏦' }
              ].map((m) => (
                <button key={m.id} className={`pay-method ${method === m.id ? 'on' : ''}`} onClick={() => setMethod(m.id)}>
                  <span className="pm-icon">{m.icon}</span>
                  <span className="pm-meta"><b>{m.label}</b><small>{m.sub}</small></span>
                  <span className="pm-radio" />
                </button>
              ))}
            </div>
            <button className="btn btn-coral btn-block" onClick={() => setStep('details')}>Continue →</button>
          </motion.div>
        )}

        {step === 'details' && (
          <motion.div className="pay-body" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {method === 'card' && (
              <>
                <div className="test-card">
                  <div className="tc-chip" />
                  <div className="tc-number">{card.number || '•••• •••• •••• ••••'}</div>
                  <div className="tc-row"><span>{card.name || 'TEST CARDHOLDER'}</span><span>{card.expiry || 'MM/YY'}</span></div>
                </div>
                <Field label="Card number">
                  <input className="input" value={card.number} inputMode="numeric"
                    onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim() })} />
                </Field>
                <div className="pay-row">
                  <Field label="Expiry"><input className="input" placeholder="MM/YY" value={card.expiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                      setCard({ ...card, expiry: v });
                    }} /></Field>
                  <Field label="CVV"><input className="input" type="password" inputMode="numeric" value={card.cvv}
                    onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })} /></Field>
                </div>
                <Field label="Name on card"><input className="input" placeholder="As printed" value={card.name}
                  onChange={(e) => setCard({ ...card, name: e.target.value })} /></Field>
                <p className="pay-hint">Razorpay test card <b>4111 1111 1111 1111</b> is pre-filled — any future expiry and CVV works.</p>
              </>
            )}
            {method === 'upi' && (
              <>
                <div className="upi-apps">
                  {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((a) => <span key={a} className="upi-app">{a}</span>)}
                </div>
                <Field label="UPI ID" hint="Use success@razorpay to simulate a successful collect request.">
                  <input className="input" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourname@bank" />
                </Field>
              </>
            )}
            {method === 'netbanking' && (
              <Field label="Choose your bank">
                <select className="input" value={bank} onChange={(e) => setBank(e.target.value)}>
                  {BANKS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </Field>
            )}
            {error && <Alert tone="error">{error}</Alert>}
            <div className="pay-actions">
              <button className="btn btn-ghost" onClick={() => setStep('method')}>← Back</button>
              <button className="btn btn-coral" onClick={toOtp}>Pay {inr(amount)}</button>
            </div>
          </motion.div>
        )}

        {step === 'otp' && (
          <motion.div className="pay-body" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="pay-bank">
              <span className="bank-badge">🏦</span>
              <div><b>Bank verification</b><small>Razorpay simulated 3-D Secure / UPI PIN step</small></div>
            </div>
            <p className="pay-otp-copy">Enter the 6-digit code sent to your registered mobile to authorise <b>{inr(amount)}</b>.</p>
            {session.devPayOtp && (
              <div className="dev-code" onClick={() => setOtp(session.devPayOtp)} role="button" tabIndex={0}>
                <span>Razorpay test OTP</span><b>{session.devPayOtp}</b><small>tap to fill</small>
              </div>
            )}
            <OtpInput value={otp} onChange={setOtp} onComplete={authorize} disabled={busy} />
            {error && <Alert tone="error">{error}</Alert>}
            <div className="pay-actions">
              <button className="btn btn-ghost" onClick={() => setStep('details')} disabled={busy}>← Back</button>
              <button className="btn btn-coral" onClick={() => authorize()} disabled={busy || otp.length !== 6}>
                {busy ? <Spinner /> : 'Authorise payment'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'processing' && (
          <div className="pay-processing">
            <div className="pay-spinner"><span /><span /><span /></div>
            <b>Authorising with Razorpay…</b>
            <small>Verifying Razorpay payment signature server-side (simulated)</small>
          </div>
        )}

        <div className="pay-foot">
          <span>🔒 Secured by Razorpay · {config.razorpayEnabled ? 'Live' : 'Test Mode'} · signature verified</span>
        </div>
      </div>
    </Modal>
  );
}
