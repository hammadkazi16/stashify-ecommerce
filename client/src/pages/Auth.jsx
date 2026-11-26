import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ClerkLogin, ClerkSignup } from '../components/ClerkAuth.jsx';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { Page, Alert, Spinner, Field, OtpInput } from '../components/ui.jsx';
import { Logo } from '../components/Navbar.jsx';
import { productPhoto } from '../components/ProductImage.jsx';

function AuthShell({ title, sub, children, footer }) {
  const { products } = useStore();
  const art = products.filter((p) => p.images?.length).slice(0, 3);
  return (
    <Page className="auth-page">
      <div className="auth-split">
        <div className="auth-art">
          <div className="auth-art-photos" aria-hidden="true">
            {art.map((p, i) => (
              <motion.img key={p.id} src={productPhoto(p, 0, 'full')} alt=""
                className={`auth-photo auth-photo-${i}`}
                initial={{ opacity: 0, y: 24, rotate: i === 1 ? 4 : -4 }}
                animate={{ opacity: 1, y: 0, rotate: i === 1 ? 3 : -3 }}
                transition={{ delay: 0.15 * i, duration: 0.6 }} />
            ))}
          </div>
          <div className="auth-art-copy">
            <Logo size={34} />
            <h2>Everything you love,<br />stashed in one place.</h2>
            <ul>
              <li>◆ Real photos on every listing</li>
              <li>◆ Email + mobile OTP verification</li>
              <li>◆ Signature-verified secure payments</li>
            </ul>
          </div>
        </div>
        <div className="auth-panel">
          <motion.div className="auth-card" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h1>{title}</h1>
            {sub && <p className="auth-sub">{sub}</p>}
            {children}
            {footer && <div className="auth-footer">{footer}</div>}
          </motion.div>
        </div>
      </div>
    </Page>
  );
}

function DevCode({ code, onFill }) {
  if (!code) return null;
  return (
    <div className="dev-code" role="button" tabIndex={0} onClick={() => onFill?.(code)}>
      <span>Demo code</span><b>{code}</b><small>{onFill ? 'tap to fill' : 'also in Demo Inbox'}</small>
    </div>
  );
}

/* --------------------------------- LOGIN --------------------------------- */
function DemoLogin() {
  const { applySession, toast, user } = useStore();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (user) nav(next, { replace: true }); }, [user, nav, next]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: form, auth: false });
      applySession(data);
      toast(`Welcome back, ${data.user.name.split(' ')[0]}!`, 'success');
      nav(next, { replace: true });
    } catch (err) {
      if (err.data?.needsVerification) {
        nav(`/verify?email=${encodeURIComponent(form.email)}&next=${encodeURIComponent(next)}`);
        return;
      }
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back" sub="Sign in to sync your bag, wishlist and orders."
      footer={<>New to Stashify? <Link to={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></>}>
      <form onSubmit={submit} className="stack">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Email address">
          <input className="input" type="email" required autoComplete="email" placeholder="you@example.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <input className="input" type="password" required autoComplete="current-password" placeholder="••••••••"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="auth-row">
          <Link to="/forgot" className="link-btn">Forgot password?</Link>
        </div>
        <button className="btn btn-coral btn-lg btn-block" disabled={busy}>{busy ? <Spinner /> : 'Sign in →'}</button>
      </form>
      <button className="btn btn-ghost btn-block" disabled={busy}
        onClick={() => { setForm({ email: 'demo@stashify.shop', password: 'Demo@1234' }); }}>
        Use the demo account
      </button>
      <div className="auth-note">
        <b>Testing this build?</b> Sign in with <code>demo@stashify.shop</code> / <code>Demo@1234</code> (verified admin,
        has a past order), or create your own account — the verification code appears on screen and in the
        Demo Inbox, since no SMTP keys are configured yet.
      </div>
    </AuthShell>
  );
}

/* --------------------------------- SIGNUP -------------------------------- */
function DemoSignup() {
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const nav = useNavigate();
  const { toast } = useStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const strength = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api('/auth/signup', { method: 'POST', body: form, auth: false });
      toast('Account created — verify your email to continue', 'success');
      nav(`/verify?email=${encodeURIComponent(form.email)}&next=${encodeURIComponent(next)}${r.devCode ? `&dev=${r.devCode}` : ''}`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create your account" sub="One account for verified checkout, wishlists and order tracking."
      footer={<>Already have an account? <Link to={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></>}>
      <form onSubmit={submit} className="stack">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Full name">
          <input className="input" required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email address" hint="We'll send a 6-digit verification code here.">
          <input className="input" type="email" required autoComplete="email" placeholder="you@example.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Mobile number" hint="Optional now — required before your first checkout.">
          <div className="phone-row">
            <span className="phone-prefix">+91</span>
            <input className="input" inputMode="numeric" placeholder="98765 43210" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          </div>
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <input className="input" type="password" required autoComplete="new-password" placeholder="••••••••"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {form.password && (
          <div className="strength">
            <div className="strength-bar">{[1, 2, 3, 4].map((i) => <i key={i} className={strength >= i ? `on s${strength}` : ''} />)}</div>
            <small>{['Too short', 'Weak', 'Fair', 'Good', 'Strong'][strength]}</small>
          </div>
        )}
        <button className="btn btn-coral btn-lg btn-block" disabled={busy}>{busy ? <Spinner /> : 'Create account →'}</button>
        <p className="auth-terms">By continuing you agree to this demo's terms. No real payments are processed in demo mode.</p>
      </form>
    </AuthShell>
  );
}

/* --------------------------------- VERIFY -------------------------------- */
function DemoVerify() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const next = params.get('next') || '/';
  const nav = useNavigate();
  const { applySession, toast } = useStore();
  const [otp, setOtp] = useState('');
  const [dev, setDev] = useState(params.get('dev') || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) nav('/signup', { replace: true });
  }, [email, nav]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async (code) => {
    const pin = code || otp;
    if (pin.length !== 6) { setError('Enter all 6 digits.'); return; }
    setBusy(true); setError('');
    try {
      const data = await api('/auth/verify-email', { method: 'POST', body: { email, code: pin }, auth: false });
      applySession(data);
      toast('Email verified — welcome to Stashify! 🎉', 'success');
      nav(next, { replace: true });
    } catch (err) { setError(err.message); setOtp(''); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); setError(''); setInfo('');
    try {
      const r = await api('/auth/resend', { method: 'POST', body: { email, purpose: 'verify' }, auth: false });
      setDev(r.devCode || '');
      setInfo('A fresh code is on its way.');
      setCooldown(30);
      setOtp('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Verify your email" sub={<>We sent a 6-digit code to <b>{email}</b>. It expires in 10 minutes.</>}
      footer={<>Wrong address? <Link to="/signup">Start over</Link></>}>
      <div className="stack">
        {error && <Alert tone="error">{error}</Alert>}
        {info && <Alert tone="success">{info}</Alert>}
        <DevCode code={dev} onFill={setOtp} />
        <OtpInput value={otp} onChange={setOtp} onComplete={verify} disabled={busy} />
        <button className="btn btn-coral btn-lg btn-block" onClick={() => verify()} disabled={busy || otp.length !== 6}>
          {busy ? <Spinner /> : 'Verify & continue →'}
        </button>
        <button className="btn btn-ghost btn-block" onClick={resend} disabled={busy || cooldown > 0}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
        <div className="auth-note">
          <b>Where's my code?</b> With no SMTP keys configured, Stashify delivers mail to the built-in
          <b> Demo Inbox</b> (bottom-right button). Add SMTP credentials to <code>.env</code> to send real email.
        </div>
      </div>
    </AuthShell>
  );
}

/* --------------------------------- FORGOT -------------------------------- */
function DemoForgot() {
  const nav = useNavigate();
  const { applySession, toast } = useStore();
  const [stage, setStage] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [dev, setDev] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const request = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api('/auth/forgot', { method: 'POST', body: { email }, auth: false });
      setDev(r.devCode || '');
      setStage('reset');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const reset = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await api('/auth/reset', { method: 'POST', body: { email, code: otp, password }, auth: false });
      applySession(data);
      toast('Password updated ✓', 'success');
      nav('/', { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Reset your password"
      sub={stage === 'email' ? 'Enter your account email and we will send a reset code.' : `Enter the code we sent to ${email} and choose a new password.`}
      footer={<Link to="/login">← Back to sign in</Link>}>
      {error && <Alert tone="error">{error}</Alert>}
      {stage === 'email' ? (
        <form onSubmit={request} className="stack">
          <Field label="Email address">
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <button className="btn btn-coral btn-lg btn-block" disabled={busy}>{busy ? <Spinner /> : 'Send reset code'}</button>
        </form>
      ) : (
        <form onSubmit={reset} className="stack">
          <DevCode code={dev} onFill={setOtp} />
          <OtpInput value={otp} onChange={setOtp} disabled={busy} />
          <Field label="New password" hint="At least 8 characters.">
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <button className="btn btn-coral btn-lg btn-block" disabled={busy || otp.length !== 6}>{busy ? <Spinner /> : 'Update password →'}</button>
        </form>
      )}
    </AuthShell>
  );
}


/* Shown when the embedded preview blocks the browser storage Clerk requires.
 * The catalog stays usable; real sign-in needs a full browser context. */
function AuthUnavailable() {
  return (
    <AuthShell
      title="Sign-in is unavailable in this preview"
      sub="This embedded preview blocks the browser storage that Clerk needs for secure accounts."
    >
      <div className="auth-note">
        You can browse the catalog here. To create an account or sign in, open this page in a full
        browser tab (use your preview panel’s open-in-new-tab control if available), then return to
        <code>/signup</code> or <code>/login</code>.
      </div>
      <div className="stack" style={{ marginTop: 18 }}>
        <a className="btn btn-coral btn-lg btn-block" href={window.location.href} target="_blank" rel="noopener">
          Open in a new tab
        </a>
        <Link className="btn btn-ghost btn-block" to="/shop">Browse the shop</Link>
      </div>
    </AuthShell>
  );
}

/* Clerk replaces the legacy password/OTP screens when real accounts are enabled. */
export function Login() {
  const { config, authUnavailable } = useStore();
  if (config.authProvider !== 'clerk') return <DemoLogin />;
  return authUnavailable ? <AuthUnavailable /> : <ClerkLogin />;
}
export function Signup() {
  const { config, authUnavailable } = useStore();
  if (config.authProvider !== 'clerk') return <DemoSignup />;
  return authUnavailable ? <AuthUnavailable /> : <ClerkSignup />;
}
export function Verify() {
  const { config, authUnavailable } = useStore();
  if (config.authProvider !== 'clerk') return <DemoVerify />;
  return authUnavailable ? <AuthUnavailable /> : <Navigate to="/login" replace />;
}
export function Forgot() {
  const { config, authUnavailable } = useStore();
  if (config.authProvider !== 'clerk') return <DemoForgot />;
  return authUnavailable ? <AuthUnavailable /> : <Navigate to="/login" replace />;
}
