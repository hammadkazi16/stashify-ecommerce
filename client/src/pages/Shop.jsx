import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { Page, EmptyState, Stars } from '../components/ui.jsx';
import { inr } from '../lib/api.js';

const SORTS = [
  { id: 'popular', label: 'Most popular' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Top rated' },
  { id: 'discount', label: 'Biggest discount' },
  { id: 'newest', label: 'Newest first' }
];

export default function Shop() {
  const { products, categories, loading } = useStore();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'popular';
  const maxPrice = Number(params.get('max') || 80000);
  const minRating = Number(params.get('rating') || 0);
  const brand = params.get('brand') || '';

  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === '') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  const results = useMemo(() => {
    let list = [...products];
    if (q) {
      const n = q.toLowerCase();
      list = list.filter((p) => [p.name, p.brand, p.category, p.description, ...p.tags].join(' ').toLowerCase().includes(n));
    }
    if (category) list = list.filter((p) => p.category === category);
    if (brand) list = list.filter((p) => p.brand === brand);
    list = list.filter((p) => p.price <= maxPrice && p.rating >= minRating);
    const s = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      popular: (a, b) => b.ratingCount - a.ratingCount,
      discount: (a, b) => (1 - b.price / b.mrp) - (1 - a.price / a.mrp),
      newest: (a, b) => (b.badges.includes('New') ? 1 : 0) - (a.badges.includes('New') ? 1 : 0)
    }[sort];
    if (s) list.sort(s);
    return list;
  }, [products, q, category, brand, maxPrice, minRating, sort]);

  const activeCat = categories.find((c) => c.id === category);
  const chips = [
    q && { key: 'q', label: `“${q}”` },
    category && { key: 'category', label: activeCat?.name || category },
    brand && { key: 'brand', label: brand },
    minRating > 0 && { key: 'rating', label: `${minRating}★ & up` },
    maxPrice < 80000 && { key: 'max', label: `Under ${inr(maxPrice)}` }
  ].filter(Boolean);

  return (
    <Page className="shop">
      <div className="container">
        <div className="shop-hero">
          <div>
            <span className="eyebrow">{activeCat ? activeCat.blurb : 'The full stash'}</span>
            <h1>{activeCat ? activeCat.name : q ? `Results for “${q}”` : 'All products'}</h1>
            <p className="muted">{loading ? 'Loading products…' : `${results.length} product${results.length === 1 ? '' : 's'} · real photos, honest prices`}</p>
          </div>
          <div className="shop-sort">
            <button className="btn btn-ghost filter-toggle" onClick={() => setFiltersOpen((o) => !o)}>Filters</button>
            <label>
              <span>Sort</span>
              <select className="input" value={sort} onChange={(e) => setParam('sort', e.target.value)}>
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="chips">
            {chips.map((c) => (
              <button key={c.key} className="chip" onClick={() => setParam(c.key, '')}>{c.label} ✕</button>
            ))}
            <button className="chip chip-clear" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear all</button>
          </div>
        )}

        <div className="shop-layout">
          <aside className={`filters ${filtersOpen ? 'open' : ''}`}>
            <div className="filter-group">
              <h4>Category</h4>
              <button className={!category ? 'on' : ''} onClick={() => setParam('category', '')}>All categories</button>
              {categories.map((c) => (
                <button key={c.id} className={category === c.id ? 'on' : ''} onClick={() => setParam('category', c.id)}>
                  {c.name} <i>{products.filter((p) => p.category === c.id).length}</i>
                </button>
              ))}
            </div>
            <div className="filter-group">
              <h4>Max price</h4>
              <input type="range" min="1000" max="80000" step="1000" value={maxPrice}
                onChange={(e) => setParam('max', e.target.value)} />
              <div className="range-row"><span>₹1,000</span><b>{inr(maxPrice)}</b></div>
            </div>
            <div className="filter-group">
              <h4>Customer rating</h4>
              {[4.5, 4, 3.5, 0].map((r) => (
                <button key={r} className={minRating === r ? 'on' : ''} onClick={() => setParam('rating', r || '')}>
                  {r === 0 ? 'Any rating' : <><Stars value={r} size={12} /> & up</>}
                </button>
              ))}
            </div>
            <div className="filter-group">
              <h4>Brand</h4>
              <button className={!brand ? 'on' : ''} onClick={() => setParam('brand', '')}>All brands</button>
              {brands.map((b) => (
                <button key={b} className={brand === b ? 'on' : ''} onClick={() => setParam('brand', b)}>{b}</button>
              ))}
            </div>
          </aside>

          <div className="shop-results">
            {loading ? (
              <div className="grid-products">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="pcard skeleton-card"><span /></div>)}
              </div>
            ) : results.length === 0 ? (
              <EmptyState icon="🔍" title="Nothing matches those filters"
                body="Try widening the price range or clearing a filter."
                action={<button className="btn btn-coral" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Reset filters</button>} />
            ) : (
              <div className="grid-products">
                {results.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
