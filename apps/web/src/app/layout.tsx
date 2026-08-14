import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui'
import { MobileBottomNav } from '@/components/layout'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: "LorryCarry.com - India's Freight Marketplace & Logistics Control Tower",
  description: 'Find trucks, post loads, track fleets in real time. Direct carrier-shipper platform.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-[#070A11] text-surface-100 antialiased">
        {children}
        <MobileBottomNav />
        <ToastProvider />
        <SpeedInsights />
      </body>
    </html>
  )
}
