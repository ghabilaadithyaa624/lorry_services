/**
 * Build-time configuration.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` references at bundle time, so each
 * variable must be read with a literal member access (no dynamic keys). The
 * module-scoped `declare` keeps this file type-safe whether or not Node
 * typings are present in the workspace.
 */
declare const process: { env: Record<string, string | undefined> }

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function optional(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** NestJS API base including the `/api/v1` prefix. */
export const API_URL = trimTrailingSlash(
  optional(process.env.EXPO_PUBLIC_API_URL) ?? 'http://localhost:3002/api/v1'
)

/** Public web app origin, used for "continue in browser" hand-offs. */
export const WEB_APP_URL = trimTrailingSlash(
  optional(process.env.EXPO_PUBLIC_WEB_URL) ?? 'http://localhost:3010'
)

/** Support contacts. Absent values hide the corresponding action in Help. */
export const SUPPORT_PHONE = optional(process.env.EXPO_PUBLIC_SUPPORT_PHONE)
export const SUPPORT_EMAIL = optional(process.env.EXPO_PUBLIC_SUPPORT_EMAIL)
