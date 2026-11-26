import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { productPhoto } from './ProductImage.jsx';

const EASE = [0.22, 1, 0.36, 1];

/** 01 · Real photography — a live listing photo flips through its actual angles. */
export function PhotoAngles({ product }) {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const count = product?.images?.length || 0;

  useEffect(() => {
    if (reduce || count < 2) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), 2600);
    return () => clearInterval(t);
  }, [reduce, count]);

  if (!product) return null;
  return (
    <div className="demo-photo">
      <AnimatePresence initial={false}>
        <motion.img
          key={idx}
          src={productPhoto(product, idx, 'full')}
          alt={`${product.name} — angle ${idx + 1}`}
          initial={{ opacity: 0, x: 30, scale: 1.04 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -30, scale: 1.04 }}
          transition={{ duration: 0.55, ease: EASE }}
        />
      </AnimatePresence>
      <span className="demo-tag">Angle {idx + 1} / {Math.max(count, 1)}</span>
      {count > 1 && (
        <span className="demo-dots" aria-hidden="true">
          {product.images.map((_, i) => <i key={i} className={i === idx ? 'on' : ''} />)}
        </span>
      )}
    </div>
  );
}

/** 02 · Verified twice — a six-digit code types itself in, then verifies. Loops. */
const CODE = ['2', '4', '9', '1', '7', '3'];
export function OtpDemo() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? 6 : 0);
  const [verified, setVerified] = useState(!!reduce);

  useEffect(() => {
    if (reduce) return undefined;
    let t;
    if (n < 6) t = setTimeout(() => setN(n + 1), n === 0 ? 1000 : 340);
    else if (!verified) t = setTimeout(() => setVerified(true), 380);
    else t = setTimeout(() => { setN(0); setVerified(false); }, 2300);
    return () => clearTimeout(t);
  }, [n, verified, reduce]);

  return (
    <div className="demo-otp" aria-label="OTP verification demo">
      <span className="demo-label">Code sent to your phone</span>
      <div className="demo-otp-boxes">
        {CODE.map((d, i) => (
          <span key={i} className={`demo-box${i < n ? ' filled' : ''}${verified ? ' ok' : ''}`}>
            {i < n ? d : ''}
          </span>
        ))}
      </div>
      <span className="demo-pill-row">
        <AnimatePresence>
          {verified && (
            <motion.span className="demo-pill" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Verified
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </div>
  );
}

/** 03 · Signature-checked payments — a card hands off to a shield that signs off. Loops. */
export function PayDemo() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(reduce ? 2 : 0);

  useEffect(() => {
    if (reduce) return undefined;
    const wait = [1500, 1100, 2300][phase];
    const t = setTimeout(() => setPhase((p) => (p + 1) % 3), wait);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  return (
    <div className="demo-pay" aria-label="Payment signature demo">
      <div className="demo-pay-row">
        <motion.span
          className="demo-card"
          animate={phase === 0 ? { x: 0, opacity: 1, scale: 1 } : { x: 34, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.6, ease: EASE }}
          aria-hidden="true"
        >
          <i /><b /><b />
        </motion.span>
        <svg className="demo-shield" viewBox="0 0 48 48" width="58" height="58" aria-hidden="true">
          <motion.path
            d="M24 4 L40 10 V22 C40 34 33 41 24 44 C15 41 8 34 8 22 V10 Z"
            fill="none" stroke="var(--coral)" strokeWidth="2.4" strokeLinejoin="round"
            animate={{ pathLength: phase >= 1 ? 1 : 0.001, opacity: phase >= 1 ? 1 : 0.25 }}
            transition={{ duration: 0.7, ease: EASE }}
          />
          <motion.path
            d="M16.5 24.5l5.5 5.5L32 18.5"
            fill="none" stroke="#7FD8A4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            animate={{ pathLength: phase >= 2 ? 1 : 0.001, opacity: phase >= 2 ? 1 : 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          />
        </svg>
      </div>
      <span className="demo-pill-row">
        <AnimatePresence>
          {phase === 2 && (
            <motion.span className="demo-pill" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Signature matched
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </div>
  );
}
