import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toasts" role="region" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismissToast(t.id)}>
          <span className="toast-icon">{t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export function NotFound() {
  return (
    <main className="page notfound">
      <div className="container">
        <div className="nf-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="72" height="72"><rect width="64" height="64" rx="16" fill="#FF6B5B"/><path d="M20 23h24l-2.4 27a3 3 0 0 1-3 2.7H25.4a3 3 0 0 1-3-2.7Z" fill="#F4EDE0"/><path d="M25 23v-2.5a7 7 0 0 1 14 0V23" fill="none" stroke="#14213D" strokeWidth="3.2" strokeLinecap="round"/></svg>
        </div>
        <h1>404</h1>
        <h2>This shelf is empty</h2>
        <p>The page you're looking for drifted out of the stash.</p>
        <Link to="/" className="btn btn-coral btn-lg">Back to the storefront →</Link>
      </div>
    </main>
  );
}

export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <span className="spinner" />
      <p>Loading your stash…</p>
    </div>
  );
}
