'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Truck,
  MapPin,
  ShieldCheck,
  Clock,
  ArrowRight,
  Signal,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RouteData {
  id: string
  route: string
  origin: string
  originFacility: string
  destination: string
  destFacility: string
  distanceKm: number
  etaHours: number
  trucksAvailable: number
  proximityKm: number
  commercialRate: number
  ratePerKm: number
  cargoType: string
  truckBody: string
  vehicleReg: string
  lastMatched: string
  driverPhone: string
  checkpoints: Array<{ name: string; status: 'passed' | 'active' | 'upcoming'; time: string }>
}

export const DEFAULT_ROUTES: RouteData[] = [
  {
    id: 'delhi-mumbai',
    route: 'Delhi NCR ➔ JNPT Port, Mumbai',
    origin: 'Delhi NCR',
    originFacility: 'Tughlakabad Freight Terminal',
    destination: 'Mumbai',
    destFacility: 'JNPT Port Logistics Hub',
    distanceKm: 1420,
    etaHours: 38,
    trucksAvailable: 18,
    proximityKm: 12.4,
    commercialRate: 52000,
    ratePerKm: 36.6,
    cargoType: 'Industrial Goods & FMCG',
    truckBody: '32ft Multi-Axle Container',
    vehicleReg: 'DL-01-GC-8842',
    lastMatched: '12 mins ago',
    driverPhone: '918072025106',
    checkpoints: [
      { name: 'Jaipur Toll Bypass', status: 'passed', time: '04:20 IST' },
      { name: 'Udaipur Checkpoint', status: 'passed', time: '11:45 IST' },
      { name: 'Ahmedabad Ring Road', status: 'active', time: '18:10 IST' },
      { name: 'JNPT Gate 3', status: 'upcoming', time: 'ETA 12 Hrs' },
    ],
  },
  {
    id: 'chennai-bengaluru',
    route: 'Chennai Port ➔ Bengaluru ICD',
    origin: 'Chennai',
    originFacility: 'Chennai Port Container Terminal',
    destination: 'Bengaluru ICD',
    destFacility: 'Whitefield Industrial ICD',
    distanceKm: 345,
    etaHours: 10,
    trucksAvailable: 24,
    proximityKm: 8.2,
    commercialRate: 18500,
    ratePerKm: 53.6,
    cargoType: 'Electronics & Auto Components',
    truckBody: '24ft Open Body Lorry',
    vehicleReg: 'TN-09-BK-4102',
    lastMatched: '4 mins ago',
    driverPhone: '918072025106',
    checkpoints: [
      { name: 'Sriperumbudur Hub', status: 'passed', time: '07:15 IST' },
      { name: 'Vellore Toll Plaza', status: 'active', time: '10:30 IST' },
      { name: 'Hosur Border Check', status: 'upcoming', time: 'ETA 2 Hrs' },
      { name: 'Whitefield ICD', status: 'upcoming', time: 'ETA 3.5 Hrs' },
    ],
  },
  {
    id: 'ahmedabad-mumbai',
    route: 'Ahmedabad GIDC ➔ Mumbai Port',
    origin: 'Ahmedabad',
    originFacility: 'Vatva GIDC Freight Yard',
    destination: 'Mumbai Port',
    destFacility: 'Mumbai Port Authority Gate 2',
    distanceKm: 525,
    etaHours: 14,
    trucksAvailable: 15,
    proximityKm: 16.1,
    commercialRate: 24000,
    ratePerKm: 45.7,
    cargoType: 'Chemicals & Plastics',
    truckBody: '20ft Closed Tanker/Trailer',
    vehicleReg: 'GJ-01-TX-9921',
    lastMatched: '19 mins ago',
    driverPhone: '918072025106',
    checkpoints: [
      { name: 'Vadodara Express Toll', status: 'passed', time: '08:40 IST' },
      { name: 'Surat Bypass Gate', status: 'active', time: '12:15 IST' },
      { name: 'Vapi Checkpost', status: 'upcoming', time: 'ETA 3 Hrs' },
      { name: 'Mumbai Port Terminal', status: 'upcoming', time: 'ETA 6 Hrs' },
    ],
  },
  {
    id: 'hyderabad-chennai',
    route: 'Hyderabad Pharma Hub ➔ Chennai Port',
    origin: 'Hyderabad',
    originFacility: 'Pashamylaram Pharma Zone',
    destination: 'Chennai Port',
    destFacility: 'Chennai Port Terminal 1',
    distanceKm: 630,
    etaHours: 16,
    trucksAvailable: 12,
    proximityKm: 14.5,
    commercialRate: 29500,
    ratePerKm: 46.8,
    cargoType: 'Pharma & Machinery',
    truckBody: '32ft High-Cube Container',
    vehicleReg: 'TS-07-HC-5534',
    lastMatched: '7 mins ago',
    driverPhone: '918072025106',
    checkpoints: [
      { name: 'Nalgonda Toll', status: 'passed', time: '06:30 IST' },
      { name: 'Vijayawada Outer Ring', status: 'active', time: '11:20 IST' },
      { name: 'Nellore Bypass', status: 'upcoming', time: 'ETA 4 Hrs' },
      { name: 'Chennai Port Dock', status: 'upcoming', time: 'ETA 8 Hrs' },
    ],
  },
]

export function FreightNetworkDiagram() {
  const [activeRouteId, setActiveRouteId] = useState<string>('delhi-mumbai')
  const current = DEFAULT_ROUTES.find((r) => r.id === activeRouteId) || DEFAULT_ROUTES[0]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-5 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-gray-200 pb-4 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-mono font-bold text-gray-900 uppercase tracking-wider">
            LIVE DISPATCH MATRIX & TELEMETRY
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>VAHAN VERIFIED</span>
          </span>
          <span className="text-[10px] font-mono text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 font-bold">
            50KM RADIUS
          </span>
        </div>
      </div>

      {/* Corridor Selector Command Tabs */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">
          SELECT HIGHWAY CORRIDOR:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {DEFAULT_ROUTES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveRouteId(r.id)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none',
                activeRouteId === r.id
                  ? 'bg-orange-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-gray-600 hover:text-gray-900 hover:bg-slate-200'
              )}
            >
              {r.origin} ➔ {r.destination}
            </button>
          ))}
        </div>
      </div>

      {/* Route Visual Diagram */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-gray-200 space-y-4">
        {/* Route Nodes Display */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Origin Node */}
          <div className="md:col-span-5 bg-white p-3.5 rounded-xl border border-gray-200 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-orange-600 font-bold uppercase tracking-wider">
                01. LOADING ORIGIN
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                RADIAL &lt; {current.proximityKm} KM
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-gray-900 leading-snug">{current.origin}</h4>
                <p className="text-[11px] text-gray-500 truncate">{current.originFacility}</p>
              </div>
            </div>
          </div>

          {/* Dynamic Route Telemetry Line */}
          <div className="md:col-span-2 flex flex-col items-center justify-center py-2 md:py-0">
            <div className="w-full flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              <div className="flex-1 h-0.5 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500 relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-gray-700 bg-white px-1.5 rounded border border-gray-200 shadow-2xs">
                  {current.distanceKm} KM
                </span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-700 mt-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" />
              {current.etaHours} HRS ETA
            </span>
          </div>

          {/* Destination Node */}
          <div className="md:col-span-5 bg-white p-3.5 rounded-xl border border-gray-200 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase tracking-wider">
                02. UNLOADING DESTINATION
              </span>
              <span className="text-[10px] font-mono text-gray-500 font-bold">
                DIRECT DISPATCH
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-gray-900 leading-snug">{current.destination}</h4>
                <p className="text-[11px] text-gray-500 truncate">{current.destFacility}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Matched Carrier Card */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900">{current.truckBody}</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    {current.vehicleReg}
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 block font-sans">
                  Cargo Profile: <strong className="text-gray-700">{current.cargoType}</strong>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
                RATE BENCHMARK
              </span>
              <span className="text-base font-mono font-black text-gray-900">
                ₹{current.commercialRate.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-mono text-gray-500 block">₹{current.ratePerKm}/KM</span>
            </div>
          </div>

          {/* FASTag Checkpoint Logs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
            {current.checkpoints.map((cp, idx) => (
              <div
                key={cp.name}
                className={cn(
                  'p-2 rounded-lg border space-y-0.5',
                  cp.status === 'passed'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                    : cp.status === 'active'
                    ? 'bg-orange-50 border-orange-200 text-orange-800'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                )}
              >
                <span className="text-[9px] uppercase font-bold block">
                  {idx + 1}. {cp.status}
                </span>
                <span className="font-bold truncate block text-[11px] font-sans text-gray-900">{cp.name}</span>
                <span className="text-[9px] block text-gray-500">{cp.time}</span>
              </div>
            ))}
          </div>

          {/* Direct Actions without promising unsealed direct contact before subscription */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <Link
              href={`/search?type=truck&location=${encodeURIComponent(current.origin)}`}
              className="w-full sm:flex-1 text-center text-xs font-bold text-gray-800 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none"
            >
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>See Live Corridors</span>
            </Link>

            <Link
              href={`/search?type=truck&location=${encodeURIComponent(current.origin)}`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-mono font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5 uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none"
            >
              <span>Explore {current.trucksAvailable} Lorries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Live Status Footer Line */}
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1">
          <span className="flex items-center gap-1.5">
            <Signal className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Updated {current.lastMatched} • 50km Loading Proximity Verified</span>
          </span>
          <span className="text-emerald-700 font-bold">₹0 Broker Margin Guaranteed</span>
        </div>
      </div>
    </div>
  )
}
