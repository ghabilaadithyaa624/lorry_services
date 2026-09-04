import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LorryCarry — India's Freight Marketplace & Logistics Control Tower",
    short_name: 'LorryCarry',
    description:
      'India logistics, truck booking, cargo dispatch platform — direct Vahan-verified fleet with zero broker commission.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070A11',
    theme_color: '#F97316',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['logistics', 'business', 'transportation'],
    lang: 'en-IN',
    dir: 'ltr',
  }
}
