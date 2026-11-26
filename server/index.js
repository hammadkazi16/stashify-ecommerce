import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';
import { getCollection, load, save, uid, publicUser, initStore, storeMode, closeStore } from './store.js';
import { clerkMiddleware } from '@clerk/express';
import { clerkEnabled, assertAuthEnv, clerkAuth } from './clerk-auth.js';
import { CATEGORIES, COUPONS } from './catalog.js';
import {
  initInventory, allProducts, liveProducts, getProduct, productsBySeller,
  normaliseProduct, createProduct, updateProduct, removeProduct, sellerStats
} from './inventory.js';
import {
  createImageUploadSignature,
  verifyUploadedImage,
  deleteCloudinaryImage
} from './cloudinary.js';
import { registerSellerRoutes } from './seller-routes.js';
import { createOtp, verifyOtp, otpMeta } from './otp.js';
import { sendSms, smsMode } from './sms.js';
import { sendMail, templates, mailMode } from './mail.js';
import { seedDemo } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const app = express();
assertAuthEnv();
await initStore();
const db = load();
const CLERK_ON = clerkEnabled();
if (!CLERK_ON) await seedDemo();
await initInventory(CLERK_ON ? { id: 'system_house', seller: { storeName: 'Stashify Official' } } : null);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
if (CLERK_ON) {
  const parties = (process.env.CLERK_AUTHORIZED_PARTIES || '').split(',').map((x) => x.trim()).filter(Boolean);
  app.use(clerkMiddleware(parties.length ? { authorizedParties: parties } : undefined));
}

/* ------------------------------- config ---------------------------------- */
const RZP_ON = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const rzp = RZP_ON
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;
const DEMO_SECRET = process.env.DEMO_PAY_SECRET || 'stashify-demo-secret';
const JWT_SECRET = process.env.JWT_SECRET || db.meta.jwtSecret;

const sign = (u) => jwt.sign({ uid: u.id }, JWT_SECRET, { expiresIn: '30d' });

function auth(required = true) {
  if (CLERK_ON) return clerkAuth(required);
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) {
      if (required) return res.status(401).json({ error: 'Please sign in to continue.' });
      req.user = null;
      return next();
    }
    try {
      const { uid: id } = jwt.verify(token, JWT_SECRET);
      const u = db.users.find((x) => x.id === id);
      if (!u) throw new Error('gone');
      req.user = u;
      next();
    } catch {
      if (required) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
      req.user = null;
      next();
    }
  };
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
const phoneOk = (p) => /^[6-9]\d{9}$/.test(String(p || '').replace(/\D/g, '').slice(-10));
const norm = (s) => String(s || '').trim();

app.get('/api/health', (req, res) => {
  res.json({ ok: true, auth: CLERK_ON ? 'clerk' : 'demo', database: storeMode() });
});

app.get('/api/config', (req, res) => {
  res.json({
    brand: 'Stashify',
    authProvider: CLERK_ON ? 'clerk' : 'demo',
    clerkPublishableKey: CLERK_ON ? process.env.CLERK_PUBLISHABLE_KEY : null,
    database: storeMode(),
    demoAuth: !CLERK_ON,
    demoData: storeMode() === 'file',
    demoSms: smsMode() === 'demo',
    smsProvider: smsMode(),
    razorpayEnabled: RZP_ON,
    razorpayKeyId: RZP_ON ? process.env.RAZORPAY_KEY_ID : null,
    paymentGateway: 'razorpay',
    razorpayMode: RZP_ON ? 'live' : 'test',
    demoMail: mailMode() === 'demo',
    demoPay: !RZP_ON,
    currency: 'INR'
  });
});

/* ------------------------------- catalog --------------------------------- */
app.get('/api/categories', (req, res) => res.json(CATEGORIES));

app.get('/api/products', wrap(async (req, res) => {
  const { q, category, sort, min, max, rating, brand } = req.query;
  let list = await liveProducts();

  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((p) =>
      [p.name, p.brand, p.category, p.description, ...(p.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }

  if (category) list = list.filter((p) => p.category === category);
  if (brand) list = list.filter((p) => p.brand === brand);
  if (min) list = list.filter((p) => p.price >= Number(min));
  if (max) list = list.filter((p) => p.price <= Number(max));
  if (rating) list = list.filter((p) => p.rating >= Number(rating));

  const sorters = {
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    popular: (a, b) => b.ratingCount - a.ratingCount,
    discount: (a, b) => (1 - b.price / b.mrp) - (1 - a.price / a.mrp),
    newest: (a, b) => (b.badges.includes('New') ? 1 : 0) - (a.badges.includes('New') ? 1 : 0)
  };

  if (sorters[sort]) list.sort(sorters[sort]);

  res.json({ total: list.length, products: list });
}));

app.get('/api/products/:id', wrap(async (req, res) => {
  const p = await getProduct(req.params.id);

  if (!p || p.status !== 'active') {
    return res.status(404).json({ error: 'Product not found' });
  }

  const related = (await liveProducts())
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 4);

  res.json({ product: p, related });
}));

app.get('/api/products/:id/reviews', wrap(async (req, res) => {
  const productId = req.params.id;
  const seeded = await seedReviews(productId);

  let user;

  if (storeMode() === 'mongo') {
    user = await getCollection('reviews')
      .find({ productId })
      .sort({ createdAt: -1 })
      .toArray();

    user = user.map(({ _id, ...review }) => review);
  } else {
    user = db.reviews.filter((r) => r.productId === productId);
  }

  res.json([...user, ...seeded]);
}));

app.post('/api/products/:id/reviews', auth(), wrap(async (req, res) => {
  const p = await getProduct(req.params.id);

  if (!p) return res.status(404).json({ error: 'Product not found' });

  const rating = Math.max(1, Math.min(5, Number(req.body.rating) || 5));
  const title = norm(req.body.title).slice(0, 90);
  const body = norm(req.body.body).slice(0, 1200);

  if (!body) return res.status(400).json({ error: 'Please write a short review.' });

  let bought;

  if (storeMode() === 'mongo') {
    bought = !!(await getCollection('orders').findOne({
      userId: req.user.id,
      'items.productId': p.id
    }));
  } else {
    bought = db.orders.some((o) =>
      o.userId === req.user.id &&
      o.items.some((i) => i.productId === p.id)
    );
  }

  const review = {
    id: uid('rev'),
    productId: p.id,
    userId: req.user.id,
    name: req.user.name,
    rating,
    title,
    body,
    verified: bought,
    createdAt: Date.now()
  };

  if (storeMode() === 'mongo') {
    await getCollection('reviews').insertOne({
      ...review,
      _id: review.id
    });
  } else {
    db.reviews.unshift(review);
    await save();
  }

  res.json(review);
}));

async function seedReviews(productId) {
  const p = await getProduct(productId);
  if (!p) return [];

  const pool = [
    { name: 'Ananya R.', rating: 5, title: 'Exactly as described', body: 'Packaging was lovely and the build quality is a step above what I expected at this price. Would buy again.' },
    { name: 'Rohit M.', rating: 4, title: 'Great, with one nitpick', body: 'Been using it daily for three weeks. Does the job brilliantly — took off one star only because I wish the case was a touch smaller.' },
    { name: 'Farah K.', rating: 5, title: 'The photos sold me', body: 'The listing photos were clear and honest, so I knew exactly what I was getting. What arrived matched them perfectly.' }
  ];

  const n = 2 + (productId.length % 2);

  return pool.slice(0, n).map((r, i) => ({
    id: `${productId}-seed-${i}`,
    productId,
    ...r,
    verified: true,
    createdAt: Date.now() - (i + 2) * 86400000 * 6
  }));
}

/* --------------------------------- auth ---------------------------------- */
if (CLERK_ON) {
  // Legacy password/OTP account endpoints are retired when Clerk is enabled.
  app.use('/api/auth', (req, res) => res.status(410).json({
    error: 'This store uses Clerk for accounts. Please use the sign-in page.', clerk: true
  }));
}

app.post('/api/auth/signup', wrap(async (req, res) => {
  const name = norm(req.body.name);
  const email = norm(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  const phone = norm(req.body.phone).replace(/\D/g, '').slice(-10);
  if (name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!emailOk(email)) return res.status(400).json({ error: 'That email address looks invalid.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (phone && !phoneOk(phone)) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
  if (db.users.some((u) => u.email === email && u.authProvider !== 'clerk')) {
    return res.status(409).json({ error: 'An account with this email already exists. Try signing in.' });
  }
  const user = {
    id: uid('usr'), name, email, phone,
    passwordHash: bcrypt.hashSync(password, 10),
    emailVerified: false, phoneVerified: false,
    addresses: [], wishlist: [], cart: [],
    createdAt: Date.now(),
    isAdmin: (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean).includes(email)
  };
  db.users.push(user);
  await save();
  const { code } = await createOtp({ target: email, channel: 'email', purpose: 'verify' });
  const t = templates.verifyEmail(name, code);
  await sendMail({ to: email, kind: 'verify', code, ...t });
  res.json({
    ok: true, email, requiresVerification: true,
    devCode: mailMode() === 'demo' ? code : undefined,
    message: mailMode() === 'demo' ? 'Demo mode: your code is shown below and saved to the Demo Inbox.' : `We emailed a 6-digit code to ${email}.`
  });
}));

app.post('/api/auth/verify-email', wrap(async (req, res) => {
  const email = norm(req.body.email).toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: 'No account found for that email.' });
  const r = await verifyOtp({ target: email, channel: 'email', purpose: 'verify', code: req.body.code });
  if (!r.ok) return res.status(400).json({ error: r.message });
  user.emailVerified = true;
  await save();
  res.json({ ok: true, token: sign(user), user: publicUser(user) });
}));

app.post('/api/auth/resend', wrap(async (req, res) => {
  const email = norm(req.body.email).toLowerCase();
  const purpose = ['verify', 'login', 'reset'].includes(req.body.purpose) ? req.body.purpose : 'verify';
  const user = db.users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: 'No account found for that email.' });
  const { code } = await createOtp({ target: email, channel: 'email', purpose });
  const t = purpose === 'reset' ? templates.reset(user.name, code)
    : purpose === 'login' ? templates.login(user.name, code)
    : templates.verifyEmail(user.name, code);
  await sendMail({ to: email, kind: purpose, code, ...t });
  res.json({ ok: true, devCode: mailMode() === 'demo' ? code : undefined, meta: await otpMeta(email, 'email', purpose) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const email = norm(req.body.email).toLowerCase();
  const user = db.users.find((u) => u.email === email && u.authProvider !== 'clerk');
  if (!user || !bcrypt.compareSync(String(req.body.password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  if (!user.emailVerified) {
    const { code } = await createOtp({ target: email, channel: 'email', purpose: 'verify' });
    await sendMail({ to: email, kind: 'verify', code, ...templates.verifyEmail(user.name, code) });
    return res.status(403).json({
      error: 'Please verify your email first.', needsVerification: true, email,
      devCode: mailMode() === 'demo' ? code : undefined
    });
  }
  res.json({ ok: true, token: sign(user), user: publicUser(user) });
}));

app.post('/api/auth/forgot', wrap(async (req, res) => {
  const email = norm(req.body.email).toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (user) {
    const { code } = await createOtp({ target: email, channel: 'email', purpose: 'reset' });
    await sendMail({ to: email, kind: 'reset', code, ...templates.reset(user.name, code) });
    return res.json({ ok: true, devCode: mailMode() === 'demo' ? code : undefined });
  }
  res.json({ ok: true }); // do not leak account existence
}));

app.post('/api/auth/reset', wrap(async (req, res) => {
  const email = norm(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const user = db.users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: 'No account found for that email.' });
  const r = await verifyOtp({ target: email, channel: 'email', purpose: 'reset', code: req.body.code });
  if (!r.ok) return res.status(400).json({ error: r.message });
  user.passwordHash = bcrypt.hashSync(password, 10);
  user.emailVerified = true;
  await save();
  res.json({ ok: true, token: sign(user), user: publicUser(user) });
}));

app.get('/api/me', auth(), (req, res) => res.json(publicUser(req.user)));

app.put('/api/me', auth(), wrap(async (req, res) => {
  const name = norm(req.body.name);
  if (name.length >= 2) req.user.name = name.slice(0, 80);
  const phone = norm(req.body.phone).replace(/\D/g, '').slice(-10);
  if (phone && phoneOk(phone) && phone !== req.user.phone) {
    req.user.phone = phone;
    req.user.phoneVerified = false;
  }
  await save();
  res.json(publicUser(req.user));
}));

app.post('/api/me/state', auth(), wrap(async (req, res) => {
  if (Array.isArray(req.body.wishlist)) req.user.wishlist = req.body.wishlist.slice(0, 200);
  if (Array.isArray(req.body.cart)) req.user.cart = req.body.cart.slice(0, 100);
  await save();
  res.json(publicUser(req.user));
}));

/* ----------------------------- phone OTP --------------------------------- */
app.post('/api/phone/send', auth(), wrap(async (req, res) => {
  const phone = norm(req.body.phone || req.user.phone).replace(/\D/g, '').slice(-10);
  if (!phoneOk(phone)) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
  req.user.phone = phone;
  await save();
  const { code } = await createOtp({ target: phone, channel: 'sms', purpose: 'phone' });
  const mode = smsMode();
  if (mode === 'demo') {
    await sendMail({
      to: phone, kind: 'sms', code,
      subject: `${code} is your Stashify SMS code`,
      title: 'SMS to +91 ' + phone,
      html: `<p style="line-height:1.6;color:rgba(20,33,61,.75)">Your Stashify verification code is below. In live mode this is delivered by your SMS provider (Twilio / MSG91).</p>
        <div style="margin:20px 0;padding:18px;background:#F4EDE0;border-radius:14px;text-align:center;font-size:34px;font-weight:800;letter-spacing:10px">${code}</div>`
    });
    return res.json({ ok: true, phone, devCode: code, channel: 'sms', demo: true });
  }
  try {
    await sendSms({ to: phone, code });
    res.json({ ok: true, phone, channel: 'sms', demo: false, provider: mode });
  } catch (e) {
    res.status(502).json({ error: `SMS delivery failed: ${e.message}` });
  }
}));

app.post('/api/phone/verify', auth(), wrap(async (req, res) => {
  const phone = norm(req.body.phone || req.user.phone).replace(/\D/g, '').slice(-10);
  const r = await verifyOtp({ target: phone, channel: 'sms', purpose: 'phone', code: req.body.code });
  if (!r.ok) return res.status(400).json({ error: r.message });
  req.user.phoneVerified = true;
  req.user.phone = phone;
  await save();
  res.json({ ok: true, user: publicUser(req.user) });
}));


/* ------------------------------ addresses -------------------------------- */
app.post('/api/addresses', auth(), wrap(async (req, res) => {
  const a = req.body || {};
  const line1 = norm(a.line1), city = norm(a.city), state = norm(a.state), pincode = norm(a.pincode);

  if (!line1 || !city || !state || !/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ error: 'Address needs a street, city, state and 6-digit pincode.' });
  }

  const addr = {
    id: uid('adr'),
    label: norm(a.label) || 'Home',
    name: norm(a.name) || req.user.name,
    line1,
    line2: norm(a.line2),
    city,
    state,
    pincode,
    phone: norm(a.phone).replace(/\D/g, '').slice(-10) || req.user.phone,
    isDefault: (req.user.addresses || []).length === 0
  };

  req.user.addresses = req.user.addresses || [];
  if (a.isDefault) req.user.addresses.forEach((x) => (x.isDefault = false));
  req.user.addresses.push(addr);

  if (storeMode() === 'mongo') {
    await getCollection('users').updateOne(
      { id: req.user.id },
      { $set: { addresses: req.user.addresses } }
    );
  } else {
    await save();
  }

  res.json(publicUser(req.user));
}));

app.delete('/api/addresses/:id', auth(), wrap(async (req, res) => {
  req.user.addresses = (req.user.addresses || []).filter((a) => a.id !== req.params.id);

  if (req.user.addresses.length && !req.user.addresses.some((a) => a.isDefault)) {
    req.user.addresses[0].isDefault = true;
  }

  if (storeMode() === 'mongo') {
    await getCollection('users').updateOne(
      { id: req.user.id },
      { $set: { addresses: req.user.addresses } }
    );
  } else {
    await save();
  }

  res.json(publicUser(req.user));
}));

/* -------------------------------- pricing -------------------------------- */
async function priceCart(items, couponCode, user) {
  if (!Array.isArray(items) || !items.length) {
    const e = new Error('Your cart is empty.'); e.status = 400; throw e;
  }
  const lines = [];
  for (const it of items) {
    const p = await getProduct(it.productId);
    if (!p || p.status !== 'active') { const e = new Error('A product in your cart is no longer available.'); e.status = 400; throw e; }
    if (p.stock < 1) { const e = new Error(`${p.name} is out of stock.`); e.status = 400; throw e; }
    const qty = Math.max(1, Math.min(10, Math.min(p.stock, parseInt(it.qty, 10) || 1)));
    const color = (p.colors.find((c) => c.name === it.color) || p.colors[0]).name;
    lines.push({ productId: p.id, name: p.name, brand: p.brand, model: p.model, image: p.images?.[0]?.thumb || p.images?.[0]?.url || null, sellerId: p.sellerId, price: p.price, mrp: p.mrp, qty, color });
  }
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const mrpTotal = lines.reduce((s, l) => s + l.mrp * l.qty, 0);
  let discount = 0, coupon = null, couponError = null;
  if (couponCode) {
    const c = COUPONS.find((x) => x.code === String(couponCode).toUpperCase().trim());
    if (!c) couponError = 'That coupon code is not valid.';
    else if (subtotal < c.minSubtotal) couponError = `${c.code} needs a subtotal of ₹${c.minSubtotal.toLocaleString('en-IN')}.`;
    else {
      discount = c.type === 'percent'
        ? Math.min(Math.round((subtotal * c.value) / 100), c.maxDiscount || Infinity)
        : c.value;
      coupon = { code: c.code, label: c.label, amount: discount };
    }
  }
  const shipping = subtotal - discount >= 499 ? 0 : 49;
  const total = Math.max(1, subtotal - discount + shipping);
  return { lines, subtotal, mrpTotal, savings: mrpTotal - subtotal, discount, coupon, couponError, shipping, total };
}

app.post('/api/cart/quote', auth(false), wrap(async (req, res) => {
  res.json(await priceCart(req.body.items, req.body.coupon, req.user));
}));

app.get('/api/coupons', (req, res) => res.json(COUPONS));

/* -------------------------------- payments ------------------------------- */
db.pending = db.pending || [];

app.post('/api/payments/create', auth(), wrap(async (req, res) => {
  const user = req.user;
  if (!user.emailVerified) return res.status(403).json({ error: 'Verify your email before checking out.' });
  if (!user.phoneVerified) return res.status(403).json({ error: 'Verify your mobile number before checking out.', needsPhone: true });
  const address = (user.addresses || []).find((a) => a.id === req.body.addressId);
  if (!address) return res.status(400).json({ error: 'Choose a delivery address.' });

  const quote = await priceCart(req.body.items, req.body.coupon, user);
  const internalId = uid('pay');
  let rzpOrder;
  if (RZP_ON) {
    rzpOrder = await rzp.orders.create({
      amount: quote.total * 100,
      currency: 'INR',
      receipt: internalId,
      notes: { userId: user.id, email: user.email }
    });
  } else {
    rzpOrder = { id: `order_${crypto.randomBytes(7).toString('hex')}`, amount: quote.total * 100, currency: 'INR' };
  }
  const payOtp = String(crypto.randomInt(100000, 1000000));
  const pending = {
    id: internalId, userId: user.id, rzpOrderId: rzpOrder.id,
    quote, address, demo: !RZP_ON, payOtp,
    paid: false, createdAt: Date.now(), expiresAt: Date.now() + 30 * 60 * 1000
  };
  db.pending = db.pending.filter((p) => p.expiresAt > Date.now());
  db.pending.push(pending);
  await save();

  res.json({
    internalId,
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: 'INR',
    keyId: RZP_ON ? process.env.RAZORPAY_KEY_ID : null,
    demo: !RZP_ON,
    devPayOtp: !RZP_ON ? payOtp : undefined,
    quote,
    prefill: { name: user.name, email: user.email, contact: user.phone }
  });
}));

// Demo-only: mimics the Razorpay sheet's card/UPI + bank OTP step.
app.post('/api/payments/demo-authorize', auth(), wrap(async (req, res) => {
  const p = db.pending.find((x) => x.id === req.body.internalId && x.userId === req.user.id);
  if (!p) return res.status(404).json({ error: 'Payment session not found. Please retry checkout.' });
  if (!p.demo) return res.status(400).json({ error: 'This endpoint is only available in demo mode.' });
  if (Date.now() > p.expiresAt) return res.status(410).json({ error: 'Payment session expired. Please retry.' });
  if (String(req.body.otp || '').trim() !== p.payOtp) return res.status(400).json({ error: 'Incorrect bank OTP. Check the hint and try again.' });
  const method = ['card', 'upi', 'netbanking', 'cod'].includes(req.body.method) ? req.body.method : 'card';
  if (method === 'cod') return res.status(400).json({ error: 'Cash on delivery is not enabled for this store.' });
  const paymentId = `pay_${crypto.randomBytes(7).toString('hex')}`;
  const signature = crypto.createHmac('sha256', DEMO_SECRET).update(`${p.rzpOrderId}|${paymentId}`).digest('hex');
  p.paid = true;
  p.method = method;
  await save();
  res.json({ razorpay_order_id: p.rzpOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature, method });
}));

app.post('/api/payments/verify', auth(), wrap(async (req, res) => {
  const { internalId, razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body;
  const p = db.pending.find((x) => x.id === internalId && x.userId === req.user.id);
  if (!p) return res.status(404).json({ error: 'Payment session not found.' });
  if (p.rzpOrderId !== razorpay_order_id) return res.status(400).json({ error: 'Order mismatch.' });

  const secret = p.demo ? DEMO_SECRET : process.env.RAZORPAY_KEY_SECRET;
  const expected = crypto.createHmac('sha256', secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(razorpay_signature || ''), 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(400).json({ error: 'Payment signature verification failed. You have not been charged.' });
  }
  if (RZP_ON && !p.demo) {
    const payment = await rzp.payments.fetch(razorpay_payment_id);
    if (!['captured', 'authorized'].includes(payment.status)) {
      return res.status(400).json({ error: `Payment status is ${payment.status}. Please retry.` });
    }
  }
  const existing = db.orders.find((o) => o.payment.paymentId === razorpay_payment_id);
  if (existing) return res.json({ ok: true, order: existing });

  const order = {
    id: `ST${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    userId: req.user.id,
    items: p.quote.lines,
    address: p.address,
    totals: {
      subtotal: p.quote.subtotal, discount: p.quote.discount,
      shipping: p.quote.shipping, total: p.quote.total, coupon: p.quote.coupon
    },
    total: p.quote.total,
    status: 'confirmed',
    payment: {
      gateway: 'razorpay',
      paymentId: razorpay_payment_id, orderId: razorpay_order_id,
      method: method || p.method || 'card', mode: p.demo ? 'test' : 'live', capturedAt: Date.now()
    },
    deliveryOtp: String(crypto.randomInt(1000, 10000)),
    timeline: [{ status: 'confirmed', at: Date.now(), note: 'Payment verified and order placed' }],
    eta: Date.now() + 3 * 86400000,
    createdAt: Date.now()
  };
  for (const line of order.items) {
    const prod = getProduct(line.productId);
    if (prod) prod.stock = Math.max(0, prod.stock - line.qty);
  }
  db.orders.unshift(order);
  db.pending = db.pending.filter((x) => x.id !== p.id);
  await save();
  await sendMail({ to: req.user.email, kind: 'order', ...templates.order(order, req.user) });
  res.json({ ok: true, order });
}));

/* --------------------------------- orders -------------------------------- */
app.get('/api/orders', auth(), (req, res) => {
  res.json(db.orders.filter((o) => o.userId === req.user.id));
});

app.get('/api/orders/:id', auth(), (req, res) => {
  const o = db.orders.find((x) => x.id === req.params.id && (x.userId === req.user.id || req.user.isAdmin));
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  res.json(o);
});

app.post('/api/orders/:id/cancel', auth(), wrap(async (req, res) => {
  const o = db.orders.find((x) => x.id === req.params.id && x.userId === req.user.id);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  if (['shipped', 'delivered', 'cancelled'].includes(o.status)) {
    return res.status(400).json({ error: `An order that is already ${o.status} cannot be cancelled.` });
  }
  o.status = 'cancelled';
  o.timeline.push({ status: 'cancelled', at: Date.now(), note: 'Cancelled by customer · refund in 3–5 business days' });
  await save();
  res.json(o);
}));

const FLOW = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

app.post('/api/orders/:id/advance', auth(), wrap(async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required.' });
  const o = db.orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  const i = FLOW.indexOf(o.status);
  if (i < 0 || i === FLOW.length - 1) return res.status(400).json({ error: 'Order cannot advance further.' });
  const next = FLOW[i + 1];
  if (next === 'delivered' && String(req.body.deliveryOtp || '') !== o.deliveryOtp) {
    return res.status(400).json({ error: 'Delivery OTP does not match. Ask the customer for their 4-digit code.' });
  }
  o.status = next;
  o.timeline.push({ status: next, at: Date.now(), note: STATUS_NOTE[next] });
  await save();
  res.json(o);
}));

const STATUS_NOTE = {
  packed: 'Packed at the Stashify fulfilment centre',
  shipped: 'Handed to delivery partner',
  out_for_delivery: 'Out for delivery — share your OTP with the agent',
  delivered: 'Delivered · OTP verified'
};

app.get('/api/admin/orders', auth(), (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required.' });
  res.json(db.orders.map((o) => ({ ...o, customer: publicUser(db.users.find((u) => u.id === o.userId)) })));
});

/* ------------------------------ demo inbox ------------------------------- */
/* Project mode: customers only see mail addressed to their own email/phone.
   Admins can see all mail. Payment-success emails are sent to the customer only. */
const inboxTargets = (user) => [
  user.email,
  user.phone,
  user.phone ? `+91${user.phone}` : null
].filter(Boolean).map((x) => String(x).toLowerCase());

app.get('/api/dev/inbox', auth(false), (req, res) => {
  if (mailMode() !== 'demo') return res.status(403).json({ error: 'Demo Inbox is disabled when live SMTP is configured.' });
  let list = db.inbox;
  if (!req.user) list = [];
  else if (!req.user.isAdmin) {
    const targets = inboxTargets(req.user);
    list = list.filter((m) => targets.includes(String(m.to).toLowerCase()));
  }
  const { to } = req.query;
  if (to && req.user?.isAdmin) list = list.filter((m) => m.to === String(to).toLowerCase() || m.to === String(to));
  res.json(list.slice(0, 40));
});

app.delete('/api/dev/inbox', auth(), wrap(async (req, res) => {
  if (mailMode() !== 'demo') return res.status(403).json({ error: 'Disabled in live mode.' });
  if (req.user.isAdmin) db.inbox = [];
  else {
    const targets = inboxTargets(req.user);
    db.inbox = db.inbox.filter((m) => !targets.includes(String(m.to).toLowerCase()));
  }
  await save();
  res.json({ ok: true });
}));

/* --------------------------- seller dashboard ---------------------------- */
registerSellerRoutes(app, {
  auth, wrap, load, save, publicUser, getCollection, storeMode,
  allProducts, getProduct, productsBySeller, normaliseProduct,
  createProduct, updateProduct, removeProduct, sellerStats,
  deleteImage: deleteCloudinaryImage,
  createImageUploadSignature,
  verifyUploadedImage
});


/* ------------------------------ static + SPA ----------------------------- */
// Serve legacy product images locally (Vercel uses Cloudinary).
if (!process.env.VERCEL) {
  app.use('/uploads', express.static(path.join(ROOT, 'uploads'), { maxAge: '1h' }));
}
const DIST = path.join(ROOT, 'public');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1h', index: false }));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(DIST, 'index.html')));
} else {
  app.get('/', (req, res) => res.status(503).send('Client not built yet. Run: npm run build'));
}

app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API endpoint' }));
app.use((err, req, res, next) => {
  console.error('[api]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});


const PORT = Number(process.env.PORT || 4000);

// Vercel imports the Express app as a serverless function.
// Local development continues to use the normal HTTP server.
if (!process.env.VERCEL) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Stashify API + storefront → http://0.0.0.0:${PORT}`);
    console.log(`  Auth:     ${CLERK_ON ? 'Clerk (real accounts)' : 'DEMO login'}`);
    console.log(`  Database: ${storeMode() === 'mongo' ? 'MongoDB Atlas' : 'local JSON file (demo)'}`);
    console.log(`  Payments: ${RZP_ON ? 'LIVE Razorpay' : 'DEMO (Razorpay-compatible flow)'}`);
    console.log(`  Email:    ${mailMode() === 'live' ? 'LIVE SMTP' : 'DEMO Inbox'}\n`);
  });

  async function shutdown() {
    server.close();
    await closeStore().catch(() => {});
    process.exit(0);
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
