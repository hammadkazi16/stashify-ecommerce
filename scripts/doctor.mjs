import 'dotenv/config';
import { MongoClient } from 'mongodb';

const live = process.argv.includes('--live');
const pub = String(process.env.CLERK_PUBLISHABLE_KEY || '').trim();
const secret = String(process.env.CLERK_SECRET_KEY || '').trim();
const uri = String(process.env.MONGODB_URI || '').trim();
const db = String(process.env.MONGODB_DB || 'stashify').trim();
const admins = String(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').trim();

const rows = [];
const ok = (name, value, note = '') => rows.push({ name, status: 'ok', value, note });
const warn = (name, value, note = '') => rows.push({ name, status: 'warn', value, note });
const bad = (name, value, note = '') => rows.push({ name, status: 'bad', value, note });

if (pub && secret) {
  const pubOk = /^pk_(test|live)_/.test(pub);
  const secOk = /^sk_(test|live)_/.test(secret);
  const sameEnv = pub.startsWith('pk_test_') === secret.startsWith('sk_test_');
  if (pubOk && secOk && sameEnv) ok('Clerk keys', 'configured', sameEnv && pub.startsWith('pk_live_') ? 'production instance' : 'development instance');
  else bad('Clerk keys', 'invalid', 'Check CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY and use the same environment.');
} else if (pub || secret) {
  bad('Clerk keys', 'partial', 'Set both keys or leave both blank for demo mode.');
} else {
  warn('Clerk keys', 'blank', 'Demo login is active.');
}

if (uri) {
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) bad('MongoDB URI', 'invalid', 'Expected mongodb:// or mongodb+srv:// connection string.');
  else ok('MongoDB URI', 'configured', `database: ${db}`);
} else {
  warn('MongoDB URI', 'blank', 'Data is stored in server/data/db.json (demo).');
}

if (pub && secret && !uri) bad('Real mode', 'blocked', 'Clerk requires MONGODB_URI so accounts have persistent data.');
else if (pub && secret && uri) ok('Real mode', 'ready', 'Clerk + MongoDB will be used.');
else ok('Demo mode', 'ready', 'The storefront works without external services.');

if (admins) ok('Admin emails', admins.split(',').length + ' configured', 'Only verified Clerk emails in this list get admin access.');
else warn('Admin emails', 'blank', 'No real-mode admin is configured. Set ADMIN_EMAILS.');

console.log('\nStashify setup doctor\n');
for (const r of rows) {
  const icon = r.status === 'ok' ? '✓' : r.status === 'warn' ? '•' : '✗';
  console.log(`${icon} ${r.name}: ${r.value}${r.note ? ` — ${r.note}` : ''}`);
}

if (live && uri) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000, appName: 'stashify-doctor' });
  try {
    await client.connect();
    await client.db(db).command({ ping: 1 });
    console.log('\n✓ MongoDB connection successful.');
  } catch (e) {
    console.log('\n✗ MongoDB connection failed: ' + e.message);
    process.exitCode = 1;
  } finally {
    await client.close().catch(() => {});
  }
} else if (live) {
  console.log('\n• Skipped MongoDB ping because MONGODB_URI is blank.');
}

if (rows.some((r) => r.status === 'bad')) process.exitCode = 1;
console.log('');
