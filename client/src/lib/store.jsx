import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, getToken, setToken, setTokenProvider, hasAuth } from './api.js';
import { safeStorage } from './storage.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const read = (k, fallback) => {
  try { return JSON.parse(safeStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};

export function StoreProvider({ children, initialConfig = null, clerk = null, clerkUnavailable = false }) {
  const [config, setConfig] = useState(initialConfig || { demoMail: true, demoPay: true, razorpayEnabled: false, brand: 'Stashify', authProvider: 'demo' });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCart] = useState(() => read('stashify.cart', []));
  const [wishlist, setWishlist] = useState(() => read('stashify.wishlist', []));
  const [saved, setSaved] = useState(() => read('stashify.saved', []));
  const [coupon, setCoupon] = useState(() => safeStorage.getItem('stashify.coupon') || '');
  const [recent, setRecent] = useState(() => read('stashify.recent', []));
  const [toasts, setToasts] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [theme, setTheme] = useState(() => safeStorage.getItem('stashify.theme') || 'dark');
  const synced = useRef(false);

  /* ------------------------------ theme ------------------------------ */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    safeStorage.setItem('stashify.theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F6F1E7' : '#14213D');
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  /* ---------------------------- catalog ----------------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cfg, cats, prods] = await Promise.all([
          initialConfig ? Promise.resolve(initialConfig) : api('/config', { auth: false }),
          api('/categories', { auth: false }),
          api('/products', { auth: false })
        ]);
        if (!alive) return;
        setConfig(cfg);
        setCategories(cats);
        setProducts(prods.products);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [initialConfig]);

  /* ------------------------------ auth ------------------------------- */
  const clerkLoaded = clerk?.isLoaded;
  const clerkSignedIn = clerk?.isSignedIn;
  const clerkUserId = clerk?.userId;
  useEffect(() => {
    let alive = true;
    (async () => {
      if (clerkUnavailable) {
        // The embedded preview blocked the storage Clerk needs. Keep the
        // storefront usable, but never fall back to legacy demo auth.
        setToken(null);
        setTokenProvider(null);
        if (alive) { setUser(null); setAuthReady(true); }
        return;
      }
      if (clerk) {
        setToken(null); // never mix legacy demo JWTs with Clerk sessions
        setTokenProvider(clerkSignedIn ? (opts) => clerk.getToken(opts) : null);
        if (!clerkLoaded) return;
        if (!clerkSignedIn) {
          if (alive) { setUser(null); setAuthReady(true); }
          return;
        }
        try {
          const me = await api('/me');
          if (!alive) return;
          setUser(me);
          mergeServerState(me);
        } catch {
          if (alive) setUser(null);
        } finally {
          if (alive) setAuthReady(true);
        }
        return;
      }
      if (getToken()) {
        try {
          const me = await api('/me');
          if (!alive) return;
          setUser(me);
          mergeServerState(me);
        } catch {
          setToken(null);
        }
      }
      if (alive) setAuthReady(true);
    })();
    return () => { alive = false; };
  }, [clerk, clerkUnavailable, clerkLoaded, clerkSignedIn, clerkUserId]);

  const mergeServerState = (me) => {
    if (synced.current) return;
    synced.current = true;
    const localCart = read('stashify.cart', []);
    const localWish = read('stashify.wishlist', []);
    const merged = [...(me.cart || [])];
    localCart.forEach((l) => {
      const hit = merged.find((m) => m.productId === l.productId && m.color === l.color);
      if (hit) hit.qty = Math.min(10, hit.qty + l.qty);
      else merged.push(l);
    });
    const wish = Array.from(new Set([...(me.wishlist || []), ...localWish]));
    setCart(merged);
    setWishlist(wish);
    api('/me/state', { method: 'POST', body: { cart: merged, wishlist: wish } }).catch(() => {});
  };

  /* --------------------------- persistence --------------------------- */
  useEffect(() => { safeStorage.setItem('stashify.cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { safeStorage.setItem('stashify.wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { safeStorage.setItem('stashify.saved', JSON.stringify(saved)); }, [saved]);
  useEffect(() => { safeStorage.setItem('stashify.recent', JSON.stringify(recent)); }, [recent]);
  useEffect(() => { safeStorage.setItem('stashify.coupon', coupon); }, [coupon]);

  const pushState = useCallback((nextCart, nextWish) => {
    if (!hasAuth()) return;
    clearTimeout(pushState.t);
    pushState.t = setTimeout(() => {
      api('/me/state', { method: 'POST', body: { cart: nextCart, wishlist: nextWish } }).catch(() => {});
    }, 700);
  }, []);

  useEffect(() => { if (user) pushState(cart, wishlist); }, [cart, wishlist, user, pushState]);

  /* ------------------------------ toasts ----------------------------- */
  const toast = useCallback((message, type = 'info', ttl = 3800) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  /* ------------------------------- cart ------------------------------ */
  const addToCart = useCallback((product, qty = 1, color = null, opts = {}) => {
    const chosen = color || product.colors[0].name;
    setCart((c) => {
      const hit = c.find((i) => i.productId === product.id && i.color === chosen);
      if (hit) return c.map((i) => i === hit ? { ...i, qty: Math.min(10, i.qty + qty) } : i);
      return [...c, { productId: product.id, qty: Math.min(10, qty), color: chosen }];
    });
    if (!opts.silent) {
      toast(`${product.name.split(' ').slice(0, 3).join(' ')} added to bag`, 'success');
      setCartOpen(true);
    }
  }, [toast]);

  const setQty = useCallback((productId, color, qty) => {
    setCart((c) => qty <= 0
      ? c.filter((i) => !(i.productId === productId && i.color === color))
      : c.map((i) => (i.productId === productId && i.color === color ? { ...i, qty: Math.min(10, qty) } : i)));
  }, []);

  const removeFromCart = useCallback((productId, color) => {
    setCart((c) => c.filter((i) => !(i.productId === productId && i.color === color)));
  }, []);

  const saveForLater = useCallback((productId, color) => {
    setCart((c) => {
      const item = c.find((i) => i.productId === productId && i.color === color);
      if (item) setSaved((s) => s.some((x) => x.productId === productId && x.color === color) ? s : [...s, item]);
      return c.filter((i) => !(i.productId === productId && i.color === color));
    });
    toast('Saved for later', 'info');
  }, [toast]);

  const moveToCart = useCallback((productId, color) => {
    setSaved((s) => {
      const item = s.find((i) => i.productId === productId && i.color === color);
      if (item) setCart((c) => c.some((x) => x.productId === productId && x.color === color)
        ? c.map((x) => x.productId === productId && x.color === color ? { ...x, qty: Math.min(10, x.qty + item.qty) } : x)
        : [...c, item]);
      return s.filter((i) => !(i.productId === productId && i.color === color));
    });
  }, []);

  const clearCart = useCallback(() => { setCart([]); setCoupon(''); }, []);

  const toggleWishlist = useCallback((productId) => {
    setWishlist((w) => {
      const has = w.includes(productId);
      toast(has ? 'Removed from wishlist' : 'Saved to wishlist', has ? 'info' : 'success');
      return has ? w.filter((x) => x !== productId) : [...w, productId];
    });
  }, [toast]);

  const markRecent = useCallback((productId) => {
    setRecent((r) => [productId, ...r.filter((x) => x !== productId)].slice(0, 8));
  }, []);

  /* ------------------------------- auth ------------------------------ */
  const applySession = useCallback((data) => {
    if (data.token) setToken(data.token);
    if (data.user) { setUser(data.user); synced.current = true; }
  }, []);

  const refreshUser = useCallback(async () => {
    try { setUser(await api('/me')); } catch { /* ignore */ }
  }, []);

  const logout = useCallback(async () => {
    synced.current = false;
    setUser(null);
    if (clerk) {
      setTokenProvider(null);
      setCart([]); setWishlist([]); setSaved([]); setCoupon('');
      await clerk.signOut();
      toast('Signed out.', 'info');
      return;
    }
    setToken(null);
    toast('Signed out. Your bag is saved on this device.', 'info');
  }, [clerk, toast]);

  /* ----------------------------- selectors --------------------------- */
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const cartLines = useMemo(() => cart.map((i) => {
    const p = byId[i.productId];
    return p ? { ...i, product: p, lineTotal: p.price * i.qty } : null;
  }).filter(Boolean), [cart, byId]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const cartSubtotal = useMemo(() => cartLines.reduce((s, l) => s + l.lineTotal, 0), [cartLines]);

  const value = {
    config, products, categories, loading, byId,
    user, setUser, authReady, authUnavailable: clerkUnavailable, applySession, refreshUser, logout,
    cart, cartLines, cartCount, cartSubtotal, addToCart, setQty, removeFromCart,
    clearCart, saveForLater, moveToCart, saved, setSaved,
    wishlist, toggleWishlist, recent, markRecent,
    coupon, setCoupon, toasts, toast, dismissToast,
    cartOpen, setCartOpen, theme, toggleTheme,
    manageAccount: clerk?.openUserProfile || null
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
