import { memo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../lib/store.jsx';
import { Stars, Price, Badge } from './ui.jsx';
import ProductImage, { productPhoto } from './ProductImage.jsx';

function ProductCardBase({ product, index = 0, compact = false }) {
  const { addToCart, toggleWishlist, wishlist } = useStore();
  const [colorIdx, setColorIdx] = useState(0);
  const [hover, setHover] = useState(false);
  const ref = useRef(null);
  const wished = wishlist.includes(product.id);
  const color = product.colors[colorIdx];
  const hasSecond = Boolean(productPhoto(product, 1));
  const hasPhoto = Boolean(productPhoto(product, 0));

  const onMove = (e) => {
    const el = ref.current;
    if (!el || window.matchMedia('(hover: none)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${-py * 7}deg`);
    el.style.setProperty('--ry', `${px * 9}deg`);
    el.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
    el.style.setProperty('--my', `${(py + 0.5) * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    el?.style.setProperty('--rx', '0deg');
    el?.style.setProperty('--ry', '0deg');
    setHover(false);
  };

  return (
    <motion.article
      className={`pcard ${compact ? 'pcard-compact' : ''}`}
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pcard-shine" />
      <Link to={`/product/${product.id}`} className={`pcard-media ${hasPhoto ? 'has-photo' : ''}`} aria-label={product.name}>
        <div className="pcard-badges">
          {product.badges?.map((b) => <Badge key={b} tone={b === 'Deal' ? 'coral' : b === 'New' ? 'navy' : 'cream'}>{b}</Badge>)}
          {product.stock === 0 && <Badge tone="navy">Sold out</Badge>}
        </div>
        <ProductImage product={product} index={hover && hasSecond ? 1 : 0} size="thumb" />
        {hasSecond && <span className="pcard-photos">{product.images.length} photos</span>}
      </Link>

      <button
        className={`heart ${wished ? 'on' : ''}`}
        onClick={() => toggleWishlist(product.id)}
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9.3A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.7C19 15.6 12 20 12 20z" strokeWidth="1.8" strokeLinejoin="round" /></svg>
      </button>

      <div className="pcard-body">
        <span className="pcard-brand">{product.brand}</span>
        <Link to={`/product/${product.id}`} className="pcard-name">{product.name}</Link>
        <Stars value={product.rating} count={product.ratingCount} />
        <div className="pcard-swatches">
          {product.colors.map((c, i) => (
            <button
              key={c.name}
              className={`swatch ${i === colorIdx ? 'on' : ''}`}
              style={{ background: c.hex }}
              onClick={() => setColorIdx(i)}
              title={c.name}
              aria-label={`Choose ${c.name}`}
            />
          ))}
        </div>
        <Price product={product} />
        <div className="pcard-foot">
          <span className="pcard-delivery">
            {product.stock === 0 ? 'Out of stock' : product.price >= 499 ? 'Free delivery' : '+₹49 delivery'}
          </span>
          <button className="btn btn-coral btn-sm" disabled={product.stock === 0}
            onClick={() => addToCart(product, 1, color.name)}>
            {product.stock === 0 ? 'Sold out' : 'Add to bag'}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export const ProductCard = memo(ProductCardBase);

export function ProductRow({ title, eyebrow, products, action }) {
  if (!products?.length) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>
          {action}
        </div>
        <div className="grid-products">
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </div>
    </section>
  );
}
