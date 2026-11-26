/** Returns a real photo URL for a product, or null if it has none yet. */
export function productPhoto(product, index = 0, size = 'thumb') {
  const img = product?.images?.[index];
  if (img) return size === 'thumb' ? (img.thumb || img.url) : (img.url || img.thumb);
  // Order lines store a single thumbnail string.
  if (index === 0 && typeof product?.image === 'string' && product.image) return product.image;
  return null;
}

/**
 * Real photography only. When a product has no uploaded photos yet (e.g. a
 * freshly created draft) we show a neutral placeholder — never a generated render.
 */
export default function ProductImage({ product, index = 0, size = 'thumb', alt = '', ...rest }) {
  const src = productPhoto(product, index, size);
  if (src) {
    return <img src={src} alt={alt || product?.name || ''} loading="lazy" draggable="false" {...rest} />;
  }
  return (
    <span className="img-placeholder" role="img" aria-label={alt || 'No photo yet'} {...rest}>
      <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-9 8" />
      </svg>
    </span>
  );
}
