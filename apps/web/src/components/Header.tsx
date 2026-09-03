'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Language = 'en' | 'ta'

interface NavItem {
  nameEn: string
  nameTa: string
  href: string
  icon: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element
  badge?: string
  badgeColor?: string
}

const navItems: NavItem[] = [
  {
    nameEn: 'Find Trucks',
    nameTa: 'சரக்கு வண்டிகள்',
    href: '/search?type=truck',
    icon: (props) => (
      <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8m-8 4h5m5 0a3 3 0 013 3v4a2 2 0 01-2 2h-1m-10 0H8a2 2 0 01-2-2V9a2 2 0 012-2h8a2 2 0 012 2v2m-6 9a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    ),
  },
  {
    nameEn: 'Find Loads',
    nameTa: 'சுமை தேடல்',
    href: '/search?type=load',
    icon: (props) => (
      <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    nameEn: 'Pricing & Plans',
    nameTa: 'கட்டண திட்டங்கள்',
    href: '/subscription',
    icon: (props) => (
      <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    nameEn: 'Control Tower',
    nameTa: 'கட்டுப்பாட்டு அறை',
    href: '/admin',
    icon: (props) => (
      <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    badge: 'LIVE',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  },
]

export default function Header() {
  const pathname = usePathname()
  const [lang, setLang] = useState<Language>('en')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Track scroll for elevation & border styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Prevent background scroll when mobile menu is open
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

  const isTabActive = (href: string) => {
    if (href.includes('?')) {
      const [base, query] = href.split('?')
      return pathname === base || (pathname === '/search' && typeof window !== 'undefined' && window.location.search.includes(query))
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 dark:bg-[#120B07]/95 backdrop-blur-md shadow-sm border-b border-gray-200/80 dark:border-white/10'
          : 'bg-white/85 dark:bg-[#120B07]/85 backdrop-blur-sm border-b border-gray-100 dark:border-white/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[70px]">
          
          {/* LEFT: Logo & Language Toggle */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-orange-400 flex items-center justify-center text-white shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-gray-900 dark:text-white leading-none">
                  Lorry<span className="text-primary-500">Carry</span>
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-wider uppercase hidden sm:block">
                  Logistics Network
                </span>
              </div>
            </Link>

            {/* Subtle Divider */}
            <div className="h-5 sm:h-6 w-px bg-gray-200 dark:bg-white/15" aria-hidden="true" />

            {/* Language Toggle Pill (தமிழ் | English) */}
            <div
              role="radiogroup"
              aria-label="Language selection"
              className="inline-flex items-center p-0.5 rounded-full bg-gray-100 dark:bg-stone-900 border border-gray-200/80 dark:border-white/10 text-xs font-medium"
            >
              <button
                type="button"
                role="radio"
                aria-checked={lang === 'ta'}
                onClick={() => setLang('ta')}
                className={`px-2.5 py-1 rounded-full transition-all duration-200 text-xs leading-none ${
                  lang === 'ta'
                    ? 'bg-primary-500 text-white shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                தமிழ்
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lang === 'en'}
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-full transition-all duration-200 text-xs leading-none ${
                  lang === 'en'
                    ? 'bg-primary-500 text-white shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* CENTER: Navigation Tabs (Desktop & Tablet Landscape) */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2" aria-label="Main Navigation">
            {navItems.map((item) => {
              const active = isTabActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50/70 dark:bg-primary-500/10'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-white/5'
                  }`}
                >
                  <item.icon
                    className={`w-4 h-4 transition-colors ${
                      active
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'
                    }`}
                  />
                  <span>{lang === 'ta' ? item.nameTa : item.nameEn}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide leading-none ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-500 rounded-full"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* RIGHT: CTA Button & Quick Access */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bright Orange Post Freight CTA */}
            <Link
              href="/post-load"
              className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold text-xs sm:text-sm px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 active:scale-[0.98] transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <svg className="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="whitespace-nowrap">
                {lang === 'ta' ? 'சுமை பதிவிடுக' : 'Post Freight'}
              </span>
            </Link>

            {/* Login / Dashboard Link (Desktop / Tablet) */}
            <Link
              href="/login"
              className="hidden md:inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 px-3 py-2 rounded-lg hover:bg-gray-100/60 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{lang === 'ta' ? 'உள்நுழைய' : 'Login'}</span>
            </Link>

            {/* Mobile / Tablet Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Subtle bottom gradient accent line */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />

      {/* MOBILE / TABLET SLIDE-OVER DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[65px] sm:top-[71px] z-40">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative bg-white dark:bg-[#160D07] border-b border-gray-200 dark:border-white/10 shadow-2xl px-5 py-6 space-y-6 max-h-[calc(100vh-72px)] overflow-y-auto">
            {/* Quick Language Toggle in Mobile Menu */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Language / மொழி:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setLang('ta')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    lang === 'ta' ? 'bg-primary-500 text-white shadow-sm' : 'bg-white dark:bg-stone-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  தமிழ்
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    lang === 'en' ? 'bg-primary-500 text-white shadow-sm' : 'bg-white dark:bg-stone-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Navigation Tabs List */}
            <nav className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3">
                {lang === 'ta' ? 'முதன்மை வழிசெலுத்தல்' : 'Primary Navigation'}
              </p>
              {navItems.map((item) => {
                const active = isTabActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between p-3.5 rounded-xl text-base font-medium transition-all ${
                      active
                        ? 'bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 border border-primary-500/20'
                        : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          active
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold">{lang === 'ta' ? item.nameTa : item.nameEn}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Prominent CTA in Mobile Menu */}
            <div className="pt-2">
              <Link
                href="/post-load"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 text-base transition-all"
              >
                <svg className="w-5 h-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>{lang === 'ta' ? 'சுமை பதிவிடுக (Post Freight)' : 'Post Freight Now'}</span>
              </Link>
            </div>

            {/* Quick Account / Help Footnote */}
            <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-primary-500 font-medium flex items-center gap-1.5"
              >
                <span>👤</span>
                <span>{lang === 'ta' ? 'கணக்கு உள்நுழைவு' : 'Account Login'}</span>
              </Link>
              <span>24/7 Helpline: 1800-LORRY</span>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
