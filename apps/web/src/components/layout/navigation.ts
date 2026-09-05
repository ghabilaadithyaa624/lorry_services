import {
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  Package,
  PackageSearch,
  RadioTower,
  Route,
  Shield,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react'

/**
 * navigation — single source of truth for the public LorryCarry navbar.
 *
 * Consumed by `Navbar.tsx` (desktop menus + mobile drawer) and by
 * `navigation.spec.tsx` (guards the required routes and the truthfulness of
 * every public label).
 *
 * Ground rules baked into this module:
 * - Every href must point at a page that actually exists in `src/app/**`
 *   (protected pages are fine — middleware routes anonymous visitors through
 *   `/login?redirect=…`).
 * - Labels/descriptions must describe real platform capabilities. No invented
 *   scale claims, certifications, geographies or testimonials.
 * - All user-facing strings go through the i18n catalogue (`nav.*` keys in
 *   `src/lib/i18n.ts`) with English copy as the fallback.
 */

/** CTA destinations shared by the navbar, hero and homepage. */
export const CTA_ROUTES = {
  findTrucks: '/search?type=truck',
  findLoads: '/search?type=load',
  pricing: '/subscribe',
  signIn: '/login',
  postFreight: '/post-load',
  registerLorry: '/login?redirect=/dashboard/truck-driver',
  requestDemo: '/request-demo',
} as const

/** One product card inside the Products mega menu. */
export interface NavModule {
  /** Stable identifier (also the i18n suffix, e.g. `nav.mega.marketplace`). */
  key: string
  /** i18n key for the module name. */
  titleKey: string
  /** English fallback title, shown until translations load. */
  title: string
  /** i18n key for the one-line capability description. */
  descKey: string
  /** English fallback description. */
  desc: string
  href: string
  icon: LucideIcon
  /** Optional contextual badge (e.g. restricted console). */
  badge?: 'admin'
}

/** A simple labelled link inside a dropdown menu. */
export interface NavSubLink {
  key: string
  labelKey: string
  label: string
  /** Optional one-line description (used by Solutions). */
  descKey?: string
  desc?: string
  href: string
  icon: LucideIcon
}

/** A top-level navbar entry. */
export interface NavSection {
  key: 'products' | 'solutions' | 'resources' | 'company'
  labelKey: string
  label: string
  /** Route prefixes that highlight the section as active. */
  activePaths: readonly string[]
  /** Mega-menu product cards (Products only). */
  modules?: readonly NavModule[]
  /** Simple dropdown links. */
  links?: readonly NavSubLink[]
}

/**
 * Products mega menu — the six LorryCarry modules (shipped or planned).
 * Each entry maps to an existing surface; nothing here is invented.
 */
export const PRODUCT_MODULES: readonly NavModule[] = [
  {
    key: 'marketplace',
    titleKey: 'nav.mega.marketplace',
    title: 'Freight Marketplace',
    descKey: 'nav.mega.marketplace.desc',
    desc: 'Post cargo requirements and browse loads posted by shippers across highway corridors.',
    href: CTA_ROUTES.findLoads,
    icon: Boxes,
  },
  {
    key: 'fleet',
    titleKey: 'nav.mega.fleet',
    title: 'Fleet Listings',
    descKey: 'nav.mega.fleet.desc',
    desc: 'Search Vahan-verified truck listings by location, body type and proximity radius.',
    href: CTA_ROUTES.findTrucks,
    icon: Truck,
  },
  {
    key: 'controlTower',
    titleKey: 'nav.mega.controlTower',
    title: 'Trip Control Tower',
    descKey: 'nav.mega.controlTower.desc',
    desc: 'Follow active bookings with checkpoint milestone logs, ETAs and POD confirmation.',
    href: '/tracking',
    icon: RadioTower,
  },
  {
    key: 'compliance',
    titleKey: 'nav.mega.compliance',
    title: 'Compliance',
    descKey: 'nav.mega.compliance.desc',
    desc: 'RC, insurance and fitness documents verified against the Vahan database per listing.',
    href: '/documents',
    icon: ShieldCheck,
  },
  {
    key: 'payments',
    titleKey: 'nav.mega.payments',
    title: 'Payments & Subscription',
    descKey: 'nav.mega.payments.desc',
    desc: 'Compare subscription plans, unlock contact access and manage billing in one place.',
    href: '/subscription',
    icon: CreditCard,
  },
  {
    key: 'admin',
    titleKey: 'nav.mega.admin',
    title: 'Admin Operations',
    descKey: 'nav.mega.admin.desc',
    desc: 'Internal console for verification queues, booking oversight and platform operations.',
    href: '/admin',
    icon: LayoutDashboard,
    badge: 'admin',
  },
]

/** Public navbar sections, in render order. */
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    key: 'products',
    labelKey: 'nav.products',
    label: 'Products',
    activePaths: ['/search', '/tracking', '/documents', '/subscription', '/admin', '/bookings', '/booking'],
    modules: PRODUCT_MODULES,
  },
  {
    key: 'solutions',
    labelKey: 'nav.solutions',
    label: 'Solutions',
    activePaths: ['/post-load', '/need-load', '/need-vehicle', '/corridors', '/procurement', '/analytics', '/my-loads', '/my-trucks', '/my-listings'],
    links: [
      {
        key: 'shippers',
        labelKey: 'nav.sol.shippers',
        label: 'For Shippers & Load Owners',
        descKey: 'nav.sol.shippers.desc',
        desc: 'Post freight once and get matched with verified trucks within a 50 km radius.',
        href: CTA_ROUTES.postFreight,
        icon: Package,
      },
      {
        key: 'carriers',
        labelKey: 'nav.sol.carriers',
        label: 'For Truck Owners & Fleets',
        descKey: 'nav.sol.carriers.desc',
        desc: 'Find loads that fit your route and reduce empty return trips with return-load matching.',
        href: CTA_ROUTES.findLoads,
        icon: PackageSearch,
      },
      {
        key: 'corridors',
        labelKey: 'nav.sol.corridors',
        label: 'Corridor Intelligence',
        descKey: 'nav.sol.corridors.desc',
        desc: 'Browse reference corridors connecting major industrial hubs and ports.',
        href: '/corridors',
        icon: Route,
      },
      {
        key: 'procurement',
        labelKey: 'nav.sol.procurement',
        label: 'Procurement Intelligence',
        descKey: 'nav.sol.procurement.desc',
        desc: 'Compare indicative lane rates before you commit to a booking.',
        href: '/procurement',
        icon: ClipboardList,
      },
      {
        key: 'analytics',
        labelKey: 'nav.sol.analytics',
        label: 'Freight Analytics',
        descKey: 'nav.sol.analytics.desc',
        desc: 'Track your own bookings, spending and lane activity from your dashboard.',
        href: '/analytics',
        icon: BarChart3,
      },
    ],
  },
  {
    key: 'resources',
    labelKey: 'nav.resources',
    label: 'Resources',
    activePaths: ['/help', '/security'],
    links: [
      {
        key: 'help',
        labelKey: 'nav.res.help',
        label: 'Help & Support',
        href: '/help',
        icon: LifeBuoy,
      },
      {
        key: 'tracking',
        labelKey: 'nav.res.tracking',
        label: 'Track a Shipment',
        href: '/tracking',
        icon: Gauge,
      },
      {
        key: 'security',
        labelKey: 'nav.res.security',
        label: 'Security & Data Protection',
        href: '/security',
        icon: Lock,
      },
    ],
  },
  {
    key: 'company',
    labelKey: 'nav.company',
    label: 'Company',
    activePaths: ['/privacy', '/terms', '/request-demo'],
    links: [
      {
        key: 'requestDemo',
        labelKey: 'nav.requestDemo',
        label: 'Request Demo',
        href: CTA_ROUTES.requestDemo,
        icon: CalendarDays,
      },
      {
        key: 'contact',
        labelKey: 'nav.company.contact',
        label: 'Contact Support',
        href: '/help',
        icon: LifeBuoy,
      },
      {
        key: 'privacy',
        labelKey: 'nav.company.privacy',
        label: 'Privacy & Data Security',
        href: '/privacy',
        icon: Shield,
      },
      {
        key: 'terms',
        labelKey: 'nav.company.terms',
        label: 'Terms of Service',
        href: '/terms',
        icon: FileText,
      },
    ],
  },
]

/** True when the current path should highlight the given section. */
export function isSectionActive(section: NavSection, pathname: string): boolean {
  return section.activePaths.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

/** True when the path belongs to one of the Pricing surfaces. */
export function isPricingActive(pathname: string): boolean {
  return pathname === '/subscribe' || pathname.startsWith('/subscribe/')
}

/** True when the path is the public Request Demo form. */
export function isRequestDemoActive(pathname: string): boolean {
  return pathname === '/request-demo' || pathname.startsWith('/request-demo/')
}
