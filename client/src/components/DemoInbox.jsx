import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, timeFmt } from '../lib/api.js';
import { useStore } from '../lib/store.jsx';

export default function DemoInbox() {
  const { config, user, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [mail, setMail] = useState([]);
  const [active, setActive] = useState(null);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.querySelector('.footer');
    if (!footer || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const load = useCallback(async () => {
    if (!config.demoMail || !user) return;
    setBusy(true);
    try { setMail(await api('/dev/inbox')); }
    catch (e) { /* silent */ }
    finally { setBusy(false); }
  }, [config.demoMail, user]);

  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => {
    if (!open || !config.demoMail) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [open, load, config.demoMail]);

  if (!config.demoMail || !user) return null;

  const shown = mail.filter((m) => filter === 'all' ? true : filter === 'sms' ? m.kind === 'sms' : m.kind !== 'sms');
  const copy = (code) => {
    navigator.clipboard?.writeText(code).then(() => toast(`Code ${code} copied`, 'success')).catch(() => toast(`Code: ${code}`, 'info'));
  };

  return (
    <>
      {!footerVisible && (
        <button className="inbox-fab" onClick={() => setOpen(true)} aria-label="Open demo inbox">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 6.5h18v11H3z" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 7l8.5 6 8.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
          <span>Demo Inbox</span>
          {mail.length > 0 && <i className="inbox-dot">{mail.length}</i>}
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="drawer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setOpen(false); setActive(null); }} />
            <motion.aside className="drawer inbox" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
              <div className="drawer-head">
                <h3>Demo Inbox</h3>
                <button className="icon-btn" onClick={() => { setOpen(false); setActive(null); }} aria-label="Close">✕</button>
              </div>
              <div className="inbox-note">
                Project mode: no SMTP is configured, so emails are previewed here. Payment-success emails go only to the customer.
              </div>
              <div className="inbox-tabs">
                {['all', 'email', 'sms'].map((f) => (
                  <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'sms' ? 'SMS' : 'Email'}</button>
                ))}
                <button className="inbox-refresh" onClick={load} disabled={busy}>{busy ? '…' : '↻'}</button>
              </div>

              <div className="drawer-body">
                {active ? (
                  <div className="mail-view">
                    <button className="btn btn-ghost btn-sm" onClick={() => setActive(null)}>← Back to inbox</button>
                    <div className="mail-meta">
                      <b>{active.subject}</b>
                      <small>To {active.to} · {timeFmt(active.createdAt)}</small>
                    </div>
                    {active.code && (
                      <button className="mail-code" onClick={() => copy(active.code)}>
                        <span>{active.code}</span><small>Tap to copy</small>
                      </button>
                    )}
                    <iframe className="mail-frame" srcDoc={active.html} title="Email preview" sandbox="" />
                  </div>
                ) : shown.length === 0 ? (
                  <div className="inbox-empty">
                    <p>No messages yet.</p>
                    <small>Create an account or request an OTP and it will appear here within a second.</small>
                  </div>
                ) : (
                  shown.map((m) => (
                    <button key={m.id} className="mail-item" onClick={() => setActive(m)}>
                      <span className={`mail-kind ${m.kind === 'sms' ? 'sms' : ''}`}>{m.kind === 'sms' ? 'SMS' : '@'}</span>
                      <span className="mail-meta">
                        <b>{m.subject}</b>
                        <small>{m.to} · {timeFmt(m.createdAt)}</small>
                      </span>
                      {m.code && <span className="mail-pill">{m.code}</span>}
                    </button>
                  ))
                )}
              </div>

              <div className="drawer-foot">
                <button className="btn btn-ghost btn-block" onClick={async () => { await api('/dev/inbox', { method: 'DELETE' }); setMail([]); setActive(null); }}>
                  Clear inbox
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
