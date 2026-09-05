'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Truck,
  Search,
  LifeBuoy,
  PlusCircle,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { whatsappLink, cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

const SUPPORT_PHONE = '918072025106'

/**
 * WhatsApp brand mark.
 *
 * Rendered as an inline SVG because stroke-based icon libraries do not ship a
 * brand-consistent WhatsApp glyph. The path keeps the icon crisp at small
 * sizes and uses `currentColor` so it inherits the surrounding button colour.
 */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

export function Footer() {
  const { t } = useI18n()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  /**
   * Simplified footer navigation — exactly four columns:
   * Platform · Resources · Support · Legal.
   */
  const footerGroups = [
    {
      title: 'PLATFORM',
      i18nKey: 'footer.platform',
      links: [
        { label: 'Post Load', href: '/post-load' },
        { label: 'Find Trucks', href: '/search?type=truck' },
        { label: 'Find Loads', href: '/search?type=load' },
        { label: 'Pricing & Plans', href: '/subscribe' },
        { label: 'Request Demo', href: '/request-demo' },
        { label: 'Track Shipments', href: '/tracking' },
      ],
    },
    {
      title: 'RESOURCES',
      i18nKey: 'footer.resources',
      links: [
        { label: 'Freight Rate Benchmarks', href: '/subscribe' },
        { label: 'Route Corridors', href: '/corridors' },
        { label: 'Documents & Verification', href: '/documents' },
        { label: 'Procurement Intelligence', href: '/procurement' },
        { label: 'Freight Analytics', href: '/analytics' },
      ],
    },
    {
      title: 'SUPPORT',
      i18nKey: 'footer.support',
      links: [
        { label: 'Help & Support', href: '/help' },
        { label: '24/7 Freight Helpline', href: 'tel:+918072025106' },
        { label: 'WhatsApp Dispatch Desk', href: whatsappLink(SUPPORT_PHONE, 'Hi LorryCarry Support, I need assistance.') },
        { label: 'Dispute Resolution', href: '/help' },
        { label: 'Account Settings', href: '/settings' },
      ],
    },
    {
      title: 'LEGAL',
      i18nKey: 'footer.legal',
      links: [
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Privacy & Data Security', href: '/privacy' },
        { label: 'Security & Account', href: '/security' },
        { label: 'Carrier Liability Policy', href: '/terms' },
        { label: 'Zero-Brokerage Guarantee', href: '/#comparison' },
      ],
    },
  ]

  return (
    <footer className="bg-canvas text-muted border-t border-hairline font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Brand + quick actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-10 border-b border-hairline">
          <div className="space-y-3 max-w-xl">
            <Link href="/" className="inline-flex items-center gap-2.5 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas">
              <span
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-glow-primary border border-primary-400/30 transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                aria-hidden="true"
              >
                <Truck className="w-5 h-5 stroke-[2.4]" />
              </span>
              <span className="text-xl font-black tracking-tight text-ink leading-none">
                Lorry<span className="text-primary-500">Carry</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Button
              as={Link}
              href="/post-load"
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-glow-primary border-primary-500/40"
            >
              {t('footer.quickPostLoad')}
            </Button>
            <Button
              as={Link}
              href="/search?type=truck"
              variant="secondary"
              size="sm"
              leftIcon={<Search className="w-4 h-4" />}
            >
              {t('footer.quickFindTruck')}
            </Button>
            <Button
              as={Link}
              href="/help"
              variant="secondary"
              size="sm"
              leftIcon={<LifeBuoy className="w-4 h-4" />}
            >
              {t('footer.quickContactSupport')}
            </Button>

            {/* WhatsApp helpline icon with hover / focus tooltip */}
            <div className="group relative">
              <a
                href={whatsappLink(SUPPORT_PHONE, 'Hi LorryCarry Support, I need help with freight dispatch.')}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('footer.whatsappHelpline')}
                aria-describedby="whatsapp-helpline-tooltip"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-whatsapp/15 border border-whatsapp/40 text-whatsapp hover:bg-whatsapp hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <WhatsAppIcon className="w-5 h-5" />
              </a>
              <span
                id="whatsapp-helpline-tooltip"
                role="tooltip"
                className="absolute bottom-full right-0 z-20 mb-2 w-max max-w-[240px] rounded-lg bg-ink text-canvas border border-hairline-strong shadow-card px-3 py-1.5 text-[11px] font-semibold leading-snug pointer-events-none opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
              >
                {t('footer.whatsappTooltip')}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop 4-column footer links */}
        <div className="hidden md:grid grid-cols-4 gap-8 pt-10">
          {footerGroups.map((group) => (
            <div key={group.i18nKey} className="space-y-3">
              <h5 className="text-[11px] font-mono font-bold text-ink uppercase tracking-wider">
                {t(group.i18nKey)}
              </h5>
              <ul className="space-y-2 text-xs">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted hover:text-ink transition-colors block truncate"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Mobile accordion groups */}
        <div className="md:hidden pt-8 space-y-3">
          {footerGroups.map((group) => {
            const isOpen = !!openSections[group.title]
            const sectionId = `footer-${group.i18nKey.replace('.', '-')}`
            return (
              <div key={group.i18nKey} className="border-b border-hairline pb-3">
                <button
                  type="button"
                  onClick={() => toggleSection(group.title)}
                  aria-expanded={isOpen}
                  aria-controls={sectionId}
                  className="w-full flex items-center justify-between py-1 text-xs font-mono font-bold text-ink uppercase tracking-wider text-left"
                >
                  <span>{t(group.i18nKey)}</span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-muted transition-transform duration-200',
                      isOpen && 'rotate-180 text-primary-500'
                    )}
                  />
                </button>

                {isOpen && (
                  <ul id={sectionId} className="pt-2 pb-1 space-y-2 text-xs">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="text-muted hover:text-ink transition-colors block py-0.5"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        {/* Bottom legal / copyright bar */}
        <div className="mt-12 pt-8 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted">
          <p>© {new Date().getFullYear()} LorryCarry Operations Platform. All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-glow-sm" />
            <span>Direct Freight Operating System • Zero Middleman Brokerage</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
