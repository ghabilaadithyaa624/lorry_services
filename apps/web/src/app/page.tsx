'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Truck,
  Search,
  MapPin,
  ArrowRight,
  Clock,
  ShieldCheck,
  Signal,
  Sparkles,
  FileText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Navigation,
} from 'lucide-react'
import { Navbar, Footer } from '@/components/layout'
import { FreightNetworkDiagram } from '@/components/ui'
import { cn } from '@/lib/utils'

export default function HomePage() {
  const router = useRouter()
  const [searchTab, setSearchTab] = useState<'trucks' | 'loads'>('trucks')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [truckType, setTruckType] = useState('Open')
  const [radius, setRadius] = useState('50')

  // Quick Preset Locations for Command Console
  const quickLocations = ['Pune', 'Delhi NCR', 'Mumbai', 'Bengaluru', 'Chennai', 'Ahmedabad', 'Hyderabad']

  // Live Operational Marketplace Preview Routes Data
  const liveRoutes = [
    {
      id: 'delhi-mumbai',
      route: 'Delhi NCR (Tughlakabad) ➔ JNPT Port, Mumbai',
      origin: 'Delhi NCR',
      destination: 'Mumbai (JNPT)',
      distanceKm: 1420,
      etaHours: 38,
      trucksAvailable: 18,
      proximityKm: 12.4,
      commercialRate: 52000,
      ratePerKm: 36.6,
      cargoType: 'Industrial Goods & FMCG',
      truckBody: '32ft Multi-Axle Container',
      lastMatched: '12 mins ago',
      driverPhone: '918072025106',
    },
    {
      id: 'chennai-bengaluru',
      route: 'Chennai Port ➔ Bengaluru ICD (Whitefield)',
      origin: 'Chennai',
      destination: 'Bengaluru ICD',
      distanceKm: 345,
      etaHours: 10,
      trucksAvailable: 24,
      proximityKm: 8.2,
      commercialRate: 18500,
      ratePerKm: 53.6,
      cargoType: 'Electronics & Auto Components',
      truckBody: '24ft Open Body Lorry',
      lastMatched: '4 mins ago',
      driverPhone: '918072025106',
    },
    {
      id: 'ahmedabad-mumbai',
      route: 'Ahmedabad Industrial GIDC ➔ JNPT Port, Mumbai',
      origin: 'Ahmedabad',
      destination: 'Mumbai Port',
      distanceKm: 525,
      etaHours: 14,
      trucksAvailable: 15,
      proximityKm: 16.1,
      commercialRate: 24000,
      ratePerKm: 45.7,
      cargoType: 'Chemicals & Plastics',
      truckBody: '20ft Closed Body Tanker/Trailer',
      lastMatched: '19 mins ago',
      driverPhone: '918072025106',
    },
    {
      id: 'hyderabad-chennai',
      route: 'Hyderabad Pharma Hub ➔ Chennai Port Terminal',
      origin: 'Hyderabad',
      destination: 'Chennai Port',
      distanceKm: 630,
      etaHours: 16,
      trucksAvailable: 12,
      proximityKm: 14.5,
      commercialRate: 29500,
      ratePerKm: 46.8,
      cargoType: 'Pharma & Machinery',
      truckBody: '32ft High-Cube Container',
      lastMatched: '7 mins ago',
      driverPhone: '918072025106',
    },
  ]

  const [activeRouteId, setActiveRouteId] = useState('delhi-mumbai')
  const currentRoute = liveRoutes.find((r) => r.id === activeRouteId) || liveRoutes[0]

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = new URLSearchParams()
    query.set('type', searchTab === 'trucks' ? 'truck' : 'load')
    if (origin.trim()) query.set('location', origin.trim())
    if (destination.trim()) query.set('destination', destination.trim())
    if (truckType) query.set('truckType', truckType)
    if (radius) query.set('radius', radius)

    router.push(`/search?${query.toString()}`)
  }

  // 5-Stage Enterprise Workflow
  const operationalWorkflow = [
    {
      step: '01',
      code: 'POST',
      title: 'Post Freight Load',
      desc: 'Publish cargo specifications or trigger radial search within 50km loading radius.',
      icon: FileText,
    },
    {
      step: '02',
      code: 'MATCH',
      title: '50km Proximity Match',
      desc: 'Algorithmic matching engine locks nearest Vahan-verified trucks in real time.',
      icon: MapPin,
    },
    {
      step: '03',
      code: 'CONNECT',
      title: 'Direct Phone & WhatsApp',
      desc: 'Instant access to driver phone & WhatsApp credentials with zero middleman call centers.',
      icon: Sparkles,
    },
    {
      step: '04',
      code: 'BOOK',
      title: 'Zero Brokerage Agreement',
      desc: '100% direct freight agreement with standard 50% advance / 50% POD balance protocol.',
      icon: IndianRupee,
    },
    {
      step: '05',
      code: 'TRACK',
      title: 'Corridor Telemetry',
      desc: 'Monitor FASTag toll gate checkpoints and receive digital POD unloading confirmation.',
      icon: Signal,
    },
  ]

  const capabilityRail = [
    { label: 'VAHAN VERIFICATION', val: '100% RC Authenticated' },
    { label: 'PROXIMITY ENGINE', val: '50KM Loading Radius' },
    { label: 'DIRECT CONNECT', val: 'Direct WhatsApp & Phone' },
    { label: 'COMMERCIAL VALUE', val: '₹0 Broker Commission' },
    { label: 'TRANSIT CONTROL', val: 'FASTag Checkpoints' },
    { label: 'PAYMENT TERMS', val: '50% Advance / 50% POD' },
  ]

  const comparisons = [
    {
      parameter: 'Broker Margin / Commission',
      lorryCarry: '₹0 (Zero Commission — 100% Direct)',
      traditional: '3% – 8% trip deduction by middleman',
    },
    {
      parameter: 'Transporter Identity & Access',
      lorryCarry: 'Direct driver phone & WhatsApp credentials',
      traditional: 'Hidden behind broker phone lines & call centers',
    },
    {
      parameter: 'Vehicle & Owner Audit',
      lorryCarry: 'Digital Vahan & RC government database checks',
      traditional: 'Unverified manual paper records',
    },
    {
      parameter: 'Transit Telemetry & Visibility',
      lorryCarry: 'Highway toll checkpoint tracking & control tower',
      traditional: 'Manual phone calls to driver once a day',
    },
    {
      parameter: 'Payment Transparency',
      lorryCarry: 'Standard 50% loading advance / 50% on POD',
      traditional: 'Unpredictable delays & broker hold-backs',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      <Navbar />

      <main className="flex-1 overflow-x-hidden">
        {/* ── SECTION 1: ENTERPRISE HERO ── */}
        <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-24 border-b border-gray-200 overflow-hidden bg-slate-50">
          {/* Subtle Ambient Warm Glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: Hero Value Proposition */}
              <div className="lg:col-span-5 space-y-6 text-left">
                {/* Enterprise Badge */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-mono font-bold text-orange-600 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                  <span>DIRECT FREIGHT DISPATCH PLATFORM</span>
                </div>

                {/* Requirement Headline */}
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 leading-[1.08] font-sans">
                  INDIA&apos;S LIVE <br />
                  <span className="text-orange-500">
                    FREIGHT OPERATING NETWORK
                  </span>
                </h1>

                {/* Requirement Subheading */}
                <p className="text-xs sm:text-sm text-gray-600 max-w-xl leading-relaxed font-sans">
                  Direct freight dispatch connecting shippers with verified carriers across India&apos;s major freight corridors within a 50km loading radius.
                </p>

                {/* Hero CTAs */}
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => router.push('/post-load')}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs sm:text-sm font-bold transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus:outline-none cursor-pointer uppercase tracking-wider"
                  >
                    <Truck className="w-4 h-4 shrink-0" />
                    <span>POST FREIGHT LOAD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/search?type=truck')}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm font-bold transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer uppercase tracking-wider"
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    <span>EXPLORE VERIFIED FLEET</span>
                  </button>
                </div>

                {/* Hero Proof Metrics */}
                <div className="pt-6 grid grid-cols-3 gap-3 border-t border-gray-200">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                      VERIFIED FLEET
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-gray-900">2,480+</span>
                    <span className="text-[10px] text-gray-500 block font-sans">Vahan Authenticated</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                      PROXIMITY MATCH
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-orange-600">50 KM</span>
                    <span className="text-[10px] text-gray-500 block font-sans">Loading Radius</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                      BROKER MARGIN
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-emerald-700">₹0</span>
                    <span className="text-[10px] text-gray-500 block font-sans">100% Direct Deal</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Light Enterprise Product Visual */}
              <div className="lg:col-span-7">
                <FreightNetworkDiagram />
              </div>
            </div>
          </div>
        </section>

        {/* ── CAPABILITY TELEMETRY RAIL ── */}
        <section className="bg-white border-b border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {capabilityRail.map((item) => (
                <div
                  key={item.label}
                  className="bg-slate-50 p-3 rounded-xl border border-gray-200/80 text-center space-y-1 shadow-2xs"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                    {item.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-900 block">
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 2: LIVE FREIGHT NETWORK ── */}
        <section id="live-network" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-5 gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-mono font-bold uppercase mb-2">
                  SECTION 02 — LIVE FREIGHT NETWORK
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-sans">
                  Live Freight Matching Engine
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 font-sans mt-1">
                  Real-time availability, distance, ETA, proximity, and rate benchmarks across primary Indian highways.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  REAL-TIME DISPATCH ONLINE
                </span>
              </div>
            </div>

            {/* Route Selector Command Tabs */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                SELECT OPERATIONAL FREIGHT CORRIDOR:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                {liveRoutes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRouteId(r.id)}
                    className={cn(
                      'px-4 py-2.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none',
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

            {/* Active Route Enterprise Product Preview Box */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-gray-200 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                    ACTIVE FREIGHT ROUTE
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 mt-0.5 font-sans">
                    {currentRoute.route}
                  </h3>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold shrink-0 self-start sm:self-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{currentRoute.trucksAvailable} LORRIES AVAILABLE (50KM)</span>
                </div>
              </div>

              {/* Operational Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                    DISTANCE
                  </span>
                  <span className="text-base sm:text-lg font-mono font-black text-gray-900">
                    {currentRoute.distanceKm} KM
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                    ESTIMATED ETA
                  </span>
                  <span className="text-base sm:text-lg font-mono font-black text-gray-900">
                    {currentRoute.etaHours} HRS
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                    PROXIMITY
                  </span>
                  <span className="text-base sm:text-lg font-mono font-black text-orange-600">
                    &lt; {currentRoute.proximityKm} KM
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                    RATE BENCHMARK
                  </span>
                  <div className="flex flex-col">
                    <span className="text-base sm:text-lg font-mono font-black text-gray-900">
                      ₹{currentRoute.commercialRate.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 font-bold">
                      ₹{currentRoute.ratePerKm}/KM
                    </span>
                  </div>
                </div>
              </div>

              {/* Cargo & Body Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600 pt-1 border-t border-gray-200 font-sans">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-sans text-[11px] uppercase font-semibold">Fleet Type:</span>
                  <span className="font-semibold text-gray-900 truncate">{currentRoute.truckBody}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-sans text-[11px] uppercase font-semibold">Cargo Profile:</span>
                  <span className="font-semibold text-gray-900 truncate">{currentRoute.cargoType}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href={`/search?type=truck&location=${encodeURIComponent(currentRoute.origin)}`}
                  className="w-full sm:flex-1 text-center text-xs sm:text-sm font-bold text-gray-800 bg-white hover:bg-gray-50 border border-gray-200 py-3 rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer font-sans focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none"
                >
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <span>See Live Corridors</span>
                </Link>

                <Link
                  href={`/search?type=truck&location=${encodeURIComponent(currentRoute.origin)}`}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-mono font-bold transition-all shadow-sm flex items-center justify-center gap-2 uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none"
                >
                  <span>View Matches</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Live Ticker Bar */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 bg-slate-50 px-4 py-2.5 rounded-xl border border-gray-200">
              <RefreshCw className="w-3.5 h-3.5 text-orange-500 shrink-0 animate-spin" />
              <span className="truncate">
                Matched {currentRoute.lastMatched}: <strong className="text-gray-900">{currentRoute.truckBody}</strong> on {currentRoute.origin} ➔ {currentRoute.destination} (<strong className="text-emerald-700 font-bold">₹0 Brokerage</strong>)
              </span>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: HOW LORRYCARRY WORKS ── */}
        <section id="solutions" className="py-24 bg-slate-100/70 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-mono uppercase text-[10px] font-bold">
                SECTION 03 — HOW THE NETWORK WORKS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight font-sans">
                5-Stage Enterprise Workflow
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-sans">
                Streamlined direct freight dispatch pipeline connecting shippers with Vahan-verified fleet owners.
              </p>
            </div>

            {/* 5-Stage Clean Enterprise Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5 relative">
              {operationalWorkflow.map((m, idx) => {
                const Icon = m.icon
                return (
                  <div
                    key={m.step}
                    className="bg-white rounded-2xl p-6 border border-gray-200 flex flex-col justify-between space-y-5 hover:shadow-md transition-shadow relative group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-mono font-black text-orange-500">
                          {m.step}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-slate-100 px-2.5 py-1 rounded border border-gray-200">
                          {m.code}
                        </span>
                      </div>

                      <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
                        <Icon className="w-5 h-5 stroke-[2]" />
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors font-sans">
                        {m.title}
                      </h3>

                      <p className="text-xs text-gray-500 leading-relaxed font-sans">
                        {m.desc}
                      </p>
                    </div>

                    {idx < 4 && (
                      <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-orange-400 text-xs font-mono font-bold">
                        ➔
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: FREIGHT SEARCH COMMAND PANEL ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-gray-200 pb-5 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-mono text-xs font-bold">
                  SYS
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                    SECTION 04 — SEARCH COMMAND PANEL
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-gray-900 font-mono tracking-tight">
                    SEARCH VERIFIED FLEET PREVIEW
                  </h2>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setSearchTab('trucks')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none',
                    searchTab === 'trucks'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>FLEET DISCOVERY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchTab('loads')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none',
                    searchTab === 'loads'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span>CARGO DISCOVERY</span>
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Origin */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 font-sans">
                  ORIGIN LOCATION
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Pune, Delhi NCR"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 text-xs sm:text-sm font-medium font-sans"
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 font-sans">
                  DESTINATION NODE
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Bengaluru, JNPT Port"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 text-xs sm:text-sm font-medium font-sans"
                  />
                </div>
              </div>

              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 font-sans">
                  VEHICLE TYPE
                </label>
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 text-xs sm:text-sm font-medium font-sans"
                >
                  <option value="Open">Open Body Lorry</option>
                  <option value="Container">Closed Container</option>
                  <option value="OpenBody">Trailer / Flatbed</option>
                </select>
              </div>

              {/* Radius */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 font-sans">
                  PROXIMITY RADIUS
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 text-xs sm:text-sm font-medium font-sans"
                >
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km (Recommended)</option>
                  <option value="100">Within 100 km</option>
                  <option value="200">Within 200 km</option>
                </select>
              </div>

              {/* Submit CTA */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 font-mono font-bold py-3 text-xs sm:text-sm bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl shadow-sm uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span>SEARCH FLEET</span>
                </button>
              </div>
            </form>

            {/* Quick Origin Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-[11px]">
              <span className="font-semibold uppercase tracking-wider text-gray-400 text-[10px] font-sans">
                QUICK ORIGIN PRESETS:
              </span>
              {quickLocations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setOrigin(loc)}
                  className="px-3 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-gray-600 hover:text-gray-900 border border-gray-200 font-mono text-[11px] transition-colors cursor-pointer"
                >
                  + {loc}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: ACTIVE FREIGHT CORRIDORS ── */}
        <section id="active-corridors" className="py-24 bg-slate-100/70 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-mono text-[10px] uppercase font-bold mb-2">
                  SECTION 05 — ACTIVE FREIGHT CORRIDORS
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight font-sans">
                  High-Volume Operational Corridors
                </h2>
              </div>

              <Link
                href="/search?type=truck"
                className="text-xs sm:text-sm font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1.5 group font-mono"
              >
                <span>EXPLORE ALL CORRIDORS</span>
                <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Corridor Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {liveRoutes.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-6 border border-gray-200 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>{c.trucksAvailable} Trucks Avail.</span>
                      </div>

                      <span className="text-gray-500 flex items-center gap-1 font-bold">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {c.etaHours} HRS
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-400 font-sans">
                        <span>HIGHWAY CORRIDOR</span>
                        <span className="font-bold text-orange-600 font-mono">{c.distanceKm} KM</span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mt-1 group-hover:text-orange-600 transition-colors font-sans">
                        {c.origin} ➔ {c.destination}
                      </h3>
                    </div>

                    {/* Rate Telemetry Box */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-200 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Rate Benchmark:</span>
                        <span className="font-bold text-gray-900 text-sm">
                          ₹{c.commercialRate.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-400">Rate per KM:</span>
                        <span className="text-gray-700 font-bold">₹{c.ratePerKm}/KM</span>
                      </div>
                    </div>

                    {/* Specs */}
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                          CARGO TYPE
                        </span>
                        <span className="text-xs text-gray-700 font-medium font-sans">{c.cargoType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                          FLEET TYPE
                        </span>
                        <span className="text-xs text-gray-600 font-sans">{c.truckBody}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/search?type=truck&location=${encodeURIComponent(c.origin)}`}
                    className="w-full text-center text-xs font-mono font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 py-3 rounded-xl border border-orange-200 transition-colors block uppercase tracking-wider"
                  >
                    Match Freight on Route ➔
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 6: TRANSIT INTELLIGENCE ── */}
        <section id="transit-intelligence" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Context */}
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px] uppercase font-bold">
                SECTION 06 — SIGNATURE PRODUCT FEATURE
              </span>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight font-sans">
                Transit Intelligence & Checkpoint Telemetry
              </h2>

              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-sans">
                LorryCarry provides operational visibility after booking. Monitor active freight along national highway toll gates with FASTag checkpoint logs, digital bill of lading, and instant POD balance alerts.
              </p>

              <div className="space-y-3 pt-2 font-sans">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Highway toll gate FASTag checkpoint logging</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Automated 50% advance / 50% digital POD payout alerts</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Vahan & E-Way Bill verified transport compliance</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => router.push('/tracking')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-mono font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-orange-500" />
                  <span>OPEN CONTROL TOWER DEMO</span>
                </button>
              </div>
            </div>

            {/* Static Telemetry UI Preview Panel */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
                {/* Control Tower Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                      ACTIVE SHIPMENT TELEMETRY
                    </span>
                    <h3 className="text-base font-mono font-bold text-gray-900 mt-0.5">
                      BOOKING #BK-88492 <span className="text-orange-600 text-xs font-normal">(IN TRANSIT)</span>
                    </h3>
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-bold">
                    ON SCHEDULE
                  </span>
                </div>

                {/* Progress Bar & Route */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-800 font-bold">Kolkata Port ➔ Delhi NCR</span>
                    <span className="text-emerald-700 font-black">820 / 1,420 KM (57%)</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 border border-gray-200 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 w-[57%] rounded-full" />
                  </div>
                </div>

                {/* Checkpoint Milestone Logs */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                    CHECKPOINT TIMELINE LOGS:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                    <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
                      <span className="text-[9px] text-emerald-700 block font-bold">01. ORIGIN</span>
                      <span className="font-bold text-gray-900 truncate block">Kolkata Port</span>
                      <span className="text-[9px] text-gray-500 block mt-0.5">06:10 IST</span>
                    </div>

                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
                      <span className="text-[9px] text-orange-700 block font-bold">02. CHECKPOINT</span>
                      <span className="font-bold text-gray-900 truncate block">Ambala Toll</span>
                      <span className="text-[9px] text-emerald-700 block mt-0.5 font-bold">14:20 IST</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                      <span className="text-[9px] text-gray-400 block font-bold">03. NEXT GATE</span>
                      <span className="font-bold text-gray-700 truncate block">Ludhiana Bypass</span>
                      <span className="text-[9px] text-gray-500 block mt-0.5">ETA: 2.5 Hrs</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                      <span className="text-[9px] text-gray-400 block font-bold">04. DESTINATION</span>
                      <span className="font-bold text-gray-700 truncate block">Delhi NCR</span>
                      <span className="text-[9px] text-gray-500 block mt-0.5">ETA: 6.0 Hrs</span>
                    </div>
                  </div>
                </div>

                {/* Status Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">FASTag Toll Gate Scan:</span>
                    <span className="text-emerald-700 font-bold">CONFIRMED (VERIFIED)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">Commercial Payout State:</span>
                    <span className="text-orange-600 font-bold">50% Advance Paid (₹26,000)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">POD Payout Balance:</span>
                    <span className="text-gray-700 font-bold">50% Due on Unloading Confirmation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 7: COMMERCIAL TRANSPARENCY (DIRECT VS BROKER) ── */}
        <section id="comparison" className="py-24 bg-slate-100/70 border-t border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] uppercase font-bold">
                SECTION 07 — COMMERCIAL TRANSPARENCY
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight font-sans">
                Direct Marketplace vs Traditional Broker
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-sans">
                Executive operational comparison between LorryCarry direct network and legacy freight brokers.
              </p>
            </div>

            {/* Executive Comparison Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 text-gray-500 uppercase tracking-wider font-semibold font-mono text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="p-5">Operational Parameter</th>
                      <th className="p-5 text-emerald-700">LorryCarry Direct</th>
                      <th className="p-5 text-gray-500">Traditional Broker</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                    {comparisons.map((row) => (
                      <tr key={row.parameter} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-5 font-bold text-gray-900">
                          {row.parameter}
                        </td>
                        <td className="p-5 font-bold text-emerald-700 font-mono">
                          ✓ {row.lorryCarry}
                        </td>
                        <td className="p-5 text-gray-500">
                          ✗ {row.traditional}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 8: FINAL CTA ── */}
        <section className="relative py-24 bg-slate-50 overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* White Premium Surface Panel */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 sm:p-14 shadow-md text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-mono font-bold text-orange-700 uppercase tracking-wider">
                <span>START DIRECT FREIGHT OPERATIONS TODAY</span>
              </div>

              {/* Requirement Headline */}
              <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight font-sans uppercase">
                ELIMINATE MIDDLEMEN.<br />
                <span className="text-orange-500">CONNECT DIRECTLY.</span>
              </h2>

              <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto leading-relaxed font-sans">
                Join thousands of Vahan-verified lorry owners and industrial cargo shippers moving freight across India. Zero commission, 50km radial matching, and transparent terms.
              </p>

              {/* Requirement Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/post-load')}
                  className="font-bold px-8 py-4 text-xs sm:text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm uppercase tracking-wider font-mono transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                >
                  POST FREIGHT LOAD
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/login?redirect=/dashboard/truck-owner')}
                  className="font-bold px-8 py-4 text-xs sm:text-sm bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-xl shadow-2xs uppercase tracking-wider font-mono transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                >
                  REGISTER YOUR LORRY
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── SECTION 9: ENTERPRISE FOOTER ── */}
      <Footer />
    </div>
  )
}
