import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Trucks & Loads — India Logistics Marketplace',
  description:
    'Search Vahan-verified trucks and freight loads across India. India logistics truck booking and cargo dispatch with 50km proximity matching, transparent match scores, and direct carrier connect.',
  keywords: [
    'India logistics',
    'truck booking',
    'cargo dispatch',
    'search trucks',
    'find lorry',
    'freight marketplace',
    'Vahan verified',
    'load posting',
    'transport booking India',
  ],
  openGraph: {
    title: 'LorryCarry Search — Find Trucks & Freight Loads Across India',
    description:
      'Discover Vahan-verified trucks within 50km. Direct India logistics, truck booking, cargo dispatch — smart match scoring, transparent pricing.',
    type: 'website',
  },
  alternates: {
    canonical: '/search',
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
