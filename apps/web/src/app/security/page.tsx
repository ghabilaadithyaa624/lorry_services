import type { Metadata } from 'next'
import SecurityCenter from './SecurityCenter'

/**
 * Security & data protection — a **public** route (see `@/lib/publicRoutes`).
 *
 * It is linked from the marketing footer's legal column, so it must render for
 * an anonymous visitor. Previously the page mounted inside the authenticated
 * dashboard shell and immediately called `/users/me`; without a session that
 * call 401'd and the visitor was shown "Failed to load security profile" on a
 * page they are allowed to read. The platform-security content is now public
 * and only the session controls require a login.
 */
export const metadata: Metadata = {
  title: 'Security & Data Protection | LorryCarry',
  description:
    'How LorryCarry protects operator accounts, verification documents and payments — OTP authentication, rotating refresh tokens, encryption in transit and scoped access.',
  alternates: { canonical: '/security' },
  openGraph: {
    title: 'Security & Data Protection | LorryCarry',
    description:
      'OTP authentication, rotating refresh-token families, encryption in transit and scoped access across the LorryCarry freight marketplace.',
    url: '/security',
    type: 'website',
  },
}

export default function SecurityPage() {
  return <SecurityCenter />
}
