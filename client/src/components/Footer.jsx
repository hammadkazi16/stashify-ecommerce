import { Link } from 'react-router-dom';
import { Logo } from './Navbar.jsx';
import { useStore } from '../lib/store.jsx';

export default function Footer() {
  const { categories, config } = useStore();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo size={34} />
            <p>See it. Love it. Stash it. A modern marketplace with real product photography, a smooth animated experience, secure verified checkout — and a seller dashboard to list your own.</p>
          </div>
          <div>
            <h4>Shop</h4>
            {categories.slice(0, 6).map((c) => <Link key={c.id} to={`/shop?category=${c.id}`}>{c.name}</Link>)}
          </div>
          <div>
            <h4>Your account</h4>
            <Link to="/account">Profile & addresses</Link>
            <Link to="/orders">Orders & tracking</Link>
            <Link to="/wishlist">Wishlist</Link>
            <Link to="/cart">Your bag</Link>
          </div>
          <div>
            <h4>Trust & safety</h4>
            <span className="footer-static">Email OTP verification</span>
            <span className="footer-static">Mobile OTP verification</span>
            <span className="footer-static">{config.razorpayEnabled ? 'Razorpay live checkout' : 'Razorpay-ready checkout'}</span>
            <span className="footer-static">HMAC signature validation</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Stashify — an original demo storefront. Not affiliated with any real retailer.</span>
          <span className="footer-credit">
            Made with <span className="footer-heart" aria-hidden="true">♥</span> by <strong>Hammad Kazi</strong>
          </span>
        </div>
      </div>
    </footer>
  );
}
