import { useEffect, useState } from 'react';
import { api, dateFmt } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { Spinner } from '../../components/ui.jsx';

export default function Settings() {
  const { user, setUser, toast } = useStore();
  const [form, setForm] = useState({ storeName: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [since, setSince] = useState(null);

  useEffect(() => {
    api('/seller/me').then((d) => {
      setForm({ storeName: d.seller.storeName, description: d.seller.description || '' });
      setSince(d.seller.since);
    }).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const r = await api('/seller/me', { method: 'PUT', body: form });
      setUser({ ...user, seller: r.seller });
      toast('Store profile updated.', 'success');
    } catch (e2) { toast(e2.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <div className="seller-head"><div><h1>Store settings</h1><p>Manage your public seller profile.</p></div></div>
      <div className="panel">
        {since && <div className="alert info">Selling on Stashify since {dateFmt(since)}.</div>}
        <form onSubmit={save} className="form-grid">
          <div className="field full"><label>Store name *</label>
            <input value={form.storeName} onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))} required minLength={3} maxLength={60} />
            <div className="hint">Shown on every listing. Renaming updates all your products.</div>
          </div>
          <div className="field full"><label>About your store</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={600} />
          </div>
          <div className="full"><button className="btn btn-coral" disabled={saving}>{saving ? <Spinner /> : 'Save profile'}</button></div>
        </form>
      </div>
      <div className="panel">
        <div className="panel-head"><h2>Account</h2></div>
        <p style={{ fontSize: 14, opacity: .7 }}>{user.name} · {user.email} {user.emailVerified && <span className="status-pill active">verified</span>}</p>
        {user.seller?.gstin && <p style={{ fontSize: 13, opacity: .6, marginTop: 6 }}>GSTIN: {user.seller.gstin}</p>}
      </div>
    </div>
  );
}
