import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, inr } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { EmptyState } from '../../components/ui.jsx';
import ProductImage from '../../components/ProductImage.jsx';
import { IconEdit, IconTrash, IconPlay, IconPause } from '../../components/Icons.jsx';

export default function Products() {
  const { toast } = useStore();
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => { api('/seller/products').then(setList).catch((e) => toast(e.message, 'error')); }, [toast]);
  useEffect(load, [load]);

  const shown = useMemo(() => {
    if (!list) return [];
    return list.filter((p) => {
      if (filter === 'active' && p.status !== 'active') return false;
      if (filter === 'draft' && p.status === 'active') return false;
      if (filter === 'low' && !(p.stock <= 5)) return false;
      if (q && !`${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [list, q, filter]);

  const remove = async (p) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setBusyId(p.id);
    try {
      const r = await api(`/seller/products/${p.id}`, { method: 'DELETE' });
      toast(r.archived ? 'Archived (it has past orders).' : 'Product deleted.', 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusyId(''); }
  };

  const toggleStatus = async (p) => {
    setBusyId(p.id);
    try {
      const next = p.status === 'active' ? 'draft' : 'active';
      await api(`/seller/products/${p.id}`, { method: 'PUT', body: { ...p, status: next } });
      toast(next === 'active' ? 'Published to the storefront.' : 'Moved to draft.', 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusyId(''); }
  };

  if (!list) return <div className="route-loading"><span className="spinner" /></div>;

  return (
    <div className="container">
      <div className="seller-head">
        <div><h1>Products</h1><p>{list.length} listing{list.length === 1 ? '' : 's'} in your store.</p></div>
        <Link to="/seller/products/new" className="btn btn-coral">+ Add product</Link>
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…"
            style={{ flex: 1, minWidth: 200, border: '1px solid rgba(20,33,61,.18)', borderRadius: 11, padding: '10px 14px', font: 'inherit' }} />
          <div className="view-switch">
            {[['all', 'All'], ['active', 'Live'], ['draft', 'Draft'], ['low', 'Low stock']].map(([id, label]) => (
              <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon="📦" title={list.length ? 'No matches' : 'No products yet'}
          body={list.length ? 'Try a different search or filter.' : 'Add your first product with real photos to start selling.'}
          action={!list.length && <Link to="/seller/products/new" className="btn btn-coral">Add your first product</Link>} />
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="seller-table">
              <thead>
                <tr><th>Product</th><th>Price</th><th>Stock</th><th>Photos</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {shown.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * .02, .3) }}>
                    <td>
                      <div className="prod-cell">
                        <ProductImage product={p} alt="" />
                        <div>
                          <Link to={`/seller/products/${p.id}`} style={{ color: 'var(--navy)' }}><b>{p.name}</b></Link>
                          <small>{p.brand} · {p.category}</small>
                        </div>
                      </div>
                    </td>
                    <td><b>{inr(p.price)}</b>{p.mrp > p.price && <br />}<small style={{ opacity: .5, textDecoration: 'line-through' }}>{p.mrp > p.price ? inr(p.mrp) : ''}</small></td>
                    <td style={{ color: p.stock === 0 ? 'var(--coral-600)' : p.stock <= 5 ? '#b8860b' : 'inherit', fontWeight: 600 }}>{p.stock}</td>
                    <td>{p.images?.length || 0}{!p.images?.length && <span style={{ color: 'var(--coral-600)', fontSize: 11 }}> ⚠</span>}</td>
                    <td><span className={`status-pill ${p.status}`}>{p.status}</span></td>
                    <td>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="icon-btn" title={p.status === 'active' ? 'Unpublish' : 'Publish'} disabled={busyId === p.id} onClick={() => toggleStatus(p)}>{p.status === 'active' ? <IconPause /> : <IconPlay />}</button>
                        <button className="icon-btn" title="Edit" onClick={() => nav(`/seller/products/${p.id}`)}><IconEdit /></button>
                        <button className="icon-btn danger" title="Delete" disabled={busyId === p.id} onClick={() => remove(p)}><IconTrash /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
