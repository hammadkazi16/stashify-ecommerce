# Stashify deployment review — 26 November 2026

## Current status

This source snapshot is **not approved for production deployment to Vercel yet**. The review found important persistence and checkout issues. A Vercel entry point/configuration has intentionally not been added, because routing requests to the current backend would make an incomplete persistence design look deployable.

## Changes made in this review copy

1. `server/index.js`: made `priceCart` asynchronous and awaited `getProduct()` for each cart line. The cart-quote route now awaits the quote. This fixes a concrete bug introduced when product reads became asynchronous.
2. `server/index.js`: removed automatic administrator privileges for the first registered account. Admin assignment now requires the email to be explicitly listed in `ADMIN_EMAILS` (comma-separated) or `ADMIN_EMAIL`.
3. `server/seller-routes.js`: product deletion now checks MongoDB orders directly when MongoDB mode is active, instead of checking the stale in-memory order snapshot.

## Production blockers that remain

### 1. Snapshot-based persistence is unsafe across serverless instances

`server/store.js` loads all MongoDB collections into a process-local object and persists diffs from a process-local baseline. The save queue only serializes writes inside one Node process. Separate Vercel instances have separate snapshots and can overwrite or reintroduce stale records. Production data paths need direct, atomic MongoDB repository operations rather than `load()`/mutate/`save()`.

### 2. Authentication and user profile writes still use the snapshot

`server/index.js`, `server/clerk-auth.js`, `server/otp.js`, and `server/mail.js` still contain user, OTP, and inbox operations through `load()` and `save()`. These need direct database operations and concurrency-safe uniqueness/consumption logic.

### 3. Checkout and order finalisation are not safe for production

Payment creation, demo authorisation, payment verification, order history, order cancellation/advancement, and admin order views still rely on the in-memory snapshot. Product reads are asynchronous, and stock decrement/order creation need an idempotent, atomic design. Do not run a real Razorpay purchase against this code.

### 4. Vercel routing has not been configured

The ZIP has no `api/index.js` or `vercel.json`. These should be added only after the backend persistence blockers are addressed and the correct function routing is tested.

### 5. Runtime verification could not be completed in this environment

All JavaScript files under `server/`, `scripts/`, and `tests/` passed `node --check` after the changes above. `npm run build` could not run because Vite is not installed in this extracted workspace. `npm ci` did not complete within the available install window, so no application build or end-to-end tests are claimed.

## Environment variables to configure later

Keep secrets out of Git and never share `.env`. Vercel environment variables will eventually need the MongoDB connection/database settings, Clerk keys, Cloudinary credentials, Razorpay **test** credentials for testing, a stable JWT secret if legacy JWT auth remains, and any configured email/SMS provider credentials. The exact required list must be finalized after the auth and payment architecture is completed.

## Safe next engineering phase

Replace snapshot-based reads/writes with direct MongoDB operations across authentication, OTP, profile, cart, checkout, payment, orders, seller profiles, and inbox. Add indexes and idempotency keys. Then add the Vercel function entry point and routing, reinstall dependencies from the lockfile, run the production build and tests, and only then deploy with Razorpay test keys.
