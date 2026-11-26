# Stashify — start here

A demo marketplace: browse → cart → checkout → **simulated Razorpay Test Mode payment** (no real money) → "Payment successful!" → order with Razorpay-shaped IDs → payment-success email to the customer.

## Run it (VS Code)

1. Unzip this archive.
2. Open the `stashify/` folder in VS Code.
3. In the VS Code terminal:

   ```bash
   npm install
   npm start
   ```

4. Open **http://localhost:4000**

That's it. The `.env` file is already filled in — real Clerk accounts and MongoDB Atlas are wired up, and the client is pre-built (`dist/`), so no build step is needed.

> Requires **Node.js 20+**.

## Recent fix (sign-in 404)

Signing in from a new account/device used to land on a 404 page. Clerk's sign-in flow moves through
sub-paths (`/login/client-trust`, `/login/sso-callback`, `/signup/verify-email-code`, …). The router now
uses catch-all routes so those render correctly. The change is in **`client/src/App.jsx`**:

```jsx
<Route path="/login/*"  element={<Login />} />
<Route path="/signup/*" element={<Signup />} />
```

(Previously `/login` and `/signup` without the `/*`.) If you ever edit `client/`, run `npm run build`
and restart `npm start`.

## What's inside

- **Storefront** — home, shop, product pages, cart, wishlist, checkout, orders, account.
- **Seller dashboard** — apply at `/seller`, list products with photos, manage orders.
- **Admin** — sign in with `hammadkazi77@gmail.com` to reach `/admin`.
- **Payments** — Razorpay Checkout shown in **Test Mode (simulated)**. The flow, IDs (`order_…` / `pay_…`), signature check and success email all mirror a real Razorpay integration, but no real money moves.
- **Email** — with no SMTP keys set, messages land in the in-app **Demo Inbox** (envelope icon, bottom-right). Add SMTP keys to `.env` to send real email.
- **Logo** — the Stashify wordmark (option 8) lives in `client/public/brand/`.

## Notes

- **MongoDB Atlas:** if the app can't reach the database from your network, add your IP in Atlas → Network Access (or temporarily allow `0.0.0.0/0` for a class demo).
- **Coupons:** `FIRST15` (15% off, min ₹1,999, max ₹3,000 off), `STASH10`, `CORAL500`. Shipping ₹49 under ₹499.
- This is an original demo storefront, not affiliated with any real retailer. Made by Hammad Kazi.
