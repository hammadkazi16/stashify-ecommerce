import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { inr } from '../lib/api.js';

export function Page({ children, className = '' }) {
  // Route-level transitions live in App.jsx so pages don't double-animate.
  return <main className={`page ${className}`}>{children}</main>;
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' }); }, [pathname]);
  return null;
}

export function Stars({ value = 0, size = 14, showValue = false, count }) {
  const full = Math.floor(value), half = value - full >= 0.4;
  return (
    <span className="stars" style={{ '--star-size': size + 'px' }} title={`${value} out of 5`}>
      <span className="stars-row" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} viewBox="0 0 24 24" className={i < full ? 'on' : i === full && half ? 'half' : ''}>
            <defs><linearGradient id={`hg${i}`}><stop offset="50%" stopColor="currentColor" /><stop offset="50%" stopColor="transparent" /></linearGradient></defs>
            <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"
              fill={i < full ? 'currentColor' : i === full && half ? `url(#hg${i})` : 'none'}
              stroke="currentColor" strokeWidth="1.4" />
          </svg>
        ))}
      </span>
      {showValue && <b>{value.toFixed(1)}</b>}
      {count != null && <span className="muted-sm">({count.toLocaleString('en-IN')})</span>}
    </span>
  );
}

export function Price({ product, size = 'md' }) {
  const off = Math.round((1 - product.price / product.mrp) * 100);
  return (
    <div className={`price price-${size}`}>
      <span className="price-now">{inr(product.price)}</span>
      <span className="price-mrp">{inr(product.mrp)}</span>
      {off > 0 && <span className="price-off">{off}% off</span>}
    </div>
  );
}

export function Badge({ children, tone = 'coral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Spinner({ size = 18 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-label="Loading" />;
}

export function Field({ label, hint, error, children, ...rest }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function Alert({ tone = 'info', children, onDismiss }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onDismiss && <button className="alert-x" onClick={onDismiss} aria-label="Dismiss">×</button>}
    </div>
  );
}

/* Six-box OTP entry with paste + arrow-key support. */
export function OtpInput({ value, onChange, onComplete, length = 6, disabled, autoFocus = true, tone = 'navy' }) {
  const refs = useRef([]);
  const chars = value.padEnd(length, ' ').slice(0, length).split('');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const set = (i, ch) => {
    const next = chars.map((c, idx) => (idx === i ? ch : c)).join('').replace(/\s/g, ' ').trimEnd();
    const clean = next.replace(/\s/g, '');
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const handleChange = (i, e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) { set(i, ' '); return; }
    if (digits.length > 1) {
      const merged = (value.slice(0, i) + digits).replace(/\D/g, '').slice(0, length);
      onChange(merged);
      refs.current[Math.min(merged.length, length - 1)]?.focus();
      if (merged.length === length) onComplete?.(merged);
      return;
    }
    const arr = value.padEnd(length, ' ').split('');
    arr[i] = digits;
    const merged = arr.join('').replace(/\s/g, '');
    onChange(merged);
    if (digits && i < length - 1) refs.current[i + 1]?.focus();
    if (merged.length === length) onComplete?.(merged);
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = value.split('');
      if (arr[i]) { arr[i] = ''; onChange(arr.join('').slice(0, i)); }
      else if (i > 0) { onChange(value.slice(0, i - 1)); refs.current[i - 1]?.focus(); }
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!digits) return;
    onChange(digits);
    refs.current[Math.min(digits.length, length - 1)]?.focus();
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <div className={`otp otp-${tone}`} onPaste={handlePaste}>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="otp-box"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          value={c.trim()}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

export function Modal({ open, onClose, children, title, width = 520, dismissable = true }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && dismissable && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose, dismissable]);
  if (!open) return null;
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && dismissable && onClose?.()}>
      <motion.div
        className="modal"
        style={{ maxWidth: width }}
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        role="dialog" aria-modal="true"
      >
        {title && (
          <div className="modal-head">
            <h3>{title}</h3>
            {dismissable && <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>}
          </div>
        )}
        {children}
      </motion.div>
    </div>
  );
}

export function EmptyState({ icon = '📦', title, body, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function SectionHead({ eyebrow, title, body, action }) {
  return (
    <motion.div
      className="section-head"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {body && <p className="section-body">{body}</p>}
      </div>
      {action}
    </motion.div>
  );
}

export function useCountdown(target) {
  const [left, setLeft] = useState(Math.max(0, target - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(t);
  }, [target]);
  const s = Math.floor(left / 1000);
  return {
    done: left <= 0,
    h: String(Math.floor(s / 3600)).padStart(2, '0'),
    m: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
    s: String(s % 60).padStart(2, '0')
  };
}
