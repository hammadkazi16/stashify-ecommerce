import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../lib/store.jsx';
import ProductImage from './ProductImage.jsx';
import { inr } from '../lib/api.js';
import { IconSun, IconMoon } from './Icons.jsx';

export function Logo({ size = 30 }) {
  // Option 8: the full Stashify wordmark. Keep the old size prop as a
  // compact scaling hint so every existing header stays balanced.
  const height = Math.round(size * 1.35);
  const width = Math.round(height * 2.5);
  return (
    <span className="logo">
      <img
        src="/brand/stashify-wordmark.svg"
        alt="Stashify"
        width={width}
        height={height}
        draggable={false}
      />
    </span>
  );
}

const MotionLink = motion(Link);

export default function Navbar() {
  const { user, cartCount, wishlist, setCartOpen, products, categories, logout, config, theme, toggleTheme, manageAccount } = useStore();
  const [q, setQ] = useState('');
  const [openSuggest, setOpenSuggest] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const nav = useNavigate();
  const boxRef = useRef(null);
  const acctRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpenSuggest(false);
      if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('mousedown', onClick); };
  }, []);

  const suggestions = q.trim().length > 0
    ? products.filter((p) => (p.name + p.brand + p.tags.join(' ')).toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];

  const submit = (e) => {
    e?.preventDefault();
    setOpenSuggest(false);
    setMenuOpen(false);
    nav(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  const menuLinks = [
    { to: '/shop', label: 'Shop all' },
    ...categories.map((c) => ({ to: `/shop?category=${c.id}`, label: c.name })),
    { to: '/wishlist', label: 'Wishlist' },
    { to: '/orders', label: 'Orders' },
    { to: '/account', label: 'Account' },
    { to: '/seller', label: 'Seller dashboard' },
    ...(!user ? [{ to: '/login', label: 'Sign in' }] : []),
  ];
  // 60ms per link, whole sequence capped at 400ms so long menus never feel slow.
  const menuStep = Math.min(0.06, 0.4 / menuLinks.length);

  return (
    <>
      <div className="announce">
        <div className="container announce-in">
          <span>◆ Launch week — extra 15% off with <b>FIRST15</b></span>
          <span className="announce-sep">·</span>
          <span>Free delivery over ₹499</span>
          <span className="announce-sep">·</span>
          <span>{config.authProvider === 'clerk'
            ? (config.demoPay ? 'Real accounts · Razorpay test checkout' : 'Real accounts · Razorpay live checkout')
            : (config.demoPay ? 'Demo checkout active' : 'Secure Razorpay checkout')}</span>
        </div>
      </div>

      <header className={`navbar ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container nav-in">
          <Link to="/" className="nav-logo" onClick={() => setMenuOpen(false)}><Logo /></Link>

          <form className="nav-search" onSubmit={submit} ref={boxRef} role="search">
            <svg viewBox="0 0 24 24" className="search-icon" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpenSuggest(true); }}
              onFocus={() => setOpenSuggest(true)}
              placeholder="Search headphones, sneakers, lamps…"
              aria-label="Search products"
            />
            {q && <button type="button" className="search-clear" onClick={() => setQ('')} aria-label="Clear">✕</button>}
            <button type="submit" className="search-go">Search</button>

            <AnimatePresence>
              {openSuggest && suggestions.length > 0 && (
                <motion.div className="suggest" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  {suggestions.map((p) => (
                    <Link key={p.id} to={`/product/${p.id}`} className="suggest-row" onClick={() => { setOpenSuggest(false); setQ(''); }}>
                      <ProductImage product={p} />
                      <span className="suggest-meta">
                        <b>{p.name}</b>
                        <small>{p.brand} · {inr(p.price)}</small>
                      </span>
                      <span className="suggest-arrow">→</span>
                    </Link>
                  ))}
                  <button className="suggest-all" onClick={submit}>See all results for “{q}”</button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <nav className="nav-links">
            <NavLink to="/shop" className={({ isActive }) => isActive ? 'on' : ''}>Shop</NavLink>
            <NavLink to="/shop?sort=discount" className={({ isActive }) => isActive ? 'on' : ''}>Deals</NavLink>
            {user && <NavLink to="/orders" className={({ isActive }) => isActive ? 'on' : ''}>Orders</NavLink>}
          </nav>

          <div className="nav-actions">
            <button className="icon-btn theme-toggle" onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to bright theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Bright mode' : 'Dark mode'}>
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            <Link to="/wishlist" className="icon-btn nav-wish" aria-label="Wishlist">
              <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9.3A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.7C19 15.6 12 20 12 20z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /></svg>
              {wishlist.length > 0 && <motion.span key={wishlist.length} className="count" initial={{ scale: 0.4 }} animate={{ scale: 1 }}>{wishlist.length}</motion.span>}
            </Link>

            <div className="acct-wrap" ref={acctRef}>
              <button className="icon-btn" onClick={() => setAcctOpen((o) => !o)} aria-label="Account" aria-expanded={acctOpen}>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M4.8 20c1.2-3.7 4-5.5 7.2-5.5s6 1.8 7.2 5.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
              </button>
              <AnimatePresence>
                {acctOpen && (
                  <motion.div className="dropdown" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    {user ? (
                      <>
                        <div className="dropdown-head">
                          <b>{user.name}</b>
                          <small>{user.email}</small>
                          <span className={`verify-chip ${user.emailVerified ? 'ok' : ''}`}>{user.emailVerified ? '✓ Email verified' : '! Email unverified'}</span>
                        </div>
                        <Link to="/account" onClick={() => setAcctOpen(false)}>Account & addresses</Link>
                        <Link to="/orders" onClick={() => setAcctOpen(false)}>Your orders</Link>
                        <Link to="/wishlist" onClick={() => setAcctOpen(false)}>Wishlist</Link>
                        <Link to="/seller" onClick={() => setAcctOpen(false)}>{user.seller ? '🏪 Seller dashboard' : '🏪 Sell on Stashify'}</Link>
                        {user.isAdmin && <Link to="/admin" onClick={() => setAcctOpen(false)}>Fulfilment console</Link>}
                        {manageAccount && <button onClick={() => { manageAccount(); setAcctOpen(false); }}>Login & security</button>}
                        <button onClick={() => { logout(); setAcctOpen(false); nav('/'); }}>Sign out</button>
                      </>
                    ) : (
                      <>
                        <div className="dropdown-head"><b>Welcome to Stashify</b><small>Sign in to sync your bag</small></div>
                        <Link to="/login" onClick={() => setAcctOpen(false)}>Sign in</Link>
                        <Link to="/signup" onClick={() => setAcctOpen(false)}>Create account</Link>
                        <Link to="/seller" onClick={() => setAcctOpen(false)}>Sell on Stashify</Link>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className="bag-btn" onClick={() => setCartOpen(true)} aria-label={`Bag, ${cartCount} items`}>
              <svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><path d="M9.2 8V6.6a2.8 2.8 0 0 1 5.6 0V8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
              <span>Bag</span>
              <AnimatePresence>
                {cartCount > 0 && <motion.span key={cartCount} className="count" initial={{ scale: 0.3 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>{cartCount}</motion.span>}
              </AnimatePresence>
            </button>

            <button className="icon-btn burger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
              <span className={menuOpen ? 'x' : ''}><i /><i /><i /></span>
            </button>
          </div>
        </div>

        <div className="catbar">
          <div className="container catbar-in">
            {categories.map((c) => (
              <Link key={c.id} to={`/shop?category=${c.id}`} className="catlink">{c.name}</Link>
            ))}
            <Link to="/shop?sort=newest" className="catlink hot">New in ✦</Link>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="mobile-menu"
              initial={{ opacity: 0, y: -14 }}
              animate="open"
              exit={{ opacity: 0, y: -14, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }}
              variants={{ open: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1], delayChildren: 0.05, staggerChildren: menuStep } } }}
            >
              <div className="container">
                {menuLinks.map((l) => (
                  <MotionLink
                    key={l.to}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    initial={{ opacity: 0, y: 24 }}
                    variants={{ open: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}
                  >
                    {l.label}
                  </MotionLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
