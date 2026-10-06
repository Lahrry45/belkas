# Phone + laptop test checklist

Run on a physical Android phone (BELKA'S app, preview build) and a laptop browser side by side,
signed in with the **same Google account** (must be a Google OAuth *test user* until the Google app is published).

| # | Test | How | Expected | Result |
|---|------|-----|----------|--------|
| 1 | Same account on both | Laptop: Sign in → Continue with Google. Phone: Account tab → Sign in → Continue with Google, same account. | Same name and email on both; Orders list on the phone shows the website's orders (BLK-1001…). | _pending_ |
| 2 | Web → phone live add | Phone: open Cart tab. Laptop: add a shoe (pick a size) to cart. | Phone cart + tab badge update within ~1 s, no refresh. | _pending_ |
| 3 | Phone → web live change | Laptop: open /cart. Phone: tap + on a line, then Remove. | Laptop quantity, then removal, appear within ~1 s. | _pending_ |
| 4 | Session + cart persist | Phone: swipe the app away (close it fully), reopen. | Still signed in; cart unchanged. | _pending_ |
| 5 | Paystack order end-to-end | Phone: Checkout → Paystack → Paystack test page → **Success** → Pay. | Order success screen; order saved as Paid; cart empties on phone **and** laptop; confirmation email arrives. | _pending_ |

## Already verified on the web (before the phone run)

| Check | Result |
|---|---|
| Google sign-in on website creates profile (name, avatar) | ✅ 2026-10-06 |
| Live cart between two browser windows | ✅ adds 0.66–0.74 s, qty 0.77–0.86 s, removes 0.49–0.66 s (one 3.7 s outlier) |
| Guest cart merges into account cart on sign-in (DB test, rolled back) | ✅ 2 + 1 → 3; invalid size / unknown product skipped |
| Pay on Delivery order (BLK-1001, BLK-1002): totals from DB, stock −1, cart cleared on both windows | ✅ |
| Paystack test order (BLK-1003, ₦39,000): server-computed amount, verify + signed webhook (200), marked Paid, stock −1, cart cleared | ✅ |
| Forged / unsigned Paystack webhooks rejected | ✅ 401 |
| Mailgun welcome email (sent once) + order confirmation email arrive | ✅ |
| Anonymous visitor: products readable; carts/orders/profiles/addresses empty; product insert + checkout RPCs refused | ✅ |
| No secret keys in the mobile JavaScript bundle | ✅ |
| Automated tests (`npm test`) | ✅ 18/18 |
