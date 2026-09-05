'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Sparkles,
  ArrowRight,
  Phone,
  ExternalLink,
  CircleDollarSign,
} from 'lucide-react'
import { api, locationApi } from '@/lib/api'
import { Footer, Navbar } from '@/components/layout'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { BookingTermsModal } from '@/components/BookingTermsModal'
import { Badge, Button, Card, EmptyState, Input, Select, Skeleton, Spinner } from '@/components/ui'
import { MatchScoreBadge } from '@/components/intelligence'
import {
  calculateMatchScore,
  estimateFreightRate,
  sortMarketplaceItems,
  MatchSortOption,
  MatchResult,
} from '@/lib/intelligence'
import { toast } from '@/lib/toast'
import { cn, formatINR, formatPhone, whatsappLink } from '@/lib/utils'
import { StructuredData } from '@/components/seo/StructuredData'
import {
  getSearchResultsItemListStructuredData,
  getBreadcrumbStructuredData,
} from '@/lib/seo/structuredData'

interface TruckResult {
  id: string
  bodyType: 'Open' | 'Container' | 'OpenBody'
  lengthFt: number
  heightFt: number
  tonnageCapacity: number
  serviceableRadiusKm: number
  verificationStatus: 'Verified' | 'Pending' | 'Rejected'
  /** ISO timestamp of the last Vahan RC validation — powers the verified badge. */
  vahanVerifiedAt?: string | null
  fastagStatus?: string | null
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

/**
 * Monospace telemetry readout cell (docs/LORRYCARRY_DESIGN_SYSTEM.md §4, §8.3).
 * Dense operational values render in a deep well with a mono uppercase label.
 */
function TelemetryCell({
  label,
  icon,
  value,
  valueClassName,
}: {
  label: string
  icon?: React.ReactNode
  value: React.ReactNode
  valueClassName?: string
}) {
  return (
    <div className="bg-sunken/60 rounded-xl p-3 border border-white/5">
      <div className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-widest text-muted">
        {label}
      </div>
      <div
        className={cn(
          'text-sm sm:text-base font-bold text-ink font-mono mt-0.5 flex items-center gap-1',
          valueClassName
        )}
      >
        {icon && (
          <span className="shrink-0 inline-flex" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="min-w-0">{value}</span>
      </div>
    </div>
  )
}

function SearchPageContent() {
  const router = useRouter()
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

  // Booking modal state
  const [selectedTruckForBooking, setSelectedTruckForBooking] = useState<TruckResult | null>(null)

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

  // Structured data for SEO: ItemList of current results + Breadcrumbs
  const breadcrumbLd = getBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: mode === 'trucks' ? 'Find Trucks' : 'Find Loads', url: `/search?type=${mode === 'trucks' ? 'truck' : 'load'}` },
  ])

  const itemListLd =
    sortedResults.length > 0
      ? getSearchResultsItemListStructuredData(
          mode === 'trucks' ? 'truck' : 'load',
          sortedResults.slice(0, 10).map((item: any) => ({
            id: item.id,
            title:
              mode === 'trucks'
                ? `${item.bodyType || 'Open'} Truck ${item.tonnageCapacity || ''}T — ${item.distanceKm?.toFixed(1) || ''}km away`
                : `${item.loadingAddress} → ${item.unloadingAddress} — ${item.tonnageRequired}T`,
            description:
              mode === 'trucks'
                ? `Vahan ${item.verificationStatus} ${item.bodyType} truck, ${item.tonnageCapacity}T capacity, within 50km`
                : `Freight load: ${item.tonnageRequired}T ${item.truckType}, India logistics cargo dispatch`,
            url: `/search?type=${mode === 'trucks' ? 'truck' : 'load'}`,
          }))
        )
      : null

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip bg-canvas font-sans text-body selection:bg-primary-500 selection:text-white">
      {/* ── Ambient Kinetic Command lighting: radial blur wash + grid pattern (decorative) ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-primary-600/20 via-sky-500/10 to-transparent rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(var(--lc-hairline)_/_0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--lc-hairline)_/_0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col">
        {/* JSON-LD structured data for search marketplace */}
        <StructuredData data={breadcrumbLd} id="search-breadcrumb-ld" />
        {itemListLd && <StructuredData data={itemListLd} id="search-itemlist-ld" />}
        {/* ── 1. Fixed Top Navigation (shared redesigned header) ── */}
        <Navbar />

        {/* ── Main Content Area ── */}
        <main className="flex-1 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
          {/* ── 2. Page Header ── */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-primary-500/10 text-primary-300 border border-primary-500/30 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Smart Match Architecture</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Geo-Proximity Verified</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
              Marketplace Freight Discovery
            </h1>
            <p className="text-sm sm:text-base text-muted mt-1.5 max-w-3xl leading-relaxed">
              Discover verified lorries and cargo requirements with transparent factor scoring, live proximity distance, and direct carrier unlocking.
            </p>
          </div>

          {/* ── 3. Search Panel (Dark Glass Card) ── */}
          <Card surface="glass" className="p-5 sm:p-7 space-y-6">
            {/* Tab Toggle */}
            <div role="tablist" aria-label="Marketplace search mode" className="flex items-center gap-6 border-b border-white/10">
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
                  'pb-3.5 text-sm sm:text-base font-bold flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
                  mode === 'trucks'
                    ? 'border-b-2 border-primary-500 text-white'
                    : 'border-b-2 border-transparent text-muted hover:text-ink font-medium'
                )}
              >
                <Truck className={cn('w-4 h-4', mode === 'trucks' ? 'text-primary-400' : 'text-subtle')} aria-hidden="true" />
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
                  'pb-3.5 text-sm sm:text-base font-bold flex items-center gap-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
                  mode === 'loads'
                    ? 'border-b-2 border-primary-500 text-white'
                    : 'border-b-2 border-transparent text-muted hover:text-ink font-medium'
                )}
              >
                <Package className={cn('w-4 h-4', mode === 'loads' ? 'text-primary-400' : 'text-subtle')} aria-hidden="true" />
                <span>Find Freight Loads</span>
              </button>
            </div>

            {/* Fields in a Row (Stack on mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Loading Point */}
              <div className="md:col-span-5 relative" ref={suggestionsRef}>
                <Input
                  label={mode === 'trucks' ? 'Loading Point / Hub' : 'Consignment Origin'}
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
                  autoComplete="off"
                  className="pr-24 font-medium text-xs sm:text-sm"
                  leftElement={<MapPin className="w-4 h-4 text-primary-400" aria-hidden="true" />}
                  rightElement={
                    /* GPS Icon Button */
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={gpsLoading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-500/15 hover:bg-primary-500/25 text-primary-300 border border-primary-500/30 text-[11px] font-mono font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none disabled:opacity-60 cursor-pointer"
                      title="Detect current GPS coordinates"
                    >
                      <Navigation className={cn('w-3.5 h-3.5', gpsLoading && 'animate-spin')} aria-hidden="true" />
                      <span>{gpsLoading ? 'Locating...' : 'GPS'}</span>
                    </button>
                  }
                />

                {/* Autosuggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 bottom-0 translate-y-[calc(100%+6px)] bg-overlay border border-white/10 rounded-xl shadow-modal max-h-60 overflow-y-auto divide-y divide-white/5">
                    {suggestions.map((item, idx) => (
                      <li
                        key={item.placeId || idx}
                        onClick={() => handleSelectSuggestion(item)}
                        className="px-4 py-3 hover:bg-wash cursor-pointer transition-colors text-left"
                      >
                        <div className="text-xs sm:text-sm font-bold text-ink truncate">
                          {item.address}
                        </div>
                        {(item.city || item.state) && (
                          <div className="text-[11px] text-subtle truncate mt-0.5">
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
                <Select
                  label="Search Radius"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="cursor-pointer font-medium text-xs sm:text-sm"
                >
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km</option>
                  <option value="100">Within 100 km</option>
                  <option value="200">Within 200 km</option>
                  <option value="500">Within 500 km</option>
                </Select>
              </div>

              {/* Vehicle Type Dropdown */}
              <div className="md:col-span-3">
                <Select
                  label="Vehicle Body Type"
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value)}
                  className="cursor-pointer font-medium text-xs sm:text-sm"
                >
                  <option value="">All Vehicle Types</option>
                  <option value="Open">Open Body</option>
                  <option value="Container">Closed Container</option>
                  <option value="OpenBody">Open Body Trailer</option>
                </Select>
              </div>

              {/* Search Button */}
              <div className="md:col-span-2">
                <Button
                  type="button"
                  onClick={handleSearch}
                  loading={loading}
                  loadingText="Searching freight marketplace"
                  fullWidth
                  leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
                  className="text-xs sm:text-sm font-bold"
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            {/* Secondary Weight / Tonnage Filter Row */}
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <label htmlFor="tonnage-target-input" className="text-muted font-medium">
                  {mode === 'trucks' ? 'Target Consignment Weight:' : 'Vehicle Capacity Fit:'}
                </label>
                <div className="inline-flex items-center gap-1.5">
                  <input
                    id="tonnage-target-input"
                    type="number"
                    value={tonnage}
                    onChange={(e) => setTonnage(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-20 px-2.5 py-1 bg-sunken/60 border border-white/10 rounded-input text-xs font-mono font-bold text-ink placeholder:text-subtle focus:outline-none focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/25"
                  />
                  <span className="text-muted font-semibold">Tons</span>
                </div>
              </div>

              {/* Quick Weight Chips */}
              <div className="flex items-center gap-1.5">
                <span className="text-muted text-[11px] font-mono uppercase tracking-widest hidden sm:inline">Presets:</span>
                {[5, 10, 16, 25, 40].map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tonnage === t.toString()}
                    onClick={() => {
                      setTonnage(t.toString())
                    }}
                    className={cn(
                      'px-2 py-0.5 rounded-badge text-[11px] font-mono font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer',
                      tonnage === t.toString()
                        ? 'bg-primary-500 text-white shadow-glow-primary'
                        : 'bg-sunken text-muted hover:bg-wash-strong hover:text-ink border border-white/5'
                    )}
                  >
                    {t}T
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* ── 4. Results Header & Sorting Controls ── */}
          <div id="panel-marketplace-results" role="tabpanel" aria-labelledby={mode === 'trucks' ? 'tab-trucks' : 'tab-loads'} className="space-y-4">
            <Card padding="none" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-sm sm:text-base text-body font-medium" aria-live="polite">
                  Found{' '}
                  <strong className="text-ink font-bold font-mono text-base sm:text-lg">
                    {sortedResults.length}
                  </strong>{' '}
                  {mode === 'trucks' ? 'trucks' : 'loads'} within <span className="font-mono text-ink">{radius}</span> km
                </p>
                <Badge variant="primary" size="sm">
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  <span>Smart Ranked</span>
                </Badge>
              </div>

              {/* Sort Control */}
              <div className="flex items-center gap-2">
                <label htmlFor="marketplace-sort" className="text-xs font-medium text-muted flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-primary-400" aria-hidden="true" />
                  <span>Sort by:</span>
                </label>
                <div className="w-full max-w-[220px]">
                  <Select
                    id="marketplace-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as MatchSortOption)}
                    className="py-1.5 text-xs font-semibold"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>

            {/* Loading Skeleton State */}
            {loading ? (
              <div className="space-y-4" aria-hidden="true">
                {[1, 2, 3].map((n) => (
                  <Card key={n} padding="none" className="p-5 sm:p-6 space-y-4" surface="glass">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <Skeleton variant="rectangular" className="w-12 h-12 rounded-2xl shrink-0" />
                        <div className="space-y-2">
                          <Skeleton className="w-36 h-4" />
                          <Skeleton className="w-24 h-3" />
                        </div>
                      </div>
                      <Skeleton className="w-20 h-6 rounded-pill" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[1, 2, 3, 4].map((s) => (
                        <Skeleton key={s} className="h-16 rounded-xl" />
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            ) : sortedResults.length === 0 ? (
              /* ── Zero-Results Empty State ── */
              <EmptyState
                icon={mode === 'trucks' ? Truck : Package}
                title={`No matching ${mode === 'trucks' ? 'trucks' : 'freight loads'} found within ${radius} km`}
                description="Try expanding your search radius to 100 km or 200 km to discover more active freight matches across the regional corridor."
                primaryAction={{
                  label: 'Expand Search to 200 km',
                  onClick: () => {
                    setRadius('200')
                    handleSearch()
                  },
                }}
                className="py-10 sm:py-14"
              />
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
                        <Card
                          key={truck.id}
                          surface="glass"
                          hover
                          padding="none"
                          className={cn(
                            'p-5 sm:p-6 space-y-5',
                            isTopRecommendation && 'border-primary-500/40 shadow-glow-primary'
                          )}
                        >
                          {/* Header: Identity, Vahan Badge, Match Score */}
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              {/* Truck Icon Badge */}
                              <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20 shrink-0">
                                <Truck className="w-6 h-6 stroke-[2.2]" aria-hidden="true" />
                              </div>

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono font-bold text-ink text-base sm:text-lg tracking-wide">
                                    {truck.registrationNumber || 'MH-12-TRUCK'}
                                  </span>

                                  {/* Vahan Verification Badge (backed by the Vahan RC validation API) */}
                                  <VerifiedBadge
                                    verified={isVerified}
                                    source="vahan"
                                    validatedAt={truck.vahanVerifiedAt}
                                    variant="dark"
                                  />

                                  {isTopRecommendation && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill bg-gradient-to-r from-primary-500 to-amber-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-glow-primary">
                                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                                      <span>Recommended</span>
                                    </span>
                                  )}

                                  {/* FASTag readiness chip (compliance signal) */}
                                  {truck.fastagStatus === 'Active' && (
                                    <Badge
                                      variant="info"
                                      size="sm"
                                      title="FASTag is active with sufficient balance — toll-ready vehicle."
                                    >
                                      <CircleDollarSign className="w-3 h-3" aria-hidden="true" />
                                      <span>FASTag Ready</span>
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted font-medium">
                                  <span className="font-semibold text-body">
                                    {truck.bodyType === 'Open'
                                      ? 'Open Body'
                                      : truck.bodyType === 'Container'
                                      ? 'Closed Container'
                                      : 'Open Body Trailer'}{' '}
                                    Truck
                                  </span>
                                  {truck.lengthFt && (
                                    <span>
                                      • <span className="font-mono text-ink">{truck.lengthFt}ft</span> Length
                                    </span>
                                  )}
                                  <span>
                                    • Updated <span className="font-mono text-subtle">{relativeTime}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Match Score */}
                            <div className="flex items-center gap-2 self-start md:self-auto">
                              <MatchScoreBadge match={match} />
                            </div>
                          </div>

                          {/* 4-Stat Row (Compact Telemetry Readouts) */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {/* Distance */}
                            <TelemetryCell
                              label="Distance"
                              icon={<MapPin className="w-3.5 h-3.5 text-primary-400" />}
                              value={truck.distanceKm ? `${truck.distanceKm.toFixed(1)} km` : '12 km'}
                            />

                            {/* ETA to Load Point */}
                            <TelemetryCell
                              label="ETA to Load Point"
                              icon={<Clock className="w-3.5 h-3.5 text-subtle" />}
                              value={`${etaMinutes} mins`}
                            />

                            {/* Rate Benchmark */}
                            <TelemetryCell
                              label="Rate Benchmark"
                              value={`₹${rateEstimate.ratePerTonKm.toFixed(2)}/T-km`}
                              valueClassName="text-emerald-600 dark:text-emerald-400"
                            />

                            {/* Cargo Fit */}
                            <TelemetryCell
                              label="Cargo Fit"
                              value={`${truck.tonnageCapacity || 16}T Cap (${Math.round((match.factors?.capacity?.fit ? 1 : 0.85) * 100)}%)`}
                            />
                          </div>

                          {/* Preferred Corridors (if specified) */}
                          {truck.preferredDestinations && truck.preferredDestinations.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                                Corridors:
                              </span>
                              {truck.preferredDestinations.map((dest, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-badge bg-sunken text-muted border border-white/10 text-[11px] font-medium"
                                >
                                  {dest}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* ── Contact Section (SEALED) ── */}
                          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {truck.ownerPhone ? (
                              /* Unlocked Contact state after paid subscription reveal */
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-500/25">
                                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
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
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-button bg-whatsapp hover:bg-[#20bd5a] text-white text-xs font-bold transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none"
                                >
                                  <span>Direct WhatsApp</span>
                                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                                </a>
                              </div>
                            ) : (
                              /* Sealed Contact state per monetization model */
                              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-muted font-medium">
                                <div className="w-7 h-7 rounded-lg bg-sunken border border-white/10 text-subtle flex items-center justify-center shrink-0">
                                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                                </div>
                                <span>Contact details sealed until subscription unlock</span>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                              {!truck.ownerPhone && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  loading={revealing === truck.id}
                                  loadingText="Unlocking contact details"
                                  leftIcon={<Lock className="w-3.5 h-3.5" aria-hidden="true" />}
                                  onClick={() => handleReveal(truck.id, 'truck')}
                                >
                                  {revealing === truck.id ? 'Unlocking...' : 'Unlock Contact'}
                                </Button>
                              )}

                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                                onClick={() => setSelectedTruckForBooking(truck)}
                              >
                                Book Lorry
                              </Button>
                            </div>
                          </div>
                        </Card>
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
                        <Card
                          key={load.id}
                          surface="glass"
                          hover
                          padding="none"
                          className={cn(
                            'p-5 sm:p-6 space-y-5',
                            isTopRecommendation && 'border-primary-500/40 shadow-glow-primary'
                          )}
                        >
                          {/* Header: Route, Badges, Match Score */}
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20 shrink-0">
                                <Package className="w-6 h-6 stroke-[2.2]" aria-hidden="true" />
                              </div>

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-ink text-base sm:text-lg flex items-center gap-2">
                                    <span>{load.loadingAddress}</span>
                                    <ArrowRight className="w-4 h-4 text-primary-400 shrink-0" aria-hidden="true" />
                                    <span>{load.unloadingAddress}</span>
                                  </span>

                                  {load.urgent && (
                                    <Badge variant="danger" size="sm">
                                      <span>Urgent Load</span>
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted font-medium">
                                  <span className="font-semibold text-body">
                                    <span className="font-mono text-ink">{load.tonnageRequired}T</span> • {load.truckType} Body Required
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Match Score */}
                            <div className="flex items-center gap-2 self-start md:self-auto">
                              <MatchScoreBadge match={match} />
                            </div>
                          </div>

                          {/* 4-Stat Row */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <TelemetryCell
                              label="Distance"
                              value={load.distanceKm ? `${load.distanceKm.toFixed(1)} km` : '15 km'}
                            />

                            <TelemetryCell
                              label="Required Payload"
                              value={`${load.tonnageRequired} Tons`}
                            />

                            <TelemetryCell
                              label="Rate Benchmark"
                              value={
                                load.maxPrice
                                  ? formatINR(load.maxPrice)
                                  : `Est. ${formatINR(priceEstimate.recommendedTarget)}`
                              }
                              valueClassName="text-emerald-600 dark:text-emerald-400"
                            />

                            <TelemetryCell label="Body Requirement" value={load.truckType} />
                          </div>

                          {/* Sealed Contact Row */}
                          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {load.ownerPhone ? (
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-500/25">
                                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
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
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-button bg-whatsapp hover:bg-[#20bd5a] text-white text-xs font-bold transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none"
                                >
                                  <span>Direct WhatsApp</span>
                                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                                </a>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-muted font-medium">
                                <div className="w-7 h-7 rounded-lg bg-sunken border border-white/10 text-subtle flex items-center justify-center shrink-0">
                                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                                </div>
                                <span>Contact details sealed until subscription unlock</span>
                              </div>
                            )}

                            {!load.ownerPhone && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="self-end sm:self-auto"
                                loading={revealing === load.id}
                                loadingText="Unlocking contact details"
                                leftIcon={<Lock className="w-3.5 h-3.5" aria-hidden="true" />}
                                onClick={() => handleReveal(load.id, 'load')}
                              >
                                {revealing === load.id ? 'Unlocking...' : 'Unlock Contact'}
                              </Button>
                            )}
                          </div>
                        </Card>
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
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" className="text-primary-500" label="Loading freight marketplace" />
            <span
              aria-hidden="true"
              className="text-xs font-mono font-bold text-muted uppercase tracking-widest"
            >
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
