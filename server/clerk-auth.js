import { clerkClient, getAuth } from '@clerk/express';
import { load, save, uid, getCollection, storeMode } from './store.js';

const PROFILE_TTL_MS = 60_000;
const profileCache = new Map();   // clerkId -> { at }
const inflight = new Map();       // clerkId -> Promise<localUser>

export function clerkEnabled() {
  return Boolean(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

/** Fail fast on half-configured Clerk instead of silently falling back to demo login. */
export function assertAuthEnv() {
  const pub = Boolean(process.env.CLERK_PUBLISHABLE_KEY);
  const secret = Boolean(process.env.CLERK_SECRET_KEY);
  if (pub !== secret) {
    throw new Error('Set both CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY, or leave both blank for demo mode.');
  }
  if (pub && !process.env.MONGODB_URI) {
    throw new Error('Clerk sign-in requires MONGODB_URI so real accounts have a persistent database.');
  }
}

export function adminEmailSet() {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
  return new Set(raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
}

function primaryEmail(clerkUser) {
  const email = clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)
    || clerkUser.emailAddresses?.[0];
  if (!email?.emailAddress) {
    const err = new Error('Your Clerk account needs a primary email address.');
    err.status = 400;
    throw err;
  }
  return {
    email: email.emailAddress.toLowerCase(),
    emailVerified: email.verification?.status === 'verified'
  };
}

function displayName(clerkUser, email) {
  const full = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim();
  return full || clerkUser.username || email.split('@')[0];
}

async function upsertProfile(clerkId, { refresh }) {
  const mongoMode = storeMode() === 'mongo';
  const db = mongoMode ? null : load();
  const users = mongoMode ? getCollection('users') : null;

  let local = mongoMode
    ? await users.findOne({ clerkId })
    : db.users.find((u) => u.clerkId === clerkId);

  const cached = profileCache.get(clerkId);
  const fresh = cached && Date.now() - cached.at < PROFILE_TTL_MS;

  if (local && !refresh && fresh) return local;

  let clerkUser;

  try {
    clerkUser = await clerkClient.users.getUser(clerkId);
  } catch (e) {
    const err = new Error(e?.status === 404
      ? 'Your account no longer exists. Please sign in again.'
      : 'Could not verify your account with Clerk. Please retry.');
    err.status = e?.status === 404 ? 401 : 503;
    throw err;
  }

  const { email, emailVerified } = primaryEmail(clerkUser);
  const name = displayName(clerkUser, email);
  const isAdmin = emailVerified && adminEmailSet().has(email);

  if (mongoMode) {
    try {
      await users.updateOne(
        { clerkId },
        {
          $set: {
            name,
            email,
            emailVerified,
            isAdmin,
            authProvider: 'clerk'
          },
          $setOnInsert: {
            id: uid('usr'),
            clerkId,
            phone: '',
            phoneVerified: false,
            addresses: [],
            wishlist: [],
            cart: [],
            createdAt: Date.now()
          }
        },
        { upsert: true }
      );

      local = await users.findOne({ clerkId });

      if (!local) {
        throw new Error('Could not retrieve the saved Clerk profile.');
      }
    } catch (e) {
      if (e?.code === 11000) {
        const existing = await users.findOne({ clerkId });

        if (existing) {
          local = existing;
        } else {
          const err = new Error(
            'This email is already linked to another Clerk account. Please contact support to restore your account.'
          );
          err.status = 409;
          throw err;
        }
      } else {
        throw e;
      }
    }
  } else {
    const emailOwner = db.users.find((u) =>
      u.id !== local?.id &&
      u.email === email &&
      u.authProvider === 'clerk'
    );

    if (emailOwner) {
      const err = new Error(
        'This email is already linked to another Clerk account. Please contact support to restore your account.'
      );
      err.status = 409;
      throw err;
    }

    if (!local) {
      local = {
        id: uid('usr'),
        clerkId,
        authProvider: 'clerk',
        name,
        email,
        phone: '',
        emailVerified,
        phoneVerified: false,
        addresses: [],
        wishlist: [],
        cart: [],
        isAdmin,
        createdAt: Date.now()
      };

      db.users.push(local);
    } else {
      local.name = name;
      local.email = email;
      local.emailVerified = emailVerified;
      local.isAdmin = isAdmin;
      local.authProvider = 'clerk';
    }

    await save();
  }

  profileCache.set(clerkId, { at: Date.now() });
  return local;
}

export async function ensureClerkUser(clerkId, opts = {}) {
  if (inflight.has(clerkId)) return inflight.get(clerkId);
  const run = upsertProfile(clerkId, { refresh: !!opts.refresh }).finally(() => inflight.delete(clerkId));
  inflight.set(clerkId, run);
  return run;
}

function needsFreshProfile(req) {
  const p = req.path || '';
  return (req.method === 'GET' && p === '/api/me')
    || (req.method === 'POST' && p === '/api/payments/create')
    || (req.method === 'POST' && p === '/api/seller/apply');
}

/** Express middleware factory for Clerk-protected API routes. */
export function clerkAuth(required = true) {
  return async (req, res, next) => {
    try {
      const { isAuthenticated, userId } = getAuth(req);
      if (!isAuthenticated || !userId) {
        if (required) return res.status(401).json({ error: 'Please sign in to continue.' });
        req.user = null;
        return next();
      }
      req.user = await ensureClerkUser(userId, { refresh: needsFreshProfile(req) });
      next();
    } catch (e) {
      if (e?.status) return res.status(e.status).json({ error: e.message });
      next(e);
    }
  };
}
