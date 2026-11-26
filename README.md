# Stashify — a modern marketplace

An original, fully-functional e-commerce storefront built around **real product photography**
— no 3D renders — plus a complete **seller dashboard** with drag-and-drop photo uploads.
Built with React, Express, sharp and a Razorpay-compatible payment layer.

> Original brand and content. Not affiliated with, and containing no assets from, any real retailer.

---

## Palette — the 60 / 30 / 10 rule

| Role | Colour | Hex | Share |
|---|---|---|---|
| Main | Navy | `#14213D` | **60%** — page background, nav, footer, type on cream |
| Second | Cream | `#F4EDE0` | **30%** — product cards, panels, body copy on navy |
| Accent | Coral | `#FF6B5B` | **10%** — CTAs, prices, active states, badges only |

Coral is deliberately rationed: it marks *actions and money*, never large surfaces.

---

## Quick start

```bash
npm install
npm run build
npm start          # → http://localhost:4000
```

One Express process serves both the API and the built SPA. No database server required —
state persists to `server/data/db.json`.

### Demo account (seeded on first boot)

```
email     demo@stashify.shop
password  Demo@1234
```

Verified email + mobile, administrator, and one past delivered order so tracking and the
fulfilment console are populated. The **Use the demo account** button on the sign-in page
fills it for you.

---

## What works

**Storefront**
- Text-led hero with a kinetic masked-word headline, cursor-responsive lighting and magnetic CTAs — no hero imagery
- Dark / bright theme toggle in the header — persisted per browser, applied before first paint (no flash)
- Optional real accounts with Clerk + persistent MongoDB Atlas data; see `SETUP-REAL.md` (demo mode remains the default)
- Sitewide motion: scroll-progress rail, route transitions, scroll reveals, button ripples and image light-sweeps
- Pinned tagline reveal — words light up one by one as you scroll (static under reduced motion)
- "The Stashify standard" — live demo cards: real photos flipping angles, a self-typing OTP, and a signature-checked payment handoff
- Mobile menu overlays with staggered link entrances and a morphing burger icon
- 24 products across 8 categories with **real product photography** (free-licence Pexels/Unsplash)
- Live search with thumbnail suggestions, category/price/rating/brand filters, 6 sort modes
- Product page: **photo gallery** (thumbnails, prev/next, expand) with selectable colour options
- Highlights, spec tables, reviews with star picker and verified-purchase badges
- Cart with quantity limits, save-for-later, wishlist, recently viewed
- Coupons: `FIRST15` (15% up to ₹3,000), `STASH10` (10% up to ₹1,500), `CORAL500` (₹500 off ₹3,999+)
- Free delivery over ₹499, otherwise ₹49 — all totals computed **server-side**

**Accounts & verification**
- Signup → **email OTP** → verified session (JWT, 30 days)
- **Mobile OTP** required before checkout
- Password reset by email OTP, resend cooldown, password strength meter
- Address book, profile editing, session/security overview

**Checkout & payments**
- 3-step flow: address → mobile verification → review & pay
- Razorpay order created server-side; **HMAC-SHA256 signature verified** before an order exists
- Card / UPI / Netbanking, then a bank OTP authorisation step
- Order confirmation with a confetti celebration, **4-digit delivery OTP**
- Order history, tracking timeline, cancel-with-refund note, buy-again, printable invoice

**Fulfilment console** (`/admin`, administrators only)
- Revenue and pipeline stats, all orders
- Advance confirmed → packed → shipped → out for delivery → delivered
- Marking delivered **requires the customer's delivery OTP**

**Seller dashboard** (`/seller`, any verified account)
- One-click onboarding: store name, optional GSTIN (validated), description
- Overview: revenue, units, orders, product/photo counts, low-stock & missing-photo alerts, top products, recent orders
- Product CRUD: create draft → upload photos → publish; edit, unpublish, archive/delete (products with past orders are archived, never hard-deleted)
- **Photo uploads**: multi-file drag-and-drop, progress bar, auto-resize + EXIF strip (sharp), cover/reorder/delete, max 10 per product
- Publishing is gated on having ≥1 photo; a published product can't drop its last photo
- Orders view scoped to the seller's own line items; store-profile settings
- **Ownership enforced server-side** — a seller can only touch their own products (admins can manage all)

---

## Demo mode vs going live

Everything runs end-to-end with **zero credentials**. Add keys to `.env` and the same code
paths switch to real services — no code changes.

| Capability | Demo mode (default) | Live mode |
|---|---|---|
| Email | Built-in **Demo Inbox** (bottom-right button) | Real SMTP via Nodemailer |
| SMS | Demo Inbox, code shown on screen | Same hook — wire your SMS provider |
| Payment | Razorpay-style sheet, test card, simulated bank OTP | Real **Razorpay Checkout** |
| Signature | HMAC with `DEMO_PAY_SECRET` | HMAC with `RAZORPAY_KEY_SECRET` + payment status fetch |

### Going live

```ini
# .env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx

SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=xxxxxxxx
SMTP_FROM="Stashify <no-reply@yourdomain.com>"

JWT_SECRET=a-long-random-string
ADMIN_EMAIL=you@yourdomain.com
```

Restart. The UI automatically drops the demo badges, hides the Demo Inbox, and opens real
Razorpay Checkout. Use Razorpay's test card `4111 1111 1111 1111` with any future expiry/CVV.

**Real SMS:** demo mode stores the code in the Demo Inbox. To send real texts, replace the
`sendMail({ channel: 'sms' })` call inside `POST /api/phone/send` (`server/index.js`) with
your Twilio/MSG91 SDK call. OTP generation, hashing, expiry and attempt limits stay as-is.

---

## Security notes

- Passwords hashed with **bcrypt** (10 rounds)
- OTPs stored only as **salted SHA-256 hashes**; 6 digits, 10-minute expiry, 5-attempt lockout, 30s resend cooldown, constant-time comparison
- Payment amounts **never trusted from the client** — recomputed from the catalog on quote, create and verify
- Razorpay signature verified with `crypto.timingSafeEqual`; live payments additionally fetched to confirm `captured`/`authorized`
- Idempotent verification: replaying a payment ID returns the existing order instead of creating a duplicate
- Forgot-password never reveals whether an account exists
- Demo Inbox endpoint hard-disabled the moment SMTP is configured

This is a demo build. Before production: move to Postgres, add rate limiting and HTTPS,
set a real `JWT_SECRET`, and register a Razorpay webhook for asynchronous capture confirmation.

---

## Performance & accessibility

- **No WebGL / no Three.js** — the whole UI is photography + CSS/Framer Motion, so the JS bundle is ~108 kB gzipped
- Product images are pre-resized JPEGs with separate 480² thumbnails, lazy-loaded and faded in
- Animations respect `prefers-reduced-motion`
- Full keyboard OTP entry (paste, arrow keys, backspace), ARIA labels, focus rings, print stylesheet

---

## Project layout

```
stashify/
├── server/
│   ├── index.js        Express API + SPA host, all routes
│   ├── catalog.js      24 seed products, categories, coupons
│   ├── inventory.js    DB-backed products, seed migration, CRUD, seller stats
│   ├── seller-routes.js seller onboarding + product/image/order API
│   ├── media.js        multer upload + sharp resize/thumbnail pipeline
│   ├── photo-credits.json  per-photo source URL + licence (Pexels/Unsplash)
│   ├── store.js        JSON persistence helpers
│   ├── otp.js          hashed OTP issue/verify, cooldowns
│   ├── mail.js         Nodemailer + Demo Inbox, branded templates
│   ├── seed.js         demo admin (house seller) + sample order
│   └── data/db.json    generated at runtime
├── uploads/products/   real product photos + thumbnails (served at /uploads)
├── scripts/fetch-photos.mjs  re-download + normalise the seed photography
├── client/src/
│   ├── components/     navbar, cards, ProductImage, cart drawer, payment sheet, demo inbox, UI kit, SVG icons, motion effects
│   ├── pages/          home, shop, product, cart, checkout, orders, account, auth, admin
│   │   └── seller/     layout + onboarding, dashboard, products, editor (uploads), orders, settings
│   ├── lib/            api client (+ multipart upload), global store
│   └── styles.css      the 60/30/10 design system
└── tests/
    ├── api-flow.mjs       backend end-to-end incl. tamper rejection
    ├── purchase-flow.mjs  full browser purchase, signup → delivery
    ├── seller-flow.mjs    seller API: CRUD, uploads, validation, ownership isolation
    ├── seller-ui.mjs      browser seller dashboard + photo gallery (asserts no 3D)
    └── screenshots.mjs    page + mobile captures
```

## Tests

```bash
npm start                # in one terminal
npm run test:api         # backend flow, OTP + signature tampering
npm run test:ui          # real browser purchase (needs: npx playwright install chromium)
npm run test:shots       # screenshots into /home/user/shots
npm run test:seller      # seller API: CRUD, uploads, fake-image rejection, cross-seller isolation
npm run test:seller-ui   # browser seller dashboard, photo upload/reorder/delete, PDP gallery
npm run seed:reset       # wipe DB; restart to reseed
```

All suites pass with **zero console errors**. The API suite asserts that a forged payment
signature is rejected and that delivery cannot complete without the right OTP. The seller
suite asserts that a non-image file is rejected, an undersized image is rejected, and one
seller cannot read or edit another seller's products.

---

## Adding a product

**The normal way — through the seller dashboard:**
1. Sign in (any verified account) → **Sell on Stashify** → open your store.
2. **Add product** → fill details → **Create** → drag in photos → set status to **Active**.
3. It appears on the storefront instantly with real photos.

Uploads accept JPEG/PNG/WebP/AVIF up to 8 MB each (≤8 per request, ≤10 per product).
`sharp` re-encodes to ≤1600px (q86) + a 480² cover thumbnail and strips EXIF/GPS metadata.

**Seeding the catalog:** the 24 launch products live in `server/catalog.js` and are migrated
into the database on first boot (`initInventory`), attached to the house seller with the
photography in `uploads/products/`. Photo sources/licences are recorded in
`server/photo-credits.json`; re-run `node scripts/fetch-photos.mjs` to refresh them.

> **Photography licence:** every seed image is from Pexels or Unsplash (free for commercial
> use). Attribution/source URLs are kept in `server/photo-credits.json`. Replace them with
> your own product photos via the dashboard for a real store.
