'use client'

import { useId } from 'react'

interface SearchFiltersProps {
  radius: number
  onRadiusChange: (r: number) => void
  truckType: string
  onTruckTypeChange: (type: string) => void
  minTonnage: string
  onMinTonnageChange: (tonnage: string) => void
}

export function SearchFilters({
  radius,
  onRadiusChange,
  truckType,
  onTruckTypeChange,
  minTonnage,
  onMinTonnageChange,
}: SearchFiltersProps) {
  const radiusId = useId()
  const truckTypeId = useId()
  const minTonnageId = useId()

  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Radius Slider */}
        <div className="w-full md:w-1/3">
          <label htmlFor={radiusId} className="block text-sm font-medium mb-1">
            Search Radius: <span className="text-primary-500 font-bold">{radius} km</span>
          </label>
          <input
            id={radiusId}
            type="range"
            min="10"
            max="300"
            step="10"
            value={radius}
            onChange={(e) => onRadiusChange(parseInt(e.target.value))}
            aria-label="Search Radius"
            aria-valuemin={10}
            aria-valuemax={300}
            aria-valuenow={radius}
            aria-valuetext={`${radius} km`}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          />
        </div>

        {/* Truck Type */}
        <div className="w-full md:w-1/3">
          <label htmlFor={truckTypeId} className="block text-sm font-medium mb-1">Truck Type</label>
          <select
            id={truckTypeId}
            value={truckType}
            onChange={(e) => onTruckTypeChange(e.target.value)}
            aria-label="Truck Type"
            className="input focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <option value="">All Types</option>
            <option value="Open">Open Body</option>
            <option value="Container">Container</option>
            <option value="OpenBody">Open Body Trailer</option>
          </select>
        </div>

        {/* Min Tonnage */}
        <div className="w-full md:w-1/3">
          <label htmlFor={minTonnageId} className="block text-sm font-medium mb-1">Min Tonnage (Tons)</label>
          <input
            id={minTonnageId}
            type="number"
            min="0"
            value={minTonnage}
            onChange={(e) => onMinTonnageChange(e.target.value)}
            placeholder="Min Tonnage"
            aria-label="Min Tonnage (Tons)"
            className="input focus-visible:ring-2 focus-visible:ring-primary-500"
          />
        </div>
      </div>
    </div>
  )
}
