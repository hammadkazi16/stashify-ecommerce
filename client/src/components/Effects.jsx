import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';

/** Thin reading-progress rail pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });
  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />;
}

/** Adds a soft ripple to every .btn press without touching each call site. */
export function ButtonRipples() {
  useEffect(() => {
    const onDown = (e) => {
      if (e.button !== 0) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const btn = e.target.closest?.('.btn');
      if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      const remove = () => ripple.remove();
      ripple.addEventListener('animationend', remove, { once: true });
      setTimeout(remove, 800);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);
  return null;
}

/** Gentle magnetic pull for hero CTAs on precise pointers. */
export function Magnetic({ children, strength = 0.18 }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 });
  const sy = useSpring(y, { stiffness: 260, damping: 18 });

  const move = (e) => {
    if (reduce || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set(Math.max(-10, Math.min(10, (e.clientX - r.left - r.width / 2) * strength)));
    y.set(Math.max(-8, Math.min(8, (e.clientY - r.top - r.height / 2) * strength)));
  };
  const leave = () => { x.set(0); y.set(0); };

  return (
    <motion.div className="magnetic" style={{ x: sx, y: sy }} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </motion.div>
  );
}

/** Scroll-triggered reveal used for section headers and feature banners. */
export function Reveal({ children, className = '', delay = 0, y = 32 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* One word of the tagline reveal: muted until scroll progress crosses its slot. */
function ScrollWord({ progress, range, accent, children }) {
  const opacity = useTransform(progress, range, [0.26, 1]);
  return (
    <motion.span className={accent ? 'sr-word accent' : 'sr-word'} style={{ opacity }}>
      {children}
    </motion.span>
  );
}

/**
 * Large-type tagline moment (ai-design-skills B11): the section pins while each
 * word lights up in reading order as you scroll. Reduced motion → static text.
 */
export function TaglineReveal() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const lines = [
    ['Shopping', 'should', 'feel', 'like', 'finding,', 'not', 'filtering.'],
    ['See', 'it.', 'Love', 'it.', 'Stash', 'it.'],
  ];
  const total = lines.flat().length;
  const accentFrom = lines[0].length;
  let i = 0;

  return (
    <section className={reduce ? 'tagline-reveal static' : 'tagline-reveal'} ref={ref}>
      <div className="tagline-pin">
        <p className="tagline-lines">
          {lines.map((words, li) => (
            <span className="tagline-line" key={li}>
              {words.map((w) => {
                const idx = i++;
                const range = [0.04 + (0.92 * idx) / total, 0.04 + (0.92 * (idx + 1)) / total];
                return reduce
                  ? <span className={idx >= accentFrom ? 'sr-word accent' : 'sr-word'} key={idx}>{w}</span>
                  : <ScrollWord key={idx} progress={scrollYProgress} range={range} accent={idx >= accentFrom}>{w}</ScrollWord>;
              })}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
