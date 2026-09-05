'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  CreditCardIcon,
  DocumentCheckIcon,
  MapIcon,
  PhoneIcon,
  QuestionMarkCircleIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import { Navbar, Footer } from '@/components/layout'
import { Card, Button } from '@/components/ui'
import { hasClientSession } from '@/lib/subscription'
import { cn } from '@/lib/utils'

/**
 * Support contact channel.
 * The phone number below is the same one already published on the marketing
 * site; no new contact data is introduced here.
 */
const SUPPORT_PHONE = '+918072025106'

interface FaqItem {
  question: string
  answer: string
}

const FAQ_GROUPS: Array<{
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: FaqItem[]
}> = [
  {
    title: 'Getting started',
    icon: QuestionMarkCircleIcon,
    items: [
      {
        question: 'How do I sign in to LorryCarry?',
        answer:
          'Enter your mobile number and we send a one-time password over WhatsApp or SMS. There is no password to remember. Choose your role — factory owner or truck driver — the first time you sign in.',
      },
      {
        question: 'Can I change my role after registering?',
        answer:
          'Your account role determines the whole workflow, so it is fixed after registration. If you need a different role, contact support and we will help you set up the correct account.',
      },
    ],
  },
  {
    title: 'Loads and trucks',
    icon: TruckIcon,
    items: [
      {
        question: 'How do I post a load?',
        answer:
          'Open Post Freight from the dashboard, then enter pickup and drop locations, cargo weight, and truck requirements. Locations are matched against Mappls address data so carriers see an accurate route.',
      },
      {
        question: 'Why is my truck not appearing in search results?',
        answer:
          'Trucks only appear in marketplace search after verification. Upload the RC and Insurance documents from the Documents page, and our compliance team reviews them. You can track the status on My Trucks.',
      },
    ],
  },
  {
    title: 'Documents and verification',
    icon: DocumentCheckIcon,
    items: [
      {
        question: 'Which documents do I need to upload?',
        answer:
          'Registration Certificate (RC) and a valid Insurance certificate are required for every vehicle. Both are reviewed manually before the truck becomes visible to shippers.',
      },
      {
        question: 'My document was rejected. What now?',
        answer:
          'Open the Documents page to see the reviewer note explaining the reason. Upload a corrected copy and the vehicle re-enters the verification queue.',
      },
    ],
  },
  {
    title: 'Payments and plans',
    icon: CreditCardIcon,
    items: [
      {
        question: 'Why do I need a subscription to see contact details?',
        answer:
          'Direct phone numbers are released to subscribers only. This keeps the network free of spam and ensures both sides are committed before contact is shared.',
      },
      {
        question: 'How are payments processed?',
        answer:
          'Subscription payments are handled by Cashfree. LorryCarry never stores your card or UPI credentials — every transaction is verified server-side before your plan activates.',
      },
    ],
  },
  {
    title: 'Tracking',
    icon: MapIcon,
    items: [
      {
        question: 'Is tracking live GPS?',
        answer:
          'Tracking is checkpoint based, not continuous GPS. As a consignment crosses each highway checkpoint the status updates and both parties are notified. Screens always show when the position was last updated.',
      },
    ],
  },
]

/**
 * Links offered next to the FAQ. Signed-in operators get shortcuts into the
 * product; anonymous visitors only ever see routes they can actually open, so
 * no link here can bounce them into a login hop.
 */
const ACCOUNT_LINKS = [
  { label: 'Go to dashboard', href: '/dashboard' },
  { label: 'Account settings', href: '/settings' },
  { label: 'Document centre', href: '/documents' },
  { label: 'Recent activity', href: '/activity' },
  { label: 'Plans & billing', href: '/subscribe' },
]

const PUBLIC_LINKS = [
  { label: 'Pricing & plans', href: '/subscribe' },
  { label: 'Track a shipment', href: '/tracking' },
  { label: 'Security & data protection', href: '/security' },
  { label: 'Privacy & data security', href: '/privacy' },
  { label: 'Terms of service', href: '/terms' },
]

/**
 * Help & support — public help centre.
 *
 * `/help` is reachable without a session (see `@/lib/publicRoutes`) and is
 * linked from the marketing footer, so it renders the public shell rather than
 * the authenticated dashboard chrome. Content is static guidance plus the real
 * support channels; there is deliberately no ticketing UI, because the platform
 * has no support-ticket backend — offering one would imply functionality that
 * does not exist.
 */
export default function HelpCenter() {
  // `null` until the browser has been probed, so SSR and the first paint match.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    setIsAuthenticated(hasClientSession())
  }, [])

  const quickLinks = isAuthenticated === true ? ACCOUNT_LINKS : PUBLIC_LINKS

  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20 font-mono uppercase text-[10px] font-bold">
            Support
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
            Help &amp; support
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Answers to the questions operators ask most, and a direct line to a person when the
            answer is not here. Browsing this page does not require an account.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* FAQ */}
          <div className="lg:col-span-2 space-y-5">
            {FAQ_GROUPS.map((group) => {
              const Icon = group.icon
              return (
                <Card key={group.title} padding="none">
                  <Card.Header>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0"
                        aria-hidden="true"
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </span>
                      <Card.Title>{group.title}</Card.Title>
                    </div>
                  </Card.Header>
                  <Card.Body padding="none">
                    <div className="divide-y divide-hairline">
                      {group.items.map((item) => (
                        <FaqRow key={item.question} item={item} />
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              )
            })}
          </div>

          {/* Contact channels + contextual links */}
          <aside className="space-y-5">
            <Card>
              <Card.Title as="h2" className="mb-1">
                Talk to us
              </Card.Title>
              <p className="text-sm text-muted leading-relaxed mb-4">
                Our operations desk is available Monday to Saturday, 9am to 8pm IST.
              </p>

              <div className="space-y-2.5">
                <a
                  href={`https://wa.me/${SUPPORT_PHONE.replace('+', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-hairline hover:border-primary-500/40 hover:bg-wash-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <span
                    className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <ChatBubbleLeftRightIcon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">WhatsApp</span>
                    <span className="block text-xs text-muted">Fastest response</span>
                  </span>
                </a>

                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-hairline hover:border-primary-500/40 hover:bg-wash-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <span
                    className="w-9 h-9 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <PhoneIcon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">Call support</span>
                    <span className="block text-xs text-muted font-mono">{SUPPORT_PHONE}</span>
                  </span>
                </a>
              </div>
            </Card>

            <Card>
              <Card.Title as="h2" className="mb-3">
                {isAuthenticated === true ? 'Your account' : 'New here?'}
              </Card.Title>

              {isAuthenticated === true ? (
                <p className="text-sm text-muted leading-relaxed mb-3">
                  Signed in. Jump straight to the screen you need.
                </p>
              ) : (
                <p className="text-sm text-muted leading-relaxed mb-3">
                  Posting a load or listing a truck needs an account. Comparing plans and reading
                  the legal pages does not.
                </p>
              )}

              <ul className="space-y-1.5 text-sm">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block px-3 py-2 rounded-lg text-body hover:bg-wash hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {isAuthenticated !== true && (
                <div className="mt-4 pt-4 border-t border-hairline flex flex-wrap gap-2">
                  <Button as={Link} href="/login" variant="primary" size="sm">
                    Sign in
                  </Button>
                  <Button as={Link} href="/role-select" variant="secondary" size="sm">
                    Create account
                  </Button>
                </div>
              )}
            </Card>
          </aside>
        </div>

        {/* Closing CTA */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/subscribe"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors"
          >
            See pricing &amp; plans
          </Link>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-panel border border-hairline text-sm font-semibold text-ink hover:bg-wash transition-colors"
          >
            Back to home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}

/**
 * Disclosure row. Uses native <details>/<summary> so keyboard and
 * screen-reader behaviour is correct without custom ARIA wiring.
 */
function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false)

  return (
    <details
      className="group"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 cursor-pointer list-none marker:hidden text-sm font-medium text-ink hover:bg-wash-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset">
        <span className="min-w-0">{item.question}</span>
        <ChevronDownIcon
          className={cn(
            'w-4 h-4 text-subtle shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </summary>
      <div className="px-5 sm:px-6 pb-4 -mt-1">
        <p className="text-sm text-muted leading-relaxed">{item.answer}</p>
      </div>
    </details>
  )
}
