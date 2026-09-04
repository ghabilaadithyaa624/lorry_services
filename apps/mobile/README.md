# LorryCarry Mobile (Expo / React Native)

Driver- and cargo-owner-facing companion app. It talks only to the NestJS API
in `apps/api` (`/api/v1`) and, for payment hand-offs, to the web app in
`apps/web`.

## Configuration

Copy `.env.example` to `.env` and adjust. All variables are `EXPO_PUBLIC_*`
and are inlined into the bundle at build time (restart `expo start` after
changes).

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | API base **including** `/api/v1`. Android emulator: `http://10.0.2.2:3002/api/v1`; physical device: your machine's LAN IP. |
| `EXPO_PUBLIC_WEB_URL` | Public origin of `apps/web`. Used for "continue in browser" checkout and the help centre link. Must match `CLIENT_URL` on the API. |
| `EXPO_PUBLIC_SUPPORT_PHONE` / `EXPO_PUBLIC_SUPPORT_EMAIL` | Optional. When absent the Help screen says support contacts are not configured instead of inventing one. |

## Source layout

```
src/
  lib/env.ts            build-time config (single place that reads process.env)
  lib/plans.ts          plan display data (mirrors packages/shared SUBSCRIPTION_PLANS), formatters
  lib/roles.ts          role normalisation (unchanged)
  services/types.ts     API contracts consumed by the app
  services/api.ts       axios client, token storage, refresh, typed endpoint groups, error mapping
  hooks/useSubscription.ts  GET /subscriptions/status wrapper
  contexts/AuthContext  session state backed by the same MMKV keys the API client uses
  screens/              Home, Driver Mode, My Trips, Payments, Notifications, Help, Login, RoleSelect
```

## Auth & tokens

* Access/refresh tokens and the user profile live in MMKV under
  `accessToken` / `refreshToken` / `user`. `services/api.ts#tokenStorage` is
  the only writer; `AuthContext` reads through it.
* On `401` the client performs **one shared refresh** (`POST /auth/token/refresh`)
  and persists **both** rotated tokens. Concurrent 401s wait on the same
  promise, which matters because the API revokes a refresh token the moment
  it is used.
* If the refresh is rejected with a 4xx (or no refresh token exists) the
  client clears storage and emits `onSessionExpired`, which `AuthContext`
  turns into a sign-out. A network failure during refresh does **not** sign
  the user out.
* `logout()` best-effort calls `POST /auth/logout` to revoke the refresh
  token, then clears local state regardless.

## Subscriptions & payments

Server endpoints used (no backend changes were made):

| Call | Used for |
| --- | --- |
| `GET /subscriptions/status` | Entitlement: `status` (`trial`/`active`/`expired`), `trialDaysRemaining`, `trialDurationDays`, `expiresAt`, `upgradeRequired`. Auto-grants the 90-day trial. |
| `POST /subscriptions/initiate { plan }` | Creates the payment row + gateway session. Provider is chosen server-side (`PAYMENT_PROVIDER`). |
| `GET /subscriptions/verify/:orderId` | Server-side verification + idempotent activation. Safe to poll. |
| `GET /payments/history` | Payment history (subscription + booking rows). |

Checkout flow in `PaymentScreen`:

1. `initiate` → the response's `checkout` payload decides the path.
2. **Stripe** returns `checkout.checkoutUrl` → opened with `Linking.openURL`.
   When the app returns to the foreground (or the user taps *I've paid — check
   status*) the app polls `GET /subscriptions/verify/:orderId` (up to 10 × 2.5 s).
3. **Cashfree / Razorpay** return only a `paymentSessionId` / `razorpayOrderId`.
   Their checkout requires the vendor SDK, which is **not bundled** in this
   app, so the modal explains this and offers *Continue on the website*, which
   opens `${EXPO_PUBLIC_WEB_URL}/subscribe?plan=…&source=mobile` (the web app
   already runs both SDKs). Because the website creates its own gateway order,
   activation is detected only from server data: the entitlement changing
   versus a snapshot taken when checkout began, or a new `Success`
   subscription payment appearing in `/payments/history`.
4. Outcomes are shown exactly as the server reports them: `SUCCESS` activates,
   `FAILED` shows the gateway reason, `PENDING` after polling stays *not
   confirmed yet* with a manual re-check. Nothing in the app marks a payment
   as paid on its own, and no payment state is persisted locally.
5. Recent `Pending` subscription rows (last 24 h, only while no plan is
   active) are surfaced as *Unfinished checkout* with a re-check action that
   runs the same verify route the web callback page uses.

`POST /payments/subscription/initialize` (legacy Cashfree-only route) is typed
but intentionally unused: it takes a client-supplied amount and stores no plan
metadata.

To offer in-app Cashfree/Razorpay checkout later, add `react-native-cashfree-pg-api`
/ `react-native-razorpay` and branch on `checkout.paymentSessionId` /
`checkout.razorpayOrderId` inside `startCheckout`; the verify/polling code is
provider-agnostic.

## Bookings, tracking, notifications

* `GET /bookings/my-bookings` drives Home counts, My Trips and Driver Mode.
  (`GET /bookings` does not exist on the API.)
* Driver Mode reads checkpoint progress from `GET /tracking/:bookingId` and
  records crossings with `POST /tracking/:bookingId/checkpoint` using the
  device GPS. The API answers `200 { success: false }` when the driver is
  outside the geofence — the app treats that as *not recorded*.
* Trip completion uses `POST /payments/trip/complete`; the alert reflects the
  server's `balanceReleased` flag rather than assuming release. POD photo
  upload is not implemented (the API's `generate-upload-url` flow needs a
  file picker), so the app says so instead of sending a fake URL.
* Factory owners confirm the 50/50 milestones from My Trips via
  `PATCH /bookings/:id/confirm-advance|confirm-balance`.
* Notifications use `GET /notifications`, `POST /notifications/read`,
  `POST /notifications/read-all`.

## Error handling

`getApiErrorMessage(err, fallback)` in `services/api.ts` maps every failure to
user-safe copy: NestJS `message` strings/arrays are surfaced verbatim (they are
validation messages), transport failures become connectivity copy, and
5xx/HTML bodies never leak URLs or stack traces.

## Type-checking

```
cd apps/mobile && npx tsc -p tsconfig.json
```
