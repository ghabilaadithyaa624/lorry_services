'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface TruckResult {
  id: string
  bodyType: string
  lengthFt: number
  heightFt: number
  tonnageCapacity: number
  serviceableRadiusKm: number
  verificationStatus: string
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
  truckType: string
  urgent: boolean
  maxPrice: number | null
  distanceKm: number
  ownerPhone: string | null
  ownerName: string | null
}

type SearchMode = 'trucks' | 'loads'

const TRUCK_TYPES = ['Open', 'Container', 'OpenBody']

export default function SearchPage() {
  const router = useRouter()
  const [mode, setMode] = useState<SearchMode>('trucks')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [radius, setRadius] = useState('50')
  const [truckType, setTruckType] = useState('')
  const [tonnage, setTonnage] = useState('')
  const [results, setResults] = useState<TruckResult[] | LoadResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [revealing, setRevealing] = useState<string | null>(null)
  const [revealError, setRevealError] = useState('')

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toString())
        setLng(pos.coords.longitude.toString())
        setLocationLabel(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
      },
      () => alert('Could not detect location. Please allow location access.')
    )
  }

  const handleSearch = async () => {
    if (!lat || !lng) {
      setError('Please detect or enter your location first.')
      return
    }
    setLoading(true)
    setError('')
    setResults([])

    try {
      const params = new URLSearchParams({
        lat, lng, radius,
        ...(truckType && { truckType }),
        ...(tonnage && { [mode === 'trucks' ? 'minTonnage' : 'maxTonnage']: tonnage }),
      })
      const res = await api.get(`/search/${mode}?${params}`)
      setResults(res.data)
      setSearched(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleReveal = async (id: string, type: 'truck' | 'load') => {
    setRevealing(id)
    setRevealError('')
    try {
      const res = await api.post(`/search/${type}/${id}/reveal`)
      // Update result in-place with revealed data
      setResults(prev =>
        (prev as any[]).map(r =>
          r.id === id
            ? { ...r, ownerPhone: res.data?.user?.phone, ownerName: res.data?.user?.name }
            : r
        )
      )
    } catch (err: any) {
      if (err.response?.status === 402) {
        router.push('/subscribe?reason=reveal')
      } else {
        setRevealError('Failed to reveal contact. Try again.')
      }
    } finally {
      setRevealing(null)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Search Nearby</h1>
          <p className="text-sm text-gray-500 mt-1">Find trucks or loads within your radius</p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-button overflow-hidden border border-gray-200 dark:border-gray-700 w-fit mb-6">
          <button
            onClick={() => { setMode('trucks'); setResults([]); setSearched(false) }}
            className={`px-6 py-2.5 text-sm font-medium transition-colors ${
              mode === 'trucks'
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
            }`}
          >
            🚛 Find Trucks
          </button>
          <button
            onClick={() => { setMode('loads'); setResults([]); setSearched(false) }}
            className={`px-6 py-2.5 text-sm font-medium transition-colors ${
              mode === 'loads'
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
            }`}
          >
            📦 Find Loads
          </button>
        </div>

        {/* Filters card */}
        <div className="card p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Location */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Your Location *</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={locationLabel}
                  placeholder="Click detect →"
                  className="input text-sm"
                />
                <button
                  onClick={detectLocation}
                  className="btn-secondary whitespace-nowrap text-sm px-3"
                  title="Detect my location"
                >
                  📍 Detect
                </button>
              </div>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm font-medium mb-1">Radius (km)</label>
              <select
                value={radius}
                onChange={e => setRadius(e.target.value)}
                className="input text-sm"
              >
                {[25, 50, 100, 200, 500].map(r => (
                  <option key={r} value={r}>{r} km</option>
                ))}
              </select>
            </div>

            {/* Truck type */}
            <div>
              <label className="block text-sm font-medium mb-1">Truck Type</label>
              <select
                value={truckType}
                onChange={e => setTruckType(e.target.value)}
                className="input text-sm"
              >
                <option value="">Any type</option>
                {TRUCK_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end gap-4 mt-4">
            <div className="w-48">
              <label className="block text-sm font-medium mb-1">
                {mode === 'trucks' ? 'Min Tonnage (T)' : 'Max Tonnage (T)'}
              </label>
              <input
                type="number"
                value={tonnage}
                onChange={e => setTonnage(e.target.value)}
                placeholder="Any"
                className="input text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : '🔍'}
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          {revealError && <p className="text-red-500 text-sm mt-3">{revealError}</p>}
        </div>

        {/* Results */}
        {searched && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Found <strong>{results.length}</strong> {mode} within {radius} km
            </p>

            {results.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-500">No results found. Try increasing the radius.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mode === 'trucks'
                  ? (results as TruckResult[]).map(truck => (
                    <div key={truck.id} className="card p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-base">🚛 {truck.bodyType} Truck</span>
                            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">
                              Verified
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>📏 {truck.lengthFt}ft × {truck.heightFt}ft</span>
                            <span>⚖️ {truck.tonnageCapacity}T capacity</span>
                            <span>🎯 {truck.serviceableRadiusKm}km serviceable</span>
                            <span className="font-medium text-primary-600">📍 {truck.distanceKm?.toFixed(1)} km away</span>
                          </div>

                          {/* Contact reveal */}
                          {truck.ownerPhone ? (
                            <div className="mt-3 flex items-center gap-3 text-sm">
                              <span className="font-medium text-green-600">📞 {truck.ownerPhone}</span>
                              {truck.ownerName && <span className="text-gray-500">({truck.ownerName})</span>}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleReveal(truck.id, 'truck')}
                              disabled={revealing === truck.id}
                              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                              {revealing === truck.id ? '⏳ Revealing...' : '🔓 Reveal Contact (Subscription)'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                  : (results as LoadResult[]).map(load => (
                    <div key={load.id} className="card p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {load.urgent && (
                              <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">URGENT</span>
                            )}
                            <span className="font-semibold">📦 {load.tonnageRequired}T — {load.truckType}</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">
                            📍 {load.loadingAddress} → {load.unloadingAddress}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                            {load.maxPrice && <span>💰 Max ₹{load.maxPrice.toLocaleString()}</span>}
                            <span className="font-medium text-primary-600">📍 {load.distanceKm?.toFixed(1)} km away</span>
                          </div>

                          {/* Contact reveal */}
                          {load.ownerPhone ? (
                            <div className="mt-3 flex items-center gap-3 text-sm">
                              <span className="font-medium text-green-600">📞 {load.ownerPhone}</span>
                              {load.ownerName && <span className="text-gray-500">({load.ownerName})</span>}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleReveal(load.id, 'load')}
                              disabled={revealing === load.id}
                              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                              {revealing === load.id ? '⏳ Revealing...' : '🔓 Reveal Contact (Subscription)'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
