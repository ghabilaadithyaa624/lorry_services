import type { Metadata } from 'next'
import RequestDemo from './RequestDemo'

/**
 * Request Demo — a **public** B2B lead form (see `@/lib/publicRoutes`).
 *
 * Anonymous visitors can open this page without a session. The form does not
 * persist PII; delivery is a user-initiated WhatsApp hand-off to the published
 * support desk after server-side validation.
 */
export const metadata: Metadata = {
  title: 'Request a Demo | LorryCarry',
  description:
    'Book a 20–30 minute walkthrough of the LorryCarry freight marketplace — 50 km proximity matching, Vahan-ready truck verification and checkpoint tracking. No obligation.',
  alternates: { canonical: '/request-demo' },
  openGraph: {
    title: 'Request a Demo | LorryCarry',
    description:
      'A live walkthrough of LorryCarry’s freight marketplace, matching, verification and checkpoint tracking. No obligation.',
    url: '/request-demo',
    type: 'website',
  },
}

export default function RequestDemoPage() {
  return <RequestDemo />
}
