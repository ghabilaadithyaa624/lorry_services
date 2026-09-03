/**
 * LorryCarry SEO — Structured Data Helpers (JSON-LD)
 *
 * Generates schema.org JSON-LD for:
 * - Organization
 * - WebSite with SearchAction
 * - Service / Service Listings (freight marketplace)
 * - BreadcrumbList
 * - FAQPage
 * - ItemList for search results
 *
 * All helpers return plain objects ready to JSON.stringify and inject via
 * <script type="application/ld+json">.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lorrycarry.com'
const SITE_NAME = 'LorryCarry'
const LOGO_URL = `${SITE_URL}/images/highway-trucks-hero.jpg`

export interface ServiceListing {
  id: string
  name: string
  description: string
  serviceType: string
  areaServed?: string
  url?: string
  keywords?: string[]
}

// ───────────── Organization ─────────────
export function getOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: LOGO_URL,
      width: 1200,
      height: 630,
    },
    description:
      'India’s direct freight marketplace connecting load owners and verified truck operators with zero broker commission. India logistics, truck booking, cargo dispatch platform.',
    foundingLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
      },
    },
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
    keywords: 'India logistics, truck booking, cargo dispatch, freight marketplace, lorry booking India',
    sameAs: [
      'https://www.linkedin.com/company/lorrycarry',
      'https://twitter.com/lorrycarry',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+91-8072025106',
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['en', 'hi', 'ta'],
        contactOption: 'TollFree',
      },
    ],
  }
}

// ───────────── WebSite + SearchAction ─────────────
export function getWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}#website`,
    url: SITE_URL,
    name: `${SITE_NAME} — India's Freight Marketplace & Logistics Control Tower`,
    description:
      'Find trucks, post loads, track fleets in real time. Direct carrier-shipper platform for India logistics, truck booking, cargo dispatch.',
    publisher: {
      '@id': `${SITE_URL}#organization`,
    },
    inLanguage: 'en-IN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?location={search_term_string}&type=truck`,
      },
      'query-input': 'required name=search_term_string',
    },
    keywords: 'India logistics, truck booking, cargo dispatch, freight marketplace',
  }
}

// ───────────── Service Listings (core requirement) ─────────────
export const FREIGHT_SERVICES: ServiceListing[] = [
  {
    id: 'india-logistics',
    name: 'India Logistics Network',
    description:
      'Pan-India logistics operating system covering major freight corridors – Delhi NCR, Mumbai JNPT, Chennai, Bengaluru, Hyderabad, Ahmedabad, Kolkata with 50km proximity matching.',
    serviceType: 'LogisticsService',
    areaServed: 'India',
    url: `${SITE_URL}/search?type=truck`,
    keywords: ['India logistics', 'freight corridors', 'national logistics'],
  },
  {
    id: 'truck-booking',
    name: 'Truck Booking & Fleet Dispatch',
    description:
      'Direct truck booking with Vahan-verified lorries – Open body, Container, Trailer. Zero broker commission, direct phone & WhatsApp connect to drivers.',
    serviceType: 'TruckBooking',
    areaServed: 'India',
    url: `${SITE_URL}/search?type=truck`,
    keywords: ['truck booking', 'lorry booking', 'truck hire India', 'fleet dispatch'],
  },
  {
    id: 'cargo-dispatch',
    name: 'Cargo Dispatch & Load Posting',
    description:
      'Post freight loads and get matched with nearest verified trucks within 50km loading radius. Industrial goods, FMCG, pharma, chemicals, machinery.',
    serviceType: 'CargoDispatch',
    areaServed: 'India',
    url: `${SITE_URL}/post-load`,
    keywords: ['cargo dispatch', 'load posting', 'freight load', 'goods transport'],
  },
  {
    id: 'freight-tracking',
    name: 'FASTag Corridor Tracking',
    description:
      'Checkpoint-based milestone tracking using highway toll gate FASTag logs. Digital POD, E-way bill compliance, and 50% advance / 50% POD payment protocol.',
    serviceType: 'ParcelDelivery',
    areaServed: 'India',
    url: `${SITE_URL}/tracking`,
    keywords: ['freight tracking', 'FASTag tracking', 'toll checkpoint', 'POD verification'],
  },
  {
    id: 'freight-rate-intelligence',
    name: 'Freight Rate Intelligence',
    description:
      'Deterministic freight pricing estimator per ton-km by truck type with transparent corridor benchmarks. Indicative benchmark rates for informed negotiation.',
    serviceType: 'FinancialService',
    areaServed: 'India',
    url: `${SITE_URL}/corridors`,
    keywords: ['freight rate', 'transport pricing', 'rate per ton km'],
  },
  {
    id: 'vahan-verification',
    name: 'Vahan RC Verification',
    description:
      'Government Vahan/Parivahan RC, insurance and owner identity authentication for every truck before marketplace visibility.',
    serviceType: 'GovernmentService',
    areaServed: 'India',
    url: `${SITE_URL}/search?type=truck`,
    keywords: ['Vahan verification', 'RC verification', 'truck verification'],
  },
]

export function getServiceListingsStructuredData(services: ServiceListing[] = FREIGHT_SERVICES) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'LorryCarry Freight Services',
    description: 'Direct freight service listings: India logistics, truck booking, cargo dispatch and corridor intelligence.',
    numberOfItems: services.length,
    itemListElement: services.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        '@id': `${SITE_URL}#service-${service.id}`,
        name: service.name,
        description: service.description,
        serviceType: service.serviceType,
        provider: {
          '@id': `${SITE_URL}#organization`,
        },
        areaServed: {
          '@type': 'Country',
          name: service.areaServed || 'India',
        },
        url: service.url || SITE_URL,
        keywords: (service.keywords || []).join(', '),
        offers: {
          '@type': 'Offer',
          availability: 'https://schema.org/InStock',
          priceCurrency: 'INR',
          url: service.url || SITE_URL,
          category: service.serviceType,
        },
      },
    })),
  }
}

// Legacy single-service helper (for compatibility)
export function getTransportServiceStructuredData() {
  return getServiceListingsStructuredData()
}

// ───────────── FAQPage ─────────────
export interface FaqItem {
  question: string
  answer: string
}

export function getFaqStructuredData(faqs: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

// ───────────── BreadcrumbList ─────────────
export interface BreadcrumbItem {
  name: string
  url: string
}

export function getBreadcrumbStructuredData(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  }
}

// ───────────── ItemList for search results (trucks/loads) ─────────────
export function getSearchResultsItemListStructuredData(
  listingType: 'truck' | 'load',
  items: Array<{ id: string; title: string; description?: string; url?: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listingType === 'truck' ? 'Available Trucks Near You' : 'Available Freight Loads',
    description:
      listingType === 'truck'
        ? 'Vahan-verified trucks available for booking within 50km radius – India logistics truck booking.'
        : 'Open freight loads available for dispatch – cargo dispatch marketplace.',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url || `${SITE_URL}/search?type=${listingType}`,
      name: item.title,
      description: item.description,
    })),
  }
}

// ───────────── LogisticsService localBusiness flavor (extra SEO) ─────────────
export function getLogisticsServiceStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LogisticsService',
    '@id': `${SITE_URL}#logistics`,
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'Direct freight marketplace for India logistics, truck booking and cargo dispatch with zero brokerage, 50km proximity matching and FASTag checkpoint tracking.',
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
    serviceType: ['India logistics', 'truck booking', 'cargo dispatch'],
    provider: {
      '@id': `${SITE_URL}#organization`,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Freight Services Catalog',
      itemListElement: FREIGHT_SERVICES.map((s) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          description: s.description,
        },
      })),
    },
  }
}
