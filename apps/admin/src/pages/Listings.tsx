import React, { useState } from 'react'
import {
  Package,
  Truck as TruckIcon,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eye,
  MapPin,
  Calendar,
  X,
  DollarSign
} from 'lucide-react'

type ListingCategory = 'loads' | 'trucks'

interface LoadListing {
  id: string
  ownerName: string
  ownerPhone: string
  loadingAddress: string
  unloadingAddress: string
  truckType: string
  tonnageRequired: string
  maxPrice: string
  urgent: boolean
  status: 'Open' | 'In-transit' | 'Completed' | 'Flagged'
  postedAt: string
}

interface TruckListing {
  id: string
  ownerName: string
  ownerPhone: string
  registrationNumber: string
  bodyType: string
  tonnageCapacity: string
  serviceableRadiusKm: number
  preferredDestinations: string[]
  verificationStatus: 'Verified' | 'Pending' | 'Flagged'
  registeredAt: string
}

const MOCK_LOADS: LoadListing[] = [
  {
    id: 'LD-9901',
    ownerName: 'Apex Logistics Corp',
    ownerPhone: '+91 98765 11223',
    loadingAddress: 'Peenya Industrial Area, Bangalore (560058)',
    unloadingAddress: 'Bhiwandi Warehousing Zone, Mumbai (421302)',
    truckType: 'Container',
    tonnageRequired: '18.5 Tons',
    maxPrice: '₹ 42,000',
    urgent: true,
    status: 'Open',
    postedAt: '2026-08-07 15:20'
  },
  {
    id: 'LD-9902',
    ownerName: 'Venkateshwara Minerals',
    ownerPhone: '+91 94432 88776',
    loadingAddress: 'Hospet Iron Ore Yard, Bellary (583201)',
    unloadingAddress: 'Chennai Port Container Terminal (600001)',
    truckType: 'Open body',
    tonnageRequired: '32 Tons',
    maxPrice: '₹ 68,000',
    urgent: false,
    status: 'In-transit',
    postedAt: '2026-08-07 11:05'
  },
  {
    id: 'LD-9903',
    ownerName: 'Rapid Traders',
    ownerPhone: '+91 98450 99887',
    loadingAddress: 'Chakan MIDC Phase 2, Pune (410501)',
    unloadingAddress: 'Sanand Industrial Estate, Ahmedabad (382110)',
    truckType: 'Container',
    tonnageRequired: '12 Tons',
    maxPrice: '₹ 28,500',
    urgent: false,
    status: 'Completed',
    postedAt: '2026-08-06 09:40'
  }
]

const MOCK_TRUCKS: TruckListing[] = [
  {
    id: 'TRK-5501',
    ownerName: 'Suraj Transports',
    ownerPhone: '+91 98112 33445',
    registrationNumber: 'KA-01-EQ-9876',
    bodyType: 'Container',
    tonnageCapacity: '16 Tons',
    serviceableRadiusKm: 75,
    preferredDestinations: ['Mumbai', 'Pune', 'Hyderabad'],
    verificationStatus: 'Verified',
    registeredAt: '2026-08-05 16:10'
  },
  {
    id: 'TRK-5502',
    ownerName: 'Kalyani Heavy Haulers',
    ownerPhone: '+91 97334 66778',
    registrationNumber: 'MH-12-AB-1234',
    bodyType: 'Open body',
    tonnageCapacity: '28 Tons',
    serviceableRadiusKm: 100,
    preferredDestinations: ['Chennai', 'Bangalore'],
    verificationStatus: 'Pending',
    registeredAt: '2026-08-07 10:30'
  }
]

export function Listings() {
  const [category, setCategory] = useState<ListingCategory>('loads')
  const [loads, setLoads] = useState<LoadListing[]>(MOCK_LOADS)
  const [trucks, setTrucks] = useState<TruckListing[]>(MOCK_TRUCKS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState<LoadListing | TruckListing | null>(null)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  const handleFlagLoad = (id: string) => {
    setLoads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'Flagged' as const } : l))
    )
    setActionFeedback(`Load listing ${id} has been flagged & removed from public search.`)
    setTimeout(() => setActionFeedback(null), 4000)
  }

  const handleFlagTruck = (id: string) => {
    setTrucks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, verificationStatus: 'Flagged' as const } : t))
    )
    setActionFeedback(`Truck registration ${id} has been suspended.`)
    setTimeout(() => setActionFeedback(null), 4000)
  }

  const filteredLoads = loads.filter(
    (l) =>
      l.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.loadingAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.unloadingAddress.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredTrucks = trucks.filter(
    (t) =>
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="w-7 h-7 text-orange-500" />
            Listings Moderation & Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor active load postings and truck registrations, review specs, and remove suspicious listings.
          </p>
        </div>

        {/* Category Switcher */}
        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => {
              setCategory('loads')
              setSelectedItem(null)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              category === 'loads'
                ? 'bg-orange-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Loads ({loads.length})
          </button>

          <button
            onClick={() => {
              setCategory('trucks')
              setSelectedItem(null)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              category === 'trucks'
                ? 'bg-orange-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TruckIcon className="w-4 h-4" />
            Trucks ({trucks.length})
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionFeedback && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-5 h-5" />
            {actionFeedback}
          </span>
          <button onClick={() => setActionFeedback(null)} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={
              category === 'loads'
                ? 'Search load ID, owner, origin, or destination address...'
                : 'Search truck reg number, owner name, or ID...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-orange-500 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {category === 'loads' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs uppercase text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">Load ID & Owner</th>
                  <th className="px-6 py-4">Route (Origin → Destination)</th>
                  <th className="px-6 py-4">Truck & Tonnage</th>
                  <th className="px-6 py-4">Offer Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filteredLoads.map((load) => (
                  <tr key={load.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{load.id}</span>
                          {load.urgent && (
                            <span className="bg-rose-500/20 text-rose-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-rose-500/30">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{load.ownerName} ({load.ownerPhone})</p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs">
                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5 text-slate-200">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-xs">{load.loadingAddress}</span>
                        </p>
                        <p className="flex items-center gap-1.5 text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="truncate max-w-xs">{load.unloadingAddress}</span>
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-200">
                      {load.truckType} • <strong className="text-orange-400">{load.tonnageRequired}</strong>
                    </td>

                    <td className="px-6 py-4 font-semibold text-emerald-400">{load.maxPrice}</td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          load.status === 'Open'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : load.status === 'In-transit'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : load.status === 'Completed'
                            ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {load.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedItem(load)}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>

                        {load.status !== 'Flagged' && (
                          <button
                            onClick={() => handleFlagLoad(load.id)}
                            className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Flag
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs uppercase text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">Reg Number</th>
                  <th className="px-6 py-4">Truck Owner</th>
                  <th className="px-6 py-4">Specs & Capacity</th>
                  <th className="px-6 py-4">Service Radius & Routes</th>
                  <th className="px-6 py-4">Verification</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filteredTrucks.map((truck) => (
                  <tr key={truck.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-white">{truck.registrationNumber}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200">{truck.ownerName}</p>
                      <p className="text-xs text-slate-400">{truck.ownerPhone}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-200">
                      {truck.bodyType} • <strong className="text-orange-400">{truck.tonnageCapacity}</strong>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300">
                      <p>Radius: {truck.serviceableRadiusKm} km</p>
                      <p className="text-slate-400 mt-0.5">Dest: {truck.preferredDestinations.join(', ')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          truck.verificationStatus === 'Verified'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : truck.verificationStatus === 'Pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {truck.verificationStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedItem(truck)}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          Details
                        </button>
                        {truck.verificationStatus !== 'Flagged' && (
                          <button
                            onClick={() => handleFlagTruck(truck.id)}
                            className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Inspector */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white">Listing Details</h3>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="bg-slate-900 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto border border-slate-700">
              {JSON.stringify(selectedItem, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
