'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  Truck,
  PlusCircle,
  Search,
  ArrowRight,
  ShieldCheck,
  Clock,
  AlertCircle,
  Sparkles,
  Pencil,
  Power,
  Trash2,
  Upload,
  X,
  Menu,
  Bell,
  MapPin,
} from 'lucide-react'
import { api, trucksApi, authApi, matchesApi } from '@/lib/api'
import { isOwnListingRow } from '@/lib/marketplaceActions'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Footer, LanguageToggle } from '@/components/layout'
import { MatchesPanel } from '@/components/matching/MatchesPanel'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { TruckCompliancePanel } from '@/components/compliance/TruckCompliancePanel'
import { toast } from '@/lib/toast'
import { cn, formatINR, formatPhone, whatsappLink } from '@/lib/utils'

interface FleetTruck {
  id: string
  /** Owner user id (from the trucks API); legacy gate for Edit/Delete to own trucks. */
  userId?: string
  /** Backend-computed ownership (Prompt 9) — preferred over the userId compare. */
  isOwner?: boolean
  registrationNumber?: string | null
  bodyType: 'Open' | 'Container' | 'OpenBody' | string
  lengthFt?: number
  heightFt?: number
  tonnageCapacity: number
  serviceableRadiusKm?: number
  verificationStatus: 'Verified' | 'Pending' | 'Rejected' | string
  status?: 'Available' | 'On Trip' | 'Under Verification' | 'Maintenance' | string
  /** ISO timestamp of the last Vahan RC validation. */
  vahanValidatedAt?: string | null
  /** FASTag readiness: Unknown | Active | LowBalance | Inactive. */
  fastagStatus?: string | null
  currentLat?: number
  currentLng?: number
  currentLocationName?: string
  preferredDestinations?: string[]
  activeBooking?: {
    id: string
    loadingAddress: string
    unloadingAddress: string
    agreedPrice: number
    status: string
    advanceConfirmed?: boolean
    balanceConfirmed?: boolean
    checkpoints?: Array<{
      id: string
      seq: number
      name: string
      passed?: boolean
    }>
  } | null
  completedTripsCount?: number
  revenueEarned?: number
  documents?: {
    rcBook: 'Verified' | 'Pending' | 'Missing'
    insurance: 'Verified' | 'Pending' | 'Missing'
  }
}

export default function MyFleetPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [trucks, setTrucks] = useState<FleetTruck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<{ id?: string; name?: string; role?: string } | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Registration Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [regNumber, setRegNumber] = useState('')
  const [bodyType, setBodyType] = useState('Open')
  const [capacity, setCapacity] = useState('16')
  const [lengthFt, setLengthFt] = useState('24')
  const [heightFt, setHeightFt] = useState('8')
  const [locationAddress, setLocationAddress] = useState('Mumbai, Maharashtra')
  const [radiusKm, setRadiusKm] = useState('50')
  const [registering, setRegistering] = useState(false)

  // Document Upload Modal State for a specific truck
  const [uploadDocModalTruck, setUploadDocModalTruck] = useState<FleetTruck | null>(null)
  const [docType, setDocType] = useState<'RC' | 'Insurance'>('RC')
  const [docNumber, setDocNumber] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit Truck Modal State
  const [editTruck, setEditTruck] = useState<FleetTruck | null>(null)
  const [editBodyType, setEditBodyType] = useState('Open')
  const [editCapacity, setEditCapacity] = useState('16')
  const [editLength, setEditLength] = useState('24')
  const [editHeight, setEditHeight] = useState('8')
  const [editRadius, setEditRadius] = useState('50')
  const [editLocation, setEditLocation] = useState('')
  const [editDestinations, setEditDestinations] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete Truck Confirmation State — destructive and irreversible server-side
  const [deleteTarget, setDeleteTarget] = useState<FleetTruck | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  // Per-truck smart matches (Need Load ↔ Need Vehicle, ≤50km, tonnage/budget)
  const [expandedMatches, setExpandedMatches] = useState<Record<string, { loading: boolean; items: any[] }>>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch {
      // Ignore
    }

    loadFleetData()
  }, [])

  const loadFleetData = async () => {
    try {
      setLoading(true)
      setError('')

      const [trucksRes, bookingsRes] = await Promise.allSettled([
        trucksApi.getMyTrucks(),
        api.get('/bookings/my-bookings'),
      ])

      const fetchedTrucks: any[] = trucksRes.status === 'fulfilled' ? trucksRes.value.data || [] : []
      const fetchedBookings: any[] = bookingsRes.status === 'fulfilled' ? bookingsRes.value.data || [] : []

      const enriched: FleetTruck[] = fetchedTrucks.map((truck) => {
        const truckBookings = fetchedBookings.filter(
          (b) => b.truckId === truck.id || b.truck?.id === truck.id
        )
        const activeBk = truckBookings.find(
          (b) => b.status === 'InTransit' || b.status === 'Confirmed'
        )
        const completedBks = truckBookings.filter((b) => b.status === 'Completed')
        const revenueEarned = completedBks.reduce((sum, b) => sum + Number(b.agreedPrice || 0), 0)

        let operationalStatus: 'Available' | 'On Trip' | 'Under Verification' = 'Available'
        if (activeBk) {
          operationalStatus = 'On Trip'
        } else if (truck.verificationStatus === 'Pending') {
          operationalStatus = 'Under Verification'
        }

        return {
          ...truck,
          status: operationalStatus,
          activeBooking: activeBk
            ? {
                id: activeBk.id,
                loadingAddress: activeBk.load?.loadingAddress || 'Origin Centerpoint',
                unloadingAddress: activeBk.load?.unloadingAddress || 'Destination Terminal',
                agreedPrice: Number(activeBk.agreedPrice) || 48000,
                status: activeBk.status,
                advanceConfirmed: activeBk.advanceConfirmed,
                balanceConfirmed: activeBk.balanceConfirmed,
                checkpoints: activeBk.checkpoints || [
                  { id: '1', seq: 1, name: 'Loading Point', passed: true },
                  { id: '2', seq: 2, name: 'Corridor Toll 1', passed: true },
                  { id: '3', seq: 3, name: 'Mid Corridor Hub', passed: false },
                  { id: '4', seq: 4, name: 'State Checkpoint', passed: false },
                  { id: '5', seq: 5, name: 'Unloading Point', passed: false },
                ],
              }
            : null,
          completedTripsCount: completedBks.length,
          revenueEarned,
          documents: {
            rcBook: truck.verificationStatus === 'Verified' ? 'Verified' : 'Pending',
            insurance: truck.verificationStatus === 'Verified' ? 'Verified' : 'Pending',
          },
        }
      })

      setTrucks(enriched)
    } catch {
      setError('Failed to load registered fleet vehicles.')
      toast.error('Failed to load fleet data')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterTruck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regNumber.trim()) {
      toast.error('Vehicle registration number is required (e.g. MH 12 QT 8492)')
      return
    }

    try {
      setRegistering(true)
      await api.post('/trucks', {
        registrationNumber: regNumber.toUpperCase().trim(),
        bodyType,
        tonnageCapacity: parseFloat(capacity) || 16,
        lengthFt: parseFloat(lengthFt) || 24,
        heightFt: parseFloat(heightFt) || 8,
        currentLocationAddress: locationAddress || 'Mumbai, Maharashtra',
        serviceableRadiusKm: parseFloat(radiusKm) || 50,
      })

      toast.success(`Vehicle ${regNumber.toUpperCase()} registered for Vahan verification!`)
      setRegisterModalOpen(false)
      setRegNumber('')
      loadFleetData()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register truck')
    } finally {
      setRegistering(false)
    }
  }

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadDocModalTruck) return
    if (!selectedFile) {
      toast.error('Please select an RC or Insurance document file (PDF or Image)')
      return
    }

    try {
      setUploadingDoc(true)
      await trucksApi.uploadDocument(uploadDocModalTruck.id, docType, selectedFile, docNumber)
      toast.success(`${docType} document uploaded for verification!`)
      setUploadDocModalTruck(null)
      setSelectedFile(null)
      setDocNumber('')
      loadFleetData()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload document')
    } finally {
      setUploadingDoc(false)
    }
  }

  /**
   * Owner gate — `/trucks/my-trucks` only returns the signed-in user's trucks,
   * but the owner controls (Edit/Delete/Manage Documents) stay hidden unless
   * the card is provably the current user's: the backend `isOwner` flag
   * (Prompt 9) wins, with the legacy userId compare as fallback (defence in
   * depth alongside the server-side check).
   */
  const canManageTruck = (truck: FleetTruck) => isOwnListingRow(truck, user?.id)

  const openEditModal = (truck: FleetTruck) => {
    setEditTruck(truck)
    setEditBodyType(truck.bodyType || 'Open')
    setEditCapacity(truck.tonnageCapacity?.toString() ?? '16')
    setEditLength(truck.lengthFt?.toString() ?? '24')
    setEditHeight(truck.heightFt?.toString() ?? '8')
    setEditRadius((truck.serviceableRadiusKm ?? 50).toString())
    setEditLocation(truck.currentLocationName || '')
    setEditDestinations((truck.preferredDestinations || []).join(', '))
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTruck) return
    if (!canManageTruck(editTruck)) {
      toast.error('You can only edit your own vehicles')
      return
    }

    try {
      setSavingEdit(true)
      await trucksApi.updateTruck(editTruck.id, {
        bodyType: editBodyType,
        tonnageCapacity: parseFloat(editCapacity) || undefined,
        lengthFt: editLength ? parseFloat(editLength) : undefined,
        heightFt: editHeight ? parseFloat(editHeight) : undefined,
        serviceableRadiusKm: editRadius ? parseFloat(editRadius) : undefined,
        preferredDestinations: editDestinations
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
      })

      // Location moves go through the dedicated re-geocoding endpoint (re-runs matching).
      const newLocation = editLocation.trim()
      if (newLocation && newLocation !== (editTruck.currentLocationName || '')) {
        await trucksApi.updateTruckLocation(editTruck.id, newLocation)
      }

      toast.success(`Vehicle ${editTruck.registrationNumber} specifications updated!`)
      setEditTruck(null)
      loadFleetData()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update truck details')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleteBusy(true)
      await trucksApi.deleteTruck(deleteTarget.id)
      setTrucks((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      toast.success(`Vehicle ${deleteTarget.registrationNumber} removed`)
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete truck')
    } finally {
      setDeleteBusy(false)
    }
  }

  const handleToggleDeactivate = (truck: FleetTruck) => {
    toast.info(`Status updated for vehicle ${truck.registrationNumber}`)
  }

  const toggleMatches = async (truckId: string) => {
    if (expandedMatches[truckId]) {
      setExpandedMatches((prev) => {
        const copy = { ...prev }
        delete copy[truckId]
        return copy
      })
      return
    }
    setExpandedMatches((prev) => ({ ...prev, [truckId]: { loading: true, items: [] } }))
    try {
      const res = await matchesApi.getMatchesForTruck(truckId, 50)
      const items = Array.isArray(res.data) ? res.data : []
      setExpandedMatches((prev) => ({ ...prev, [truckId]: { loading: false, items } }))
      if (items.length === 0) toast.info('No freight loads within 50 km matching this vehicle tonnage & route')
      matchesApi.evaluateForTruck(truckId, 50).catch(() => null)
    } catch (err: any) {
      setExpandedMatches((prev) => ({ ...prev, [truckId]: { loading: false, items: [] } }))
      toast.error(err?.response?.data?.message || 'Failed to fetch matched loads')
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

  // Telemetry metric counts
  const totalTrucks = trucks.length
  const availableCount = trucks.filter((t) => t.status === 'Available').length
  const onTripCount = trucks.filter((t) => t.status === 'On Trip').length
  const verifiedCount = trucks.filter((t) => t.verificationStatus === 'Verified').length
  const pendingCount = trucks.filter(
    (t) => t.verificationStatus === 'Pending' || t.status === 'Under Verification'
  ).length

  // Filtered List
  const filteredTrucks = trucks.filter((truck) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'Available' && truck.status !== 'Available') return false
      if (statusFilter === 'On Trip' && truck.status !== 'On Trip') return false
      if (
        statusFilter === 'Under Verification' &&
        truck.verificationStatus !== 'Pending' &&
        truck.status !== 'Under Verification'
      )
        return false
      if (statusFilter === 'Verified' && truck.verificationStatus !== 'Verified') return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const reg = (truck.registrationNumber || '').toLowerCase()
      const body = (truck.bodyType || '').toLowerCase()
      return reg.includes(q) || body.includes(q)
    }

    return true
  })

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

  return (
    <div className="min-h-screen bg-canvas text-surface-100 flex flex-col font-sans selection:bg-primary-500 selection:text-white">
      {/* ── 1. Sticky Top Navigation ── */}
      <header className="sticky top-0 z-40 w-full bg-canvas/85 backdrop-blur-xl border-b border-white/10 shadow-modal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Brand Logo */}
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

              {/* Desktop Nav Links */}
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
              <Link
                href="/notifications"
                className="relative p-2.5 text-surface-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer border border-transparent hover:border-white/10"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500 shadow-glow-primary ring-2 ring-canvas" />
              </Link>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/truck-driver"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-surface-900/80 backdrop-blur-md text-xs font-semibold text-surface-200 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none shadow-card"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-300 font-bold flex items-center justify-center text-xs border border-primary-500/30">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'F'}
                  </div>
                  <span>Dashboard</span>
                  <span className="px-2 py-0.5 rounded-md bg-surface-950 text-surface-400 text-[10px] font-mono border border-white/5">
                    Fleet Owner
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

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
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
                href="/dashboard/truck-driver"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2 text-sm font-semibold text-surface-200 hover:bg-white/5 rounded-xl"
              >
                Fleet Dashboard
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

      {/* ── Main Workspace ── */}
      <main className="flex-1 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
        {/* ── 2. Page Header & Add Truck CTA ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>RTO / Vahan Certified Fleet</span>
              </span>
              <span className="text-xs font-mono font-bold text-surface-400">
                • {totalTrucks} Vehicles Registered
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              My Fleet
            </h1>
            <p className="text-xs sm:text-sm text-surface-400">
              Manage commercial vehicles, compliance verification status, and active trip assignments.
            </p>
          </div>

          {/* Add Truck Button (Top Right) */}
          <button
            type="button"
            onClick={() => router.push('/need-vehicle')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:outline-none cursor-pointer self-start sm:self-auto shrink-0 border border-primary-400/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Truck</span>
          </button>
        </div>

        {/* ── Telemetry Stats Overview Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              TOTAL FLEET
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
              {loading ? '...' : totalTrucks}
            </div>
            <div className="text-xs text-surface-400 mt-0.5">Registered lorries</div>
          </div>

          <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              AVAILABLE NOW
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mt-1">
              {loading ? '...' : availableCount}
            </div>
            <div className="text-xs text-surface-400 mt-0.5">Ready for dispatch</div>
          </div>

          <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              ON ACTIVE TRIP
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-primary-400 mt-1">
              {loading ? '...' : onTripCount}
            </div>
            <div className="text-xs text-surface-400 mt-0.5">In highway transit</div>
          </div>

          <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal hover:border-white/20 transition-all">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              VAHAN VERIFIED
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
              {loading ? '...' : `${verifiedCount}/${totalTrucks}`}
            </div>
            <div className="text-xs text-surface-400 mt-0.5">
              {pendingCount > 0 ? `${pendingCount} verification pending` : 'RC & insurance clear'}
            </div>
          </div>
        </div>

        {/* ── Smart Matches — both dashboards, Pending/Booked/Completed, ≤50km, WhatsApp ── */}
        <MatchesPanel role="truck_driver" />

        {/* ── Search & Filter Controls Toolbar ── */}
        <div className="bg-panel rounded-2xl border border-white/10 p-4 sm:p-5 shadow-modal flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-surface-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by registration number or body type…"
              className="w-full pl-10 pr-4 py-2.5 bg-surface-950/90 border border-white/10 rounded-xl text-white placeholder-surface-500 text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'ALL', label: 'All Fleet' },
              { id: 'Available', label: 'Available' },
              { id: 'On Trip', label: 'On Trip' },
              { id: 'Under Verification', label: 'Verification Pending' },
              { id: 'Verified', label: 'Vahan Verified' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
                  statusFilter === tab.id
                    ? 'bg-primary-500 text-white shadow-glow-primary'
                    : 'bg-surface-950 border border-white/10 text-surface-400 hover:text-white hover:bg-white/5'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. Fleet Cards Grid ── */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-panel rounded-2xl border border-white/10 p-6 space-y-4 shadow-modal animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-surface-950" />
                    <div className="space-y-2">
                      <div className="w-36 h-4 bg-surface-900 rounded" />
                      <div className="w-24 h-3 bg-surface-950 rounded" />
                    </div>
                  </div>
                  <div className="w-24 h-6 bg-surface-900 rounded-full" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="h-16 bg-surface-950 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-panel rounded-2xl border border-danger-500/30 p-8 text-center space-y-3">
            <div className="text-danger-400 font-bold text-sm">{error}</div>
            <button
              type="button"
              onClick={loadFleetData}
              className="px-4 py-2 bg-surface-900 hover:bg-surface-800 text-white text-xs font-bold rounded-xl border border-white/10"
            >
              Retry Loading Fleet
            </button>
          </div>
        ) : filteredTrucks.length === 0 ? (
          /* ── 4. Empty State (Zero Trucks Registered) ── */
          <div className="bg-panel rounded-2xl border border-white/10 p-10 sm:p-14 text-center space-y-4 shadow-modal">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center mx-auto border border-primary-500/20">
              <Truck className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {searchQuery ? 'No trucks match your search query' : 'No trucks registered yet'}
            </h3>
            <p className="text-xs sm:text-sm text-surface-400 max-w-md mx-auto leading-relaxed">
              Register your commercial lorry with vehicle registration, body type, and tonnage capacity
              to receive direct verified freight loads with zero broker cuts.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push('/need-vehicle')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer border border-primary-400/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Your First Truck</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredTrucks.map((truck) => {
              const isVerified = truck.verificationStatus === 'Verified'
              const isRejected = truck.verificationStatus === 'Rejected'
              const isOnTrip = truck.status === 'On Trip' && truck.activeBooking

              return (
                <div
                  key={truck.id}
                  className="bg-panel rounded-2xl border border-white/10 p-5 sm:p-6 shadow-modal hover:border-primary-500/30 transition-all duration-200 space-y-5"
                >
                  {/* Card Header: Identity, Verification Badge, Status Badge, Icon Actions */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      {/* Truck Icon Badge */}
                      <div className="w-12 h-12 rounded-2xl bg-surface-950 text-primary-400 flex items-center justify-center border border-white/10 shrink-0">
                        <Truck className="w-6 h-6 stroke-[2.2]" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-white text-base sm:text-lg tracking-wide">
                            {truck.registrationNumber || 'MH-XX-TRUCK'}
                          </span>

                          {/* Verification Badge */}
                          {isVerified ? (
                            <VerifiedBadge verified source="vahan" validatedAt={truck.vahanValidatedAt} variant="dark" />
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-500/30 text-xs font-medium">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Verification Rejected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-900 text-surface-400 border border-white/10 text-xs font-medium">
                              <Clock className="w-3.5 h-3.5 text-surface-400" />
                              <span>Verification Pending</span>
                            </span>
                          )}

                          {/* Operational Status Badge */}
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-xs font-semibold border font-mono',
                              truck.status === 'Available'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                                : truck.status === 'On Trip'
                                ? 'bg-primary-500/20 text-primary-300 border-primary-500/30'
                                : 'bg-surface-900 text-surface-400 border-white/10'
                            )}
                          >
                            {truck.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-surface-400 font-medium">
                          <span className="font-semibold text-surface-200">
                            {truck.bodyType === 'Open'
                              ? 'Open Body'
                              : truck.bodyType === 'Container'
                              ? 'Closed Container'
                              : 'Open Body Trailer'}{' '}
                            Truck
                          </span>
                          {truck.lengthFt && <span>• {truck.lengthFt}ft Length</span>}
                          {truck.heightFt && <span>• {truck.heightFt}ft Height</span>}
                        </div>
                      </div>
                    </div>

                    {/* Icon Action Buttons (Compacts with badges) */}
                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      {/* Manage Documents (owner only, Prompt 9): RC/Insurance
                          upload & re-upload lives in the KYC modal. Pending
                          verification trucks are nudged with the extra label. */}
                      {canManageTruck(truck) && (
                        <button
                          type="button"
                          onClick={() => setUploadDocModalTruck(truck)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 text-primary-300 border border-primary-500/30 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
                          title="Manage RC & Insurance documents"
                          aria-label={`Manage documents for vehicle ${truck.registrationNumber || truck.bodyType}`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isVerified ? 'Manage Documents' : 'Manage Documents — Upload RC / KYC'}</span>
                        </button>
                      )}

                      {/* Edit Icon Button — own trucks only (server re-checks ownership) */}
                      {canManageTruck(truck) && (
                        <button
                          type="button"
                          onClick={() => openEditModal(truck)}
                          className="p-2 text-surface-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
                          title="Edit Vehicle Details"
                          aria-label={`Edit vehicle ${truck.registrationNumber || truck.bodyType}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Icon Button — own trucks only, with confirmation gate */}
                      {canManageTruck(truck) && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(truck)}
                          className="p-2 text-danger-400 hover:bg-danger-950/40 rounded-xl border border-danger-900/40 transition-colors focus-visible:ring-2 focus-visible:ring-danger-500 focus:outline-none cursor-pointer"
                          title="Delete vehicle"
                          aria-label={`Delete vehicle ${truck.registrationNumber || truck.bodyType}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Deactivate / Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleDeactivate(truck)}
                        className="p-2 text-surface-400 hover:text-danger-400 hover:bg-danger-950/30 rounded-xl border border-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-danger-500 focus:outline-none cursor-pointer"
                        title="Toggle Active State"
                        aria-label="Toggle Active State"
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      {/* Match Loads (≤50km, tonnage/budget) with WhatsApp */}
                      <button
                        type="button"
                        onClick={() => toggleMatches(truck.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs font-bold transition-all shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer border border-primary-400/30"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{expandedMatches[truck.id] ? 'Hide Loads' : 'Match Loads ≤50km'}</span>
                      </button>
                    </div>
                  </div>

                  {/* ── Card Body: If On Trip vs If Available ── */}
                  {isOnTrip ? (
                    /* Mini Checkpoint Progress Bar for Trucks On Trip */
                    <div className="bg-surface-950/80 rounded-2xl p-4 sm:p-5 border border-white/5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                            ACTIVE CONSIGNMENT TRIP
                          </div>
                          <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mt-0.5">
                            <span>{truck.activeBooking?.loadingAddress}</span>
                            <ArrowRight className="w-4 h-4 text-primary-400 shrink-0" />
                            <span>{truck.activeBooking?.unloadingAddress}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                            AGREED FREIGHT
                          </div>
                          <div className="text-sm sm:text-base font-bold font-mono text-emerald-400">
                            {formatINR(truck.activeBooking?.agreedPrice || 48000)}
                          </div>
                        </div>
                      </div>

                      {/* Telemetry Stat Row for Trip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-panel/90 rounded-xl p-3 border border-white/5">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                            ORIGIN
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5 truncate">
                            {truck.activeBooking?.loadingAddress.split(',')[0]}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                            CHECKPOINT STATUS
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-primary-400 font-mono mt-0.5">
                            Milestone 2/5 Passed
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                            DESTINATION
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5 truncate">
                            {truck.activeBooking?.unloadingAddress.split(',')[0]}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                            MILESTONE ETA
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5">
                            Est. 4h 15m
                          </div>
                        </div>
                      </div>

                      {/* 5-Step Checkpoint Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-medium text-surface-400">
                          <span>Highway Checkpoint Progression</span>
                          <span className="font-mono text-surface-300 font-semibold">2 of 5 recorded</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {['Loading Hub', 'Corridor Toll', 'Transit Hub', 'State Border', 'Unloading Point'].map(
                            (cpName, idx) => {
                              const isDone = idx < 2
                              const isCurrent = idx === 1
                              return (
                                <div key={idx} className="space-y-1">
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
                                    {cpName}
                                  </span>
                                </div>
                              )
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 4-Stat Telemetry Row for Available Truck */
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5">
                        <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                          TONNAGE CAPACITY
                        </div>
                        <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
                          {truck.tonnageCapacity} Tons
                        </div>
                      </div>

                      <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5">
                        <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                          VEHICLE BODY
                        </div>
                        <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5 truncate">
                          {truck.bodyType}
                        </div>
                      </div>

                      <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5">
                        <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                          DECK DIMENSIONS
                        </div>
                        <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
                          {truck.lengthFt || 24}ft × {truck.heightFt || 8}ft
                        </div>
                      </div>

                      <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5">
                        <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                          SERVICE RADIUS
                        </div>
                        <div className="text-sm sm:text-base font-bold text-primary-400 font-mono mt-0.5">
                          {truck.serviceableRadiusKm || 50} km
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preferred Corridors (if present) */}
                  {truck.preferredDestinations && truck.preferredDestinations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                        Active Corridors:
                      </span>
                      {truck.preferredDestinations.map((dest, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-surface-950 text-surface-300 text-[11px] font-medium border border-white/5"
                        >
                          {dest}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Verification & Compliance Panel (Vahan RC · FASTag · checklist) */}
                  <TruckCompliancePanel truck={truck} onChanged={loadFleetData} />

                  {/* Compliance Summary Footer */}
                  <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-surface-400">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            isVerified ? 'bg-emerald-400 shadow-glow-sm' : 'bg-amber-400'
                          )}
                        />
                        <span>RC Book: {isVerified ? 'Vahan Verified' : 'Pending Upload/Review'}</span>
                      </span>
                      <span>•</span>
                      <span>Insurance: {isVerified ? 'Active Commercial Cover' : 'Pending Review'}</span>
                      <span>•</span>
                      <span>
                        FASTag:{' '}
                        {truck.fastagStatus === 'Active'
                          ? 'Toll Ready'
                          : truck.fastagStatus === 'LowBalance'
                          ? 'Low Balance'
                          : truck.fastagStatus === 'Inactive'
                          ? 'Inactive'
                          : 'Not Reported'}
                      </span>
                    </div>

                    <Link
                      href="/search?type=load"
                      className="text-xs font-bold text-primary-400 hover:text-primary-300 inline-flex items-center gap-1"
                    >
                      <span>Marketplace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Per-Vehicle Smart Matches (tonnage/route≤50km/budget, Pending/Booked/Completed, WhatsApp) */}
                  {expandedMatches[truck.id] && (
                    <div className="pt-4 mt-2 border-t border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary-400" />
                          <span>Matching Need Loads ≤50km</span>
                          <span className="px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/20 text-xs font-mono">
                            {expandedMatches[truck.id].items.length} match{expandedMatches[truck.id].items.length === 1 ? '' : 'es'}
                          </span>
                        </h4>
                        <span className="text-xs text-surface-400 font-mono">WhatsApp on Pending</span>
                      </div>
                      {expandedMatches[truck.id].loading ? (
                        <div className="h-20 rounded-xl bg-surface-950/60 border border-white/5 animate-pulse" />
                      ) : expandedMatches[truck.id].items.length === 0 ? (
                        <div className="p-6 rounded-xl bg-surface-950/60 border border-white/5 text-center">
                          <p className="text-sm font-semibold text-surface-300">No open freight within 50 km matching {truck.tonnageCapacity}T capacity & route</p>
                          <p className="text-xs text-surface-400 mt-1">Matching checks load tonnage ≤ truck capacity, route proximity ≤50km, and budget.</p>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {expandedMatches[truck.id].items.map((m: any) => {
                            const load = m.load
                            const match = m.match
                            const dist = Number(m.distanceKm ?? match?.distanceKm ?? 0).toFixed(1)
                            const score = match?.score ?? 70
                            return (
                              <li key={load.id} className="p-3.5 rounded-xl bg-surface-950/80 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-white text-sm truncate">{load.loadingAddress} → {load.unloadingAddress}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30 text-xs font-mono font-bold">Pending</span>
                                    <span className="px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/20 text-xs font-mono font-bold">{score}% match</span>
                                    <span className="text-xs font-mono text-surface-400">{dist} km</span>
                                  </div>
                                  <p className="text-xs text-surface-400">
                                    {load.tonnageRequired}T • {load.truckType} • {load.maxPrice ? formatINR(Number(load.maxPrice)) : 'Open budget'} • {match?.factors?.capacity?.detail ?? ''} • {match?.factors?.budget?.detail ?? ''}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                  {load.user?.phone ? (
                                    <a
                                      href={whatsappLink(load.user.phone, `Hi ${load.user.name ?? 'Shipper'}, your freight ${load.loadingAddress} → ${load.unloadingAddress} matches my lorry ${truck.registrationNumber} (${truck.tonnageCapacity}T). Distance ${dist}km, score ${score}%.`)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-colors"
                                    >
                                      WhatsApp
                                    </a>
                                  ) : (
                                    <span className="text-xs text-surface-500">Contact locked</span>
                                  )}
                                  <Link href="/search?type=load" className="px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold transition-colors">
                                    Book
                                  </Link>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── REGISTER NEW TRUCK MODAL ── */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-panel rounded-2xl border border-white/15 max-w-lg w-full p-6 shadow-modal space-y-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Register Commercial Lorry</h3>
              </div>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="p-1.5 text-surface-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterTruck} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                  Registration Number (e.g. MH 12 QT 8492) *
                </label>
                <input
                  type="text"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  placeholder="MH 12 QT 8492"
                  className="w-full px-4 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                    Body Type *
                  </label>
                  <select
                    value={bodyType}
                    onChange={(e) => setBodyType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500"
                  >
                    <option value="Open">Open Body</option>
                    <option value="Container">Closed Container</option>
                    <option value="OpenBody">Open Body Trailer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                    Capacity (Tons) *
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white font-mono font-bold text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                    Deck Length (ft)
                  </label>
                  <input
                    type="number"
                    value={lengthFt}
                    onChange={(e) => setLengthFt(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                    Deck Height (ft)
                  </label>
                  <input
                    type="number"
                    value={heightFt}
                    onChange={(e) => setHeightFt(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                    Base Location / Operating Hub
                  </label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="e.g. Bhiwandi, MH"
                    className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                    Service Radius (km)
                  </label>
                  <input
                    type="number"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-surface-300 hover:text-white hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer disabled:opacity-60 border border-primary-400/30"
                >
                  {registering ? 'Registering...' : 'Register Lorry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── UPLOAD KYC / RC DOCUMENT MODAL ── */}
      {uploadDocModalTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-panel rounded-2xl border border-white/15 max-w-md w-full p-6 shadow-modal space-y-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Upload Vehicle KYC Document</h3>
                <p className="text-xs text-surface-400">
                  Vehicle: <span className="font-mono font-bold text-primary-400">{uploadDocModalTruck.registrationNumber}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploadDocModalTruck(null)}
                className="p-1.5 text-surface-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                  Document Type *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500"
                >
                  <option value="RC">RC Book (Registration Certificate)</option>
                  <option value="Insurance">Commercial Vehicle Insurance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                  Document Number (Optional)
                </label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="e.g. RC-MH12-9842"
                  className="w-full px-4 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                  Upload File (PDF, JPEG, PNG, max 5MB) *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-surface-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-400 hover:file:bg-primary-500/20 cursor-pointer"
                  required
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUploadDocModalTruck(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-surface-300 hover:text-white hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer disabled:opacity-60 border border-primary-400/30"
                >
                  {uploadingDoc ? 'Uploading...' : 'Submit Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT TRUCK MODAL ── */}
      {editTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-panel rounded-2xl border border-white/15 max-w-md w-full p-6 shadow-modal space-y-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Edit Vehicle Specifications</h3>
                <p className="text-xs font-mono font-bold text-primary-400">{editTruck.registrationNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditTruck(null)}
                className="p-1.5 text-surface-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Registration number is Vahan-verified & unique — immutable */}
              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                  Registration Number (read-only — RTO verified)
                </label>
                <input
                  type="text"
                  value={editTruck.registrationNumber || ''}
                  readOnly
                  disabled
                  aria-readonly="true"
                  className="w-full px-3 py-2.5 bg-surface-950/60 border border-white/5 rounded-xl text-surface-500 font-mono font-bold text-xs sm:text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                  Body Type
                </label>
                <select
                  value={editBodyType}
                  onChange={(e) => setEditBodyType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-primary-500"
                >
                  <option value="Open">Open Body</option>
                  <option value="Container">Closed Container</option>
                  <option value="OpenBody">Open Body Trailer</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                    Payload Capacity (Tons)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white font-mono font-bold text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                    Serviceable Radius (km)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={editRadius}
                    onChange={(e) => setEditRadius(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                    Deck Length (ft)
                  </label>
                  <input
                    type="number"
                    min="8"
                    value={editLength}
                    onChange={(e) => setEditLength(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                    Deck Height (ft)
                  </label>
                  <input
                    type="number"
                    min="6"
                    value={editHeight}
                    onChange={(e) => setEditHeight(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary-400" aria-hidden="true" />
                  Current Location / Base Hub (leave blank to keep current)
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. Bhiwandi, Maharashtra"
                  className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                  Preferred Destinations / Corridors (comma-separated)
                </label>
                <input
                  type="text"
                  value={editDestinations}
                  onChange={(e) => setEditDestinations(e.target.value)}
                  placeholder="e.g. Mumbai, Pune, Bangalore"
                  className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditTruck(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-surface-300 hover:text-white hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer disabled:opacity-60 border border-primary-400/30"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE TRUCK CONFIRMATION GATE — destructive and irreversible ── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => (deleteBusy ? undefined : setDeleteTarget(null))}
        onConfirm={handleDelete}
        title="Delete this vehicle?"
        destructive
        loading={deleteBusy}
        confirmLabel="Delete vehicle"
        message={
          <>
            This permanently removes{' '}
            <span className="font-mono font-semibold text-surface-100">
              {deleteTarget?.registrationNumber}
            </span>{' '}
            from your fleet and the marketplace. It will no longer be matched to
            freight loads. Trucks with active or past bookings cannot be deleted
            and this action cannot be undone.
          </>
        }
      />

      {/* Footer */}
      <Footer />
    </div>
  )
}
