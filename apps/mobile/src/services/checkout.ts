/**
 * Subscription checkout orchestration for the mobile app.
 *
 * IMPORTANT — no fake success states.
 * This module never activates a subscription locally. Entitlement is owned by
 * the backend (`GET /subscriptions/status`) and only becomes active after the
 * gateway confirms the payment (webhook or server-side verification via
 * `GET /subscriptions/verify/:orderId`). The app only ever *reports* what the
 * server says.
 *
 * Checkout strategies
 * -------------------
 * The app does not bundle a native payment SDK (no Cashfree/Razorpay React
 * Native module in package.json), so:
 *
 *  1. `api-checkout-url` — providers that return a directly openable hosted
 *     checkout URL (Stripe: `checkout.checkoutUrl`). We call
 *     `POST /subscriptions/initiate`, open the returned URL in the system
 *     browser, and then poll `GET /subscriptions/verify/:orderId`.
 *
 *  2. `web-handoff` — providers whose payload is SDK-only (Cashfree
 *     `paymentSessionId`, Razorpay `razorpayOrderId`). We hand the user off to
 *     the LorryCarry web checkout in the system browser ("continue in
 *     browser"), then re-read `GET /subscriptions/status` when they return.
 *     No order is created from the device in this mode, so no orphaned pending
 *     payment rows are produced.
 *
 * Configure the active provider with `EXPO_PUBLIC_PAYMENT_PROVIDER` so it
 * matches the API's `PAYMENT_PROVIDER` env var.
 */
import * as WebBrowser from 'expo-web-browser'
import { Linking } from 'react-native'

import { WEB_URL } from '../config'
import { getApiErrorMessage, subscriptionsApi } from './api'
import type {
  PaymentProvider,
  SubscriptionEntitlement,
  SubscriptionPlanId,
  VerifyOrderResponse,
} from './types'

/** Providers whose checkout payload can be opened directly as a URL. */
const URL_CAPABLE_PROVIDERS: PaymentProvider[] = ['stripe']

const CONFIGURED_PROVIDER = (process.env.EXPO_PUBLIC_PAYMENT_PROVIDER || 'cashfree') as PaymentProvider

export type CheckoutStrategy = 'api-checkout-url' | 'web-handoff'

export function getCheckoutStrategy(provider: PaymentProvider = CONFIGURED_PROVIDER): CheckoutStrategy {
  return URL_CAPABLE_PROVIDERS.includes(provider) ? 'api-checkout-url' : 'web-handoff'
}

export function getConfiguredProvider(): PaymentProvider {
  return CONFIGURED_PROVIDER
}

/** URL of the LorryCarry web checkout used for the browser handoff. */
export function getWebCheckoutUrl(plan: SubscriptionPlanId): string {
  return `${WEB_URL}/subscribe?plan=${encodeURIComponent(plan)}&source=mobile`
}

export type CheckoutOutcome =
  | { result: 'success'; entitlement: SubscriptionEntitlement }
  /** Payment not confirmed yet — banks/UPI can take a while. Never treat as success. */
  | { result: 'pending'; message: string; orderId?: string }
  | { result: 'failed'; message: string; orderId?: string }
  /** User dismissed the browser before completing payment. */
  | { result: 'cancelled'; message: string }
  | { result: 'error'; message: string; orderId?: string }

interface CheckoutOptions {
  plan: SubscriptionPlanId
  provider?: PaymentProvider
  /** Called when the user has returned from the browser and verification starts. */
  onVerifyingChange?: (verifying: boolean) => void
}

const VERIFY_ATTEMPTS = 8
const VERIFY_INTERVAL_MS = 2500

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Run a subscription purchase end-to-end and return the *server-confirmed*
 * outcome. Throws nothing — every failure path is a typed outcome.
 */
export async function startSubscriptionCheckout({
  plan,
  provider = CONFIGURED_PROVIDER,
  onVerifyingChange,
}: CheckoutOptions): Promise<CheckoutOutcome> {
  const strategy = getCheckoutStrategy(provider)

  try {
    if (strategy === 'api-checkout-url') {
      return await runApiCheckoutUrlFlow(plan, provider, onVerifyingChange)
    }
    return await runWebHandoffFlow(plan, onVerifyingChange)
  } catch (error) {
    return { result: 'error', message: getApiErrorMessage(error, 'Could not start checkout. Please try again.') }
  }
}

/** Strategy 1 — API-driven checkout URL opened in the system browser. */
async function runApiCheckoutUrlFlow(
  plan: SubscriptionPlanId,
  provider: PaymentProvider,
  onVerifyingChange?: (verifying: boolean) => void,
): Promise<CheckoutOutcome> {
  const { data } = await subscriptionsApi.initiate(plan, provider)
  const checkoutUrl = data.checkout?.checkoutUrl

  if (!checkoutUrl) {
    // The server chose a provider that needs a native SDK we do not ship.
    // Fall back to the browser handoff instead of pretending we succeeded.
    return runWebHandoffFlow(plan, onVerifyingChange)
  }

  const browserResult = await openInBrowser(checkoutUrl)
  if (!browserResult.opened) {
    return { result: 'error', message: browserResult.message, orderId: data.orderId }
  }

  onVerifyingChange?.(true)
  try {
    return await pollOrderVerification(data.orderId)
  } finally {
    onVerifyingChange?.(false)
  }
}

/** Strategy 2 — "continue in browser" handoff to the LorryCarry web checkout. */
async function runWebHandoffFlow(
  plan: SubscriptionPlanId,
  onVerifyingChange?: (verifying: boolean) => void,
): Promise<CheckoutOutcome> {
  const before = await safeGetEntitlement()

  const browserResult = await openInBrowser(getWebCheckoutUrl(plan))
  if (!browserResult.opened) {
    return { result: 'error', message: browserResult.message }
  }

  onVerifyingChange?.(true)
  try {
    return await pollEntitlement(before)
  } finally {
    onVerifyingChange?.(false)
  }
}

async function openInBrowser(url: string): Promise<{ opened: true } | { opened: false; message: string }> {
  try {
    const result = await WebBrowser.openBrowserAsync(url, { showTitle: true, enableDefaultShareMenuItem: false })
    // `dismiss`/`cancel` still means the checkout page was shown; we verify
    // with the server regardless because payment may have completed.
    if (result) return { opened: true }
  } catch {
    // Fall through to the plain Linking fallback below.
  }

  try {
    const supported = await Linking.canOpenURL(url)
    if (!supported) {
      return { opened: false, message: 'No browser app is available to complete the payment on this device.' }
    }
    await Linking.openURL(url)
    return { opened: true }
  } catch {
    return { opened: false, message: 'Could not open the secure checkout page. Please try again.' }
  }
}

/** Poll `GET /subscriptions/verify/:orderId` until the gateway settles. */
async function pollOrderVerification(orderId: string): Promise<CheckoutOutcome> {
  let lastMessage = 'Payment is still being confirmed by your bank.'

  for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt++) {
    let verification: VerifyOrderResponse | null = null
    try {
      verification = (await subscriptionsApi.verify(orderId)).data
    } catch (error) {
      lastMessage = getApiErrorMessage(error, lastMessage)
    }

    if (verification?.status === 'SUCCESS') {
      const entitlement = await safeGetEntitlement()
      if (entitlement?.hasSubscription) {
        return { result: 'success', entitlement }
      }
      // Gateway says paid but entitlement has not propagated yet — report
      // pending rather than fabricating an active pass.
      return {
        result: 'pending',
        orderId,
        message: 'Payment received. Your pass will activate shortly — pull to refresh in a moment.',
      }
    }

    if (verification?.status === 'FAILED') {
      return {
        result: 'failed',
        orderId,
        message: verification.message || 'The payment did not go through. No amount has been captured.',
      }
    }

    if (verification?.message) lastMessage = verification.message
    if (attempt < VERIFY_ATTEMPTS - 1) await wait(VERIFY_INTERVAL_MS)
  }

  return { result: 'pending', orderId, message: lastMessage }
}

/** Poll `GET /subscriptions/status` until entitlement changes (web handoff). */
async function pollEntitlement(before: SubscriptionEntitlement | null): Promise<CheckoutOutcome> {
  for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt++) {
    const current = await safeGetEntitlement()

    if (current?.hasSubscription) {
      const changed =
        !before?.hasSubscription ||
        before.plan !== current.plan ||
        before.expiresAt !== current.expiresAt
      if (changed) return { result: 'success', entitlement: current }
    }

    if (attempt < VERIFY_ATTEMPTS - 1) await wait(VERIFY_INTERVAL_MS)
  }

  return {
    result: 'pending',
    message:
      'We have not received a payment confirmation yet. If you completed the payment, it can take a few minutes — refresh this screen to check again.',
  }
}

async function safeGetEntitlement(): Promise<SubscriptionEntitlement | null> {
  try {
    return (await subscriptionsApi.getStatus()).data
  } catch {
    return null
  }
}
