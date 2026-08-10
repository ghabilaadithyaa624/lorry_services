'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  TruckIcon,
  ArchiveBoxIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  LockClosedIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { api, locationApi } from '@/lib/api'
import { Navbar, Footer } from '@/components/layout'
import { Button, Badge, Card, Spinner, Skeleton } from '@/components/ui'
import { MatchScoreBadge } from '@/components/intelligence'
import { BookingTermsModal } from '@/components/BookingTermsModal'
import { calculateMatchScore, estimateFreightRate } from '@/lib/intelligence'
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
}

type SearchMode = 'trucks' | 'loads'

const TRUCK_TYPES = ['Open', 'Container', 'OpenBody']

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialType = searchParams.get('type') === 'load' ? 'loads' : 'trucks'
  const [mode, setMode] = useState<SearchMode>(initialType)
  const [lat, setLat] = useState('') // No default coordinates — requires GPS or manual entry
  const [lng, setLng] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [radius, setRadius] = useState('50')
  const [truckType, setTruckType] = useState('')
  const [tonnage, setTonnage] = useState('')
  const [results, setResults] = useState<TruckResult[] | LoadResult[]>([])
  const [loading, setLoading] = useState(false)
  const [revealing, setRevealing] = useState<string | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ placeId: string; address: string; lat?: number; lng?: number; city?: string; state?: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Booking modal state
  const [selectedTruckForBooking, setSelectedTruckForBooking] = useState<TruckResult | null>(null)

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

    // If string already matches a resolved coordinate pattern or was set by GPS, skip suggestions
    if (/^\d+(\.\d+)?°?\s*[NS]?\s*,\s*\d+(\.\d+)?°?\s*[EW]?$/i.test(locationLabel.trim())) {
      return
    }

    const timer = setTimeout(async () => {
      setIsSuggesting(true)
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
        // Silently catch suggestion lookup failures
      } finally {
        setIsSuggesting(false)
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
    setLocationLabel('Detecting...')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude
        const longitude = pos.coords.longitude

        // Update exact coordinates immediately for proximity search
        const latStr = latitude.toString()
        const lngStr = longitude.toString()
        setLat(latStr)
        setLng(lngStr)

        // Reverse geocode via backend (Mappls API key stays securely server-side)
        try {
          const res = await locationApi.reverseGeocode(latitude, longitude)
          const data = res.data

          if (data && data.city && data.state) {
            const humanAddress = `${data.city}, ${data.state}`
            setLocationLabel(humanAddress)
            toast.success(`📍 Location detected: ${humanAddress}`)
          } else if (data && data.formattedAddress) {
            setLocationLabel(data.formattedAddress)
            toast.success(`📍 Location detected: ${data.formattedAddress}`)
          } else {
            // Reverse geocode returned no address — show coordinates
            const coordLabel = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`
            setLocationLabel(coordLabel)
            toast.warning('Location detected. Exact coordinates will be used for proximity search.')
          }
        } catch {
          // Backend reverse geocode failed — still retain actual GPS coordinates
          const coordLabel = `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`
          setLocationLabel(coordLabel)
          toast.warning('Location detected. Exact coordinates will be used for proximity search.')
        } finally {
          setGpsLoading(false)
        }
      },
      (error) => {
        setGpsLoading(false)
        // Strictly handle all geolocation error codes without fallback to fake coordinates
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

  const handleSelectSuggestion = async (suggestion: { placeId: string; address: string; lat?: number; lng?: number; city?: string; state?: string }) => {
    setShowSuggestions(false)
    const display = suggestion.city && suggestion.state ? `${suggestion.city}, ${suggestion.state}` : suggestion.address
    setLocationLabel(display)

    if (suggestion.lat && suggestion.lng) {
      setLat(suggestion.lat.toString())
      setLng(suggestion.lng.toString())
    } else {
      // Geocode the selected address via backend
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

    // If coordinates are missing but user entered a location label, attempt geocoding
    if ((!searchLat || !searchLng) && locationLabel && locationLabel.trim().length >= 2) {
      // Check if user typed coordinates directly like "13.0827, 80.2707"
      const coordMatch = locationLabel.trim().match(/^([0-9.]+)\s*°?\s*[NS]?\s*,\s*([0-9.]+)\s*°?\s*[EW]?$/i)
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

    // Guard: do not search without valid coordinates
    if (!searchLat || !searchLng || isNaN(parseFloat(searchLat)) || isNaN(parseFloat(searchLng))) {
      toast.warning('Please detect your GPS location or enter a location before searching.')
      setLoading(false)
      return
    }

    setLoading(true)
    setResults([])

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
      setResults(res.data || [])
    } catch {
      toast.error('Failed to fetch search results. Please try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleReveal = async (id: string, type: 'truck' | 'load') => {
    setRevealing(id)
    try {
      const res = await api.post(`/search/${type}/${id}/reveal`)
      const updated = res.data

      setResults((prev: any[]) =>
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
      if (err.response?.status === 403) {
        toast.error('Subscription required to unlock direct contact numbers.')
        router.push('/subscribe?reason=reveal')
      } else {
        toast.error(err.response?.data?.message || 'Could not reveal contact')
      }
    } finally {
      setRevealing(null)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-background-dark text-surface-900 dark:text-surface-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Page Title */}
        <div className="mb-6">
          <Badge variant="primary" size="sm" className="mb-2">
            Geo-Proximity Intelligence
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-surface-900 dark:text-white">
            Marketplace Freight Search
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
            Discover verified lorries and cargo requirements with deterministic match scoring within 50km radius.
          </p>
        </div>

        {/* ── Search Control Panel ── */}
        <Card padding="lg" className="mb-8 shadow-card border-surface-200/80 dark:border-surface-700/80">
          {/* Mode Switcher */}
          <div className="flex rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700 w-fit mb-6 bg-surface-100 dark:bg-surface-800 p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('trucks')
                setResults([])
              }}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all',
                mode === 'trucks'
                  ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-primary-400 shadow-xs'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
              )}
            >
              <TruckIcon className="w-4 h-4" />
              <span>Find Trucks Nearby</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('loads')
                setResults([])
              }}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all',
                mode === 'loads'
                  ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-primary-400 shadow-xs'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
              )}
            >
              <ArchiveBoxIcon className="w-4 h-4" />
              <span>Find Freight Loads</span>
            </button>
          </div>

          {/* Filter Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Location */}
            <div className="md:col-span-2" ref={suggestionsRef}>
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">
                Centerpoint Hub
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPinIcon className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={locationLabel}
                    onChange={(e) => {
                      const val = e.target.value
                      setLocationLabel(val)
                      // If user clears input, clear coordinates too
                      if (!val.trim()) {
                        setLat('')
                        setLng('')
                      }
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true)
                    }}
                    placeholder="Enter city, address or click GPS"
                    className="input pl-9 text-xs sm:text-sm"
                    autoComplete="off"
                  />
                  {isSuggesting && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs text-surface-400">
                      Searching...
                    </div>
                  )}

                  {/* Place Autosuggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-700">
                      {suggestions.map((item, idx) => (
                        <li
                          key={item.placeId || idx}
                          onClick={() => handleSelectSuggestion(item)}
                          className="px-3.5 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-700/60 cursor-pointer transition-colors"
                        >
                          <div className="text-xs font-semibold text-surface-900 dark:text-white truncate">
                            {item.address}
                          </div>
                          {(item.city || item.state) && (
                            <div className="text-2xs text-surface-500 truncate mt-0.5">
                              {[item.city, item.state].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={detectLocation}
                  disabled={gpsLoading}
                  loading={gpsLoading}
                  leftIcon={<MapPinIcon className="w-4 h-4 text-primary-500" />}
                  className="shrink-0 text-xs font-bold"
                >
                  {gpsLoading ? 'Detecting...' : 'GPS'}
                </Button>
              </div>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">
                Radius Range
              </label>
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="input text-xs sm:text-sm"
              >
                {[25, 50, 100, 200, 500].map((r) => (
                  <option key={r} value={r}>
                    Within {r} km
                  </option>
                ))}
              </select>
            </div>

            {/* Truck Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">
                Vehicle Type
              </label>
              <select
                value={truckType}
                onChange={(e) => setTruckType(e.target.value)}
                className="input text-xs sm:text-sm"
              >
                <option value="">Any Body Type</option>
                {TRUCK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === 'Open' ? 'Open Body' : t === 'Container' ? 'Closed Container' : 'Trailer'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-5 pt-4 border-t border-surface-100 dark:border-surface-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">
                {mode === 'trucks' ? 'Min Capacity (T):' : 'Max Weight (T):'}
              </label>
              <input
                type="number"
                value={tonnage}
                onChange={(e) => setTonnage(e.target.value)}
                placeholder="Any"
                className="input py-1.5 px-3 w-28 text-xs"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              loading={loading}
              onClick={handleSearch}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
              className="w-full sm:w-auto font-bold"
            >
              Search {mode === 'trucks' ? 'Trucks' : 'Loads'}
            </Button>
          </div>
        </Card>

        {/* ── Search Results List ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs sm:text-sm text-surface-500 font-medium">
              Found <strong className="text-surface-900 dark:text-white font-bold">{results.length}</strong> available {mode} within {radius} km radius
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton.Card />
              <Skeleton.Card />
            </div>
          ) : results.length === 0 ? (
            <Card padding="lg" className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 text-surface-400 flex items-center justify-center mx-auto text-3xl">
                🔍
              </div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">
                No matching {mode} found in this radius
              </h3>
              <p className="text-xs sm:text-sm text-surface-500 max-w-sm mx-auto">
                Try expanding the search radius to 100km or 200km to discover more freight matches across the corridor.
              </p>
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRadius('200')
                    handleSearch()
                  }}
                >
                  Expand to 200 km
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {mode === 'trucks'
                ? (results as TruckResult[]).map((truck, idx) => {
                    // Compute deterministic match score against search parameters
                    const simulatedLoad = {
                      id: 'search-filter',
                      tonnageRequired: tonnage ? parseFloat(tonnage) : 10,
                      truckType: (truckType as any) || 'Open',
                    }
                    const match = calculateMatchScore(simulatedLoad, {
                      id: truck.id,
                      bodyType: truck.bodyType,
                      tonnageCapacity: truck.tonnageCapacity,
                      distanceKm: truck.distanceKm,
                      verificationStatus: truck.verificationStatus,
                    })

                    const rateEstimate = estimateFreightRate({
                      tonnage: truck.tonnageCapacity || 10,
                      truckType: truck.bodyType || 'Open',
                      distanceKm: truck.distanceKm || 50,
                    })

                    const isTopRecommendation = idx === 0 && match.score >= 75

                    return (
                      <Card
                        key={truck.id}
                        hover
                        padding="lg"
                        className={cn(
                          'border transition-all',
                          isTopRecommendation
                            ? 'border-primary-400 dark:border-primary-600/60 shadow-md bg-gradient-to-r from-white via-white to-primary-50/20 dark:from-surface-900 dark:via-surface-900 dark:to-primary-950/10'
                            : 'border-surface-200/80 dark:border-surface-700/80'
                        )}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                          <div className="space-y-3 flex-1 min-w-0">
                            {/* Top Badges & Recommendations */}
                            <div className="flex flex-wrap items-center gap-2">
                              {isTopRecommendation && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-500 text-white text-xs font-black uppercase tracking-wider shadow-xs">
                                  <SparklesIcon className="w-3.5 h-3.5" />
                                  <span>Recommended Match</span>
                                </span>
                              )}
                              <span className="text-base sm:text-lg font-extrabold text-surface-900 dark:text-white">
                                🚛 {truck.bodyType || 'Open'} Body Truck
                              </span>
                              <MatchScoreBadge match={match} />
                              <Badge variant="primary" size="sm">
                                📍 {truck.distanceKm ? truck.distanceKm.toFixed(1) : '12'} km away
                              </Badge>
                            </div>

                            {/* Specs Grid */}
                            <div className="flex flex-wrap gap-4 text-xs text-surface-600 dark:text-surface-300">
                              {truck.lengthFt && (
                                <span>📏 {truck.lengthFt}ft × {truck.heightFt || 8}ft</span>
                              )}
                              <span className="font-bold">⚖️ {truck.tonnageCapacity || 16} Ton Payload Capacity</span>
                              <span>🎯 Serviceable: {truck.serviceableRadiusKm || 50}km radius</span>
                              {truck.registrationNumber && (
                                <span className="font-mono font-bold text-surface-700 dark:text-surface-300">
                                  🆔 {truck.registrationNumber}
                                </span>
                              )}
                            </div>

                            {/* Rate Guidance Pill */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 text-xs text-surface-600 dark:text-surface-300">
                              <span className="text-surface-400">Est. Rate Metric:</span>
                              <span className="font-bold text-primary-600 dark:text-primary-400">
                                ₹{rateEstimate.ratePerTonKm.toFixed(2)}/T-km
                              </span>
                            </div>

                            {/* Contact Reveal Area */}
                            {truck.ownerPhone ? (
                              <div className="pt-2 flex flex-wrap items-center gap-3 animate-fade-in">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                                  <PhoneIcon className="w-4 h-4 text-emerald-600" />
                                  <span>{formatPhone(truck.ownerPhone)}</span>
                                  {truck.ownerName && <span>({truck.ownerName})</span>}
                                </span>

                                <a
                                  href={whatsappLink(
                                    truck.ownerPhone,
                                    `Hi ${truck.ownerName || 'Transporter'}, I found your ${truck.bodyType} truck on LorryCarry and have a freight consignment for you.`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-xs font-bold transition-colors"
                                >
                                  <span>💬 Direct WhatsApp</span>
                                </a>
                              </div>
                            ) : (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  disabled={revealing === truck.id}
                                  onClick={() => handleReveal(truck.id, 'truck')}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
                                >
                                  <LockClosedIcon className="w-4 h-4 text-primary-500" />
                                  <span>
                                    {revealing === truck.id ? 'Unlocking direct contact...' : 'Reveal Transporter Direct Contact (Pass)'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Direct Booking CTA */}
                          <div className="flex items-center gap-3 shrink-0">
                            <Button
                              variant="primary"
                              size="md"
                              onClick={() => setSelectedTruckForBooking(truck)}
                              className="font-bold px-5"
                            >
                              Book This Truck
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )
                  })
                : (results as LoadResult[]).map((load) => {
                    const priceEstimate = estimateFreightRate({
                      tonnage: load.tonnageRequired,
                      truckType: load.truckType,
                    })

                    return (
                      <Card
                        key={load.id}
                        hover
                        padding="lg"
                        className="border-surface-200/80 dark:border-surface-700/80"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                          <div className="space-y-3 flex-1 min-w-0">
                            {/* Route & Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              {load.urgent && (
                                <Badge variant="danger" size="sm">
                                  URGENT LOAD
                                </Badge>
                              )}
                              <Badge variant="info" size="sm">
                                📦 {load.tonnageRequired} Tons • {load.truckType}
                              </Badge>
                              <Badge variant="primary" size="sm">
                                📍 {load.distanceKm ? load.distanceKm.toFixed(1) : '15'} km away
                              </Badge>
                            </div>

                            {/* Route Details */}
                            <div className="text-sm sm:text-base font-bold text-surface-900 dark:text-white flex items-center gap-2 truncate">
                              <span className="truncate">{load.loadingAddress}</span>
                              <span className="text-primary-500 shrink-0">➔</span>
                              <span className="truncate">{load.unloadingAddress}</span>
                            </div>

                            <div className="flex flex-wrap gap-4 text-xs text-surface-500">
                              <span className="font-bold text-surface-900 dark:text-white">
                                Target Freight: {load.maxPrice ? formatINR(load.maxPrice) : `Est. ${formatINR(priceEstimate.recommendedTarget)}`}
                              </span>
                            </div>

                            {/* Contact Reveal Area */}
                            {load.ownerPhone ? (
                              <div className="pt-2 flex flex-wrap items-center gap-3 animate-fade-in">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                                  <PhoneIcon className="w-4 h-4 text-emerald-600" />
                                  <span>{formatPhone(load.ownerPhone)}</span>
                                  {load.ownerName && <span>({load.ownerName})</span>}
                                </span>

                                <a
                                  href={whatsappLink(
                                    load.ownerPhone,
                                    `Hi ${load.ownerName || 'Shipper'}, I saw your freight consignment from ${load.loadingAddress} on LorryCarry and can provide vehicle.`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-xs font-bold transition-colors"
                                >
                                  <span>💬 Direct WhatsApp</span>
                                </a>
                              </div>
                            ) : (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  disabled={revealing === load.id}
                                  onClick={() => handleReveal(load.id, 'load')}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
                                >
                                  <LockClosedIcon className="w-4 h-4 text-primary-500" />
                                  <span>
                                    {revealing === load.id ? 'Unlocking direct contact...' : 'Reveal Shipper Contact (Subscription)'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
            </div>
          )}
        </div>
      </main>

      {/* ── Booking Modal Integration ── */}
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

      <Footer />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-50 dark:bg-background-dark flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  )
}
