# BELKA'S ENTERPRISE: shoe shop (web + Android/iOS)

One backend, one account system and one live cart, shared by a Next.js website and an Expo (React Native) app.

| Part | Stack | Folder |
|---|---|---|
| Website + admin | Next.js 16 (App Router), TypeScript, Tailwind CSS 4 | `apps/web` |
| Mobile app | Expo SDK 57 (development build), Expo Router, TypeScript | `apps/mobile` |
| Shared logic | Types, cart store (optimistic + realtime + guest merge), pricing, API helpers, tests | `packages/shared` |
| Backend | Supabase: Postgres + RLS, Auth (Google + email), Realtime, Storage, Edge Functions | `supabase/` |
| Payments | Paystack (card / transfer / USSD) + Pay on Delivery | `supabase/functions/checkout`, `paystack-*` |
| Email | Mailgun (order confirmation + welcome) | `supabase/functions/_shared/emails.ts` |

The monorepo uses **npm workspaces** (`apps/*`, `packages/*`).

```
belkas/
├─ apps/web/            Next.js storefront, checkout, account, admin
├─ apps/mobile/         Expo app (tabs: Home, Shop, Cart, Wishlist, Account)
├─ packages/shared/     @belkas/shared: used by both apps (+ vitest tests)
└─ supabase/
   ├─ migrations/       schema, RLS policies, cart/checkout SQL functions
   ├─ functions/        Edge Functions: checkout, paystack-verify, paystack-webhook, welcome
   ├─ seed.sql          13 products from Footwear_Collection_Belkas.pptx
   ├─ seed-images/      product photos extracted from the PPT
   └─ products.json     product data extracted from the PPT
```

---

## How the important parts work

**One account on web and mobile.** Both apps use the same Supabase project. The website signs in with
`supabase.auth.signInWithOAuth({ provider: "google" })`. The app uses native Google Sign-In
(`@react-native-google-signin/google-signin`) and passes Google's ID token to `supabase.auth.signInWithIdToken`.
The ID token is issued for the **web** client ID, so Supabase sees the same Google identity and returns the
**same `user_id`**. Mobile sessions are stored in the Keychain/Keystore via `expo-secure-store` (chunked, because
SecureStore holds ~2 KB per key), so you stay signed in across restarts.

**Live cart.** For signed-in users the cart is the `cart_items` table only. `CartStore`
(`packages/shared/src/cart/store.ts`) subscribes to Supabase Realtime `postgres_changes` on `cart_items` filtered by
`user_id`. Remote changes are applied to the screen immediately, then confirmed with a background re-read.
Local changes are **optimistic** and **rolled back** if the database rejects them. Guests keep a local cart
(localStorage / AsyncStorage) that is merged into the account cart on sign-in (`merge_guest_cart` SQL function).
Measured web-to-web: 0.5–0.9 s.

**Checkout never trusts the client.** The `checkout` Edge Function calls the `create_order` SQL function, which
reads prices from `products`, computes subtotal + delivery fee in Postgres, checks and locks stock, and creates
the order and order items in one transaction.
- *Pay on Delivery*: stock is reduced and the cart cleared in the same transaction, and the email is sent.
- *Paystack*: the function initializes a Paystack transaction for the **server-computed** total. After payment,
  `paystack-verify` (called by the app/website) and `paystack-webhook` (called by Paystack, HMAC-SHA512 signature
  checked) both **ask Paystack's API** whether the reference was paid, and only then call
  `finalize_paystack_order`, which checks the amount, marks the order paid, reduces stock, clears the cart (syncs
  live to every device) and sends the email. This is idempotent: the email is sent once.

**Security.** RLS is enabled on every table. Users read and write only their own profile, cart, addresses,
wishlist and orders. Products are public read and admin-only write (`profiles.is_admin`, which users can't change).
Order writes happen only inside SECURITY DEFINER functions. The service role key, Paystack secret key and Mailgun
key exist **only** as Supabase Edge Function secrets. The web and mobile apps ship only the public anon key.

**Delivery fees** (`supabase/migrations/…_functions.sql` → `delivery_fee()`, mirrored in
`packages/shared/src/pricing.ts`): Lagos home delivery ₦3,000, other states ₦6,000, store pickup free.

---

## 1. Supabase

1. Create a project at https://supabase.com/dashboard. The free plan allows 2 active projects.
2. Install deps and log the CLI in (opens a browser):
   ```bash
   npm install
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   ```
   On Apple-silicon Macs the CLI binary comes from the optional `@supabase/cli-darwin-arm64` package.
3. Apply the schema:
   ```bash
   npx supabase db push            # or paste supabase/migrations/*.sql into Dashboard → SQL Editor, in order
   ```
4. Upload product photos and seed products:
   ```bash
   npx supabase storage cp -r supabase/seed-images ss:///product-images --experimental --linked
   npx supabase db query --linked -f supabase/seed.sql   # (edit the project ref in the image URLs first)
   ```
   Alternatively run `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-products.mjs`, which uploads the
   images and regenerates `seed.sql` for your project. Run it locally only; never commit the key.
5. Make yourself admin after your first sign-in:
   ```sql
   update profiles set is_admin = true where email = 'you@example.com';
   ```
6. **Authentication → URL Configuration**
   - Site URL: your live site, e.g. `https://belkas.vercel.app` (use `http://localhost:3000` while developing)
   - Redirect URLs: `http://localhost:3000/**`, `https://YOUR-SITE/**`, `belkas://**`
7. Deploy Edge Functions and set secrets (see `supabase/.env.example`):
   ```bash
   npx supabase functions deploy --use-api
   npx supabase secrets set SITE_URL=https://YOUR-SITE MAILGUN_DOMAIN=… "MAILGUN_FROM=BELKA'S ENTERPRISE <orders@…>"
   # Secret keys: copy the key in your browser, then run (the value never appears on screen):
   npx supabase secrets set PAYSTACK_SECRET_KEY="$(pbpaste)"
   npx supabase secrets set MAILGUN_API_KEY="$(pbpaste)"
   ```
   `paystack-webhook` is deployed with JWT verification **off** (`supabase/config.toml`) because Paystack signs
   its requests with HMAC instead.

## 2. Google Cloud Console (Google Sign-In)

You need **one Google Cloud project** with an OAuth consent screen and **three OAuth client IDs**.

1. https://console.cloud.google.com → project picker → **New project** (e.g. "Belkas Enterprise").
2. **Google Auth Platform → Branding / Get started** (the OAuth consent screen):
   - App name `BELKA'S ENTERPRISE`, support email, **Audience: External**, developer contact email → Create.
   - While in **Testing**, only addresses under **Audience → Test users** can sign in. Add yours.
   - To let anyone sign in: on **Branding** add the app home page (`https://YOUR-SITE`), privacy policy
     (`https://YOUR-SITE/privacy`) and authorized domain (`YOUR-SITE` domain), then **Audience → Publish app**.
     Only basic scopes (email, profile) are used, so Google doesn't require a security review.
3. **Clients → Create client → Web application** ("Belkas Web")
   - Authorized JavaScript origins: `http://localhost:3000`, `https://YOUR-SITE`
   - Authorized redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   - Keep the **Client ID** and **Client secret**.
4. **Clients → Create client → Android** ("Belkas Android")
   - Package name: `com.belkas.enterprise`
   - SHA-1 certificate fingerprint: the SHA-1 of the key that signs the app. For EAS builds:
     ```bash
     cd apps/mobile && npx eas-cli credentials -p android   # → development/production → shows "SHA1 Fingerprint"
     ```
     (or expo.dev → your project → Credentials → Android). Add one Android client per signing key: EAS
     upload key, and later the **Google Play app signing** key from Play Console → Setup → App integrity.
5. **Clients → Create client → iOS** ("Belkas iOS")
   - Bundle ID: `com.belkas.enterprise`
6. **Supabase → Authentication → Sign In / Providers → Google**
   - Enable. **Client IDs**: the web client ID, then a comma and the iOS and Android client IDs.
   - **Client Secret**: the web client secret.
   - **Skip nonce checks**: leave OFF for Android. Turn it ON only when you ship the iOS app (iOS native Google
     Sign-In adds a nonce that the app can't pass to Supabase).
7. Put the **web** and **iOS** client IDs in `apps/mobile/.env` (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`,
   `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`). The Android client ID is not needed in code.

## 3. Mailgun

1. https://app.mailgun.com → **Send → Domains**. For testing, use the sandbox domain and add each recipient under
   **Authorized Recipients** (sandbox only delivers to them). For real customers, add and verify your own domain
   (e.g. `mg.belkas.ng`) by adding the DNS records Mailgun shows.
2. Domain → **Settings → Sending keys → Add sending key**. Store it as `MAILGUN_API_KEY` (step 1.7).
3. Set `MAILGUN_DOMAIN` and `MAILGUN_FROM`. EU-region domains also need `MAILGUN_API_BASE=https://api.eu.mailgun.net`.

Emails: **welcome** (sent once, on first sign-in) and **order confirmation** (items with photos, sizes,
quantities, prices, delivery address, total in ₦, payment method).

## 4. Paystack

1. Sign up at https://dashboard.paystack.com (Nigeria). Test mode works immediately.
2. **Settings → API Keys & Webhooks**:
   - Copy the **Test Secret Key** → `PAYSTACK_SECRET_KEY` secret (step 1.7). Use the live key after activation.
   - **Test Webhook URL** (and later Live): `https://YOUR-PROJECT-REF.supabase.co/functions/v1/paystack-webhook`
3. Test payments: Paystack's test checkout offers **Success / Bank Authentication / Declined** options, or use
   Paystack's published test cards. No real money moves in test mode.

## 5. Run locally

```bash
npm install
cp apps/web/.env.example apps/web/.env.local     # fill in
cp apps/mobile/.env.example apps/mobile/.env     # fill in
npm run dev:web                                   # http://localhost:3000
npm test                                          # cart + checkout total tests (vitest)
npm run typecheck
```

## 6. Deploy the website to Vercel

1. `cd apps/web && npx vercel` (log in, create a project). In the Vercel project settings set **Root Directory**
   to `apps/web` (the monorepo root is used for installs automatically).
2. Add environment variables (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL=https://YOUR-SITE`, `NEXT_PUBLIC_WHATSAPP_NUMBER`. **Do not** add any secret keys.
3. `npx vercel --prod`. Then update: Supabase Site URL + redirect URLs, the Google web client's JavaScript origin,
   the `SITE_URL` secret, and `EXPO_PUBLIC_SITE_URL` in `apps/mobile/.env`.

## 7. Android development build (EAS) and installing it on your phone

A **development build** (not Expo Go) is required because native Google Sign-In is a native module.

```bash
cd apps/mobile
npx eas-cli login
# This Mac has no git, so EAS runs in "no VCS" mode and uploads the monorepo root (filtered by /.easignore):
EAS_NO_VCS=1 EAS_PROJECT_ROOT="$(cd ../.. && pwd)" npx eas-cli build -p android --profile development
```

EAS creates and stores the signing keystore on first build. Use its SHA-1 for the Android OAuth client (step 2.4).

**Install on your Android phone**
1. When the build finishes, open the build page link (or scan its QR code) **on the phone** and tap **Install**.
   It downloads an `.apk`.
2. Android asks to allow installs from your browser: **Settings → Allow from this source**, go back, tap **Install**.
3. On the Mac, start the dev server: `cd apps/mobile && npx expo start --dev-client --tunnel`
4. Open the **BELKA'S** app on the phone and scan the QR code shown in the terminal (or enter the URL).
   The app loads its JavaScript from the Mac, so code changes appear without reinstalling.

For a standalone test APK that doesn't need the Mac: `--profile preview`.
iOS builds need a paid Apple Developer account: `npx eas-cli build -p ios --profile development`.

## Admin

`/admin` (website) is visible only to profiles with `is_admin = true`. It lets you add and edit products, upload
photos, change sizes and stock, show or hide products, and change order status. Customers see status changes live
on their order page.

## Tests

`packages/shared/test`: cart logic (add, increment, sizes, caps, remove, merge, immutability), the cart store
(guest storage, merge on sign-in, optimistic update, rollback on error, applying realtime changes from another
device), and checkout totals (subtotal, pickup, Lagos vs other states, empty cart, kobo conversion, ₦ formatting).

```bash
npm test
```

See `docs/PHONE_TEST_CHECKLIST.md` for the manual phone + laptop test plan and results.
