import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const COLLECTIONS = ['users', 'products', 'orders', 'pending', 'otps', 'inbox', 'reviews'];
const empty = () => ({
  users: [], products: [], orders: [], pending: [],
  otps: [], inbox: [], reviews: [], meta: {}
});

let db = null;
let mode = 'file';
let client = null;
let mongoDb = null;
let baseline = null;
let queue = Promise.resolve();
let ready = false;

const clone = (v) => JSON.parse(JSON.stringify(v));
const docId = (doc) => String(doc?.id || doc?._id || '');

function snapshot(state) {
  const out = { meta: clone(state.meta || {}) };
  for (const name of COLLECTIONS) {
    out[name] = new Map((state[name] || []).map((d) => [docId(d), JSON.stringify(d)]));
  }
  return out;
}

function normalise(state) {
  const next = { ...empty(), ...state };
  for (const name of COLLECTIONS) next[name] = Array.isArray(next[name]) ? next[name] : [];
  next.meta ||= {};
  // Legacy/demo accounts are explicitly separated from Clerk-backed accounts.
  next.users = next.users.map((u) => ({ ...u, authProvider: u.authProvider || (u.clerkId ? 'clerk' : 'demo') }));
  return next;
}

async function initFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try { return normalise(JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); }
    catch { return normalise(empty()); }
  }
  return normalise(empty());
}

async function initMongo(uri) {
  client = new MongoClient(uri, {
    appName: 'stashify',
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    retryWrites: true
  });
  await client.connect();
  mongoDb = client.db(process.env.MONGODB_DB || 'stashify');
  await mongoDb.command({ ping: 1 });

  const state = empty();
  for (const name of COLLECTIONS) {
    const rows = await mongoDb.collection(name).find({}).toArray();
    state[name] = rows.map(({ _id, ...rest }) => ({ ...rest, id: rest.id || String(_id) }));
  }
  const meta = await mongoDb.collection('meta').findOne({ _id: 'main' });
  state.meta = meta?.data || {};

  await Promise.all([
    mongoDb.collection('users').createIndex({ clerkId: 1 }, { unique: true, sparse: true }),
    mongoDb.collection('users').createIndex({ email: 1, authProvider: 1 }, { unique: true }),
    ...COLLECTIONS.filter((n) => n !== 'users').map((n) =>
      mongoDb.collection(n).createIndex({ id: 1 }, { unique: true }))
  ]);
  return normalise(state);
}

/** Connect to the configured store before any route or seed runs. */
export async function initStore() {
  if (ready) return db;
  const uri = String(process.env.MONGODB_URI || '').trim();
  if (uri) {
    mode = 'mongo';
    db = await initMongo(uri);
  } else {
    mode = 'file';
    db = await initFile();
  }
  baseline = snapshot(db);
  ready = true;
  if (!db.meta.jwtSecret) {
    db.meta.jwtSecret = crypto.randomBytes(48).toString('hex');
    await save();
  } else if (mode === 'file') {
    await save();
  }
  return db;
}

export function load() {
  if (!db) throw new Error('Store is not initialised. Await initStore() before using load().');
  return db;
}

export function storeMode() { return mode; }
export function storeReady() { return ready; }

async function persistMongo() {
  const current = snapshot(db);
  const writes = [];
  for (const name of COLLECTIONS) {
    const before = baseline[name];
    const after = current[name];
    const ops = [];
    for (const [id, json] of after) {
      if (before.get(id) !== json) {
        const doc = JSON.parse(json);
        ops.push({ replaceOne: { filter: { _id: id }, replacement: { ...doc, _id: id }, upsert: true } });
      }
    }
    const removed = [...before.keys()].filter((id) => !after.has(id));
    if (removed.length) ops.push({ deleteMany: { filter: { _id: { $in: removed } } } });
    if (ops.length) writes.push(mongoDb.collection(name).bulkWrite(ops, { ordered: true }));
  }
  if (JSON.stringify(current.meta) !== JSON.stringify(baseline.meta)) {
    writes.push(mongoDb.collection('meta').replaceOne(
      { _id: 'main' }, { _id: 'main', data: current.meta }, { upsert: true }
    ));
  }
  await Promise.all(writes);
  baseline = current;
}

/** Persist changes. Await this in request handlers so failures surface as API errors. */
export async function save() {
  if (!db) return;
  if (mode === 'file') {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    baseline = snapshot(db);
    return;
  }
  const task = () => persistMongo();
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

export const saveNow = save;

export async function closeStore() {
  if (client) await client.close();
  client = null; mongoDb = null; ready = false;
}

export const uid = (p = 'id') => `${p}_${crypto.randomBytes(8).toString('hex')}`;

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    emailVerified: !!u.emailVerified,
    phoneVerified: !!u.phoneVerified,
    addresses: u.addresses || [],
    wishlist: u.wishlist || [],
    cart: u.cart || [],
    createdAt: u.createdAt,
    isAdmin: !!u.isAdmin,
    seller: u.seller || null,
    authProvider: u.authProvider || 'demo'
  };
}
