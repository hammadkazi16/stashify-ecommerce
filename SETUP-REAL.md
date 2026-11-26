# Make Stashify real: Clerk + MongoDB Atlas

This build now supports two modes:

| Mode | Login | Data | When |
|---|---|---|---|
| **Demo** | Built-in demo accounts + OTP | `server/data/db.json` | Clerk/Mongo env vars are blank |
| **Real** | Clerk | MongoDB Atlas | Both Clerk keys and `MONGODB_URI` are set |

The preview keeps working in demo mode until you add your own credentials. Do **not** paste secret keys into chat; put them in a local `.env` file.

---

## 1. Create a Clerk application

1. Go to <https://dashboard.clerk.com> and create an application.
2. Choose sign-in options:
   - **Email** (recommended)
   - **Google** (optional, very fast for users)
3. In Clerk, require email verification for email/password accounts.
4. Open **API keys** and copy:
   - **Publishable key** → `CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`

Use the **Development** keys while testing. Use **Production** keys only when you deploy to your real domain.

---

## 2. Create a MongoDB Atlas database

1. Go to <https://cloud.mongodb.com> and create a free **M0** cluster.
2. Create a **database user** with a strong password. This is not your Atlas account login.
3. In **Network Access**, allow the IP address of the machine running Stashify.
   - For local testing, add your current IP.
   - For a hosted server, add that server's IP. Avoid `0.0.0.0/0` unless you understand the risk.
4. Click **Connect → Drivers → Node.js** and copy the connection string.
5. Replace `<password>` with the database user's password.

Example shape:

```env
MONGODB_URI=mongodb+srv://stashify-app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=stashify
```

---

## 3. Configure Stashify locally

From the project root:

```bash
cp .env.example .env
```

Edit `.env`:

```env
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
MONGODB_URI=mongodb+srv://...
MONGODB_DB=stashify

# Only these verified Clerk emails become admins:
ADMIN_EMAILS=you@example.com
```

Then check the setup:

```bash
npm install
npm run doctor
npm run doctor:live   # also pings MongoDB
```

`doctor` should say **Real mode: ready**.

---

## 4. Run it

```bash
npm run build
npm start
```

Open the app and check:

```bash
curl http://localhost:4000/api/health
```

Expected:

```json
{ "ok": true, "auth": "clerk", "database": "mongo" }
```

Now:

1. Open `/signup` and create a real account.
2. Verify the email through Clerk.
3. Sign in at `/login`.
4. Add an address, place a demo order, restart the server, and confirm the order is still there.

The announce bar should say **Real accounts · demo checkout** while payments are still in demo mode.

---

## 5. What is real now, and what is still demo

### Real after setup

- Account creation, sign-in, sign-out, sessions
- Email verification through Clerk
- Optional Google sign-in
- Password reset / account management through Clerk
- Persistent users, products, seller profiles, addresses, carts, wishlists, orders and reviews in MongoDB Atlas
- Admin access controlled by `ADMIN_EMAILS`, not by client-side code

### Still demo until you connect more services

- **Payments:** Razorpay remains demo until you add live Razorpay keys and complete payment verification.
- **Checkout mobile OTP:** still a demo code shown in the Demo Inbox. Real SMS requires a provider such as Twilio/MSG91 and, for India, DLT compliance.
- **Product photo storage:** uploads are still written to local disk. For a hosted production app, move uploads to durable object storage such as S3, Cloudinary or Supabase Storage.

Clerk does **not** replace your product/order database, and it does not automatically make payments or SMS real.

---

## 6. Production checklist

Before launching publicly:

- Use Clerk **Production** keys and configure your real domain in Clerk.
- Set `CLERK_AUTHORIZED_PARTIES` to your allowed browser origins, for example:

  ```env
  CLERK_AUTHORIZED_PARTIES=https://stashify.example.com
  ```

- Use a persistent host for the Node server and a durable upload storage strategy.
- Keep `.env` out of Git. It is already ignored.
- Enable MongoDB backups when you outgrow the free tier.
- Replace demo checkout/SMS with live providers before taking real money.
- Run the regression suites:

  ```bash
  npm run test:api
  npm run test:seller
  npm run test:ui
  npm run test:seller-ui
  npm run test:auth-env
  ```

---

## Troubleshooting

### “Set both CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY”

One key is missing. Set both, or leave both blank for demo mode.

### “Clerk sign-in requires MONGODB_URI”

Real accounts need a persistent database. Add the Atlas connection string.

### MongoDB connection timeout

Usually Network Access. Add the IP of the machine running the server, then retry `npm run doctor:live`.

### Clerk sign-in redirects to the wrong place

Check the allowed redirect URLs / application domain in the Clerk dashboard. For local development, `http://localhost:4000` should be allowed.

### I see “Demo login” after adding keys

Restart the server. Environment variables are read at startup. Then check `/api/health`.
