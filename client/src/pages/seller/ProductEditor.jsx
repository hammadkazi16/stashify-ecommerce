import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, uploadFiles, inr } from '../../lib/api.js';
import { useStore } from '../../lib/store.jsx';
import { Spinner } from '../../components/ui.jsx';
import { IconLeft, IconRight, IconStar, IconTrash, IconCamera } from '../../components/Icons.jsx';

const BLANK = { name: '', brand: '', category: 'electronics', price: '', mrp: '', stock: 10, description: '', highlights: '', tags: '', badges: '', status: 'draft', colors: [{ name: 'Default', hex: '#14213D' }] };

function ImageManager({ product, onChange }) {
  const { toast } = useStore();
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const images = product.images || [];

  const doUpload = async (files) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!arr.length) return toast('Choose image files (JPEG, PNG, WebP or AVIF).', 'error');
    if (images.length + arr.length > 10) return toast('A product can have at most 10 photos.', 'error');
    setUploading(true); setProgress(0);
    try {
      const r = await uploadFiles(`/seller/products/${product.id}/images`, arr, { onProgress: setProgress });
      onChange(r.product);
      toast(`${r.added.length} photo${r.added.length > 1 ? 's' : ''} uploaded.${r.failed?.length ? ` ${r.failed.length} rejected.` : ''}`, 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setUploading(false); setProgress(0); if (inputRef.current) inputRef.current.value = ''; }
  };

  const act = async (path, method = 'PUT', body) => {
    try { onChange(await api(path, { method, body })); }
    catch (e) { toast(e.message, 'error'); }
  };
  const move = (i, dir) => {
    const order = images.map((x) => x.id);
    const j = i + dir; if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    act(`/seller/products/${product.id}/images/order`, 'PUT', { order });
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Product photos</h2>
        <span style={{ fontSize: 12, opacity: .6 }}>{images.length}/10 · first photo is the cover</span>
      </div>
      {!images.length && <div className="alert info">Add at least one photo to publish this product. Real photos convert far better than renders.</div>}

      <div className={`dropzone ${over ? 'over' : ''}`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!uploading) doUpload(e.dataTransfer.files); }}>
        <div className="dz-icon"><IconCamera size={30} /></div>
        <b>{uploading ? 'Uploading…' : 'Drag & drop photos here, or click to browse'}</b>
        <small>JPEG, PNG, WebP or AVIF · up to 8 MB each · we auto-resize and strip metadata</small>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden
          onChange={(e) => doUpload(e.target.files)} />
      </div>
      {uploading && <div className="upload-progress">Uploading… {progress}%</div>}

      {images.length > 0 && (
        <div className="upload-list">
          {images.map((im, i) => (
            <motion.div key={im.id} className="upload-item" layout initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }}>
              {i === 0 && <span className="primary-tag">Cover</span>}
              <img src={im.thumb || im.url} alt="" />
              <div className="ui-bar">
                <button title="Move left" onClick={() => move(i, -1)} disabled={i === 0}><IconLeft size={14} /></button>
                <button title="Set as cover" onClick={() => act(`/seller/products/${product.id}/images/${im.id}/primary`)}><IconStar size={14} /></button>
                <button title="Move right" onClick={() => move(i, 1)} disabled={i === images.length - 1}><IconRight size={14} /></button>
                <button title="Delete" onClick={() => act(`/seller/products/${product.id}/images/${im.id}`, 'DELETE')}><IconTrash size={14} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const { categories, toast } = useStore();
  const [form, setForm] = useState(BLANK);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [colorDraft, setColorDraft] = useState({ name: '', hex: '#FF6B5B' });

  useEffect(() => {
    if (isNew) return;
    api(`/seller/products/${id}`).then((p) => {
      setProduct(p);
      setForm({ ...BLANK, ...p, highlights: (p.highlights || []).join('\n'), tags: (p.tags || []).join('\n'), badges: (p.badges || []).join('\n'), price: p.price, mrp: p.mrp });
    }).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [id, isNew]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const payload = () => ({
    ...form,
    price: Number(form.price), mrp: Number(form.mrp) || Number(form.price), stock: Number(form.stock),
    highlights: form.highlights.split('\n').map((s) => s.trim()).filter(Boolean),
    tags: form.tags.split('\n').map((s) => s.trim()).filter(Boolean),
    badges: form.badges.split('\n').map((s) => s.trim()).filter(Boolean)
  });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      if (isNew) {
        const p = await api('/seller/products', { method: 'POST', body: payload() });
        toast('Product created. Now add photos.', 'success');
        nav(`/seller/products/${p.id}`, { replace: true });
      } else {
        const p = await api(`/seller/products/${id}`, { method: 'PUT', body: payload() });
        setProduct(p);
        toast('Changes saved.', 'success');
      }
    } catch (e2) { setErr(e2.message); }
    finally { setSaving(false); }
  };

  const addColor = () => {
    if (!colorDraft.name.trim()) return;
    setForm((f) => ({ ...f, colors: [...f.colors, { ...colorDraft, name: colorDraft.name.trim() }].slice(0, 6) }));
    setColorDraft({ name: '', hex: '#FF6B5B' });
  };

  if (loading) return <div className="route-loading"><span className="spinner" /></div>;
  if (err && !product && !isNew) return <div className="container"><div className="alert warn">{err}</div><Link to="/seller/products" className="btn btn-ghost">← Back to products</Link></div>;

  const discount = form.price && form.mrp > form.price ? Math.round((1 - form.price / form.mrp) * 100) : 0;

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <div className="seller-head">
        <div>
          <Link to="/seller/products" style={{ fontSize: 13, opacity: .6, textDecoration: 'none', color: 'var(--navy)' }}>← Products</Link>
          <h1>{isNew ? 'Add a product' : form.name || 'Edit product'}</h1>
        </div>
        {!isNew && product && <Link to={`/product/${product.id}`} className="btn btn-ghost btn-sm" target="_blank">View on store ↗</Link>}
      </div>

      {err && <div className="alert warn">{err}</div>}

      <form onSubmit={save}>
        <div className="panel">
          <div className="panel-head"><h2>Details</h2></div>
          <div className="form-grid">
            <div className="field full"><label>Product name *</label><input value={form.name} onChange={set('name')} required minLength={3} maxLength={120} placeholder="e.g. Aurora Wireless Headphones" /></div>
            <div className="field"><label>Brand</label><input value={form.brand} onChange={set('brand')} maxLength={60} placeholder="Stashify" /></div>
            <div className="field"><label>Category *</label>
              <select value={form.category} onChange={set('category')}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div className="field"><label>Selling price (₹) *</label><input type="number" min="1" value={form.price} onChange={set('price')} required placeholder="2999" /></div>
            <div className="field"><label>MRP (₹)</label><input type="number" min="1" value={form.mrp} onChange={set('mrp')} placeholder="4999" />
              {discount > 0 && <div className="hint" style={{ color: 'var(--coral-600)' }}>{discount}% off</div>}
            </div>
            <div className="field"><label>Stock quantity</label><input type="number" min="0" value={form.stock} onChange={set('stock')} /></div>
            <div className="field"><label>Status</label>
              <select value={form.status} onChange={set('status')}>
                <option value="draft">Draft (hidden)</option>
                <option value="active">Active (live)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="field full"><label>Description</label><textarea value={form.description} onChange={set('description')} maxLength={4000} placeholder="Describe the product, materials, what's in the box…" /></div>
            <div className="field"><label>Highlights (one per line)</label><textarea value={form.highlights} onChange={set('highlights')} placeholder={'40-hour battery\nActive noise cancellation'} /></div>
            <div className="field"><label>Search tags (one per line)</label><textarea value={form.tags} onChange={set('tags')} placeholder={'wireless\nbluetooth\nover-ear'} /></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Colour options</h2></div>
          <div className="form-grid">
            <div className="field full">
              <label>Colour options</label>
              <div className="color-row" style={{ marginBottom: 10 }}>
                {form.colors.map((c, i) => (
                  <span key={i} className="color-chip"><i style={{ background: c.hex }} />{c.name}
                    <button type="button" onClick={() => setForm((f) => ({ ...f, colors: f.colors.filter((_, j) => j !== i) }))}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={colorDraft.name} onChange={(e) => setColorDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Colour name" style={{ flex: 1, minWidth: 140, border: '1px solid rgba(20,33,61,.18)', borderRadius: 11, padding: '10px 13px', font: 'inherit' }} />
                <input type="color" value={colorDraft.hex} onChange={(e) => setColorDraft((d) => ({ ...d, hex: e.target.value }))} style={{ width: 48, height: 42, border: '1px solid rgba(20,33,61,.18)', borderRadius: 11, padding: 3, cursor: 'pointer' }} />
                <button type="button" className="btn btn-navy btn-sm" onClick={addColor}>Add</button>
              </div>
              <div className="hint">Buyers can switch colours on the product page.</div>
            </div>
            <div className="field"><label>Badges (one per line, max 3)</label><textarea value={form.badges} onChange={set('badges')} placeholder={'New\nBestseller'} style={{ minHeight: 42 }} /></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
          <button className="btn btn-coral btn-lg" disabled={saving}>{saving ? <Spinner /> : isNew ? 'Create product →' : 'Save changes'}</button>
          {!isNew && form.status === 'draft' && <span className="alert info" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>Add a photo, then set status to Active to publish.</span>}
        </div>
      </form>

      {!isNew && product && <ImageManager product={product} onChange={(p) => { setProduct(p); }} />}
      {isNew && <div className="alert info">Create the product first — you'll be taken to the photo uploader right after.</div>}
    </div>
  );
}
