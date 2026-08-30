import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui'
import { MobileBottomNav } from '@/components/layout'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: "LorryCarry.com - India's Freight Marketplace & Logistics Control Tower",
  description: 'Find trucks, post loads, track fleets in real time. Direct carrier-shipper platform.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Applies the persisted theme before first paint so users never see a
          flash of the wrong theme. Must stay inline and synchronous.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
        <SpeedInsights />
      </body>
    </html>
  )
}
