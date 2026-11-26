
import crypto from 'crypto';
import { load, save, uid, getCollection, storeMode } from './store.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;

const hash = (code, salt) =>
  crypto.createHash('sha256').update(`${code}:${salt}`).digest('hex');

const makeError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

export async function createOtp({ target, channel, purpose }) {
  const mongoMode = storeMode() === 'mongo';
  const db = mongoMode ? null : load();
  const collection = mongoMode ? getCollection('otps') : null;

  const key = `${channel}:${target}:${purpose}`;
  const now = Date.now();

  const existing = mongoMode
    ? await collection.findOne({ key, consumed: false })
    : db.otps.find((o) => o.key === key && !o.consumed);

  if (existing && now - existing.createdAt < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_MS - (now - existing.createdAt)) / 1000
    );
    throw makeError(`Please wait ${wait}s before requesting another code.`, 429);
  }

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
    createdAt: now,
    expiresAt: now + OTP_TTL_MS
  };

  if (mongoMode) {
    try {
      await collection.updateOne(
        { key },
        { $set: record },
        { upsert: true }
      );
    } catch (error) {
      if (error?.code === 11000) {
        throw makeError('Please wait before requesting another code.', 429);
      }
      throw error;
    }
  } else {
    db.otps = db.otps.filter((o) => o.key !== key);
    db.otps.push(record);
    if (db.otps.length > 400) db.otps = db.otps.slice(-400);
    await save();
  }

  return { code, record };
}

export async function verifyOtp({ target, channel, purpose, code }) {
  const mongoMode = storeMode() === 'mongo';
  const db = mongoMode ? null : load();
  const collection = mongoMode ? getCollection('otps') : null;

  const key = `${channel}:${target}:${purpose}`;
  const now = Date.now();

  if (mongoMode) {
    const rec = await collection.findOne({ key, consumed: false });

    if (!rec) {
      return { ok: false, message: 'No active code. Please request a new one.' };
    }

    if (now > rec.expiresAt) {
      return { ok: false, message: 'That code has expired. Request a new one.' };
    }

    if (rec.attempts >= MAX_ATTEMPTS) {
      return { ok: false, message: 'Too many incorrect attempts. Request a new code.' };
    }

    const given = hash(String(code || '').trim(), rec.salt);
    const a = Buffer.from(given, 'hex');
    const b = Buffer.from(rec.codeHash, 'hex');
    const matches = a.length === b.length && crypto.timingSafeEqual(a, b);

    const filter = {
      _id: rec._id,
      consumed: false,
      attempts: { $lt: MAX_ATTEMPTS },
      expiresAt: { $gte: now }
    };

    const update = matches
      ? {
          $inc: { attempts: 1 },
          $set: { consumed: true, consumedAt: now }
        }
      : { $inc: { attempts: 1 } };

    const result = await collection.updateOne(filter, update);

    if (result.modifiedCount !== 1) {
      return {
        ok: false,
        message: 'This code was already used or has expired. Request a new one.'
      };
    }

    if (matches) return { ok: true };

    const updated = await collection.findOne({ _id: rec._id });
    const left = Math.max(0, MAX_ATTEMPTS - (updated?.attempts || MAX_ATTEMPTS));

    return {
      ok: false,
      message: `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
    };
  }

  const rec = db.otps.find((o) => o.key === key && !o.consumed);

  if (!rec) return { ok: false, message: 'No active code. Please request a new one.' };
  if (now > rec.expiresAt) return { ok: false, message: 'That code has expired. Request a new one.' };
  if (rec.attempts >= MAX_ATTEMPTS) {
    return { ok: false, message: 'Too many incorrect attempts. Request a new code.' };
  }

  rec.attempts += 1;

  const given = hash(String(code || '').trim(), rec.salt);
  const a = Buffer.from(given, 'hex');
  const b = Buffer.from(rec.codeHash, 'hex');

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    await save();
    const left = MAX_ATTEMPTS - rec.attempts;
    return {
      ok: false,
      message: `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
    };
  }

  rec.consumed = true;
  rec.consumedAt = now;
  await save();

  return { ok: true };
}

export async function otpMeta(target, channel, purpose) {
  const key = `${channel}:${target}:${purpose}`;
  const mongoMode = storeMode() === 'mongo';

  const rec = mongoMode
    ? await getCollection('otps').findOne({ key, consumed: false })
    : load().otps.find((o) => o.key === key && !o.consumed);

  if (!rec) return null;

  return {
    expiresAt: rec.expiresAt,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - rec.attempts)
  };
}