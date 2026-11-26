import { Component, Suspense, lazy, useMemo } from 'react';
import { ClerkProvider, useAuth, useUser, useClerk } from '@clerk/react';
import { storageAvailable } from './lib/storage.js';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ScrollProgress, ButtonRipples } from './components/Effects.jsx';
import { StoreProvider, useStore } from './lib/store.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import DemoInbox from './components/DemoInbox.jsx';
import { Toasts, NotFound, LoadingScreen } from './components/Shell.jsx';
import { ScrollToTop } from './components/ui.jsx';
import Home from './pages/Home.jsx';

const Shop = lazy(() => import('./pages/Shop.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Wishlist = lazy(() => import('./pages/Wishlist.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const OrdersMod = lazy(() => import('./pages/Orders.jsx').then((m) => ({ default: m.Orders })));
const OrderDetail = lazy(() => import('./pages/Orders.jsx').then((m) => ({ default: m.OrderDetail })));
const Login = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Signup })));
const Verify = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Verify })));
const Forgot = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Forgot })));
const SellerLayout = lazy(() => import('./pages/seller/SellerLayout.jsx'));
const SellerDashboard = lazy(() => import('./pages/seller/Dashboard.jsx'));
const SellerProducts = lazy(() => import('./pages/seller/Products.jsx'));
const SellerEditor = lazy(() => import('./pages/seller/ProductEditor.jsx'));
const SellerOrders = lazy(() => import('./pages/seller/SellerOrders.jsx'));
const SellerSettings = lazy(() => import('./pages/seller/Settings.jsx'));

function Router() {
  const location = useLocation();
  const { loading, config } = useStore();
  if (loading) return <LoadingScreen />;
  const hideDemoInbox = config.authProvider === 'clerk'
    && ['/login', '/signup', '/verify', '/forgot'].some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.995 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<div className="route-loading"><span className="spinner" /></div>}>
            <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/orders" element={<OrdersMod />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<SellerDashboard />} />
              <Route path="products" element={<SellerProducts />} />
              <Route path="products/new" element={<SellerEditor />} />
              <Route path="products/:id" element={<SellerEditor />} />
              <Route path="orders" element={<SellerOrders />} />
              <Route path="settings" element={<SellerSettings />} />
            </Route>
            <Route path="/login/*" element={<Login />} />
            <Route path="/signup/*" element={<Signup />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/forgot" element={<Forgot />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
      <Footer />
      <CartDrawer />
      {!hideDemoInbox && <DemoInbox />}
      <Toasts />
    </>
  );
}

function ClerkStore({ config, children }) {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useAuth();
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const bridge = useMemo(() => ({
    isLoaded, isSignedIn, userId, getToken, signOut, openUserProfile, clerkUser: user
  }), [isLoaded, isSignedIn, userId, getToken, signOut, openUserProfile, user]);
  return <StoreProvider initialConfig={config} clerk={bridge}>{children}</StoreProvider>;
}

function AppTree() {
  return (
    <>
      <ScrollProgress />
      <ButtonRipples />
      <Router />
    </>
  );
}

function StorefrontOnly({ config }) {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider initialConfig={config} clerkUnavailable><AppTree /></StoreProvider>
    </MotionConfig>
  );
}

/* If Clerk cannot initialise inside a restricted preview iframe, keep the
 * storefront alive instead of letting the provider crash the whole page. */
class ClerkBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn('Clerk is unavailable in this embedded preview; storefront fallback enabled.', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function App({ initialConfig = null }) {
  const publishableKey = initialConfig?.clerkPublishableKey;
  if (publishableKey && storageAvailable()) {
    return (
      <ClerkBoundary fallback={<StorefrontOnly config={initialConfig} />}>
        <MotionConfig reducedMotion="user">
          <ClerkProvider
            publishableKey={publishableKey}
            signInUrl="/login"
            signUpUrl="/signup"
            afterSignOutUrl="/"
            appearance={{
              variables: {
                colorPrimary: '#FF6B5B',
                colorBackground: 'var(--clerk-auth-bg)',
                colorText: 'var(--clerk-auth-text)',
                colorTextSecondary: 'var(--clerk-auth-muted)',
                colorInputBackground: 'var(--clerk-auth-input-bg)',
                colorInputText: 'var(--clerk-auth-input-text)',
                colorNeutral: 'var(--clerk-auth-text)'
              }
            }}
          >
            <ClerkStore config={initialConfig}><AppTree /></ClerkStore>
          </ClerkProvider>
        </MotionConfig>
      </ClerkBoundary>
    );
  }
  if (publishableKey) return <StorefrontOnly config={initialConfig} />;
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider initialConfig={initialConfig}><AppTree /></StoreProvider>
    </MotionConfig>
  );
}
