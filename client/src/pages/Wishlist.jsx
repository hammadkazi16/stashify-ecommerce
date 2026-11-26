import { Link } from 'react-router-dom';
import { useStore } from '../lib/store.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { Page, EmptyState } from '../components/ui.jsx';
import ProductImage from '../components/ProductImage.jsx';

export default function Wishlist() {
  const { wishlist, byId, addToCart, toast } = useStore();
  const items = wishlist.map((id) => byId[id]).filter(Boolean);

  const addAll = () => {
    items.forEach((p) => addToCart(p, 1, p.colors[0].name, { silent: true }));
    toast(`${items.length} item${items.length === 1 ? '' : 's'} moved to your bag`, 'success');
  };

  return (
    <Page className="wishlist-page">
      <div className="container">
        <div className="page-head row">
          <div>
            <h1>Your wishlist</h1>
            <p className="muted">{items.length} saved item{items.length === 1 ? '' : 's'} · synced when you sign in</p>
          </div>
          {items.length > 0 && <button className="btn btn-coral" onClick={addAll}>Add all to bag</button>}
        </div>
        {items.length === 0 ? (
          <EmptyState icon="♡" title="Nothing saved yet"
            body="Tap the heart on any product to keep it here for later."
            action={<Link to="/shop" className="btn btn-coral btn-lg">Find something you love</Link>} />
        ) : (
          <div className="grid-products">
            {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </div>
    </Page>
  );
}
