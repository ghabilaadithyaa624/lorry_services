'use client'

import React, { useState, useEffect } from 'react'
import {
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { Navbar, Footer } from '@/components/layout'
import { TruckCard, Truck } from '@/components/TruckCard'
import { SearchFilters } from '@/components/SearchFilters'
import {
  calculateMatchScore,
  sortMarketplaceItems,
  MatchSortOption,
} from '@/lib/intelligence'
import { Badge, Spinner, Card } from '@/components/ui'

const SORT_OPTIONS: Array<{ id: MatchSortOption; label: string }> = [
  { id: 'BEST_MATCH', label: 'Best Match' },
  { id: 'NEAREST', label: 'Nearest' },
  { id: 'CAPACITY_FIT', label: 'Capacity Fit' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'RETURN_LOAD', label: 'Potential Return Load' },
]

export default function SearchTrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [loading, setLoading] = useState(true)
  const [radius, setRadius] = useState(50)
  const [sortBy, setSortBy] = useState<MatchSortOption>('BEST_MATCH')
  const [filters, setFilters] = useState({
    truckType: '',
    minTonnage: '',
  })

  // Default coordinates (Pune logistics center)
  const [location, setLocation] = useState({ lat: 18.5204, lng: 73.8567 })

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        () => {
          // Use default location
        }
      )
    }
  }, [])

  useEffect(() => {
    searchTrucks()
  }, [location, radius, filters])

  const searchTrucks = async () => {
    setLoading(true)
    try {
      const res = await api.get('/search/trucks', {
        params: {
          lat: location.lat,
          lng: location.lng,
          radius,
          ...filters,
        },
      })
      setTrucks(res.data || [])
    } catch {
      setTrucks([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate deterministic Smart Match score for each truck
  const targetTonnage = filters.minTonnage ? parseFloat(filters.minTonnage) : 10
  const processedTrucks = trucks.map((truck) => {
    const simulatedLoad = {
      id: 'search-filter',
      tonnageRequired: targetTonnage,
      truckType: (filters.truckType as any) || 'Open',
    }
    const match = calculateMatchScore(simulatedLoad, {
      id: truck.id,
      bodyType: (truck.bodyType as any) || 'Open',
      tonnageCapacity: truck.tonnageCapacity,
      distanceKm: truck.distanceKm,
      verificationStatus: truck.verificationStatus as any,
      preferredDestinations: truck.preferredDestinations,
    })
    return { ...truck, match }
  })

  const sortedTrucks = sortMarketplaceItems(processedTrucks, sortBy, targetTonnage)

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-background-dark text-surface-900 dark:text-surface-100 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-2.5 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
              Smart Match Marketplace
            </span>
            <Badge variant="primary" size="sm">
              Transporter Fleet
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white">
            Find Trucks Near You
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
            Browse available commercial lorries with transparent capacity, body type, and corridor match scoring.
          </p>
        </div>

        {/* Filters */}
        <SearchFilters
          radius={radius}
          onRadiusChange={setRadius}
          truckType={filters.truckType}
          onTruckTypeChange={(truckType) => setFilters({ ...filters, truckType })}
          minTonnage={filters.minTonnage}
          onMinTonnageChange={(minTonnage) => setFilters({ ...filters, minTonnage })}
        />

        {/* Results Header & Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-300 font-medium">
              Found <strong className="text-surface-900 dark:text-white font-black">{sortedTrucks.length}</strong> available trucks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-surface-500 flex items-center gap-1">
              <ArrowsUpDownIcon className="w-3.5 h-3.5" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as MatchSortOption)}
              className="px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-bold text-surface-900 dark:text-white outline-hidden focus:ring-2 focus:ring-primary-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-16">
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-xs font-semibold text-surface-500">Searching trucks in radius...</p>
          </div>
        ) : sortedTrucks.length === 0 ? (
          <Card padding="lg" className="text-center py-16 space-y-4">
            <div className="w-14 h-14 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-400 flex items-center justify-center mx-auto text-2xl">
              🚛
            </div>
            <h3 className="text-base font-bold text-surface-900 dark:text-white">
              No trucks found in {radius}km radius
            </h3>
            <p className="text-xs text-surface-500 max-w-sm mx-auto">
              Expand your search radius to discover vehicles operating in adjacent freight corridors.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setRadius(radius + 50)}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Expand Search to {radius + 50}km
              </button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTrucks.map((truck) => (
              <TruckCard key={truck.id} truck={truck} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
