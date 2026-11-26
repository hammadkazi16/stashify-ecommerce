import crypto from 'crypto';
import { load, save, uid } from './store.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;

const hash = (code, salt) => crypto.createHash('sha256').update(`${code}:${salt}`).digest('hex');

export async function createOtp({ target, channel, purpose }) {
  const db = load();
  const key = `${channel}:${target}:${purpose}`;
  const existing = db.otps.find((o) => o.key === key && !o.consumed);
  if (existing && Date.now() - existing.createdAt < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.createdAt)) / 1000);
    const err = new Error(`Please wait ${wait}s before requesting another code.`);
    err.status = 429;
    throw err;
  }
  db.otps = db.otps.filter((o) => o.key !== key);
  const code = String(crypto.randomInt(100000, 1000000));
  const salt = crypto.randomBytes(12).toString('hex');
  const record = {
    id: uid('otp'),
    key,
    target,
    channel,
    purpose,
    salt,
    codeHash: hash(code, salt),
    attempts: 0,
    consumed: false,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_TTL_MS
  };
  db.otps.push(record);
  if (db.otps.length > 400) db.otps = db.otps.slice(-400);
  await save();
  return { code, record };
}

export async function verifyOtp({ target, channel, purpose, code }) {
  const db = load();
  const key = `${channel}:${target}:${purpose}`;
  const rec = db.otps.find((o) => o.key === key && !o.consumed);
  if (!rec) return { ok: false, message: 'No active code. Please request a new one.' };
  if (Date.now() > rec.expiresAt) return { ok: false, message: 'That code has expired. Request a new one.' };
  if (rec.attempts >= MAX_ATTEMPTS) return { ok: false, message: 'Too many incorrect attempts. Request a new code.' };
  rec.attempts += 1;
  const given = hash(String(code || '').trim(), rec.salt);
  const a = Buffer.from(given, 'hex');
  const b = Buffer.from(rec.codeHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    await save();
    const left = MAX_ATTEMPTS - rec.attempts;
    return { ok: false, message: `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` };
  }
  rec.consumed = true;
  rec.consumedAt = Date.now();
  await save();
  return { ok: true };
}

export function otpMeta(target, channel, purpose) {
  const db = load();
  const rec = db.otps.find((o) => o.key === `${channel}:${target}:${purpose}` && !o.consumed);
  if (!rec) return null;
  return { expiresAt: rec.expiresAt, attemptsLeft: Math.max(0, MAX_ATTEMPTS - rec.attempts) };
}
