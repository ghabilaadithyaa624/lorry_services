import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui'
import { MobileBottomNav } from '@/components/layout'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import { LANGUAGE_INIT_SCRIPT } from '@/lib/language'
import Script from 'next/script'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { StructuredData } from '@/components/seo/StructuredData'
import {
  getOrganizationStructuredData,
  getWebsiteStructuredData,
  getServiceListingsStructuredData,
  getLogisticsServiceStructuredData,
} from '@/lib/seo/structuredData'

// ── Optimized font loading via next/font (eliminates render-blocking Google Fonts stylesheet) ──
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-geist-mono',
  preload: true,
  fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'],
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lorrycarry.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LorryCarry.com - India's Freight Marketplace & Logistics Control Tower",
    template: '%s | LorryCarry',
  },
  description:
    'India’s direct freight marketplace connecting load owners and verified truck operators with zero broker commission. 50km proximity matching, Vahan-verified trucks, FASTag checkpoint tracking, 50% advance / 50% POD. Find trucks, post loads, dispatch cargo across India logistics corridors.',
  keywords: [
    'India logistics',
    'truck booking',
    'cargo dispatch',
    'freight marketplace',
    'lorry booking India',
    'goods transport India',
    'truck hire',
    'load posting',
    'freight load',
    'Vahan verified trucks',
    'FASTag tracking',
    'transport booking',
    'fleet management',
    'logistics control tower',
    'direct freight',
    'zero broker commission',
    'cargo transport',
    'interstate trucking India',
    'industrial freight',
    'container truck booking',
  ],
  authors: [{ name: 'LorryCarry', url: SITE_URL }],
  creator: 'LorryCarry',
  publisher: 'LorryCarry',
  category: 'logistics',
  classification: 'Freight & Logistics',
  applicationName: 'LorryCarry',
  referrer: 'origin-when-cross-origin',
  alternates: {
    canonical: '/',
    languages: {
      'en-IN': '/',
      'hi-IN': '/?lang=hi',
      'ta-IN': '/?lang=ta',
    },
  },
  openGraph: {
    title: "LorryCarry.com - India's Freight Marketplace & Logistics Control Tower",
    description:
      'Find Vahan-verified trucks, post loads, track fleets with FASTag checkpoints. Direct India logistics, truck booking, cargo dispatch – zero brokerage, 50km proximity matching.',
    url: SITE_URL,
    siteName: 'LorryCarry',
    images: [
      {
        url: '/images/highway-trucks-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'LorryCarry India logistics highway corridor — direct freight network',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_IN',
    type: 'website',
    countryName: 'India',
  },
  twitter: {
    card: 'summary_large_image',
    title: "LorryCarry.com - India's Freight Marketplace & Logistics Control Tower",
    description:
      'Direct India logistics, truck booking, cargo dispatch. Vahan-verified fleet, 50km matching, FASTag tracking. Zero broker commission.',
    images: ['/images/highway-trucks-hero.jpg'],
    creator: '@lorrycarry',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  verification: {
    // Placeholder — replace with real verification tokens when available
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  other: {
    'freight-keywords': 'India logistics, truck booking, cargo dispatch',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#070A11' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // JSON-LD structured data for SEO — rendered server-side for crawlability
  const organizationLd = getOrganizationStructuredData()
  const websiteLd = getWebsiteStructuredData()
  const servicesLd = getServiceListingsStructuredData()
  const logisticsLd = getLogisticsServiceStructuredData()

  return (
    <html lang="en" suppressHydrationWarning className={`${plusJakartaSans.variable} ${jetBrainsMono.variable}`}>
      <head>
        {/* Theme must apply before first paint — inline synchronous script (critical) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />

        {/*
          Applies the persisted UI language's `lang`/`dir` attributes and the
          Tamil font-scaling class before first paint — mirrors the theme
          script above so switching to தமிழ் never flashes undersized glyphs.
        */}
        <script dangerouslySetInnerHTML={{ __html: LANGUAGE_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Resource hints for performance — preconnect & dns-prefetch reduce DNS/TCP handshake latency */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'} />
        {/* Preload LCP hero image — high priority for Largest Contentful Paint (next/image priority also handles preload, this ensures fastest discovery) */}
        <link rel="preload" as="image" href="/images/highway-trucks-hero.jpg" fetchPriority="high" />

        {/* Structured Data — Organization, Website, Service Listings */}
        <StructuredData data={organizationLd} id="org-ld" />
        <StructuredData data={websiteLd} id="website-ld" />
        <StructuredData data={servicesLd} id="services-ld" />
        <StructuredData data={logisticsLd} id="logistics-ld" />
      </head>
      <body className="font-sans bg-canvas text-body antialiased">
        {/* Skip link — first tab stop for keyboard and screen-reader users */}
        <a
          href="#main-content"
          className="sr-only sr-only-focusable focus-visible:z-[100] focus-visible:top-4 focus-visible:left-4 focus-visible:rounded-xl focus-visible:bg-primary-500 focus-visible:px-4 focus-visible:py-2.5 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-white focus-visible:shadow-elevated"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          {children}
          <MobileBottomNav />
          <ToastProvider />
        </ThemeProvider>
        {/* Deferred non-critical script — lazyOnload ensures it never blocks LCP or TTI */}
        <Script id="lorrycarry-analytics-loader" strategy="lazyOnload">
          {`window.lorrycarryAnalyticsLoaded=true;`}
        </Script>
        <SpeedInsights />
      </body>
    </html>
  )
}
