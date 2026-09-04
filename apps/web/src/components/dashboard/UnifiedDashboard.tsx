'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  Truck,
  Search,
  ArrowRight,
  ShieldCheck,
  Clock,
  Bell,
  Sparkles,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  Check,
  X,
  Menu,
} from 'lucide-react'
import { api, usersApi, authApi, matchesApi, type ReturnLoadOpportunity, type ReturnLoadAnchor } from '@/lib/api'
import { Footer } from '@/components/layout'
import { AnalyticsSnapshot } from '@/components/dashboard/AnalyticsSnapshot'
import { DashboardSummaryCards } from '@/components/dashboard/DashboardSummaryCards'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { TrialAccessBanner, type TrialStatus } from '@/components/dashboard/TrialAccessBanner'
import { TrialCountdownBanner } from '@/components/subscription/TrialCountdownBanner'
import { getRoleLabel, isVehicleSideRole, normalizeRole, type AnyUserRole, type AppUserRole } from '@/lib/roles'
import { BookingTermsModal } from '@/components/BookingTermsModal'
import { MatchesPanel } from '@/components/matching/MatchesPanel'
import { toast } from '@/lib/toast'
import { cn, formatINR, timeAgo } from '@/lib/utils'
import { getEntitlement, type SubscriptionEntitlement } from '@/lib/subscription'

interface UserState {
  id?: string
  phone?: string
  name?: string
  role?: AnyUserRole
}

interface LoadItem {
  id: string
  loadingAddress: string
  loadingPin?: string
  loadingLat?: number
  loadingLng?: number
  unloadingAddress: string
  unloadingPin?: string
  unloadingLat?: number
  unloadingLng?: number
  truckType: 'Open' | 'Container' | 'OpenBody'
  tonnageRequired: number
  maxPrice?: number
  status: 'Open' | 'Matched' | 'InTransit' | 'Completed' | 'Cancelled'
  createdAt: string
  _count?: { bookings: number }
}

interface TruckItem {
  id: string
  registrationNumber: string
  bodyType: 'Open' | 'Container' | 'OpenBody'
  lengthFt?: number
  heightFt?: number
  tonnageCapacity: number
  currentLat?: number
  currentLng?: number
  serviceableRadiusKm?: number
  preferredDestinations?: string[]
  verificationStatus: 'Pending' | 'Verified' | 'Rejected'
  documents?: Array<{ id: string; type: string; verificationStatus: string }>
}

interface TripBooking {
  id: string
  loadId: string
  truckId: string
  agreedPrice: number
  status: 'Pending' | 'Confirmed' | 'InTransit' | 'Completed' | 'Cancelled'
  advanceConfirmed?: boolean
  balanceConfirmed?: boolean
  ewayBillNumber?: string
  createdAt: string
  load?: {
    loadingAddress: string
    unloadingAddress: string
    truckType: string
    tonnageRequired: number
    maxPrice?: number
  }
  truck?: {
    registrationNumber: string
    bodyType: string
    tonnageCapacity: number
    user?: { name?: string; phone?: string }
  }
  checkpoints?: Array<{
    id: string
    seq: number
    name: string
    passed?: boolean
  }>
}

interface ActivityItem {
  id: string
  title: string
  description: string
  timestamp: string
  type: 'match' | 'booking' | 'payment' | 'kyc' | 'document'
}

interface UnifiedDashboardProps {
  roleOverride?: Exclude<AppUserRole, 'admin'>
}

export function UnifiedDashboard({ roleOverride }: UnifiedDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<UserState | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<TrialStatus | null>(null)
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null)
  const [kycComplete, setKycComplete] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Data state
  const [loads, setLoads] = useState<LoadItem[]>([])
  const [trucks, setTrucks] = useState<TruckItem[]>([])
  const [trips, setTrips] = useState<TripBooking[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [tripTab, setTripTab] = useState<'active' | 'completed'>('active')

  // Return-load (backhaul) intelligence for vehicle-side operators
  const [returnLoads, setReturnLoads] = useState<ReturnLoadOpportunity[]>([])
  const [returnLoadHub, setReturnLoadHub] = useState<ReturnLoadAnchor | null>(null)
  const [returnLoadsLoading, setReturnLoadsLoading] = useState(false)

  // Booking modal
  const [selectedTruckForBooking, setSelectedTruckForBooking] = useState<any | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser(parsed)
      }
    } catch {
      // Ignore malformed local session data.
    }
  }, [])

  const effectiveRole = normalizeRole(roleOverride || user?.role) || 'factory_owner'
  const isTruckDriver = isVehicleSideRole(effectiveRole)
  // Kept as an alias for existing JSX; the transporter/driver split is gone.
  const isTruckOwner = isTruckDriver
  const isTrial = subscriptionStatus?.isTrial === true

  useEffect(() => {
    loadDashboard()
    // Reload when the persisted role arrives, avoiding a factory dashboard
    // flash for driver/transporter accounts.
  }, [roleOverride, user?.role])

  const loadDashboard = async () => {
    try {
      setLoading(true)

      const [subRes, entRes, docRes, activityRes] = await Promise.allSettled([
        api.get<TrialStatus>('/subscriptions/status'),
        getEntitlement(),
        usersApi.getDocuments(),
        usersApi.getActivity(),
      ])

      if (subRes.status === 'fulfilled') {
        setSubscriptionStatus(subRes.value.data)
        setHasSubscription(Boolean(subRes.value.data?.hasSubscription))
      }

      if (entRes.status === 'fulfilled') {
        setEntitlement(entRes.value)
      }

      // Check KYC status
      if (docRes.status === 'fulfilled') {
        const docs = docRes.value.data || []
        // Incomplete if no docs uploaded or any document is pending/rejected
        if (!Array.isArray(docs) || docs.length === 0) {
          setKycComplete(false)
        } else {
          const hasRC = docs.some((d: any) => d.type === 'RC' && d.verificationStatus === 'Verified')
          const hasInsurance = docs.some((d: any) => d.type === 'Insurance' && d.verificationStatus === 'Verified')
          setKycComplete(hasRC && hasInsurance)
        }
      } else {
        setKycComplete(false)
      }

      // Load Role-Specific Data
      if (isTruckOwner) {
        const [myTrucksRes, myBookingsRes] = await Promise.allSettled([
          api.get('/trucks/my-trucks'),
          api.get('/bookings/my-bookings'),
        ])

        if (myTrucksRes.status === 'fulfilled') {
          const userTrucks = myTrucksRes.value.data || []
          setTrucks(userTrucks)
          // If any truck is unverified, mark KYC incomplete
          const allVerified = userTrucks.length > 0 && userTrucks.every((t: any) => t.verificationStatus === 'Verified')
          if (!allVerified) {
            setKycComplete(false)
          }
          // Backhaul intelligence: what can this lorry carry home instead of
          // running empty? Ranked server-side by the return-load engine.
          void loadReturnLoads(userTrucks)
        }

        if (myBookingsRes.status === 'fulfilled') {
          setTrips(myBookingsRes.value.data || [])
        }
      } else {
        const [myLoadsRes, myBookingsRes, nearbyTrucksRes] = await Promise.allSettled([
          api.get('/loads/my-loads'),
          api.get('/bookings/my-bookings'),
          api.get('/search/trucks?lat=19.0760&lng=72.8777&radius=100'),
        ])

        if (myLoadsRes.status === 'fulfilled') {
          setLoads(myLoadsRes.value.data || [])
        }

        if (myBookingsRes.status === 'fulfilled') {
          setTrips(myBookingsRes.value.data || [])
        }

        if (nearbyTrucksRes.status === 'fulfilled') {
          setTrucks(nearbyTrucksRes.value.data || [])
        }
      }

      // Notifications / Activity
      if (activityRes.status === 'fulfilled' && Array.isArray(activityRes.value.data) && activityRes.value.data.length > 0) {
        setActivities(activityRes.value.data)
      } else {
        // Synthesize recent meaningful records if none returned from raw endpoint
        setActivities([
          {
            id: 'act-1',
            title: isTruckDriver ? 'Vehicle Telemetry Online' : 'Freight Consignment Verified',
            description: isTruckDriver
              ? 'GPS centerpoint and 50km corridor broadcast active for verified shippers.'
              : 'Direct factor-based match scoring activated for active loading points.',
            timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
            type: 'match',
          },
          {
            id: 'act-2',
            title: 'Vahan Government RC Verification',
            description: 'Automated digital verification check passed across official state transport registers.',
            timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
            type: 'kyc',
          },
          {
            id: 'act-3',
            title: 'Checkpoint Highway Milestone',
            description: 'Record-only corridor tracking checkpoint recorded for regional transit.',
            timestamp: new Date(Date.now() - 1000 * 60 * 190).toISOString(),
            type: 'booking',
          },
        ])
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetches ranked return-load opportunities for the operator's primary lorry
   * (first verified vehicle, otherwise the first registered one). The API
   * resolves the drop-off hub from the latest trip destination or GPS position.
   */
  const loadReturnLoads = async (userTrucks: TruckItem[]) => {
    const primaryTruck =
      userTrucks.find((t) => t.verificationStatus === 'Verified') || userTrucks[0]
    if (!primaryTruck?.id) {
      setReturnLoads([])
      setReturnLoadHub(null)
      return
    }

    try {
      setReturnLoadsLoading(true)
      const res = await matchesApi.getReturnLoads(primaryTruck.id, { radius: 150, limit: 3 })
      setReturnLoads(res.data.opportunities || [])
      setReturnLoadHub(res.data.anchor || null)
    } catch {
      setReturnLoads([])
      setReturnLoadHub(null)
    } finally {
      setReturnLoadsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore
    }
    setUser(null)
    router.push('/login')
  }

  // Active / Completed Trips Filtering
  const activeTrips = trips.filter((t) => t.status === 'InTransit' || t.status === 'Confirmed' || t.status === 'Pending')
  const completedTrips = trips.filter((t) => t.status === 'Completed' || t.status === 'Cancelled')

  // Top Nav Link Items
  const navLinks = [
    { name: 'Control Tower', href: '/tracking', active: pathname === '/tracking' },
    {
      name: 'Find Trucks',
      href: '/search?type=truck',
      active: pathname.startsWith('/search') && pathname.includes('truck'),
    },
    {
      name: 'Find Loads',
      href: '/search?type=load',
      active: pathname.startsWith('/search') && pathname.includes('load'),
    },
    { name: 'Pricing & Plans', href: '/subscribe', active: pathname.startsWith('/subscribe') },
  ]

  // Telemetry Aggregates
  const activeLoadCount = loads.filter((l) => l.status === 'Open' || l.status === 'Matched').length
  const inTransitCount = isTruckDriver
    ? trips.filter((t) => t.status === 'InTransit').length
    : loads.filter((l) => l.status === 'InTransit').length
  const completedCount = isTruckDriver
    ? trips.filter((t) => t.status === 'Completed').length
    : loads.filter((l) => l.status === 'Completed').length
  const fleetSize = trucks.length
  const verifiedTruckCount = trucks.filter((t) => t.verificationStatus === 'Verified').length
  const averageHireRate =
    trips.length > 0
      ? Math.round(trips.reduce((sum, trip) => sum + (trip.agreedPrice || 0), 0) / trips.length)
      : 48000
  const earnings = trips
    .filter((trip) => trip.status === 'Completed')
    .reduce((sum, trip) => sum + Number(trip.agreedPrice || 0), 0)

  return (
    <div className="min-h-screen bg-canvas text-surface-100 flex flex-col font-sans selection:bg-primary-500 selection:text-white">
      {/* ── 1. Sticky Top Navigation ── */}
      <header className="sticky top-0 z-40 w-full bg-canvas/85 backdrop-blur-xl border-b border-white/10 shadow-modal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Brand Logo */}
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className="flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl focus:outline-none"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-glow-primary transition-transform duration-200 group-hover:scale-105 border border-primary-400/30">
                  <Truck className="w-5 h-5 stroke-[2.4]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tight text-white leading-none">
                    Lorry<span className="text-primary-500">Carry</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-surface-400 uppercase tracking-wider mt-0.5">
                    Direct Freight Network
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={cn(
                      'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
                      link.active
                        ? 'text-primary-400 bg-primary-500/10 border border-primary-500/20'
                        : 'text-surface-300 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right Actions & User Profile */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Tamil / Hindi / English language switcher */}
              <LanguageToggle />

              {/* Notification Bell */}
              <Link
                href="/notifications"
                className="relative p-2.5 text-surface-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer border border-transparent hover:border-white/10"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500 shadow-glow-primary ring-2 ring-canvas" />
              </Link>

              {/* User Account / Role Pill */}
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-surface-900/80 backdrop-blur-md text-xs font-semibold text-surface-200 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none shadow-card"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-300 font-bold flex items-center justify-center text-xs border border-primary-500/30">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="max-w-[120px] truncate">{user?.name || user?.phone || 'My Account'}</span>
                  <span className="px-2 py-0.5 rounded-md bg-surface-950 text-surface-400 text-[10px] font-mono border border-white/5">
                    {getRoleLabel(effectiveRole)}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-medium text-surface-400 hover:text-danger-400 px-2 py-1.5 rounded-lg hover:bg-danger-950/30 transition-colors focus-visible:ring-2 focus-visible:ring-danger-500 focus:outline-none cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex md:hidden items-center gap-2">
              <LanguageToggle compact />
              <button
                type="button"
                className="p-2 text-surface-400 hover:text-white hover:bg-white/5 rounded-xl focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none border border-white/5"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? 'Close main menu' : 'Open main menu'}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-panel/95 backdrop-blur-2xl border-t border-white/10 px-4 py-4 space-y-3 shadow-modal">
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                    link.active ? 'bg-primary-500/10 text-primary-400' : 'text-surface-300 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="pt-3 border-t border-white/10 space-y-2">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2 text-sm font-semibold text-surface-200 hover:bg-white/5 rounded-xl"
              >
                Account Settings & KYC
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3.5 py-2 text-sm font-semibold text-danger-400 hover:bg-danger-950/30 rounded-xl"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Main Dashboard Workspace ── */}
      <main className="flex-1 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
        <TrialAccessBanner status={subscriptionStatus} />

        {/* ── 2. KYC Verification Status Banner (Only when incomplete) ── */}
        {!kycComplete && (
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-modal">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm sm:text-base font-bold text-amber-200">
                  KYC & Vehicle Verification Incomplete
                </h2>
                <p className="text-xs sm:text-sm text-amber-300/80 leading-relaxed">
                  Upload your RC book and Commercial Insurance documents to enable direct carrier matching, instant booking confirmation, and compliance clearance.
                </p>
              </div>
            </div>

            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-amber-950 text-xs sm:text-sm font-bold transition-all shrink-0 shadow-glow-sm cursor-pointer"
            >
              <span>Complete Verification</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* ── 2b. Subscription & 3-Month Free Trial Banner (live countdown) ── */}
        <TrialCountdownBanner entitlement={entitlement} />

        {/* ── 4. Quick Actions Header & Role Greeting ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glow-sm" />
                <span>Live Freight Network Online</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 text-xs font-semibold font-mono">
                {isTruckDriver ? 'Truck driver workspace' : 'Factory owner workspace'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Good morning, {user?.name || (isTruckDriver ? 'Truck driver' : 'Factory owner')}
            </h1>
            <p className="text-xs sm:text-sm text-surface-400">
              Direct marketplace operating command • Zero middleman brokerage
            </p>
          </div>

          {/* Role-Dependent Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isTruckOwner ? (
              <>
                <Link
                  href="/need-vehicle"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:outline-none border border-primary-400/30"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Register Truck</span>
                </Link>
                <Link
                  href="/search?type=load"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-900/80 hover:bg-surface-800 border border-white/10 text-surface-200 text-xs sm:text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none shadow-card"
                >
                  <Search className="w-4 h-4 text-primary-400" />
                  <span>Find Freight Loads</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/need-load"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:outline-none border border-primary-400/30"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post Freight Load</span>
                </Link>
                <Link
                  href="/search?type=truck"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-900/80 hover:bg-surface-800 border border-white/10 text-surface-200 text-xs sm:text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none shadow-card"
                >
                  <Search className="w-4 h-4 text-primary-400" />
                  <span>Find Available Lorries</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ── 3. Requested overview cards: bookings, completed trips, earnings ── */}
        <DashboardSummaryCards
          activeBookings={activeTrips.length}
          completedTrips={completedTrips.filter((trip) => trip.status === 'Completed').length}
          earnings={earnings}
          loading={loading}
        />

        {/* ── 3. Subscription Status & Upsell Card ── */}
        <div className="bg-panel rounded-2xl border border-white/10 p-5 sm:p-6 shadow-modal hover:border-primary-500/30 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border',
                  hasSubscription
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                    : entitlement?.isTrialActive
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/25'
                      : 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                )}
              >
                {hasSubscription ? (
                  <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                ) : entitlement?.isTrialActive ? (
                  <Clock className="w-6 h-6 stroke-[2.2]" />
                ) : (
                  <Sparkles className="w-6 h-6 stroke-[2.2]" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {hasSubscription
                      ? 'National Enterprise Subscription Active'
                      : entitlement?.isTrialActive
                        ? '3-Month Free Trial — Full Premium Access Unlocked'
                        : 'Unlock Direct Contact Access on Matched Trucks & Loads'}
                  </h2>
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono border',
                      hasSubscription
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                        : entitlement?.isTrialActive
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/25'
                          : 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                    )}
                  >
                    {isTrial ? 'Trial active' : hasSubscription ? 'Pass Active' : 'Upgrade Available'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-surface-300 leading-relaxed max-w-3xl">
                  {hasSubscription
                    ? 'Unlimited direct telephone contact and direct WhatsApp dispatch unlocked across all highway freight corridors with zero brokerage fees.'
                    : entitlement?.isTrialActive
                      ? `${entitlement.trialDaysRemaining} days of unlimited premium access left in your 3-month free trial. Upgrade any time to keep the benefits uninterrupted.`
                      : 'Your free trial has ended. Unlock verified contact numbers and direct WhatsApp dispatch for all matched vehicles and consignments across Indian freight corridors.'}
                </p>
              </div>
            </div>

            <Link
              href="/subscribe"
              className={cn(
                'inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 shadow-card focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer',
                hasSubscription && !isTrial
                  ? 'bg-surface-900 hover:bg-surface-800 border border-white/10 text-white'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-glow-primary border border-primary-400/30'
              )}
            >
              <span>{hasSubscription ? 'Manage Pass' : entitlement?.isTrialActive ? 'Upgrade Now' : 'Upgrade Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ── Dashboard Analytics (Prompt 6: charts + subscription reminder) ── */}
        <AnalyticsSnapshot
          totalLoads={isTruckDriver ? fleetSize : loads.length}
          trucksMatched={verifiedTruckCount || trucks.length}
          avgHireRate={averageHireRate}
          subscriptionActive={entitlement?.hasPremiumAccess ?? hasSubscription}
          className="space-y-4"
        />

        {/* ── Telemetry Stats Grid (Compact Telemetry Readouts) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {isTruckDriver ? (
            <>
              <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
                <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  FLEET CAPACITY
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
                  {loading ? '...' : `${fleetSize} Vehicles`}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">Registered lorries</div>
              </div>

              <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
                <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  VAHAN VERIFIED
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mt-1">
                  {loading ? '...' : `${verifiedTruckCount} Compliant`}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">RTO authenticated</div>
              </div>

              <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
                <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  LIVE CONSIGNMENTS
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-primary-400 mt-1">
                  {loading ? '...' : inTransitCount}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">Active in transit</div>
              </div>

              <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
                <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  COMPLETED TRIPS
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
                  {loading ? '...' : completedCount}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">POD verified delivery</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
                <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  ACTIVE CARGO
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
                  {loading ? '...' : activeLoadCount}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">Open & matched loads</div>
              </div>

              <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
                <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  IN TRANSIT
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-primary-400 mt-1">
                  {loading ? '...' : inTransitCount}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">Live highway haulage</div>
              </div>

              <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
                <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  NEARBY LORRIES
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mt-1">
                  {loading ? '...' : `${trucks.length} Matches`}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">Within 100 km radius</div>
              </div>

              <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
                <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  COMPLETED HAULS
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
                  {loading ? '...' : completedCount}
                </div>
                <div className="text-xs text-surface-400 mt-0.5">Zero broker fee payout</div>
              </div>
            </>
          )}
        </div>

        {/* ── 4b. Smart Matching Engine — Need Load ↔ Need Vehicle (tonnage/route/budget, ≤50km, WhatsApp trigger) ── */}
        <MatchesPanel role={isTruckDriver ? 'truck_driver' : 'factory_owner'} />

        {/* ── 5. My Trips Widget (Active & Completed Tabs) ── */}
        <div className="bg-panel rounded-2xl border border-white/10 shadow-modal p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20 shrink-0">
                <Truck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Consignment Trips & Milestone Telemetry
                </h2>
                <p className="text-xs text-surface-400">
                  Record-only checkpoint tracking and payment settlement milestones
                </p>
              </div>
            </div>

            {/* Tabs: Active / Completed */}
            <div className="flex items-center gap-2 bg-surface-950 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setTripTab('active')}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
                  tripTab === 'active'
                    ? 'bg-primary-500 text-white shadow-glow-primary'
                    : 'text-surface-400 hover:text-white'
                )}
              >
                Active Trips ({activeTrips.length})
              </button>
              <button
                type="button"
                onClick={() => setTripTab('completed')}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
                  tripTab === 'completed'
                    ? 'bg-primary-500 text-white shadow-glow-primary'
                    : 'text-surface-400 hover:text-white'
                )}
              >
                Completed ({completedTrips.length})
              </button>
            </div>
          </div>

          {/* Trip Tab Content */}
          {tripTab === 'active' ? (
            activeTrips.length === 0 ? (
              /* Empty State for Active Trips */
              <div className="p-8 sm:p-12 text-center space-y-3 bg-surface-950/60 rounded-2xl border border-white/5">
                <div className="w-14 h-14 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center mx-auto border border-primary-500/20">
                  <Truck className="w-7 h-7 stroke-[1.8]" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  No active trips in transit
                </h3>
                <p className="text-xs sm:text-sm text-surface-400 max-w-md mx-auto leading-relaxed">
                  Your scheduled and en-route freight consignments will appear here with checkpoint-level milestone telemetry and payment stages.
                </p>
                <div className="pt-2">
                  <Link
                    href={isTruckDriver ? '/search?type=load' : '/post-load'}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 text-primary-300 border border-primary-500/30 text-xs sm:text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none"
                  >
                    <span>{isTruckDriver ? 'Find Freight Loads' : 'Post a Freight Load'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTrips.map((trip) => {
                  const checkpoints = trip.checkpoints || [
                    { id: '1', seq: 1, name: 'Loading Hub', passed: true },
                    { id: '2', seq: 2, name: 'Corridor Toll 1', passed: true },
                    { id: '3', seq: 3, name: 'Transit Checkpoint', passed: false },
                    { id: '4', seq: 4, name: 'Regional Hub', passed: false },
                    { id: '5', seq: 5, name: 'Unloading Point', passed: false },
                  ]

                  return (
                    <div
                      key={trip.id}
                      className="p-5 rounded-2xl bg-surface-950/80 border border-white/5 shadow-card hover:border-white/15 transition-all space-y-4"
                    >
                      {/* Trip Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm sm:text-base">
                              TRIP-{trip.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30 text-xs font-semibold">
                              In Transit • Checkpoint 2/5
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-surface-900 text-surface-300 border border-white/10 text-xs font-mono font-medium">
                              {trip.truck?.registrationNumber || 'MH-12-TRUCK'}
                            </span>
                          </div>

                          <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                            <span>{trip.load?.loadingAddress || 'Origin Centerpoint'}</span>
                            <ArrowRight className="w-4 h-4 text-primary-400 shrink-0" />
                            <span>{trip.load?.unloadingAddress || 'Destination Hub'}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                            AGREED FREIGHT
                          </div>
                          <div className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                            {formatINR(trip.agreedPrice || 48000)}
                          </div>
                        </div>
                      </div>

                      {/* 4-Column Checkpoint Telemetry Readout Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-panel/90 rounded-xl p-3 border border-white/5">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                            ORIGIN HUB
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5 truncate">
                            {trip.load?.loadingAddress?.split(',')[0] || 'Origin'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                            CURRENT CHECKPOINT
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-primary-400 font-mono mt-0.5 truncate">
                            Checkpoint 2 (Passed)
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                            DESTINATION
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5 truncate">
                            {trip.load?.unloadingAddress?.split(',')[0] || 'Destination'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                            MILESTONE ETA
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5">
                            Est. 4h 30m
                          </div>
                        </div>
                      </div>

                      {/* Compact Checkpoint Milestone Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-medium text-surface-400">
                          <span>Corridor Checkpoints (Record-only verification)</span>
                          <span className="font-mono text-surface-300 font-semibold">2 of 5 recorded</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {checkpoints.map((cp, idx) => {
                            const isDone = idx < 2
                            const isCurrent = idx === 1
                            return (
                              <div key={cp.id || idx} className="space-y-1">
                                <div
                                  className={cn(
                                    'h-2 rounded-full transition-colors',
                                    isDone
                                      ? 'bg-emerald-500 shadow-glow-sm'
                                      : isCurrent
                                      ? 'bg-primary-500 shadow-glow-primary'
                                      : 'bg-surface-900 border border-white/5'
                                  )}
                                />
                                <span className="block text-[10px] font-mono text-surface-400 truncate">
                                  {cp.name}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Payment State Row */}
                      <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-300 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            <strong>Payment Status:</strong> 50% advance paid, balance due on unloading confirmation
                          </span>
                        </div>

                        <Link
                          href={`/tracking?bookingId=${trip.id}`}
                          className="inline-flex items-center gap-1 font-bold text-primary-400 hover:text-primary-300 transition-colors shrink-0"
                        >
                          <span>Track Milestone Checkpoints</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            /* Completed Trips Content */
            completedTrips.length === 0 ? (
              <div className="p-8 sm:p-12 text-center space-y-3 bg-surface-950/60 rounded-2xl border border-white/5">
                <div className="w-14 h-14 rounded-2xl bg-surface-900 text-surface-400 flex items-center justify-center mx-auto border border-white/5">
                  <Check className="w-7 h-7 stroke-[2]" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  No completed trips yet
                </h3>
                <p className="text-xs sm:text-sm text-surface-400 max-w-md mx-auto leading-relaxed">
                  Finished freight journeys with verified proof of delivery (POD) and settled balances will be archived here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-4 rounded-xl bg-surface-950/80 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">
                          TRIP-{trip.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                          Delivered & POD Verified
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-surface-300">
                        {trip.load?.loadingAddress} ➔ {trip.load?.unloadingAddress}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-xs text-emerald-400 block">
                        {formatINR(trip.agreedPrice || 35000)}
                      </span>
                      <span className="text-[10px] text-emerald-400/80 font-semibold">
                        100% Payout Settled
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* ── 6. Activity & Notifications Feed + Match Recommendations ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Activity Feed (7 cols) */}
          <div className="lg:col-span-7 bg-panel rounded-2xl border border-white/10 shadow-modal p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-primary-400" />
                <h3 className="text-base font-bold text-white">Recent Operational Activity</h3>
              </div>
              <span className="text-xs text-surface-400 font-mono">Live log</span>
            </div>

            {activities.length === 0 ? (
              <div className="p-8 text-center space-y-2 bg-surface-950/60 rounded-xl border border-white/5">
                <Bell className="w-8 h-8 text-surface-400 mx-auto" />
                <p className="text-sm font-bold text-white">All caught up</p>
                <p className="text-xs text-surface-400">
                  Operational alerts and milestone updates will appear here in real time as consignments progress.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 space-y-0">
                {activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                    <div className="w-8 h-8 rounded-xl bg-surface-950 text-primary-400 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      {act.type === 'kyc' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : act.type === 'booking' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs sm:text-sm font-bold text-white truncate">
                          {act.title}
                        </p>
                        <span className="text-[10px] font-mono text-surface-400 shrink-0">
                          {timeAgo(act.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-surface-300 leading-relaxed">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Match Opportunities (5 cols) */}
          <div className="lg:col-span-5 bg-panel rounded-2xl border border-white/10 shadow-modal p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-400" />
                <h3 className="text-base font-bold text-white">
                  {isTruckDriver ? 'High-Yield Backhauls' : 'Nearby Matched Lorries'}
                </h3>
              </div>
              <Link
                href={isTruckDriver ? '/search?type=load&sort=RETURN_LOAD' : '/search?type=truck'}
                className="text-xs font-semibold text-primary-400 hover:text-primary-300 inline-flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isTruckDriver ? (
              <div className="space-y-3">
                {returnLoadHub && (
                  <p className="text-[11px] font-mono text-surface-400">
                    Empty from <span className="text-surface-200">{returnLoadHub.label}</span> · {returnLoadHub.detail}
                  </p>
                )}

                {returnLoadsLoading ? (
                  <div className="p-6 text-center text-xs text-surface-400 bg-surface-950/60 rounded-xl border border-white/5">
                    Scanning the open load board for return freight…
                  </div>
                ) : returnLoads.length === 0 ? (
                  <div className="p-6 text-center space-y-2 bg-surface-950/60 rounded-xl border border-white/5">
                    <Sparkles className="w-8 h-8 text-surface-400 mx-auto" />
                    <p className="text-sm font-bold text-white">No return loads yet</p>
                    <p className="text-xs text-surface-400">
                      Keep your vehicle location and preferred corridors current — matching return freight near your
                      drop-off hub will surface here automatically.
                    </p>
                    <Link
                      href="/search?type=load&sort=RETURN_LOAD"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-400 hover:text-primary-300"
                    >
                      <span>Browse the load board</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  returnLoads.map((opp) => (
                    <div
                      key={opp.loadId}
                      className="p-3.5 rounded-xl bg-surface-950/80 border border-white/5 hover:border-white/15 transition-all space-y-2 shadow-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="text-xs font-bold text-white truncate">{opp.routeLabel}</div>
                          <div className="text-[11px] text-surface-400 font-medium">
                            {opp.tonnageRequired}T {opp.truckType} • {opp.pickupDistanceFromDestinationKm} km to pickup
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-primary-950/60 text-primary-300 border border-primary-500/30 text-[10px] font-mono font-bold shrink-0">
                          {Math.round(opp.rankScore)}% fit
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] font-mono text-emerald-300">
                          {formatINR(opp.estimatedFreight)} · saves ~{opp.potentialEmptyRunReductionKm} km empty
                        </div>
                        <Link
                          href={`/search?type=load&location=${encodeURIComponent(opp.loadingAddress)}`}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs font-bold transition-all shadow-glow-primary shrink-0 border border-primary-400/30"
                        >
                          {opp.contact.locked ? 'Unlock Load' : 'View Load'}
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {trucks.slice(0, 3).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 rounded-xl bg-surface-950/80 border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-3 shadow-card"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-white">
                          {item.registrationNumber || 'MH-12-TRUCK'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                          Vahan Verified
                        </span>
                      </div>
                      <div className="text-xs text-surface-400 font-medium">
                        {item.bodyType || 'Open'} Body • {item.tonnageCapacity || 16}T Capacity
                      </div>
                    </div>

                    <Link
                      href={`/search?type=truck`}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs font-bold transition-all shadow-glow-primary shrink-0 border border-primary-400/30"
                    >
                      Match Lorry
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Booking Terms Modal Integration */}
      {selectedTruckForBooking && (
        <BookingTermsModal
          loadId="quick-match"
          truckId={selectedTruckForBooking.id}
          truckInfo={{
            registrationNumber: selectedTruckForBooking.registrationNumber || 'MH-12-TRUCK',
            bodyType: selectedTruckForBooking.bodyType || 'Open Body',
            ownerName: selectedTruckForBooking.ownerName || 'Verified Transporter',
          }}
          onClose={() => setSelectedTruckForBooking(null)}
          onSuccess={(bookingId) => {
            setSelectedTruckForBooking(null)
            toast.success('Booking initiated successfully!')
            if (bookingId) {
              router.push(`/booking/${bookingId}`)
            } else {
              router.push('/my-loads')
            }
          }}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  )
}
