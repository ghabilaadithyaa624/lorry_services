'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { TruckCard } from '@/components/TruckCard'
import { SearchFilters } from '@/components/SearchFilters'

interface Truck {
  id: string
  bodyType: string
  lengthFt: number
  heightFt: number
  tonnageCapacity: number
  serviceableRadiusKm: number
  preferredDestinations: string[]
  verificationStatus: string
  distanceKm: number
}

export default function SearchTrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [loading, setLoading] = useState(true)
  const [radius, setRadius] = useState(50)
  const [filters, setFilters] = useState({
    truckType: '',
    minTonnage: '',
  })

  // Default Pune coordinates
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
      setTrucks(res.data)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Find Trucks Near You</h1>

        {/* Filters */}
        <SearchFilters
          radius={radius}
          onRadiusChange={setRadius}
          truckType={filters.truckType}
          onTruckTypeChange={(truckType) => setFilters({ ...filters, truckType })}
          minTonnage={filters.minTonnage}
          onMinTonnageChange={(minTonnage) => setFilters({ ...filters, minTonnage })}
        />

        {/* Results */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Searching trucks...</p>
          </div>
        ) : trucks.length === 0 ? (
          <div className="text-center py-16 card p-8">
            <p className="text-lg font-semibold text-gray-600 mb-4">
              No trucks found in {radius}km radius
            </p>
            <button
              onClick={() => setRadius(radius + 50)}
              className="btn-primary"
            >
              Expand Search to {radius + 50}km
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trucks.map((truck) => (
              <TruckCard key={truck.id} truck={truck} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
