# Mobile production integration

Status of `apps/mobile` after the demo/mock removal pass.

## Summary

The mobile app previously activated subscriptions locally: the payment screen
had "Success" / "Fail Txn" buttons that wrote an `active` subscription into
MMKV and rendered seeded transaction rows. That behaviour is gone. Entitlement
and payment state are now owned exclusively by the backend, and the app only
renders what the server confirms.

**No backend changes were made.** Every endpoint consumed below already existed
in `apps/api`.

## Architecture

| File | Role |
| --- | --- |
| `src/config.ts` | Runtime config from `EXPO_PUBLIC_*` env vars (API URL, web URL, provider, support contacts). |
| `src/services/types.ts` | Typed request/response contracts mirroring `apps/api` + `packages/shared`. |
| `src/services/storage.ts` | Single MMKV instance, typed token accessors, session-expiry event bus. |
| `src/services/api.ts` | Axios client, auth interceptors, typed endpoint groups, `getApiErrorMessage`. |
| `src/services/checkout.ts` | Subscription checkout orchestration + server-side verification polling. |
| `src/contexts/AuthContext.tsx` | Session state + server-owned `SubscriptionEntitlement`. |

## Endpoints consumed

| Endpoint | Used by |
| --- | --- |
| `POST /auth/otp/request`, `POST /auth/otp/verify` | Login / role select |
| `POST /auth/token/refresh`, `POST /auth/logout` | API interceptor / logout |
| `GET /subscriptions/status` | `AuthContext.refreshEntitlement`, Home, Payments |
| `POST /subscriptions/initiate` | `checkout.ts` (API-driven checkout URL flow) |
| `GET /subscriptions/verify/:orderId` | `checkout.ts` verification polling |
| `GET /subscriptions/callback/:orderId` | exposed on `subscriptionsApi` (parity with the web return URL) |
| `POST /payments/subscription/initialize` | exposed on `paymentsApi` (Cashfree-only single-provider path) |
| `GET /payments/history` | Payments → History tab |
| `POST /payments/trip/complete` | Driver Mode → trip completion |
| `GET /bookings/my-bookings`, `PATCH /bookings/:id/status` | Home stats, My Trips, Driver Mode |
| `GET /tracking/:bookingId`, `POST /tracking/:id/{checkpoint,pod,incident}` | Driver Mode |
| `GET /notifications`, `/unread-count`, `POST /read`, `/read-all` | Notifications |
| `GET /search/trucks` | Search trucks |

## Payment flow (no native SDK)

`apps/mobile/package.json` does not include a Cashfree or Razorpay React Native
module, so checkout is completed in the system browser (`expo-web-browser`,
added as a dependency). The entry-point is `startSubscriptionCheckout()` in
`src/services/checkout.ts`, which selects one of two strategies from
`EXPO_PUBLIC_PAYMENT_PROVIDER`:

1. **`api-checkout-url`** (Stripe) — `POST /subscriptions/initiate` returns
   `checkout.checkoutUrl`. The app opens that URL, then polls
   `GET /subscriptions/verify/:orderId` (8 attempts, 2.5s apart).
2. **`web-handoff`** (Cashfree, Razorpay) — those providers return SDK-only
   payloads (`paymentSessionId` / `razorpayOrderId`) that cannot be opened as a
   URL. The app opens `"{WEB_URL}/subscribe?plan=…&source=mobile"` instead and
   then polls `GET /subscriptions/status` for an entitlement change. No order is
   created from the device in this mode, so no orphaned `Pending` payment rows
   are produced.

Outcomes are typed (`success | pending | failed | cancelled | error`). `pending`
and `failed` are never rendered as success — the UI tells the user the payment
has not been confirmed and offers a refresh. A pass appears active **only** when
`GET /subscriptions/status` returns `hasSubscription: true`.

## Other behaviour changes

- **Auth tokens** — one MMKV instance, single-flight refresh (concurrent 401s
  trigger one `/auth/token/refresh`), and a session-expiry event that clears
  `AuthContext` so the navigator returns to Login. `/auth/*` requests are
  excluded from the retry loop.
- **Home** — trial banner now reads real `trialDaysRemaining` /
  `trialDurationDays` (previously it read `trialDaysLeft`, a field the API never
  returned, and defaulted to `90`). Activity counters come from
  `/bookings/my-bookings` instead of hardcoded zeros. Quick actions deep-link to
  the web app rather than being inert.
- **My Trips** — was an always-empty `FlatList`; now lists real bookings with
  status, price and advance/balance state.
- **Driver Mode** — the fabricated `LC-8492-MAA` sample trip and the
  optimistic "success anyway" catch blocks are removed. Failed status updates,
  checkpoints, POD submissions and trip completion now surface an error and
  leave state unchanged. Fake POD photo URLs
  (`https://storage.lorrycarry.com/pod/...`) are no longer sent; POD photo
  capture is honestly labelled as web-only.
- **Help** — the hardcoded `+919876543210` support number and the
  `setTimeout`-based "Inquiry Sent" confirmation are gone. Contact details come
  from config; the form composes a real email since the API has no
  support-ticket endpoint.
- **Search trucks** — surfaces API errors with retry, and states plainly when
  results are based on a default city centre rather than the device position.
- **Error messages** — `getApiErrorMessage()` maps timeouts, offline state, and
  401/403/404/429/5xx to production-safe copy; no stack traces or URLs are shown.

## Configuration

See `apps/mobile/.env.example`. The important one for staging/production is
`EXPO_PUBLIC_API_URL` — the default `localhost:3002` only works for a simulator
on the same machine.
