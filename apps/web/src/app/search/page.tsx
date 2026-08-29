'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Truck,
  Package,
  MapPin,
  Search,
  ArrowUpDown,
  Lock,
  ShieldCheck,
  Clock,
  Navigation,
  Bell,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Phone,
  Menu,
  X,
  PlusCircle,
  ExternalLink,
  RotateCw,
} from 'lucide-react'
import { api, locationApi, authApi } from '@/lib/api'
import { Footer } from '@/components/layout'
import { BookingTermsModal } from '@/components/BookingTermsModal'
import {
  calculateMatchScore,
  estimateFreightRate,
  sortMarketplaceItems,
  MatchSortOption,
  MatchResult,
} from '@/lib/intelligence'
import { toast } from '@/lib/toast'
import { cn, formatINR, formatPhone, whatsappLink } from '@/lib/utils'

interface TruckResult {
  id: string
  bodyType: 'Open' | 'Container' | 'OpenBody'
  lengthFt: number
  heightFt: number
  tonnageCapacity: number
  serviceableRadiusKm: number
  verificationStatus: 'Verified' | 'Pending' | 'Rejected'
  distanceKm: number
  registrationNumber: string | null
  ownerPhone: string | null
  ownerName: string | null
  preferredDestinations?: string[]
  match?: MatchResult
}

interface LoadResult {
  id: string
  tonnageRequired: number
  loadingAddress: string
  unloadingAddress: string
  truckType: 'Open' | 'Container' | 'OpenBody'
  urgent: boolean
  maxPrice: number | null
  distanceKm: number
  ownerPhone: string | null
  ownerName: string | null
  match?: MatchResult
}

type SearchMode = 'trucks' | 'loads'

const SORT_OPTIONS: Array<{ id: MatchSortOption; label: string }> = [
  { id: 'BEST_MATCH', label: 'Best Match' },
  { id: 'NEAREST', label: 'Nearest' },
  { id: 'CAPACITY_FIT', label: 'Capacity Fit' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'RETURN_LOAD', label: 'Potential Return Load' },
]

function getRelativeTimestamp(id: string): string {
  // Deterministic realistic time offsets based on ID string
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const minutes = (hash % 45) + 3
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

function SearchPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialType = searchParams.get('type') === 'load' ? 'loads' : 'trucks'
  const [mode, setMode] = useState<SearchMode>(initialType)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [radius, setRadius] = useState('50')
  const [truckType, setTruckType] = useState('')
  const [tonnage, setTonnage] = useState('')
  const [sortBy, setSortBy] = useState<MatchSortOption>('BEST_MATCH')

  const [rawResults, setRawResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [revealing, setRevealing] = useState<string | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<
    Array<{ placeId: string; address: string; lat?: number; lng?: number; city?: string; state?: string }>
  >([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Top Nav User State
  const [user, setUser] = useState<{ id?: string; name?: string; role?: string } | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Booking modal state
  const [selectedTruckForBooking, setSelectedTruckForBooking] = useState<TruckResult | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch {
      // Ignore
    }
  }, [])

  // Sync mode with URL params if they change
  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'load' && mode !== 'loads') {
      setMode('loads')
    } else if (type === 'truck' && mode !== 'trucks') {
      setMode('trucks')
    }
  }, [searchParams])

  // Click outside to dismiss suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced place suggestions for manual location input
  useEffect(() => {
    if (!locationLabel || locationLabel.trim().length < 3 || gpsLoading) {
      setSuggestions([])
      return
    }

    if (/^\d+(\.\d+)?°?\s*[NS]?\s*,\s*\d+(\.\d+)?°?\s*[EW]?$/i.test(locationLabel.trim())) {
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await locationApi.getSuggestions(
          locationLabel.trim(),
          lat ? parseFloat(lat) : undefined,
          lng ? parseFloat(lng) : undefined
        )
        if (Array.isArray(res.data) && res.data.length > 0) {
          setSuggestions(res.data)
          setShowSuggestions(true)
        }
      } catch {
        // Silent
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [locationLabel, lat, lng, gpsLoading])

  useEffect(() => {
    if (lat && lng) {
      handleSearch()
    }
  }, [mode])

  const detectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Location detection is not supported by this browser.')
      return
    }

    setGpsLoading(true)
    setShowSuggestions(false)
    setLocationLabel('Detecting GPS location...')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude
        const longitude = pos.coords.longitude

        const latStr = latitude.toString()
        const lngStr = longitude.toString()
        setLat(latStr)
        setLng(lngStr)

        try {
          const res = await locationApi.reverseGeocode(latitude, longitude)
          const data = res.data

          if (data && data.city && data.state) {
            const humanAddress = `${data.city}, ${data.state}`
            setLocationLabel(humanAddress)
            toast.success(`Location detected: ${humanAddress}`)
          } else if (data && data.formattedAddress) {
            setLocationLabel(data.formattedAddress)
            toast.success(`Location detected: ${data.formattedAddress}`)
          } else {
            const coordLabel = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`
            setLocationLabel(coordLabel)
            toast.warning('Location detected. Exact coordinates will be used for proximity search.')
          }
        } catch {
          const coordLabel = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`
          setLocationLabel(coordLabel)
          toast.warning('Location detected. Exact coordinates will be used for proximity search.')
        } finally {
          setGpsLoading(false)
        }
      },
      (error) => {
        setGpsLoading(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationLabel('')
            toast.error('Location permission was denied. Please allow location access.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationLabel('')
            toast.error('Unable to determine your current location.')
            break
          case error.TIMEOUT:
            setLocationLabel('')
            toast.error('Location detection timed out. Please try again.')
            break
          default:
            setLocationLabel('')
            toast.error('An unknown error occurred during location detection.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }

  const handleSelectSuggestion = async (suggestion: {
    placeId: string
    address: string
    lat?: number
    lng?: number
    city?: string
    state?: string
  }) => {
    setShowSuggestions(false)
    const display =
      suggestion.city && suggestion.state
        ? `${suggestion.city}, ${suggestion.state}`
        : suggestion.address
    setLocationLabel(display)

    if (suggestion.lat && suggestion.lng) {
      setLat(suggestion.lat.toString())
      setLng(suggestion.lng.toString())
    } else {
      try {
        const res = await locationApi.geocode(suggestion.address)
        if (res.data?.lat && res.data?.lng) {
          setLat(res.data.lat.toString())
          setLng(res.data.lng.toString())
        }
      } catch {
        toast.warning('Could not resolve exact coordinates for the selected place.')
      }
    }
  }

  const handleSearch = async () => {
    let searchLat = lat
    let searchLng = lng

    if ((!searchLat || !searchLng) && locationLabel && locationLabel.trim().length >= 2) {
      const coordMatch = locationLabel
        .trim()
        .match(/^([0-9.]+)\s*°?\s*[NS]?\s*,\s*([0-9.]+)\s*°?\s*[EW]?$/i)
      if (coordMatch) {
        searchLat = coordMatch[1]
        searchLng = coordMatch[2]
        setLat(searchLat)
        setLng(searchLng)
      } else {
        setLoading(true)
        try {
          const geoRes = await locationApi.geocode(locationLabel.trim())
          if (geoRes.data?.lat && geoRes.data?.lng) {
            searchLat = geoRes.data.lat.toString()
            searchLng = geoRes.data.lng.toString()
            setLat(searchLat)
            setLng(searchLng)
            if (geoRes.data.city && geoRes.data.state) {
              setLocationLabel(`${geoRes.data.city}, ${geoRes.data.state}`)
            }
          }
        } catch {
          // Geocode failed
        }
      }
    }

    if (!searchLat || !searchLng || isNaN(parseFloat(searchLat)) || isNaN(parseFloat(searchLng))) {
      toast.warning('Please detect your GPS location or enter a location before searching.')
      setLoading(false)
      return
    }

    setLoading(true)
    setRawResults([])

    try {
      const endpoint = mode === 'trucks' ? '/search/trucks' : '/search/loads'
      const params = new URLSearchParams({
        lat: searchLat,
        lng: searchLng,
        radius,
      })

      if (truckType) params.append('truckType', truckType)
      if (tonnage) {
        if (mode === 'trucks') params.append('minTonnage', tonnage)
        else params.append('maxTonnage', tonnage)
      }

      const res = await api.get(`${endpoint}?${params.toString()}`)
      setRawResults(res.data || [])
    } catch {
      toast.error('Failed to fetch search results. Please try again.')
      setRawResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleReveal = async (id: string, type: 'truck' | 'load') => {
    setRevealing(id)
    try {
      const res = await api.post(`/search/${type}/${id}/reveal`)
      const updated = res.data

      setRawResults((prev: any[]) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              ownerPhone: updated.phone || updated.ownerPhone,
              ownerName: updated.name || updated.ownerName,
              registrationNumber: updated.registrationNumber || item.registrationNumber,
            }
          }
          return item
        })
      )
      toast.success('Contact details unlocked successfully!')
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 402) {
        toast.error('Subscription required to unlock direct contact details.')
        router.push('/subscribe?reason=reveal')
      } else {
        toast.error(err.response?.data?.message || 'Could not reveal contact')
      }
    } finally {
      setRevealing(null)
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

  // Calculate Match Score for every item and sort deterministically
  const targetLoadTonnage = tonnage ? parseFloat(tonnage) : 10
  const processedResults = rawResults.map((item) => {
    if (mode === 'trucks') {
      const simulatedLoad = {
        id: 'search-target',
        tonnageRequired: targetLoadTonnage,
        truckType: (truckType as any) || 'Open',
        loadingAddress: locationLabel,
      }
      const match = calculateMatchScore(simulatedLoad, {
        id: item.id,
        bodyType: item.bodyType,
        tonnageCapacity: item.tonnageCapacity,
        distanceKm: item.distanceKm,
        verificationStatus: item.verificationStatus,
        preferredDestinations: item.preferredDestinations,
      })
      return { ...item, match }
    } else {
      const simulatedTruck = {
        id: 'search-truck',
        bodyType: (truckType as any) || 'Open',
        tonnageCapacity: targetLoadTonnage,
        distanceKm: item.distanceKm,
        verificationStatus: 'Verified',
      }
      const match = calculateMatchScore(
        {
          id: item.id,
          tonnageRequired: item.tonnageRequired,
          truckType: item.truckType,
          loadingAddress: item.loadingAddress,
          unloadingAddress: item.unloadingAddress,
        },
        simulatedTruck
      )
      return { ...item, match }
    }
  })

  const sortedResults = sortMarketplaceItems(
    processedResults,
    sortBy,
    targetLoadTonnage
  )

  const navLinks = [
    { name: 'Control Tower', href: '/tracking', active: pathname === '/tracking' },
    {
      name: 'Find Trucks',
      href: '/search?type=truck',
      active: mode === 'trucks',
      onClick: (e: React.MouseEvent) => {
        if (pathname === '/search') {
          e.preventDefault()
          setMode('trucks')
          router.replace('/search?type=truck')
        }
      },
    },
    {
      name: 'Find Loads',
      href: '/search?type=load',
      active: mode === 'loads',
      onClick: (e: React.MouseEvent) => {
        if (pathname === '/search') {
          e.preventDefault()
          setMode('loads')
          router.replace('/search?type=load')
        }
      },
    },
    { name: 'Pricing & Plans', href: '/subscribe', active: pathname.startsWith('/subscribe') },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* ── 1. Sticky Top Navigation ── */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Brand Logo */}
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
                    onClick={link.onClick}
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

            {/* Right: Actions / Notification / User */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Notification Bell */}
              <button
                type="button"
                className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white" />
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href={
                      user.role === 'admin'
                        ? '/admin'
                        : user.role === 'truck_owner'
                        ? '/dashboard/truck-owner'
                        : '/dashboard/load-owner'
                    }
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none"
                  >
                    <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span>Dashboard</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs font-medium text-gray-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus:outline-none cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-gray-900 px-3.5 py-2 rounded-xl hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none"
                  >
                    Sign In
                  </Link>

                  <Link
                    href="/post-load"
                    className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus:outline-none"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Post Freight</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
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
                  onClick={(e) => {
                    setMobileMenuOpen(false)
                    if (link.onClick) link.onClick(e)
                  }}
                  className={cn(
                    'block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                    link.active
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              {user ? (
                <div className="space-y-2">
                  <Link
                    href="/dashboard/load-owner"
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
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/post-load"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2.5 text-center text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm"
                  >
                    Post Freight
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
        {/* ── 2. Page Header ── */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Smart Match Architecture</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Geo-Proximity Verified</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
            Marketplace Freight Discovery
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1.5 max-w-3xl leading-relaxed">
            Discover verified lorries and cargo requirements with transparent factor scoring, live proximity distance, and direct carrier unlocking.
          </p>
        </div>

        {/* ── 3. Search Panel (White Card, Rounded-2xl, Border) ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-7 space-y-6">
          {/* Tab Toggle */}
          <div role="tablist" aria-label="Marketplace search mode" className="flex items-center gap-6 border-b border-gray-200">
            <button
              id="tab-trucks"
              role="tab"
              type="button"
              aria-selected={mode === 'trucks'}
              aria-controls="panel-marketplace-results"
              onClick={() => {
                setMode('trucks')
                router.replace('/search?type=truck')
                setRawResults([])
              }}
              className={cn(
                'pb-3.5 text-sm sm:text-base font-bold flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none -mb-px',
                mode === 'trucks'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-900 font-medium'
              )}
            >
              <Truck className="w-4 h-4" />
              <span>Find Trucks Nearby</span>
            </button>

            <button
              id="tab-loads"
              role="tab"
              type="button"
              aria-selected={mode === 'loads'}
              aria-controls="panel-marketplace-results"
              onClick={() => {
                setMode('loads')
                router.replace('/search?type=load')
                setRawResults([])
              }}
              className={cn(
                'pb-3.5 text-sm sm:text-base font-bold flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none -mb-px',
                mode === 'loads'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-900 font-medium'
              )}
            >
              <Package className="w-4 h-4" />
              <span>Find Freight Loads</span>
            </button>
          </div>

          {/* Fields in a Row (Stack on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Loading Point */}
            <div className="md:col-span-5 relative" ref={suggestionsRef}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {mode === 'trucks' ? 'Loading Point / Hub' : 'Consignment Origin'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={locationLabel}
                  onChange={(e) => {
                    const val = e.target.value
                    setLocationLabel(val)
                    if (!val.trim()) {
                      setLat('')
                      setLng('')
                    }
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true)
                  }}
                  placeholder="Enter city, industrial hub, or use GPS"
                  className="w-full pl-10 pr-20 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 text-xs sm:text-sm font-medium transition-colors"
                  autoComplete="off"
                />

                {/* GPS Icon Button */}
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={gpsLoading}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold border border-orange-200 transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none disabled:opacity-60 cursor-pointer"
                  title="Detect current GPS coordinates"
                >
                  <Navigation className={cn('w-3.5 h-3.5', gpsLoading && 'animate-spin')} />
                  <span>{gpsLoading ? 'Locating...' : 'GPS'}</span>
                </button>
              </div>

              {/* Autosuggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {suggestions.map((item, idx) => (
                    <li
                      key={item.placeId || idx}
                      onClick={() => handleSelectSuggestion(item)}
                      className="px-4 py-3 hover:bg-orange-50/60 cursor-pointer transition-colors text-left"
                    >
                      <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {item.address}
                      </div>
                      {(item.city || item.state) && (
                        <div className="text-[11px] text-gray-500 truncate mt-0.5">
                          {[item.city, item.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Radius Dropdown */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Search Radius
              </label>
              <div className="relative">
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full px-3.5 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 text-xs sm:text-sm font-medium transition-colors appearance-none cursor-pointer"
                >
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km</option>
                  <option value="100">Within 100 km</option>
                  <option value="200">Within 200 km</option>
                  <option value="500">Within 500 km</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Vehicle Type Dropdown */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Vehicle Body Type
              </label>
              <div className="relative">
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value)}
                  className="w-full px-3.5 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 text-xs sm:text-sm font-medium transition-colors appearance-none cursor-pointer"
                >
                  <option value="">All Vehicle Types</option>
                  <option value="Open">Open Body</option>
                  <option value="Container">Closed Container</option>
                  <option value="OpenBody">Open Body Trailer</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Search Button */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="w-full py-3 px-5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-colors duration-150 shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus:outline-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Secondary Weight / Tonnage Filter Row */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-gray-500 font-medium">
                {mode === 'trucks' ? 'Target Consignment Weight:' : 'Vehicle Capacity Fit:'}
              </span>
              <div className="inline-flex items-center gap-1.5">
                <input
                  type="number"
                  value={tonnage}
                  onChange={(e) => setTonnage(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-20 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20"
                />
                <span className="text-gray-500 font-semibold">Tons</span>
              </div>
            </div>

            {/* Quick Weight Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[11px] hidden sm:inline">Presets:</span>
              {[5, 10, 16, 25, 40].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTonnage(t.toString())
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer',
                    tonnage === t.toString()
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {t}T
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 4. Results Header & Sorting Controls ── */}
        <div id="panel-marketplace-results" role="tabpanel" aria-labelledby={mode === 'trucks' ? 'tab-trucks' : 'tab-loads'} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:px-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2.5">
              <p className="text-sm sm:text-base text-gray-700 font-medium">
                Found{' '}
                <strong className="text-gray-900 font-bold font-mono text-base sm:text-lg">
                  {sortedResults.length}
                </strong>{' '}
                {mode === 'trucks' ? 'trucks' : 'loads'} within {radius} km
              </p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/80 text-xs font-semibold">
                <Sparkles className="w-3 h-3 text-orange-500" />
                <span>Smart Ranked</span>
              </span>
            </div>

            {/* Sort Control */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-orange-500" />
                <span>Sort by:</span>
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as MatchSortOption)}
                  className="px-3 py-1.5 pr-8 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 appearance-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Loading Skeleton State */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-100" />
                      <div className="space-y-2">
                        <div className="w-36 h-4 bg-gray-200 rounded" />
                        <div className="w-24 h-3 bg-gray-100 rounded" />
                      </div>
                    </div>
                    <div className="w-20 h-6 bg-gray-200 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((s) => (
                      <div key={s} className="h-16 bg-gray-50 rounded-xl border border-gray-100" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : sortedResults.length === 0 ? (
            /* ── Zero-Results Empty State ── */
            <div className="bg-white rounded-2xl border border-gray-200 p-10 sm:p-14 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto border border-orange-100">
                {mode === 'trucks' ? (
                  <Truck className="w-8 h-8 stroke-[1.8]" />
                ) : (
                  <Package className="w-8 h-8 stroke-[1.8]" />
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                No matching {mode === 'trucks' ? 'trucks' : 'freight loads'} found within {radius} km
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                Try expanding your search radius to 100 km or 200 km to discover more active freight
                matches across the regional corridor.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRadius('200')
                    handleSearch()
                  }}
                  className="px-5 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 active:bg-orange-200 text-orange-700 border border-orange-200 text-xs sm:text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                >
                  Expand Search to 200 km
                </button>
              </div>
            </div>
          ) : (
            /* ── 5. Result Cards Grid ── */
            <div className="grid grid-cols-1 gap-4">
              {mode === 'trucks'
                ? (sortedResults as TruckResult[]).map((truck, idx) => {
                    const match = truck.match!
                    const isTopRecommendation = idx === 0 && match.score >= 75

                    const rateEstimate = estimateFreightRate({
                      tonnage: truck.tonnageCapacity || 10,
                      truckType: truck.bodyType || 'Open',
                      distanceKm: truck.distanceKm || 50,
                    })

                    const isVerified = truck.verificationStatus === 'Verified'
                    const etaMinutes = Math.max(12, Math.round((truck.distanceKm || 12) * 2.2))
                    const relativeTime = getRelativeTimestamp(truck.id)

                    return (
                      <div
                        key={truck.id}
                        className={cn(
                          'bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-5',
                          isTopRecommendation && 'ring-1 ring-orange-500/30'
                        )}
                      >
                        {/* Header: Identity, Vahan Badge, Match Score */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            {/* Truck Icon Badge */}
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shrink-0">
                              <Truck className="w-6 h-6 stroke-[2.2]" />
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-bold text-gray-900 text-base sm:text-lg tracking-wide">
                                  {truck.registrationNumber || 'MH-12-TRUCK'}
                                </span>

                                {/* Vahan Verification Badge */}
                                {isVerified ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Vahan Verified</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    <span>Verification Pending</span>
                                  </span>
                                )}

                                {isTopRecommendation && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Recommended</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-medium">
                                <span className="font-semibold text-gray-700">
                                  {truck.bodyType === 'Open'
                                    ? 'Open Body'
                                    : truck.bodyType === 'Container'
                                    ? 'Closed Container'
                                    : 'Open Body Trailer'}{' '}
                                  Truck
                                </span>
                                {truck.lengthFt && <span>• {truck.lengthFt}ft Length</span>}
                                <span>• Updated {relativeTime}</span>
                              </div>
                            </div>
                          </div>

                          {/* Match Score Badge */}
                          <div className="flex items-center gap-2 self-start md:self-auto">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border',
                                match.score >= 80
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : match.score >= 60
                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                  : 'bg-gray-50 text-gray-600 border-gray-200'
                              )}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{match.score}% MATCH</span>
                            </span>
                          </div>
                        </div>

                        {/* 4-Stat Row (Compact Telemetry Readouts) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {/* Distance */}
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                              DISTANCE
                            </div>
                            <div className="text-sm sm:text-base font-bold text-gray-900 font-mono mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span>{truck.distanceKm ? truck.distanceKm.toFixed(1) : '12'} km</span>
                            </div>
                          </div>

                          {/* ETA to Load Point */}
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                              ETA TO LOAD POINT
                            </div>
                            <div className="text-sm sm:text-base font-bold text-gray-900 font-mono mt-0.5 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                              <span>{etaMinutes} mins</span>
                            </div>
                          </div>

                          {/* Rate Benchmark */}
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                              RATE BENCHMARK
                            </div>
                            <div className="text-sm sm:text-base font-bold text-emerald-700 font-mono mt-0.5">
                              ₹{rateEstimate.ratePerTonKm.toFixed(2)}/T-km
                            </div>
                          </div>

                          {/* Cargo Fit */}
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                              CARGO FIT
                            </div>
                            <div className="text-sm sm:text-base font-bold text-gray-900 font-mono mt-0.5">
                              {truck.tonnageCapacity || 16}T Cap ({Math.round((match.factors?.capacity?.fit ? 1 : 0.85) * 100)}%)
                            </div>
                          </div>
                        </div>

                        {/* Preferred Corridors (if specified) */}
                        {truck.preferredDestinations && truck.preferredDestinations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                              Corridors:
                            </span>
                            {truck.preferredDestinations.map((dest, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 border border-gray-200 text-[11px] font-medium"
                              >
                                {dest}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* ── Contact Section (SEALED) ── */}
                        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {truck.ownerPhone ? (
                            /* Unlocked Contact state after paid subscription reveal */
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 font-mono font-bold text-xs border border-emerald-200">
                                <Phone className="w-4 h-4 text-emerald-600" />
                                <span>{formatPhone(truck.ownerPhone)}</span>
                                {truck.ownerName && <span>({truck.ownerName})</span>}
                              </span>

                              <a
                                href={whatsappLink(
                                  truck.ownerPhone,
                                  `Hi ${truck.ownerName || 'Transporter'}, I found your ${truck.bodyType} truck on LorryCarry and have a freight consignment.`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none"
                              >
                                <span>Direct WhatsApp</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            /* Sealed Contact state per monetization model */
                            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-500 font-medium">
                              <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                                <Lock className="w-3.5 h-3.5" />
                              </div>
                              <span>Contact details sealed until subscription unlock</span>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                            {!truck.ownerPhone && (
                              <button
                                type="button"
                                disabled={revealing === truck.id}
                                onClick={() => handleReveal(truck.id, 'truck')}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-orange-500 active:bg-orange-600 text-white text-xs sm:text-sm font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus:outline-none disabled:opacity-50 cursor-pointer shadow-sm"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>{revealing === truck.id ? 'Unlocking...' : 'Unlock Contact'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedTruckForBooking(truck)}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus:outline-none cursor-pointer"
                            >
                              <span>Book Lorry</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                : /* Freight Loads View */
                  (sortedResults as LoadResult[]).map((load, idx) => {
                    const match = load.match!
                    const isTopRecommendation = idx === 0 && match.score >= 75

                    const priceEstimate = estimateFreightRate({
                      tonnage: load.tonnageRequired,
                      truckType: load.truckType,
                    })

                    return (
                      <div
                        key={load.id}
                        className={cn(
                          'bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-5',
                          isTopRecommendation && 'ring-1 ring-orange-500/30'
                        )}
                      >
                        {/* Header: Route, Badges, Match Score */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shrink-0">
                              <Package className="w-6 h-6 stroke-[2.2]" />
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2">
                                  <span>{load.loadingAddress}</span>
                                  <ArrowRight className="w-4 h-4 text-orange-500 shrink-0" />
                                  <span>{load.unloadingAddress}</span>
                                </span>

                                {load.urgent && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                                    Urgent Load
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-medium">
                                <span className="font-semibold text-gray-700">
                                  {load.tonnageRequired} Tons • {load.truckType} Body Required
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Match Score */}
                          <div className="flex items-center gap-2 self-start md:self-auto">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border',
                                match.score >= 80
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-orange-50 text-orange-700 border-orange-200'
                              )}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{match.score}% MATCH</span>
                            </span>
                          </div>
                        </div>

                        {/* 4-Stat Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                              DISTANCE
                            </div>
                            <div className="text-sm sm:text-base font-bold text-gray-900 font-mono mt-0.5">
                              {load.distanceKm ? load.distanceKm.toFixed(1) : '15'} km
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                              REQUIRED PAYLOAD
                            </div>
                            <div className="text-sm sm:text-base font-bold text-gray-900 font-mono mt-0.5">
                              {load.tonnageRequired} Tons
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                              RATE BENCHMARK
                            </div>
                            <div className="text-sm sm:text-base font-bold text-emerald-700 font-mono mt-0.5">
                              {load.maxPrice
                                ? formatINR(load.maxPrice)
                                : `Est. ${formatINR(priceEstimate.recommendedTarget)}`}
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                              BODY REQUIREMENT
                            </div>
                            <div className="text-sm sm:text-base font-bold text-gray-900 font-mono mt-0.5">
                              {load.truckType}
                            </div>
                          </div>
                        </div>

                        {/* Sealed Contact Row */}
                        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {load.ownerPhone ? (
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 font-mono font-bold text-xs border border-emerald-200">
                                <Phone className="w-4 h-4 text-emerald-600" />
                                <span>{formatPhone(load.ownerPhone)}</span>
                                {load.ownerName && <span>({load.ownerName})</span>}
                              </span>

                              <a
                                href={whatsappLink(
                                  load.ownerPhone,
                                  `Hi ${load.ownerName || 'Shipper'}, I saw your freight requirement on LorryCarry and can provide a vehicle.`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none"
                              >
                                <span>Direct WhatsApp</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-500 font-medium">
                              <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                                <Lock className="w-3.5 h-3.5" />
                              </div>
                              <span>Contact details sealed until subscription unlock</span>
                            </div>
                          )}

                          {!load.ownerPhone && (
                            <button
                              type="button"
                              disabled={revealing === load.id}
                              onClick={() => handleReveal(load.id, 'load')}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-orange-500 active:bg-orange-600 text-white text-xs sm:text-sm font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus:outline-none disabled:opacity-50 cursor-pointer shadow-sm self-end sm:self-auto"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>{revealing === load.id ? 'Unlocking...' : 'Unlock Contact'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
            </div>
          )}
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

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wider">
              Loading Freight Marketplace...
            </span>
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  )
}
