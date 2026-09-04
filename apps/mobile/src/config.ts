/**
 * Runtime configuration for the mobile app.
 *
 * Values are read from Expo public env vars (`EXPO_PUBLIC_*`, inlined at build
 * time by Expo SDK 50+). Development falls back to the local monorepo ports
 * used by `apps/api` (3002) and `apps/web` (3010).
 *
 * Set these in `apps/mobile/.env` (or your EAS build profile) for staging and
 * production builds:
 *
 *   EXPO_PUBLIC_API_URL=https://api.lorrycarry.com/api/v1
 *   EXPO_PUBLIC_WEB_URL=https://app.lorrycarry.com
 *   EXPO_PUBLIC_SUPPORT_PHONE=+919876543210
 */
import { Platform } from 'react-native'

/**
 * Android emulators cannot reach the host machine on `localhost`; 10.0.2.2 is
 * the loopback alias. Physical devices need an explicit EXPO_PUBLIC_API_URL.
 */
const LOCAL_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost'

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || `http://${LOCAL_HOST}:3002/api/v1`

export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/+$/, '') || `http://${LOCAL_HOST}:3010`

/** Support number used by the Help screen WhatsApp deep link (E.164). */
export const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE || ''

/** Support email fallback shown when WhatsApp is unavailable. */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@lorrycarry.com'

/**
 * No native payment SDK is bundled with this app (no Cashfree/Razorpay RN
 * module in package.json), so subscription checkout is completed in the
 * system browser via the API-provided checkout URL or the LorryCarry web
 * checkout, then verified server-side.
 */
export const HAS_NATIVE_PAYMENT_SDK = false
