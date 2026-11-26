import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { Page, SectionHead, useCountdown } from '../components/ui.jsx';
import { inr } from '../lib/api.js';
import ProductImage from '../components/ProductImage.jsx';
import { Magnetic, Reveal, TaglineReveal } from '../components/Effects.jsx';
import { PhotoAngles, OtpDemo, PayDemo } from '../components/StandardDemos.jsx';

const EASE = [0.22, 1, 0.36, 1];
const HERO_LINES = [
  { words: ['Everything', 'you', 'love,'], accent: false },
  { words: ['in', 'one', 'stash.'], accent: true }
];

/* Text-led kinetic headline — words rise out of masked lines. */
function KineticTitle() {
  let i = 0;
  return (
    <h1 className="hero-title" aria-label="Everything you love, in one stash.">
      {HERO_LINES.map((line, li) => (
        <span key={li} className={`hero-line ${line.accent ? 'hero-line-accent' : ''}`} aria-hidden="true">
          {line.words.map((w) => {
            const delay = 0.15 + i++ * 0.075;
            return (
              <span className="word-mask" key={w}>
                <motion.span
                  className="hero-word"
                  initial={{ y: '115%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  transition={{ duration: 0.75, delay, ease: EASE }}
                >
                  {w}
                </motion.span>
              </span>
            );
          })}
          {line.accent && (
            <motion.span
              className="hero-underline"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.85, duration: 0.7, ease: EASE }}
            />
          )}
        </span>
      ))}
    </h1>
  );
}

function DealStrip({ products }) {
  const endOfDay = useMemo(() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); }, []);
  const { h, m, s } = useCountdown(endOfDay);
  const deals = products.filter((p) => p.badges.includes('Deal')).slice(0, 4);
  if (!deals.length) return null;
  return (
    <section className="section deals">
      <div className="container">
        <Reveal className="deals-head">
          <div>
            <span className="eyebrow coral">Ends tonight</span>
            <h2>Deals of the day</h2>
          </div>
          <div className="countdown" aria-label="Time left">
            <span><b>{h}</b><small>hrs</small></span>
            <i>:</i>
            <span><b>{m}</b><small>min</small></span>
            <i>:</i>
            <span><b>{s}</b><small>sec</small></span>
          </div>
        </Reveal>
        <div className="grid-products">
          {deals.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { products, categories, recent, byId, config } = useStore();
  const trending = useMemo(() => [...products].sort((a, b) => b.ratingCount - a.ratingCount).slice(0, 8), [products]);
  const fresh = useMemo(() => products.filter((p) => p.badges.includes('New')).slice(0, 4), [products]);
  const recentProducts = recent.map((id) => byId[id]).filter(Boolean).slice(0, 4);
  // A real multi-angle listing for the live photo demo in "The Stashify standard".
  const demoProduct = useMemo(() => products.find((p) => p.images?.length > 1) || products[0], [products]);

  // Cursor-responsive lighting, written straight to CSS vars (no re-renders).
  const moveHeroLight = (e) => {
    if (e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--hero-x', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--hero-y', `${e.clientY - r.top}px`);
  };

  return (
    <Page className="home">
      {/* ---------------------------- HERO ---------------------------- */}
      <section className="hero" onPointerMove={moveHeroLight}>
        <div className="hero-bg" aria-hidden="true">
          <span className="orb orb-1" /><span className="orb orb-2" /><span className="grid-lines" />
          <span className="hero-spotlight" />
        </div>
        <div className="container hero-in">
          <div className="hero-copy">
            <motion.span className="hero-pill" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
              <i /> Curated marketplace
            </motion.span>

            <KineticTitle />

            <motion.p className="hero-sub" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6, ease: EASE }}>
              See it. Love it. Stash it.
            </motion.p>

            <motion.div className="hero-cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.6, ease: EASE }}>
              <Magnetic><Link to="/shop" className="btn btn-coral btn-lg">Start shopping →</Link></Magnetic>
              <Magnetic><Link to="/shop?sort=discount" className="btn btn-outline btn-lg">Explore deals</Link></Magnetic>
            </motion.div>

            <motion.div className="hero-stats" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.6, ease: EASE }}>
              <div><b>{products.length}+</b><span>products</span></div>
              <div><b>4.6★</b><span>avg. rating</span></div>
              <div><b>3 days</b><span>typical delivery</span></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --------------------------- MARQUEE --------------------------- */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k}>
              REAL PRODUCT PHOTOS <i>◆</i> EMAIL OTP VERIFICATION <i>◆</i> MOBILE OTP <i>◆</i>
              {config.razorpayEnabled ? ' LIVE RAZORPAY' : ' RAZORPAY-READY CHECKOUT'} <i>◆</i> FREE DELIVERY OVER ₹499 <i>◆</i>
              7-DAY RETURNS <i>◆</i>
            </span>
          ))}
        </div>
      </div>

      {/* -------------------------- CATEGORIES ------------------------- */}
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Browse the stash" title="Eight worlds to explore"
            body="Eight categories, stocked with gear worth keeping."
            action={<Link to="/shop" className="btn btn-ghost">View all →</Link>} />
          <div className="cat-grid">
            {categories.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.45 }}>
                <Link to={`/shop?category=${c.id}`} className="cat-card">
                  <div className="cat-art">
                    <ProductImage product={products.find((x) => x.category === c.id && x.images?.length) || products.find((x) => x.category === c.id)} size="full" alt={c.name} />
                  </div>
                  <b>{c.name}</b>
                  <small>{c.blurb}</small>
                  <span className="cat-go">→</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <DealStrip products={products} />

      {/* --------------------------- TRENDING -------------------------- */}
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Most stashed" title="Trending this week"
            action={<Link to="/shop?sort=popular" className="btn btn-ghost">See all →</Link>} />
          <div className="grid-products">
            {trending.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </div>
      </section>

      {/* ------------------------- VALUE PROPS ------------------------- */}
      {/* ------------------- THE STASHIFY STANDARD --------------------- */}
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="The Stashify standard" title="Promises you can watch."
            body="Three things every order gets — demonstrated live, not described." />
          <div className="standard-grid">
            {[
              { num: '01', title: 'Shot, not rendered', body: 'Every listing is photographed for real. Flip through the angles — what arrives is exactly what you saw.', demo: <PhotoAngles product={demoProduct} /> },
              { num: '02', title: 'Two codes, zero strangers', body: 'A code to your email at signup, another to your phone before payment. Ten minutes to use them, five tries to get them right.', demo: <OtpDemo /> },
              { num: '03', title: 'Signed before it’s sold', body: 'Every payment is signature-checked on our server before an order exists. Card details never touch Stashify.', demo: <PayDemo /> }
            ].map((c, i) => (
              <motion.article key={c.num} className="standard-card" initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}>
                <div className="standard-stage">{c.demo}</div>
                <span className="standard-num">{c.num}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {fresh.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHead eyebrow="Just landed" title="New in the stash" />
            <div className="grid-products">
              {fresh.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {recentProducts.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHead eyebrow="Pick up where you left off" title="Recently viewed" />
            <div className="recent-row">
              {recentProducts.map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className="recent-card">
                  <ProductImage product={p} />
                  <span><b>{p.name}</b><small>{inr(p.price)}</small></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --------------------- TAGLINE SCROLL REVEAL -------------------- */}
      <TaglineReveal />

      {/* ------------------------- CTA BANNER -------------------------- */}
      <section className="section">
        <div className="container">
          <Reveal className="cta-banner">
            <div className="cta-copy">
              <span className="eyebrow">Launch offer</span>
              <h2>Take 15% off your first stash.</h2>
              <p>Use code <b>FIRST15</b> at checkout. Stacks with free delivery over ₹499.</p>
              <Link to="/shop" className="btn btn-navy btn-lg">Claim the offer →</Link>
            </div>
            <div className="cta-art">
              <ProductImage product={products.find((x) => x.id === 'voyager-backpack') || products[0]} size="full" alt="Stashify deal" />
            </div>
          </Reveal>
        </div>
      </section>
    </Page>
  );
}
