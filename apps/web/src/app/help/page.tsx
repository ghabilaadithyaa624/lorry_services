import type { Metadata } from 'next'
import HelpCenter from './HelpCenter'

/**
 * Help & support — a **public** route (see `@/lib/publicRoutes`).
 *
 * It used to render inside the authenticated dashboard shell, so an anonymous
 * visitor coming from the footer saw app chrome and links that only ever
 * bounced them to `/login?redirect=…`. The page now renders the public shell
 * and is indexable; the FAQ copy and support channels are unchanged.
 */
export const metadata: Metadata = {
  title: 'Help & Support | LorryCarry',
  description:
    'Answers to common questions about posting loads, finding trucks, document verification, contact passes and checkpoint tracking — plus how to reach the LorryCarry support desk.',
  alternates: { canonical: '/help' },
  openGraph: {
    title: 'Help & Support | LorryCarry',
    description:
      'Freight marketplace FAQs and the LorryCarry support desk. Browse without an account.',
    url: '/help',
    type: 'website',
  },
}

export default function HelpPage() {
  return <HelpCenter />
}
