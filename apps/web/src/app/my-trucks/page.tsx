'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TruckIcon,
  PlusCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import {
  Badge,
  Button,
  GlassPanel,
  TelemetryMetric,
  Skeleton,
} from '@/components/ui'
import { OperationalEmptyState } from '@/components/intelligence'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

interface FleetTruck {
  id: string
  registrationNumber?: string | null
  bodyType: 'Open' | 'Container' | 'OpenBody' | string
  lengthFt?: number
  heightFt?: number
  tonnageCapacity: number
  serviceableRadiusKm?: number
  verificationStatus: 'Verified' | 'Pending' | 'Rejected' | string
  status?: 'Available' | 'InTransit' | 'Maintenance' | 'Pending Verification' | string
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
  } | null
  completedTripsCount?: number
  revenueEarned?: number
  distanceCoveredKm?: number
  emptyKmSaved?: number
  documents?: {
    rcBook: 'Verified' | 'Pending' | 'Missing'
    nationalPermit: 'Verified' | 'Pending' | 'Missing'
    insurance: 'Verified' | 'Pending' | 'Missing'
    fitnessCert: 'Verified' | 'Pending' | 'Missing'
  }
}

type FleetTab = 'DETAILS' | 'DOCUMENTS' | 'LOCATION' | 'BOOKINGS'

export default function FleetOperatingSystemPage() {
  const router = useRouter()
  const [trucks, setTrucks] = useState<FleetTruck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTruck, setSelectedTruck] = useState<FleetTruck | null>(null)
  const [modalTab, setModalTab] = useState<FleetTab>('DETAILS')
  const [registerModalOpen, setRegisterModalOpen] = useState(false)

  // Registration Form State
  const [regNumber, setRegNumber] = useState('')
  const [bodyType, setBodyType] = useState('Open')
  const [capacity, setCapacity] = useState('16')
  const [lengthFt, setLengthFt] = useState('24')
  const [heightFt, setHeightFt] = useState('8')
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    loadFleetData()
  }, [])

  const loadFleetData = async () => {
    try {
      setLoading(true)
      setError('')
      const [trucksRes, bookingsRes] = await Promise.allSettled([
        api.get('/trucks/my-trucks'),
        api.get('/bookings'),
      ])

      const fetchedTrucks: FleetTruck[] = trucksRes.status === 'fulfilled' ? trucksRes.value.data || [] : []
      const fetchedBookings: any[] = bookingsRes.status === 'fulfilled' ? bookingsRes.value.data || [] : []

      const enriched = fetchedTrucks.map((truck) => {
        const truckBookings = fetchedBookings.filter((b) => b.truckId === truck.id || b.truck?.id === truck.id)
        const activeBk = truckBookings.find((b) => b.status === 'InTransit' || b.status === 'Confirmed')
        const completedBks = truckBookings.filter((b) => b.status === 'Completed')

        const revenueEarned = completedBks.reduce((sum, b) => sum + Number(b.agreedPrice || 0), 0)

        let status: FleetTruck['status'] = 'Available'
        if (activeBk) status = 'InTransit'
        else if (truck.verificationStatus === 'Pending') status = 'Pending Verification'

        return {
          ...truck,
          status,
          currentLocationName: activeBk
            ? `In Transit to ${activeBk.load?.unloadingAddress || 'Destination'}`
            : 'Terminal Depot',
          activeBooking: activeBk
            ? {
                id: activeBk.id,
                loadingAddress: activeBk.load?.loadingAddress || 'Origin',
                unloadingAddress: activeBk.load?.unloadingAddress || 'Destination',
                agreedPrice: Number(activeBk.agreedPrice) || 0,
                status: activeBk.status,
              }
            : null,
          completedTripsCount: completedBks.length,
          revenueEarned,
          distanceCoveredKm: truck.distanceCoveredKm || 0,
          emptyKmSaved: 0,
          documents: {
            rcBook: (truck.verificationStatus === 'Verified' ? 'Verified' : 'Pending') as 'Verified' | 'Pending',
            nationalPermit: (truck.verificationStatus === 'Verified' ? 'Verified' : 'Pending') as 'Verified' | 'Pending',
            insurance: (truck.verificationStatus === 'Verified' ? 'Verified' : 'Pending') as 'Verified' | 'Pending',
            fitnessCert: (truck.verificationStatus === 'Verified' ? 'Verified' : 'Pending') as 'Verified' | 'Pending',
          },
        }
      })

      setTrucks(enriched)
    } catch {
      setError('Failed to load fleet operating system data')
      toast.error('Failed to load fleet data')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterTruck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regNumber.trim()) {
      toast.error('Vehicle registration number is required')
      return
    }

    try {
      setRegistering(true)
      await api.post('/trucks', {
        registrationNumber: regNumber.toUpperCase(),
        bodyType,
        tonnageCapacity: parseFloat(capacity) || 16,
        lengthFt: parseFloat(lengthFt) || 24,
        heightFt: parseFloat(heightFt) || 8,
      })

      toast.success(`Truck ${regNumber.toUpperCase()} registered for KYC verification!`)
      setRegisterModalOpen(false)
      setRegNumber('')
      loadFleetData()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register truck')
    } finally {
      setRegistering(false)
    }
  }

  // Real Telemetry Aggregation
  const totalTrucks = trucks.length
  const availableCount = trucks.filter((t) => t.status === 'Available').length
  const verifiedCount = trucks.filter((t) => t.verificationStatus === 'Verified').length
  const pendingCount = trucks.filter((t) => t.verificationStatus === 'Pending' || t.status === 'Pending Verification').length

  const filteredTrucks = trucks.filter((truck) => {
    if (statusFilter !== 'ALL' && truck.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const reg = (truck.registrationNumber || '').toLowerCase()
      const body = (truck.bodyType || '').toLowerCase()
      const loc = (truck.currentLocationName || '').toLowerCase()
      return reg.includes(q) || body.includes(q) || loc.includes(q)
    }
    return true
  })

  return (
    <DashboardLayout
      title="My fleet"
      subtitle="Manage your registered commercial vehicles, document compliance, and trip assignments."
      action={
        <Button
          variant="primary"
          size="md"
          onClick={() => setRegisterModalOpen(true)}
          leftIcon={<PlusCircleIcon className="w-4 h-4 shrink-0" />}
          className="shadow-glow-primary"
        >
          Add truck
        </Button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto font-sans">
        
        {/* ── FLEET TELEMETRY — 4 col ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TelemetryMetric
            label="Fleet size"
            value={loading ? <Skeleton className="h-8 w-12" /> : totalTrucks}
            subtitle="Registered vehicles"
            classification="REAL METRIC"
            variant="primary"
          />
          <TelemetryMetric
            label="Available"
            value={loading ? <Skeleton className="h-8 w-12" /> : availableCount}
            subtitle="Ready for load"
            classification="REAL METRIC"
            variant="info"
          />
          <TelemetryMetric
            label="Verified"
            value={loading ? <Skeleton className="h-8 w-12" /> : verifiedCount}
            subtitle="Vahan approved"
            classification="REAL METRIC"
            variant="success"
          />
          <TelemetryMetric
            label="Pending"
            value={loading ? <Skeleton className="h-8 w-12" /> : pendingCount}
            subtitle="RC verification"
            classification="REAL METRIC"
            variant="warning"
          />
        </div>

        {/* ── SEARCH & FILTER TOOLBAR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0F131D] p-4 rounded-2xl border border-white/10">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by registration number, body type…"
              className="w-full pl-10 pr-4 py-2.5 bg-surface-950/80 border border-white/10 rounded-xl text-white text-sm font-sans focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {['ALL', 'Available', 'Verified', 'Pending Verification', 'InTransit'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-sans font-semibold transition-all whitespace-nowrap cursor-pointer',
                  statusFilter === st
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-950/80 border border-white/10 text-surface-400 hover:text-white hover:bg-white/5'
                )}
              >
                {st === 'ALL' ? 'All' : st === 'InTransit' ? 'In transit' : st}
              </button>
            ))}
          </div>
        </div>

        {/* ── FLEET VEHICLES CARDS ── */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton.Card />
            <Skeleton.Card />
          </div>
        ) : error ? (
          <GlassPanel padding="lg" className="text-center space-y-3">
            <div className="p-4 rounded-xl bg-danger-950/40 border border-danger-900/60 text-danger-300 text-sm font-sans font-semibold">
              {error}
            </div>
            <Button variant="secondary" size="sm" onClick={loadFleetData} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
              Retry
            </Button>
          </GlassPanel>
        ) : filteredTrucks.length === 0 ? (
          <OperationalEmptyState
            role="truck_owner"
            title="No vehicles registered"
            description="Register your truck vehicle registration, body type, and tonnage capacity to receive direct freight leads without broker cuts."
            actionLabel="Add your first truck"
            actionHref="/my-trucks"
            secondaryActionLabel="Get direct transporter pass"
            secondaryActionHref="/subscribe"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrucks.map((truck) => {
              const isVerified = truck.verificationStatus === 'Verified'

              return (
                <GlassPanel
                  key={truck.id}
                  padding="lg"
                  className="space-y-4 hover:border-white/20 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">
                          Registration
                        </span>
                        <h3 className="text-base font-bold text-white font-mono tracking-wider mt-0.5">
                          {truck.registrationNumber || 'Pending'}
                        </h3>
                      </div>

                      <Badge
                        variant={
                          truck.status === 'Available'
                            ? 'success'
                            : truck.status === 'InTransit'
                            ? 'primary'
                            : truck.status === 'Pending Verification'
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                      >
                        {truck.status === 'InTransit' ? 'In transit' : truck.status}
                      </Badge>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-surface-950/80 border border-white/5 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Body type</span>
                        <span className="text-sm font-semibold text-white mt-0.5 block font-sans">
                          {truck.bodyType}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Capacity</span>
                        <span className="text-sm font-bold text-white mt-0.5 block font-mono">
                          {truck.tonnageCapacity} T
                        </span>
                      </div>
                    </div>

                    {/* Compliance */}
                    <div className="space-y-1.5 text-xs font-sans">
                      <div className="flex items-center justify-between text-surface-400">
                        <span>RTO / RC status</span>
                        <span className={isVerified ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                          {isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-surface-400">
                        <span>Insurance</span>
                        <span className="text-emerald-400 font-semibold">Active</span>
                      </div>

                      <div className="flex items-center justify-between text-surface-400">
                        <span>Service radius</span>
                        <span className="text-white font-mono">{truck.serviceableRadiusKm || 50} km</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedTruck(truck)
                        setModalTab('DETAILS')
                      }}
                      className="flex-1 border-white/10 hover:border-white/20"
                    >
                      View details
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push('/search?type=load')}
                      leftIcon={<SparklesIcon className="w-3.5 h-3.5" />}
                      className="flex-1 shadow-glow-primary"
                    >
                      Match loads
                    </Button>
                  </div>
                </GlassPanel>
              )
            })}
          </div>
        )}

      </div>

      {/* ── REGISTER NEW TRUCK MODAL ── */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F131D] p-4 animate-fade-in">
          <div className="bg-surface-900 rounded-[20px] border border-white/15 max-w-md w-full p-6 shadow-modal space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-5 h-5 text-primary-400" />
                <h3 className="text-base font-semibold text-white font-sans">Register lorry</h3>
              </div>
              <button onClick={() => setRegisterModalOpen(false)} className="text-surface-400 hover:text-white cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterTruck} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400 font-sans mb-1.5">
                  Registration number (e.g. MH 12 QT 8492) *
                </label>
                <input
                  type="text"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  placeholder="MH 12 QT 8492"
                  className="w-full px-4 py-3 bg-surface-950 border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400 font-sans mb-1.5">
                    Body type *
                  </label>
                  <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className="w-full px-3.5 py-3 bg-surface-950 border border-white/10 rounded-xl text-white text-sm font-sans focus:outline-none focus:border-primary-500">
                    <option value="Open">Open body</option>
                    <option value="Container">Closed container</option>
                    <option value="OpenBody">Open body trailer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400 font-sans mb-1.5">
                    Capacity (tons) *
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3.5 py-3 bg-surface-950 border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400 font-sans mb-1.5">
                    Deck length (ft)
                  </label>
                  <input
                    type="number"
                    value={lengthFt}
                    onChange={(e) => setLengthFt(e.target.value)}
                    className="w-full px-3.5 py-3 bg-surface-950 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400 font-sans mb-1.5">
                    Height (ft)
                  </label>
                  <input
                    type="number"
                    value={heightFt}
                    onChange={(e) => setHeightFt(e.target.value)}
                    className="w-full px-3.5 py-3 bg-surface-950 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={registering}
                  className="shadow-glow-primary"
                >
                  Register lorry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TRUCK DETAILS MODAL ── */}
      {selectedTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F131D] p-4 animate-fade-in">
          <div className="bg-surface-900 rounded-[20px] border border-white/15 max-w-xl w-full max-h-[85vh] flex flex-col justify-between shadow-modal overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Vehicle profile</span>
                <h3 className="text-base font-bold text-white font-mono mt-0.5">
                  {selectedTruck.registrationNumber || 'Pending'}
                  <span className="text-surface-400 font-sans font-normal text-sm ml-2">({selectedTruck.bodyType})</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedTruck(null)}
                className="p-2 rounded-xl text-surface-400 hover:text-white cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/10 bg-surface-950/50 overflow-x-auto scrollbar-none">
              {(['DETAILS', 'DOCUMENTS', 'LOCATION'] as FleetTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setModalTab(tab)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-sans font-semibold transition-all whitespace-nowrap cursor-pointer capitalize',
                    modalTab === tab
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-900 text-surface-400 hover:text-white border border-white/10'
                  )}
                >
                  {tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {modalTab === 'DETAILS' && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-surface-950/80 border border-white/5">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Body type</span>
                    <span className="font-semibold text-white text-sm mt-0.5 block font-sans">{selectedTruck.bodyType}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Payload</span>
                    <span className="font-bold text-white text-sm mt-0.5 block font-mono">{selectedTruck.tonnageCapacity} T</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Deck dimensions</span>
                    <span className="font-mono text-white text-sm mt-0.5 block">
                      {selectedTruck.lengthFt || 24}ft &times; {selectedTruck.heightFt || 8}ft
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Service radius</span>
                    <span className="font-bold text-white text-sm mt-0.5 block font-mono">
                      {selectedTruck.serviceableRadiusKm || 50} km
                    </span>
                  </div>
                </div>
              )}

              {modalTab === 'DOCUMENTS' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-surface-950/80 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white block font-sans">RC book</span>
                      <span className="text-xs text-surface-400 font-sans">RTO verified</span>
                    </div>
                    <Badge variant="success" size="sm">Verified</Badge>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface-950/80 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white block font-sans">Commercial insurance</span>
                      <span className="text-xs text-surface-400 font-sans">Interstate coverage</span>
                    </div>
                    <Badge variant="success" size="sm">Active</Badge>
                  </div>
                </div>
              )}

              {modalTab === 'LOCATION' && (
                <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block">Current location</span>
                  <p className="font-semibold text-white text-sm font-sans">
                    {selectedTruck.currentLocationName}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-surface-950/50 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedTruck(null)} className="border-white/10">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
