import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PRODUCTS as SEED, CATEGORIES } from './catalog.js';
import { load, save, uid } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function seedPhotos() {
  try {
    const credits = JSON.parse(fs.readFileSync(path.join(__dirname, 'photo-credits.json'), 'utf8'));
    const byProduct = {};
    for (const c of credits) {
      (byProduct[c.productId] ||= []).push({
        id: `seed-${path.basename(c.file, '.jpg')}`,
        url: c.file,
        thumb: c.thumb,
        width: c.width,
        height: c.height,
        source: c.source,
        licence: c.licence,
        seed: true
      });
    }
    return byProduct;
  } catch {
    return {};
  }
}

/**
 * On first boot the static catalog is migrated into the database as real
 * product records owned by the house seller. From then on everything —
 * including the original 24 — is ordinary CRUD through the seller dashboard.
 */
export async function initInventory(houseSeller = null) {
  const db = load();
  db.products ||= [];
  if (db.products.length) return;
  const photos = seedPhotos();
  const house = houseSeller || db.users.find((u) => u.isAdmin) || db.users[0];
  db.products = SEED.map((p, i) => ({
    ...p,
    images: photos[p.id] || [],
    sellerId: house?.id || null,
    sellerName: house?.seller?.storeName || 'Stashify Official',
    status: 'active',
    createdAt: Date.now() - (SEED.length - i) * 86400000,
    updatedAt: Date.now()
  }));
  await save();
  console.log(`  Inventory ready → ${db.products.length} products, ${Object.values(photos).flat().length} photos`);
}

export function allProducts() {
  return load().products || [];
}

export function liveProducts() {
  return allProducts().filter((p) => p.status === 'active');
}

export function getProduct(id) {
  return allProducts().find((p) => p.id === id);
}

export function productsBySeller(sellerId) {
  return allProducts().filter((p) => p.sellerId === sellerId);
}

export const slugify = (s) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export function uniqueId(name) {
  const base = slugify(name) || 'product';
  let id = base, n = 2;
  while (getProduct(id)) id = `${base}-${n++}`;
  return id;
}

const clampNum = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Normalises and validates seller-supplied product fields. */
export function normaliseProduct(body, existing = {}) {
  const name = String(body.name ?? existing.name ?? '').trim();
  if (name.length < 3) { const e = new Error('Product name needs at least 3 characters.'); e.status = 400; throw e; }
  const price = Math.round(clampNum(body.price ?? existing.price, 1, 10_000_000, 0));
  if (!price) { const e = new Error('Enter a valid selling price.'); e.status = 400; throw e; }
  const mrp = Math.round(clampNum(body.mrp ?? existing.mrp ?? price, price, 10_000_000, price));
  const category = String(body.category ?? existing.category ?? 'electronics');
  if (!CATEGORIES.some((c) => c.id === category)) {
    const e = new Error('Choose a valid category.'); e.status = 400; throw e;
  }

  let colors = body.colors ?? existing.colors;
  if (typeof colors === 'string') {
    try { colors = JSON.parse(colors); } catch { colors = null; }
  }
  if (!Array.isArray(colors) || !colors.length) colors = [{ name: 'Default', hex: '#14213D' }];
  colors = colors.slice(0, 6).map((c) => ({
    name: String(c.name || 'Default').slice(0, 30),
    hex: /^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : '#14213D'
  }));

  const listify = (v, fallback = []) => {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
    if (typeof v === 'string') return v.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12);
    return fallback;
  };

  let specs = body.specs ?? existing.specs ?? {};
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch {
      specs = Object.fromEntries(specs.split('\n').map((l) => l.split(':')).filter((p) => p.length >= 2)
        .map(([k, ...rest]) => [k.trim(), rest.join(':').trim()]));
    }
  }
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) specs = {};

  return {
    name: name.slice(0, 120),
    brand: String(body.brand ?? existing.brand ?? 'Stashify').trim().slice(0, 60) || 'Stashify',
    category,
    price,
    mrp,
    stock: Math.round(clampNum(body.stock ?? existing.stock ?? 0, 0, 100000, 0)),
    description: String(body.description ?? existing.description ?? '').trim().slice(0, 4000),
    highlights: listify(body.highlights, existing.highlights || []),
    tags: listify(body.tags, existing.tags || []).map((t) => t.toLowerCase()),
    specs: Object.fromEntries(Object.entries(specs).slice(0, 20).map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 120)])),
    colors,
    model: String(body.model ?? existing.model ?? 'box').trim(),
    badges: listify(body.badges, existing.badges || []).slice(0, 3),
    status: ['active', 'draft', 'archived'].includes(body.status) ? body.status : (existing.status || 'draft')
  };
}

export async function createProduct(fields, seller) {
  const db = load();
  const product = {
    id: uniqueId(fields.name),
    ...fields,
    images: [],
    rating: 0,
    ratingCount: 0,
    sellerId: seller.id,
    sellerName: seller.seller?.storeName || seller.name,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  db.products.unshift(product);
  await save();
  return product;
}

export async function updateProduct(product, fields) {
  Object.assign(product, fields, { updatedAt: Date.now() });
  await save();
  return product;
}

export async function removeProduct(product) {
  const db = load();
  db.products = db.products.filter((p) => p.id !== product.id);
  await save();
}

/** Revenue / units for a seller, derived from real orders. */
export function sellerStats(sellerId) {
  const db = load();
  const mine = productsBySeller(sellerId);
  const ids = new Set(mine.map((p) => p.id));
  let revenue = 0, units = 0, orderCount = 0;
  const perProduct = {};
  const recent = [];
  for (const o of db.orders) {
    if (o.status === 'cancelled') continue;
    const lines = o.items.filter((i) => ids.has(i.productId));
    if (!lines.length) continue;
    orderCount++;
    let orderRevenue = 0;
    for (const l of lines) {
      const rev = l.price * l.qty;
      revenue += rev; orderRevenue += rev; units += l.qty;
      perProduct[l.productId] ||= { productId: l.productId, name: l.name, units: 0, revenue: 0 };
      perProduct[l.productId].units += l.qty;
      perProduct[l.productId].revenue += rev;
    }
    recent.push({
      orderId: o.id, at: o.createdAt, status: o.status,
      customer: o.address?.name || 'Customer',
      city: o.address?.city || '',
      items: lines.map((l) => ({ name: l.name, qty: l.qty, color: l.color, total: l.price * l.qty })),
      total: orderRevenue
    });
  }
  return {
    revenue, units, orderCount,
    productCount: mine.length,
    activeCount: mine.filter((p) => p.status === 'active').length,
    draftCount: mine.filter((p) => p.status !== 'active').length,
    lowStock: mine.filter((p) => p.stock > 0 && p.stock <= 5).length,
    outOfStock: mine.filter((p) => p.stock === 0).length,
    photoCount: mine.reduce((s, p) => s + (p.images?.length || 0), 0),
    missingPhotos: mine.filter((p) => !p.images?.length).length,
    topProducts: Object.values(perProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    recentOrders: recent.sort((a, b) => b.at - a.at).slice(0, 20)
  };
}
