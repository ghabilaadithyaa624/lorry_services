'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Truck,
  Search,
  PlusCircle,
  Bell,
  Menu,
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Info,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react'
import { api, authApi } from '@/lib/api'
import { Footer } from '@/components/layout'
import {
  assessShipmentIntelligence,
  summarizeActiveShipmentsControlTower,
  BookingData,
} from '@/lib/intelligence'
import { formatINR, cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

export default function ControlTowerTrackingPage() {
  const router = useRouter()

  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'ACTION_REQUIRED' | 'ATTENTION_REQUIRED' | 'ON_TRACK' | 'COMPLETED'
  >('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [user, setUser] = useState<{ id?: string; name?: string; role?: string } | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch {
      // Ignore
    }

    fetchActiveBookings()
  }, [])

  const fetchActiveBookings = async () => {
    try {
      setLoading(true)
      const res = await api.get('/bookings/my-bookings')
      setBookings(res.data || [])
    } catch {
      // Fallback to /bookings if my-bookings returns 404
      try {
        const fallbackRes = await api.get('/bookings')
        setBookings(fallbackRes.data || [])
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to fetch active shipments')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAdvance = async (bookingId: string) => {
    try {
      setActionLoading(`advance-${bookingId}`)
      await api.patch(`/bookings/${bookingId}/confirm-advance`)
      toast.success('50% Loading advance confirmed!')
      fetchActiveBookings()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not confirm advance')
    } finally {
      setActionLoading(null)
    }
  }

  const handleConfirmBalance = async (bookingId: string) => {
    try {
      setActionLoading(`balance-${bookingId}`)
      await api.patch(`/bookings/${bookingId}/confirm-balance`)
      toast.success('Delivery balance confirmed!')
      fetchActiveBookings()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not confirm balance')
    } finally {
      setActionLoading(null)
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

  const summary = summarizeActiveShipmentsControlTower(bookings)

  const filteredBookings = bookings.filter((bk) => {
    const intel = assessShipmentIntelligence(bk)
    if (activeTab === 'ACTION_REQUIRED') return intel.statusTier === 'ACTION REQUIRED'
    if (activeTab === 'ATTENTION_REQUIRED') return intel.statusTier === 'ATTENTION REQUIRED'
    if (activeTab === 'ON_TRACK') return intel.statusTier === 'ON TRACK' || intel.statusTier === 'LOW RISK'
    if (activeTab === 'COMPLETED') return intel.statusTier === 'COMPLETED'
    return true
  })

  const navLinks = [
    { name: 'Control Tower', href: '/tracking', active: true },
    {
      name: 'Find Trucks',
      href: '/search?type=truck',
      active: false,
    },
    {
      name: 'Find Loads',
      href: '/search?type=load',
      active: false,
    },
    { name: 'Pricing & Plans', href: '/subscribe', active: false },
  ]

  const isTruckOwner = user?.role === 'truck_owner'
  const isShipper = user?.role === 'load_owner' || !user?.role

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* ── 1. Unified Sticky Top Navigation ── */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Brand Logo */}
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className="flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded-xl focus:outline-none"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <Truck className="w-5 h-5 stroke-[2.4]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tight text-gray-900 leading-none">
                    Lorry<span className="text-orange-500">Carry</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                    Direct Freight Network
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={cn(
                      'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none',
                      link.active
                        ? 'text-orange-600 bg-orange-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right Actions & User Account Dropdown */}
            <div className="hidden sm:flex items-center gap-3">
              <button
                type="button"
                className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
                onClick={() => router.push('/notifications')}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none shadow-2xs cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : isTruckOwner ? 'T' : 'S'}
                  </div>
                  <span>{user?.name || 'My Account'}</span>
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-mono">
                    {isTruckOwner ? 'Fleet Owner' : 'Shipper'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {/* Role Pill Dropdown for Account Features */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-gray-200 shadow-lg py-2 z-50 animate-fade-in text-xs font-medium">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="font-bold text-gray-900">{user?.name || 'Account'}</p>
                      <p className="text-gray-500 text-[11px]">{isTruckOwner ? 'Transporter' : 'Cargo Shipper'}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        href={isTruckOwner ? '/dashboard/truck-owner' : '/dashboard/load-owner'}
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-orange-600"
                      >
                        Dashboard Overview
                      </Link>
                      <Link
                        href={isTruckOwner ? '/my-trucks' : '/my-loads'}
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-orange-600"
                      >
                        {isTruckOwner ? 'My Registered Fleet' : 'My Posted Loads'}
                      </Link>
                      <Link
                        href="/documents"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-orange-600"
                      >
                        KYC & Documents
                      </Link>
                      <Link
                        href="/activity"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-orange-600"
                      >
                        Activity Log
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-orange-600"
                      >
                        Profile Settings
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-semibold"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none"
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
          <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-3 shadow-lg">
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                    link.active ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="pt-3 border-t border-gray-100 space-y-2">
              <Link
                href={isTruckOwner ? '/dashboard/truck-owner' : '/dashboard/load-owner'}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 rounded-xl"
              >
                Go to Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Main Workspace ── */}
      <main className="flex-1 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
        {/* ── 2. Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>FASTag Corridor Telemetry Active</span>
              </span>
              <span className="text-xs font-mono font-bold text-gray-400">
                • {bookings.length} Total Monitored Consignments
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
              Shipment Control Tower
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 max-w-2xl">
              Real-time operational risk monitoring, highway toll milestone tracking, and commercial compliance for active freight.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {isShipper ? (
              <button
                type="button"
                onClick={() => router.push('/post-load')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus:outline-none cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post Freight Load</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/search?type=load')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus:outline-none cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Find Freight Loads</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 3. Four Status Overview Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Action Required Card */}
          <div
            onClick={() => setActiveTab('ACTION_REQUIRED')}
            className={cn(
              'bg-white rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 border-l-4',
              activeTab === 'ACTION_REQUIRED'
                ? 'border-l-rose-500 border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20'
                : 'border-l-rose-500 border-gray-200'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                ACTION REQUIRED
              </div>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-700">
              {loading ? '...' : summary.actionRequiredCount}
            </div>
            <div className="text-[11px] text-gray-500 leading-tight">
              50% advance or POD balance confirmation pending
            </div>
          </div>

          {/* Attention Required Card */}
          <div
            onClick={() => setActiveTab('ATTENTION_REQUIRED')}
            className={cn(
              'bg-white rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 border-l-4',
              activeTab === 'ATTENTION_REQUIRED'
                ? 'border-l-amber-500 border-amber-300 ring-2 ring-amber-500/20 bg-amber-50/20'
                : 'border-l-amber-500 border-gray-200'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                ATTENTION REQUIRED
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-800">
              {loading ? '...' : summary.attentionRequiredCount}
            </div>
            <div className="text-[11px] text-gray-500 leading-tight">
              E-Way Bill missing or compliance audit pending
            </div>
          </div>

          {/* On Track Card */}
          <div
            onClick={() => setActiveTab('ON_TRACK')}
            className={cn(
              'bg-white rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 border-l-4',
              activeTab === 'ON_TRACK'
                ? 'border-l-emerald-500 border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                : 'border-l-emerald-500 border-gray-200'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                ON TRACK
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700">
              {loading ? '...' : summary.onTrackCount + summary.lowRiskCount}
            </div>
            <div className="text-[11px] text-gray-500 leading-tight">
              Vehicle progressing through national checkpoints
            </div>
          </div>

          {/* Total Active Control Tower */}
          <div
            onClick={() => setActiveTab('ALL')}
            className={cn(
              'bg-white rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 border-l-4',
              activeTab === 'ALL'
                ? 'border-l-orange-500 border-orange-300 ring-2 ring-orange-500/20 bg-orange-50/20'
                : 'border-l-orange-500 border-gray-200'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-900">
                TOTAL ACTIVE FLEET
              </div>
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-gray-900">
              {loading ? '...' : summary.totalActive}
            </div>
            <div className="text-[11px] text-gray-500 leading-tight">
              Active consignments on interstate corridors
            </div>
          </div>
        </div>

        {/* ── 4. Filter Navigation Pills ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'ALL', label: `All Active (${bookings.length})` },
              { id: 'ACTION_REQUIRED', label: `⚠️ Action Required (${summary.actionRequiredCount})` },
              { id: 'ATTENTION_REQUIRED', label: `🟡 Attention Required (${summary.attentionRequiredCount})` },
              { id: 'ON_TRACK', label: `🟢 On Track (${summary.onTrackCount + summary.lowRiskCount})` },
              { id: 'COMPLETED', label: `✓ Completed (${summary.completedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none',
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'bg-slate-100 text-gray-600 hover:text-gray-900 hover:bg-slate-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 5. Control Tower Shipment Feed ── */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="w-36 h-5 bg-gray-200 rounded" />
                  <div className="w-24 h-6 bg-gray-200 rounded-full" />
                </div>
                <div className="h-3 bg-gray-100 rounded-full" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="h-16 bg-gray-50 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="space-y-5">
            {filteredBookings.map((booking) => {
              const intel = assessShipmentIntelligence(booking)

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-5"
                >
                  {/* Row 1: Header (Badge, Booking ID, Why reason, Action CTA) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Tier Badge */}
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                            intel.statusTier === 'ACTION REQUIRED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : intel.statusTier === 'ATTENTION REQUIRED'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : intel.statusTier === 'ON TRACK' || intel.statusTier === 'LOW RISK'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          )}
                        >
                          {intel.statusTier}
                        </span>

                        <span className="font-mono font-bold text-xs text-gray-500">
                          Booking #{booking.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>

                      {/* Explicit Why Explanation */}
                      <p className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mt-1">
                        <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Status Factor:</span>
                        <span
                          className={cn(
                            'font-bold',
                            intel.statusTier === 'ACTION REQUIRED' && 'text-rose-700',
                            intel.statusTier === 'ATTENTION REQUIRED' && 'text-amber-800',
                            intel.statusTier === 'ON TRACK' && 'text-emerald-700',
                            intel.statusTier === 'COMPLETED' && 'text-gray-700'
                          )}
                        >
                          {intel.whyReason}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Link
                        href={`/booking/${booking.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none"
                      >
                        <span>Deep Tracking</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Row 2: Route & Checkpoint Milestone Progression */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-gray-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          HIGHWAY LOGISTICS CORRIDOR
                        </div>
                        <div className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2 mt-0.5">
                          <span>{booking.load?.loadingAddress || 'Origin'}</span>
                          <ArrowRight className="w-4 h-4 text-orange-500 shrink-0" />
                          <span>{booking.load?.unloadingAddress || 'Destination'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          PROGRESSION
                        </div>
                        <div className="text-sm sm:text-base font-bold font-mono text-orange-600">
                          {intel.progressPercent}% Corridor Completed
                        </div>
                      </div>
                    </div>

                    {/* Checkpoint Milestone Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium text-gray-500">
                        <span>Highway Checkpoint Progression</span>
                        <span className="font-mono text-gray-700 font-semibold">
                          Checkpoint {intel.crossedCount} of {intel.totalCheckpoints} passed
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5">
                        {['Loading Hub', 'Corridor Toll 1', 'Transit Hub', 'State Border', 'Unloading Point'].map(
                          (cpName, idx) => {
                            const isDone = idx < intel.crossedCount
                            const isCurrent = idx === intel.crossedCount - 1
                            return (
                              <div key={idx} className="space-y-1">
                                <div
                                  className={cn(
                                    'h-2 rounded-full transition-colors',
                                    isDone
                                      ? 'bg-emerald-500'
                                      : isCurrent
                                      ? 'bg-orange-500'
                                      : 'bg-gray-200'
                                  )}
                                />
                                <span className="block text-[10px] font-mono text-gray-500 truncate">
                                  {cpName}
                                </span>
                              </div>
                            )
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: 4-Stat Telemetry Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Last Checkpoint */}
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                        LAST CHECKPOINT
                      </span>
                      <span className="font-bold text-gray-900 block truncate text-xs sm:text-sm">
                        📍 {intel.currentLocationName}
                      </span>
                      <span className="text-[10px] text-gray-500 block">
                        Checkpoint {intel.crossedCount}/{intel.totalCheckpoints} passed
                      </span>
                    </div>

                    {/* Next Milestone & ETA */}
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                        NEXT MILESTONE & ETA
                      </span>
                      <span className="font-bold text-gray-900 block truncate text-xs sm:text-sm">
                        🎯 {intel.nextMilestoneName}
                      </span>
                      <span className="text-[10px] text-orange-600 font-mono font-bold block">
                        ⏱️ {intel.estimatedArrival} (Indicative ETA)
                      </span>
                    </div>

                    {/* Commercial Terms */}
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                        COMMERCIAL TERMS ({formatINR(Number(booking.agreedPrice))})
                      </span>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-gray-500">50% Advance:</span>
                        <span
                          className={cn(
                            'font-bold',
                            booking.advanceConfirmed ? 'text-emerald-700' : 'text-rose-600'
                          )}
                        >
                          {booking.advanceConfirmed ? '✓ Paid' : '⚠️ Pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">E-Way Bill:</span>
                        <span
                          className={cn(
                            'font-bold',
                            booking.ewayBillNumber ? 'text-emerald-700' : 'text-amber-700'
                          )}
                        >
                          {booking.ewayBillNumber ? '✓ Active' : '🟡 Missing'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Required Actions Callouts */}
                  {intel.requiredActions.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {intel.requiredActions.map((action, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-amber-900">
                                {action.title}
                              </span>
                              <p className="text-[11px] text-amber-800/90 mt-0.5">
                                {action.description}
                              </p>
                            </div>
                          </div>

                          {action.actionType === 'CONFIRM_ADVANCE' && (
                            <button
                              type="button"
                              disabled={actionLoading === `advance-${booking.id}`}
                              onClick={() => handleConfirmAdvance(booking.id)}
                              className="shrink-0 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer disabled:opacity-60"
                            >
                              {actionLoading === `advance-${booking.id}` ? 'Confirming...' : 'Confirm 50% Advance'}
                            </button>
                          )}

                          {action.actionType === 'CONFIRM_BALANCE' && (
                            <button
                              type="button"
                              disabled={actionLoading === `balance-${booking.id}`}
                              onClick={() => handleConfirmBalance(booking.id)}
                              className="shrink-0 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer disabled:opacity-60"
                            >
                              {actionLoading === `balance-${booking.id}` ? 'Confirming...' : 'Confirm Final POD Balance'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explicit Disclaimer Footer */}
                  <div className="text-[10px] font-mono text-gray-500 flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Info className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                    <span>
                      GPS location estimated from national highway geofence checkpoints. ETAs are indicative milestone-based estimates.
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Empty State (Zero shipments) ── */
          <div className="bg-white rounded-2xl border border-gray-200 p-10 sm:p-14 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto border border-orange-100">
              <Truck className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              No active shipments in this control category
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              Shipments will automatically appear in the Control Tower as transporters and cargo owners confirm bookings along national freight corridors.
            </p>
            <div className="pt-2">
              {isShipper ? (
                <button
                  type="button"
                  onClick={() => router.push('/post-load')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post a Freight Load</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/search?type=load')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Available Loads</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
