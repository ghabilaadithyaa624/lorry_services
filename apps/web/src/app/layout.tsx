import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const geistMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: "LorryCarry.com - India's Freight Marketplace & Logistics Control Tower",
  description: 'Find trucks, post loads, track fleets in real time. Direct carrier-shipper platform.',
}

import { ToastProvider } from '@/components/ui'
import { MobileBottomNav } from '@/components/layout'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${geistMono.variable} font-sans bg-[#070A11] text-surface-100 antialiased`}>
        {children}
        <MobileBottomNav />
        <ToastProvider />
      </body>
    </html>
  )
}
