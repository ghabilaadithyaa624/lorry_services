'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDown,
  Menu,
  PlusCircle,
  Truck,
  X,
} from 'lucide-react'
import { notificationsApi, usersApi } from '@/lib/api'
import { ProfileMenu, type ProfileMenuUser } from './ProfileMenu'
import { LanguageToggle } from './LanguageToggle'
import { Button } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import {
  CTA_ROUTES,
  NAV_SECTIONS,
  isPricingActive,
  isRequestDemoActive,
  isSectionActive,
  type NavSection,
} from './navigation'

/**
 * Navbar — LorryCarry public header.
 *
 * B2B SaaS navigation chrome (LocoNav-style structure, LorryCarry identity):
 * - Logo left, then the தமிழ் | हिन्दी | English language toggle.
 * - Products mega menu (the six LorryCarry modules), Solutions / Resources /
 *   Company dropdowns and a direct Pricing & Plans link.
 * - Sign in (anonymous) or bell + profile menu (signed in) on the right, with
 *   the bright orange “Post Freight” CTA pinned at every breakpoint.
 * - Accessibility: every menu is a disclosure pattern with `aria-expanded` /
 *   `aria-controls`, closes on Escape or focus-out (returning focus to its
 *   trigger), and every interactive element has a visible focus ring.
 * - CTAs route truthfully: Post Freight → `/post-load` (middleware sends
 *   anonymous visitors through `/login?redirect=/post-load`), Pricing →
 *   `/subscribe`, Sign in → `/login`.
 */

type MenuKey = NavSection['key']

const SECTION_IDS: Record<MenuKey, string> = {
  products: 'nav-menu-products',
  solutions: 'nav-menu-solutions',
  resources: 'nav-menu-resources',
  company: 'nav-menu-company',
}

/** Hook: closes menus on outside pointer-down and Escape (returns focus). */
function useDismissableOpen(
  openKey: MenuKey | null,
  setOpen: (key: MenuKey | null) => void,
  triggerRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>,
  rootRef: React.RefObject<HTMLElement>
) {
  useEffect(() => {
    if (!openKey) return

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setOpen(null)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(null)
        triggerRefs.current[openKey]?.focus()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openKey, setOpen, triggerRefs, rootRef])
}

interface MegaMenuProps {
  onNavigate: () => void
}

/** Products mega menu — card grid of the six LorryCarry modules. */
function ProductsMegaMenu({ onNavigate }: MegaMenuProps) {
  const { t } = useI18n()
  return (
    <div className="w-[min(92vw,44rem)] rounded-2xl border border-hairline bg-panel shadow-modal overflow-hidden animate-scale-in origin-top">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
        {NAV_SECTIONS[0].modules?.map((module) => {
          const Icon = module.icon
          return (
            <Link
              key={module.key}
              href={module.href}
              onClick={onNavigate}
              className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-wash-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span
                className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 transition-colors group-hover:bg-primary-500 group-hover:text-white"
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className="truncate">{t(module.titleKey)}</span>
                  {module.badge === 'admin' && (
                    <span className="shrink-0 rounded border border-hairline bg-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                      {t('nav.badge.admin')}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {t(module.descKey)}
                </span>
              </span>
              <ArrowRight
                className="ml-auto mt-1 h-4 w-4 shrink-0 text-subtle opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                aria-hidden="true"
              />
            </Link>
          )
        })}
      </div>

      {/* Footer quick strip — the primary marketplace actions */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline bg-sunken/60 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
          {t('nav.mega.explore')}
        </span>
        <Link
          href={CTA_ROUTES.findTrucks}
          onClick={onNavigate}
          className="text-xs font-semibold text-body hover:text-primary-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          {t('nav.findTrucks')}
        </Link>
        <Link
          href={CTA_ROUTES.findLoads}
          onClick={onNavigate}
          className="text-xs font-semibold text-body hover:text-primary-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          {t('nav.findLoads')}
        </Link>
        <Link
          href={CTA_ROUTES.postFreight}
          onClick={onNavigate}
          className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          {t('nav.postFreight')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

/** Simple dropdown for Solutions / Resources / Company. */
function SimpleDropdownMenu({ section, onNavigate }: { section: NavSection } & MegaMenuProps) {
  const { t } = useI18n()
  const withDescriptions = section.key === 'solutions'
  return (
    <div
      className={cn(
        'rounded-2xl border border-hairline bg-panel shadow-modal p-2 animate-scale-in origin-top',
        withDescriptions ? 'w-[min(92vw,24rem)]' : 'w-64'
      )}
    >
      {section.links?.map((link) => {
        const Icon = link.icon
        return (
          <Link
            key={link.key}
            href={link.href}
            onClick={onNavigate}
            className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-wash-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <span
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20"
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink leading-snug">
                {t(link.labelKey)}
              </span>
              {link.descKey && (
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {t(link.descKey)}
                </span>
              )}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

interface DesktopMenuProps {
  section: NavSection
  open: boolean
  onToggle: () => void
  onClose: () => void
  onOpen: () => void
  triggerRef: (el: HTMLButtonElement | null) => void
}

/** Desktop disclosure trigger + panel for one nav section. */
function DesktopMenu({ section, open, onToggle, onClose, onOpen, triggerRef }: DesktopMenuProps) {
  const { t } = useI18n()
  const active = isSectionActive(section, usePathname())
  const menuId = SECTION_IDS[section.key]

  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onClose()
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          open || active
            ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10'
            : 'text-body hover:text-ink hover:bg-wash'
        )}
      >
        {t(section.labelKey)}
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        /* Products anchors to the trigger's start edge so the wide panel can
           never clip the viewport left edge; smaller dropdowns stay centred. */
        <div
          id={menuId}
          className={cn(
            'absolute top-full z-50 pt-2',
            section.key === 'products' ? 'start-0' : 'left-1/2 -translate-x-1/2'
          )}
        >
          {section.key === 'products' ? (
            <ProductsMegaMenu onNavigate={onClose} />
          ) : (
            <SimpleDropdownMenu section={section} onNavigate={onClose} />
          )}
        </div>
      )}
    </div>
  )
}

interface DesktopMenusProps {
  openKey: MenuKey | null
  setOpenKey: (key: MenuKey | null) => void
  triggerRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>
  rootRef: React.RefObject<HTMLElement>
}

/** Desktop navigation row — mega menu, dropdowns and the Pricing link. */
function DesktopMenus({ openKey, setOpenKey, triggerRefs, rootRef }: DesktopMenusProps) {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <nav className="hidden xl:flex items-center gap-0.5 shrink-0" aria-label="Primary" ref={rootRef as React.RefObject<HTMLElement>}>
      {NAV_SECTIONS.map((section) => (
        <DesktopMenu
          key={section.key}
          section={section}
          open={openKey === section.key}
          onToggle={() => setOpenKey(openKey === section.key ? null : section.key)}
          onOpen={() => setOpenKey(section.key)}
          onClose={() => setOpenKey(null)}
          triggerRef={(el) => {
            triggerRefs.current[section.key] = el
          }}
        />
      ))}
      <Link
        href={CTA_ROUTES.pricing}
        aria-current={isPricingActive(pathname) ? 'page' : undefined}
        className={cn(
          'flex items-center rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          isPricingActive(pathname)
            ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10'
            : 'text-body hover:text-ink hover:bg-wash'
        )}
      >
        {t('nav.pricing')}
      </Link>
      <Link
        href={CTA_ROUTES.requestDemo}
        aria-current={isRequestDemoActive(pathname) ? 'page' : undefined}
        className={cn(
          'hidden 2xl:flex items-center rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          isRequestDemoActive(pathname)
            ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10'
            : 'text-body hover:text-ink hover:bg-wash'
        )}
      >
        {t('nav.requestDemo')}
      </Link>
    </nav>
  )
}

/** Mobile drawer accordion section (single-open). */
function MobileMenuSection({
  section,
  open,
  onToggle,
  onNavigate,
}: {
  section: NavSection
  open: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  const { t } = useI18n()
  const sectionId = `mobile-${SECTION_IDS[section.key]}`
  return (
    <div className="rounded-xl border border-hairline bg-panel overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={sectionId}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3.5 text-start text-sm font-semibold transition-colors min-h-[44px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
          open ? 'text-primary-600 dark:text-primary-400' : 'text-ink'
        )}
      >
        {t(section.labelKey)}
        <ChevronDown
          className={cn('h-4 w-4 text-muted transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={sectionId} className="border-t border-hairline p-2 space-y-0.5 animate-fade-in">
          {section.modules?.map((module) => {
            const Icon = module.icon
            return (
              <Link
                key={module.key}
                href={module.href}
                onClick={onNavigate}
                className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-wash-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span
                  className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20"
                  aria-hidden="true"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="truncate">{t(module.titleKey)}</span>
                    {module.badge === 'admin' && (
                      <span className="shrink-0 rounded border border-hairline bg-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                        {t('nav.badge.admin')}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                    {t(module.descKey)}
                  </span>
                </span>
              </Link>
            )
          })}
          {section.links?.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.key}
                href={link.href}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-lg p-2.5 text-sm font-medium text-body transition-colors hover:bg-wash-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px]"
              >
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20"
                  aria-hidden="true"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="truncate">{t(link.labelKey)}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const { t } = useI18n()
  const [user, setUser] = useState<ProfileMenuUser | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openMobileSection, setOpenMobileSection] = useState<MenuKey | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [verified, setVerified] = useState(false)
  const [subscriptionActive, setSubscriptionActive] = useState(false)

  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const desktopNavRef = useRef<HTMLElement | null>(null)
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null)
  useDismissableOpen(openMenu, setOpenMenu, triggerRefs, desktopNavRef)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) setUser(JSON.parse(storedUser))
      else setUser(null)
    } catch {
      setUser(null)
    }
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Route changes close both the desktop menus and the mobile drawer.
  useEffect(() => {
    setOpenMenu(null)
    setMobileMenuOpen(false)
    setOpenMobileSection(null)
  }, [pathname])

  // Escape closes the mobile drawer and returns focus to the hamburger.
  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        mobileToggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  // Prevent background scroll while the mobile drawer is open.
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  const lastUnreadCount = useRef(-1)

  /**
   * Load the notification badge and account status.
   * Failures are silent: the badge is supplementary and must never block chrome.
   */
  const loadAccountSignals = useCallback(async () => {
    if (!user) return
    try {
      const [notifications, profile] = await Promise.allSettled([
        notificationsApi.getUnreadCount(),
        usersApi.getProfile(),
      ])
      if (notifications.status === 'fulfilled') {
        const next = notifications.value.data?.unreadCount || 0
        // In-app alert for newly arrived WhatsApp/tracking alerts.
        if (lastUnreadCount.current >= 0 && next > lastUnreadCount.current) {
          toast.info(
            `You have ${next - lastUnreadCount.current} new notification${next - lastUnreadCount.current === 1 ? '' : 's'}`,
          )
        }
        lastUnreadCount.current = next
        setUnreadCount(next)
      }
      if (profile.status === 'fulfilled') {
        setVerified(Boolean(profile.value.data?.verification?.isVerifiedTransporter))
        setSubscriptionActive(Boolean(profile.value.data?.subscription?.isActive))
      }
    } catch {
      // Non-critical.
    }
  }, [user])

  useEffect(() => {
    lastUnreadCount.current = -1
    loadAccountSignals()

    // Poll for fresh in-app alerts so the bell and toast stay live without a
    // page reload. The API is lightweight; failures are ignored by the loader.
    const interval = setInterval(loadAccountSignals, 30_000)
    return () => clearInterval(interval)
  }, [loadAccountSignals])

  // Auth screens render without global chrome.
  if (pathname === '/login' || pathname === '/role-select') return null

  const closeMobile = () => setMobileMenuOpen(false)

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 w-full transition-shadow duration-200 border-b glass',
          scrolled ? 'shadow-card border-hairline' : 'border-hairline'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 h-16">
            {/* Brand + language toggle */}
            <div className="flex items-center gap-3 lg:gap-4 shrink-0">
              <Link
                href="/"
                className="flex items-center gap-2.5 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas shrink-0"
              >
                <span
                  className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                  aria-hidden="true"
                >
                  <Truck className="w-[18px] h-[18px] stroke-[2.4]" />
                </span>
                <span className="hidden min-[380px]:block text-lg font-bold tracking-tight text-ink leading-none">
                  Lorry<span className="text-primary-500">Carry</span>
                </span>
              </Link>

              {/* Language toggle — beside the logo at every breakpoint */}
              <div className="hidden sm:block shrink-0">
                <LanguageToggle />
              </div>
              <div className="sm:hidden shrink-0">
                <LanguageToggle compact />
              </div>
            </div>

            {/* Desktop navigation — mega menu + dropdowns + pricing */}
            <DesktopMenus
              openKey={openMenu}
              setOpenKey={setOpenMenu}
              triggerRefs={triggerRefs}
              rootRef={desktopNavRef}
            />

            {/* Right side — CTA, notifications, account */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {user && (
                <Link
                  href="/notifications"
                  className="relative p-2.5 rounded-xl text-muted hover:text-ink hover:bg-wash transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center"
                  aria-label={
                    unreadCount > 0
                      ? `Notifications, ${unreadCount} unread`
                      : 'Notifications'
                  }
                >
                  <Bell className="w-5 h-5" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-canvas"
                      aria-hidden="true"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Request Demo — public B2B sales CTA, visible from sm up.
                  The filled Post Freight button stays the product action. */}
              <Button
                as={Link}
                href={CTA_ROUTES.requestDemo}
                variant="outline"
                size="sm"
                leftIcon={<CalendarDays className="w-4 h-4" />}
                className="hidden md:inline-flex"
              >
                {t('nav.requestDemo')}
              </Button>

              {/* Bright orange “Post Freight” CTA — always visible on the right.
                  Routes to /post-load; middleware guides anonymous visitors
                  through /login?redirect=/post-load. */}
              <Button
                as={Link}
                href={CTA_ROUTES.postFreight}
                variant="primary"
                size="sm"
                leftIcon={<PlusCircle className="w-4 h-4" />}
                className="hidden sm:inline-flex bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-glow-primary border-primary-500/40"
              >
                {t('nav.postFreight')}
              </Button>
              {/* Icon-only CTA keeps the action one tap away on phones */}
              <Link
                href={CTA_ROUTES.postFreight}
                aria-label={t('nav.postFreight')}
                className="sm:hidden inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-button bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow-primary border border-primary-500/40 transition-colors hover:from-primary-600 hover:to-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <PlusCircle className="w-5 h-5" aria-hidden="true" />
              </Link>

              {user ? (
                <div className="hidden sm:block">
                  <ProfileMenu
                    user={user}
                    verified={verified}
                    subscriptionActive={subscriptionActive}
                  />
                </div>
              ) : (
                <Button
                  as={Link}
                  href={CTA_ROUTES.signIn}
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  {t('nav.signIn')}
                </Button>
              )}

              {/* Mobile / tablet menu toggle */}
              <button
                type="button"
                ref={mobileToggleRef}
                className="xl:hidden p-2.5 rounded-xl text-muted hover:text-ink hover:bg-wash transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
                aria-label={mobileMenuOpen ? t('nav.menu.close') : t('nav.menu.open')}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Menu className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile / tablet drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="xl:hidden border-t border-hairline bg-canvas px-4 py-4 space-y-3 shadow-elevated animate-fade-in max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <nav className="space-y-2" aria-label="Primary mobile">
              {NAV_SECTIONS.map((section) => (
                <MobileMenuSection
                  key={section.key}
                  section={section}
                  open={openMobileSection === section.key}
                  onToggle={() =>
                    setOpenMobileSection(openMobileSection === section.key ? null : section.key)
                  }
                  onNavigate={closeMobile}
                />
              ))}

              {/* Pricing & Plans — direct link, no accordion needed */}
              <Link
                href={CTA_ROUTES.pricing}
                onClick={closeMobile}
                aria-current={isPricingActive(pathname) ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  isPricingActive(pathname)
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10'
                    : 'text-ink hover:bg-wash'
                )}
              >
                {t('nav.pricing')}
                <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
              </Link>

              <Link
                href={CTA_ROUTES.requestDemo}
                onClick={closeMobile}
                aria-current={isRequestDemoActive(pathname) ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  isRequestDemoActive(pathname)
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10'
                    : 'text-ink hover:bg-wash'
                )}
              >
                {t('nav.requestDemo')}
                <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
              </Link>
            </nav>

            {/* Full-size language control inside the drawer */}
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-sunken/60 border border-hairline">
              <span className="text-sm font-medium text-body">{t('nav.language')}</span>
              <LanguageToggle />
            </div>

            <div className="pt-3 border-t border-hairline space-y-2">
              {user ? (
                <>
                  <Button
                    as={Link}
                    href={CTA_ROUTES.requestDemo}
                    onClick={closeMobile}
                    variant="outline"
                    size="md"
                    fullWidth
                    leftIcon={<CalendarDays className="w-4 h-4" />}
                  >
                    {t('nav.requestDemo')}
                  </Button>
                  <Button
                    as={Link}
                    href={CTA_ROUTES.postFreight}
                    onClick={closeMobile}
                    variant="primary"
                    size="md"
                    fullWidth
                    leftIcon={<PlusCircle className="w-4 h-4" />}
                    className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-glow-primary border-primary-500/40"
                  >
                    {t('nav.postFreight')}
                  </Button>
                  <Link
                    href="/profile"
                    onClick={closeMobile}
                    className="block px-3.5 py-3 rounded-xl text-sm font-medium text-body hover:text-ink hover:bg-wash transition-colors min-h-[44px]"
                  >
                    {t('nav.profileAccount')}
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={closeMobile}
                    className="block px-3.5 py-3 rounded-xl text-sm font-medium text-body hover:text-ink hover:bg-wash transition-colors min-h-[44px]"
                  >
                    {t('nav.notifications')}
                    {unreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 text-white text-[11px] font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/settings"
                    onClick={closeMobile}
                    className="block px-3.5 py-3 rounded-xl text-sm font-medium text-body hover:text-ink hover:bg-wash transition-colors min-h-[44px]"
                  >
                    {t('nav.settings')}
                  </Link>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button as={Link} href={CTA_ROUTES.signIn} onClick={closeMobile} variant="secondary" size="md" fullWidth>
                      {t('nav.signIn')}
                    </Button>
                    <Button
                      as={Link}
                      href={CTA_ROUTES.postFreight}
                      onClick={closeMobile}
                      variant="primary"
                      size="md"
                      fullWidth
                      leftIcon={<PlusCircle className="w-4 h-4" />}
                      className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-glow-primary border-primary-500/40"
                    >
                      {t('nav.postFreight')}
                    </Button>
                  </div>
                  <Button
                    as={Link}
                    href={CTA_ROUTES.requestDemo}
                    onClick={closeMobile}
                    variant="outline"
                    size="md"
                    fullWidth
                    leftIcon={<CalendarDays className="w-4 h-4" />}
                  >
                    {t('nav.requestDemo')}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Spacer keeps page content clear of the fixed header. */}
      <div aria-hidden="true" className="h-16 shrink-0" />
    </>
  )
}

export default Navbar
