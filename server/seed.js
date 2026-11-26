import bcrypt from 'bcryptjs';
import { load, save, uid } from './store.js';
import { findProduct } from './catalog.js';

/**
 * Seeds one verified demo administrator plus a sample delivered order so the
 * storefront, order tracking and fulfilment console are explorable immediately.
 * Runs only when the database has no users.
 */
export async function seedDemo() {
  const db = load();
  if (db.users.length > 0) return null;

  const demo = {
    id: uid('usr'),
    name: 'Demo Shopper',
    email: 'demo@stashify.shop',
    phone: '9876543210',
    passwordHash: bcrypt.hashSync('Demo@1234', 10),
    emailVerified: true,
    phoneVerified: true,
    isAdmin: true,
    seller: {
      storeName: 'Stashify Official',
      gstin: '',
      description: 'The house store. Every launch product ships from our own fulfilment centre.',
      since: Date.now() - 86400000 * 12,
      status: 'active'
    },
    addresses: [{
      id: uid('adr'), label: 'Home', name: 'Demo Shopper',
      line1: '42 Bandra Reclamation', line2: 'Near Sea Link',
      city: 'Mumbai', state: 'Maharashtra', pincode: '400050',
      phone: '9876543210', isDefault: true
    }],
    wishlist: ['nomad-camera', 'keystone-keyboard'],
    cart: [],
    createdAt: Date.now() - 86400000 * 12
  };
  db.users.push(demo);

  const a = findProduct('aurora-over-ear');
  const b = findProduct('summit-bottle');
  const items = [
    { productId: a.id, name: a.name, brand: a.brand, model: a.model, price: a.price, mrp: a.mrp, qty: 1, color: 'Deep Navy' },
    { productId: b.id, name: b.name, brand: b.brand, model: b.model, price: b.price, mrp: b.mrp, qty: 2, color: 'Coral Pop' }
  ];
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const placedAt = Date.now() - 86400000 * 5;
  db.orders.unshift({
    id: 'STDEMO01A7F',
    userId: demo.id,
    items,
    address: demo.addresses[0],
    totals: { subtotal, discount: 0, shipping: 0, total: subtotal, coupon: null },
    total: subtotal,
    status: 'delivered',
    payment: {
      paymentId: 'pay_demo_seeded0001', orderId: 'order_demo_seeded0001',
      method: 'upi', mode: 'demo', capturedAt: placedAt
    },
    deliveryOtp: '4271',
    timeline: [
      { status: 'confirmed', at: placedAt, note: 'Payment verified and order placed' },
      { status: 'packed', at: placedAt + 3600000 * 8, note: 'Packed at the Stashify fulfilment centre' },
      { status: 'shipped', at: placedAt + 86400000, note: 'Handed to delivery partner' },
      { status: 'out_for_delivery', at: placedAt + 86400000 * 2, note: 'Out for delivery — share your OTP with the agent' },
      { status: 'delivered', at: placedAt + 86400000 * 2 + 3600000 * 5, note: 'Delivered · OTP verified' }
    ],
    eta: placedAt + 86400000 * 3,
    createdAt: placedAt
  });
  await save();
  console.log('  Seeded demo account → demo@stashify.shop / Demo@1234 (admin)');
  return demo;
}
