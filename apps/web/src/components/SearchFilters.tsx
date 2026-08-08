'use client'

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
  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Radius Slider */}
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium mb-1">
            Search Radius: <span className="text-primary-500 font-bold">{radius} km</span>
          </label>
          <input
            type="range"
            min="10"
            max="300"
            step="10"
            value={radius}
            onChange={(e) => onRadiusChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
        </div>

        {/* Truck Type */}
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium mb-1">Truck Type</label>
          <select
            value={truckType}
            onChange={(e) => onTruckTypeChange(e.target.value)}
            className="input"
          >
            <option value="">All Types</option>
            <option value="Open">Open Body</option>
            <option value="Container">Container</option>
            <option value="OpenBody">Open Body Trailer</option>
          </select>
        </div>

        {/* Min Tonnage */}
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium mb-1">Min Tonnage (Tons)</label>
          <input
            type="number"
            value={minTonnage}
            onChange={(e) => onMinTonnageChange(e.target.value)}
            placeholder="Min Tonnage"
            className="input"
          />
        </div>
      </div>
    </div>
  )
}
