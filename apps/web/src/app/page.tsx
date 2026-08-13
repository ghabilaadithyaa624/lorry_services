'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  TruckIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  ArrowRightIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  SignalIcon,
  SparklesIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Navbar, Footer } from '@/components/layout'
import { Button, Badge } from '@/components/ui'
import { cn, whatsappLink } from '@/lib/utils'

// Lazy-loaded 3D Hero Truck Canvas with SSR disabled for optimal client-side performance
const HeroTruckCanvas = dynamic(() => import('@/components/3d/HeroTruckCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] sm:h-[420px] lg:h-[480px] rounded-[20px] bg-[#070A11] border border-white/10 flex items-center justify-center animate-pulse">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-primary-500/20 text-primary-400 flex items-center justify-center mx-auto">
          <TruckIcon className="w-6 h-6 animate-bounce" />
        </div>
        <p className="text-[11px] font-mono font-semibold text-surface-400 uppercase tracking-[0.06em]">
          Loading 3D Telemetry Engine...
        </p>
      </div>
    </div>
  ),
})

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

  // 5-Stage Operational Spine Mechanism
  const operationalMechanism = [
    {
      step: '01',
      code: 'POST',
      title: 'Post Cargo / Search Lorries',
      desc: 'Publish freight specifications or trigger radial search within 50km loading radius.',
      icon: DocumentTextIcon,
    },
    {
      step: '02',
      code: 'MATCH',
      title: '50km Proximity Radial Match',
      desc: 'Algorithmic matching engine locks nearest Vahan-verified trucks in real time.',
      icon: MapPinIcon,
    },
    {
      step: '03',
      code: 'CONTACT',
      title: 'Direct WhatsApp & Call',
      desc: 'Instant access to driver phone & WhatsApp credentials with zero middleman hold-ups.',
      icon: ChatBubbleLeftRightIcon,
    },
    {
      step: '04',
      code: 'BOOK',
      title: 'Zero Brokerage Deal',
      desc: '100% direct freight agreement with standard 50% advance / 50% POD balance protocol.',
      icon: CurrencyRupeeIcon,
    },
    {
      step: '05',
      code: 'TRACK',
      title: 'Highway Corridor Telemetry',
      desc: 'Monitor highway toll checkpoints and receive digital POD unloading confirmation.',
      icon: SignalIcon,
    },
  ]

  const capabilityRail = [
    { label: 'VAHAN VERIFICATION', val: '100% RC Authenticated', color: 'text-emerald-400' },
    { label: 'PROXIMITY ENGINE', val: '50KM Loading Radius', color: 'text-primary-400' },
    { label: 'DIRECT CONNECT', val: 'Direct WhatsApp & Phone', color: 'text-sky-400' },
    { label: 'COMMERCIAL VALUE', val: '₹0 Broker Commission', color: 'text-amber-400' },
    { label: 'TRANSIT CONTROL', val: 'Highway Checkpoints', color: 'text-indigo-400' },
    { label: 'PAYMENT TERMS', val: '50% Advance / 50% POD', color: 'text-purple-400' },
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
    <div className="min-h-screen bg-[#070A11] text-surface-100 flex flex-col font-sans selection:bg-primary-500 selection:text-white pb-32 md:pb-0">
      <Navbar />

      <main className="flex-1 overflow-x-hidden">
        
        {/* ── 1. OPERATIONAL FLOW SPINE BAR (Above The Fold) ── */}
        <section className="bg-[#0B0E17] border-b border-white/10 py-2.5 px-4 sticky top-16 sm:top-20 z-30 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-surface-300">
                OPERATIONAL SPINE:
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 text-[11px] font-mono font-bold overflow-x-auto no-scrollbar py-1">
              <span className="px-2.5 py-1 rounded bg-primary-500/10 border border-primary-500/30 text-primary-400 whitespace-nowrap">
                01. POST FREIGHT
              </span>
              <span className="text-surface-600 font-sans">➔</span>
              <span className="px-2.5 py-1 rounded bg-primary-500/10 border border-primary-500/30 text-primary-400 whitespace-nowrap">
                02. 50KM RADIAL MATCH
              </span>
              <span className="text-surface-600 font-sans">➔</span>
              <span className="px-2.5 py-1 rounded bg-primary-500/10 border border-primary-500/30 text-primary-400 whitespace-nowrap">
                03. DIRECT CONTACT
              </span>
              <span className="text-surface-600 font-sans">➔</span>
              <span className="px-2.5 py-1 rounded bg-primary-500/10 border border-primary-500/30 text-primary-400 whitespace-nowrap">
                04. ZERO BROKERAGE BOOK
              </span>
              <span className="text-surface-600 font-sans">➔</span>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 whitespace-nowrap">
                05. TELEMETRY TRACK
              </span>
            </div>
          </div>
        </section>

        {/* ── 2. HERO SECTION WITH VISUALLY DOMINANT LIVE MATCHING ENGINE ── */}
        <section className="relative pt-8 pb-16 sm:pt-12 sm:pb-20 border-b border-white/10 overflow-hidden">
          {/* Restrained Ambient Lighting */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-primary-600/15 via-orange-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(249,115,22,0.06),transparent)] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              
              {/* Left Column: Hero Value Proposition (Supporting OS Context) */}
              <div className="lg:col-span-5 space-y-6 text-left pt-2">
                
                {/* Mechanism Badge */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0F131D] border border-white/10 text-xs font-mono font-bold text-primary-400 shadow-inner-light">
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-ping" />
                  <span>DIRECT FREIGHT OPERATING SYSTEM</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.05]">
                  India&apos;s Live <br />
                  <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-amber-400 bg-clip-text text-transparent">
                    Freight Control Engine
                  </span>
                </h1>

                <p className="text-xs sm:text-sm text-surface-300 max-w-xl leading-relaxed font-sans">
                  Direct freight dispatch connecting shippers with Vahan-verified lorry owners within 50km loading radius. Zero middleman fees, direct WhatsApp contact & transparent 50/50 terms.
                </p>

                {/* Hero Primary Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => router.push('/post-load')}
                    leftIcon={<TruckIcon className="w-5 h-5 shrink-0" />}
                    className="font-bold text-xs sm:text-sm px-6 py-3.5 shadow-glow-primary hover:scale-[1.02] transition-transform"
                  >
                    Post Freight Load
                  </Button>

                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => router.push('/search?type=truck')}
                    leftIcon={<MagnifyingGlassIcon className="w-5 h-5 shrink-0" />}
                    className="font-bold text-xs sm:text-sm px-6 py-3.5 border-white/10 hover:border-white/30"
                  >
                    Explore Verified Fleet
                  </Button>
                </div>

                {/* Live Platform Telemetry Bar */}
                <div className="pt-4 grid grid-cols-3 gap-3 border-t border-white/10">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-surface-400 block">
                      VERIFIED FLEET
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-white">2,480+</span>
                    <span className="text-[10px] text-surface-400 block font-sans">Vahan Authenticated</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-surface-400 block">
                      RADIAL MATCH
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-primary-400">50 KM</span>
                    <span className="text-[10px] text-surface-400 block font-sans">Proximity Radius</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-surface-400 block">
                      BROKER MARGIN
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-emerald-400">₹0</span>
                    <span className="text-[10px] text-surface-400 block font-sans">100% Direct Deal</span>
                  </div>
                </div>

              </div>

              {/* Right Column: Visually Dominant Live Freight Matching Engine Panel (Selective Glass) */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Live Marketplace Panel Container (Selective Glass #1) */}
                <div className="bg-[#0F131D]/90 backdrop-blur-xl rounded-[22px] border border-white/15 p-5 sm:p-6 shadow-modal space-y-4">
                  
                  {/* Matching Engine Panel Header */}
                  <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3.5 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs sm:text-sm font-mono font-black text-white uppercase tracking-wider">
                        LIVE FREIGHT MATCHING ENGINE
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-bold">
                        LATENCY: 45ms
                      </span>
                      <span className="text-[10px] font-mono text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded border border-primary-500/20 font-bold hidden sm:inline-block">
                        RADIAL: 50KM
                      </span>
                    </div>
                  </div>

                  {/* Route Selector Command Tabs */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-surface-400 uppercase tracking-wider block">
                      SELECT OPERATIONAL CORRIDOR:
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                      {liveRoutes.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setActiveRouteId(r.id)}
                          className={cn(
                            'px-3.5 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all duration-150',
                            activeRouteId === r.id
                              ? 'bg-primary-500 text-white shadow-glow-primary border border-primary-400/40'
                              : 'bg-surface-950/80 text-surface-300 hover:text-white hover:bg-white/10 border border-white/5'
                          )}
                        >
                          {r.origin} ➔ {r.destination}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Route Operational Details Box (Prioritized Hierarchy) */}
                  <div className="bg-[#070A11] rounded-xl p-4 sm:p-5 border border-white/10 space-y-4">
                    
                    {/* Priority 1: ROUTE & Priority 2: AVAILABLE LORRIES */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase text-surface-400 tracking-wider">
                          ACTIVE FREIGHT ROUTE
                        </span>
                        <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5 font-sans">
                          {currentRoute.route}
                        </h3>
                      </div>
                      
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-black shrink-0 self-start sm:self-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>{currentRoute.trucksAvailable} LORRIES AVAILABLE (50KM)</span>
                      </div>
                    </div>

                    {/* Operational Telemetry Grid (Priority 3: Distance, Priority 4: ETA, Priority 5: Rate Benchmark) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0F131D] p-3.5 rounded-xl border border-white/5">
                      <div>
                        <span className="text-[10px] font-mono text-surface-400 block uppercase font-bold">DISTANCE</span>
                        <span className="text-base font-mono font-black text-white">{currentRoute.distanceKm} KM</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-surface-400 block uppercase font-bold">ESTIMATED ETA</span>
                        <span className="text-base font-mono font-black text-white">{currentRoute.etaHours} HRS</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-surface-400 block uppercase font-bold">PROXIMITY</span>
                        <span className="text-base font-mono font-black text-primary-400">&lt; {currentRoute.proximityKm} KM</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-surface-400 block uppercase font-bold">RATE BENCHMARK</span>
                        <div className="flex flex-col">
                          <span className="text-base font-mono font-black text-emerald-400">
                            ₹{currentRoute.commercialRate.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-500/90 font-bold">
                            ₹{currentRoute.ratePerKm}/KM
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cargo & Body Specifications */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-surface-300 pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-surface-400 font-mono text-[11px] uppercase font-bold">Vehicle Body:</span>
                        <span className="font-semibold text-white truncate">{currentRoute.truckBody}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-surface-400 font-mono text-[11px] uppercase font-bold">Cargo Profile:</span>
                        <span className="font-semibold text-white truncate">{currentRoute.cargoType}</span>
                      </div>
                    </div>

                    {/* Priority 6: PRIMARY CONTACT & MATCH ACTIONS */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                      <a
                        href={whatsappLink(
                          currentRoute.driverPhone,
                          `Hi, I saw your lorry on LorryCarry for route: ${currentRoute.route}. Let's agree on freight rate.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:flex-1 text-center text-xs sm:text-sm font-bold text-white bg-[#25D366] hover:bg-[#20ba5a] py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ChatBubbleLeftRightIcon className="w-4 h-4 stroke-[2.2]" />
                        <span>Direct WhatsApp Contact</span>
                      </a>

                      <Link
                        href={`/search?type=truck&location=${encodeURIComponent(currentRoute.origin)}`}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary flex items-center justify-center gap-1.5"
                      >
                        <span>Match Lorries</span>
                        <ArrowRightIcon className="w-4 h-4" />
                      </Link>
                    </div>

                  </div>

                  {/* Telemetry Ticker Feed */}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-surface-400 bg-[#070A11] px-3.5 py-2 rounded-xl border border-white/5">
                    <ArrowPathIcon className="w-3.5 h-3.5 text-primary-400 shrink-0 animate-spin" />
                    <span className="truncate">
                      Matched {currentRoute.lastMatched}: <strong className="text-white">{currentRoute.truckBody}</strong> on {currentRoute.origin} ➔ {currentRoute.destination} (<strong className="text-emerald-400">₹0 Brokerage</strong>)
                    </span>
                  </div>

                </div>

                {/* 3D Fleet Visualizer Component */}
                <HeroTruckCanvas />

              </div>

            </div>
          </div>
        </section>

        {/* ── 3. CAPABILITY TELEMETRY RAIL (Solid background per Rule #7) ── */}
        <section className="bg-[#0B0E17] border-b border-white/10 py-5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {capabilityRail.map((item) => (
                <div key={item.label} className="bg-[#070A11] p-3 rounded-xl border border-white/10 text-center space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-surface-400 block">
                    {item.label}
                  </span>
                  <span className={cn('text-xs font-mono font-bold block', item.color)}>
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. SEARCH COMMAND CONSOLE (Requirement 2 & Selective Glass #2) ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-5 relative z-20">
          {/* Glass Console Outer Container */}
          <div className="bg-[#0F131D]/90 backdrop-blur-xl rounded-[24px] border border-white/15 shadow-modal p-5 sm:p-7 space-y-5">
            
            {/* Command Console Top Header Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-400 font-mono text-xs font-bold">
                  SYS
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-surface-400 uppercase tracking-widest block">
                    OPERATIONAL COMMAND CONSOLE // v3.4
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-white font-mono tracking-tight">
                    RADIAL FREIGHT DISCOVERY MATRIX
                  </h2>
                </div>
              </div>

              {/* Mode Switcher Command Tabs */}
              <div className="flex items-center bg-[#070A11] p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setSearchTab('trucks')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-150',
                    searchTab === 'trucks'
                      ? 'bg-primary-500 text-white shadow-glow-primary'
                      : 'text-surface-400 hover:text-white'
                  )}
                >
                  <TruckIcon className="w-4 h-4 shrink-0" />
                  <span>[MODE: FLEET DISCOVERY]</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchTab('loads')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-150',
                    searchTab === 'loads'
                      ? 'bg-primary-500 text-white shadow-glow-primary'
                      : 'text-surface-400 hover:text-white'
                  )}
                >
                  <MagnifyingGlassIcon className="w-4 h-4 shrink-0" />
                  <span>[MODE: CARGO DISCOVERY]</span>
                </button>
              </div>
            </div>

            {/* Form Fields Grid (Solid inputs for contrast & legibility per Rule #7) */}
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Field 1: Origin */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-surface-400 font-mono">
                  01_ORIGIN_LOCATION
                </label>
                <div className="relative">
                  <MapPinIcon className="w-4 h-4 text-primary-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Pune, Delhi NCR"
                    className="w-full pl-10 pr-4 py-3 bg-[#070A11] border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium font-sans"
                  />
                </div>
              </div>

              {/* Field 2: Destination */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-surface-400 font-mono">
                  02_DESTINATION_NODE
                </label>
                <div className="relative">
                  <MapPinIcon className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Bengaluru, JNPT Port"
                    className="w-full pl-10 pr-4 py-3 bg-[#070A11] border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium font-sans"
                  />
                </div>
              </div>

              {/* Field 3: Truck Type */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-surface-400 font-mono">
                  03_FLEET_SPECIFICATION
                </label>
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#070A11] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium font-sans"
                >
                  <option value="Open">Open Body Lorry</option>
                  <option value="Container">Closed Container</option>
                  <option value="OpenBody">Trailer / Flatbed</option>
                </select>
              </div>

              {/* Field 4: Radius */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-[0.08em] text-surface-400 font-mono">
                  04_PROXIMITY_RADIUS
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full px-4 py-3 bg-[#070A11] border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium font-sans"
                >
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km (Recommended)</option>
                  <option value="100">Within 100 km</option>
                  <option value="200">Within 200 km</option>
                </select>
              </div>

              {/* Field 5: Submit Button */}
              <div className="flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
                  className="font-mono font-bold py-3 text-xs sm:text-sm shadow-glow-primary uppercase tracking-wider"
                >
                  [ EXECUTE RADIAL MATCH ]
                </Button>
              </div>
            </form>

            {/* Quick Origin Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-[11px]">
              <span className="font-mono font-bold text-surface-400 text-[10px] uppercase tracking-wider">
                QUICK ORIGIN PRESETS:
              </span>
              {quickLocations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setOrigin(loc)}
                  className="px-2.5 py-1 rounded-lg bg-[#070A11] hover:bg-white/10 text-surface-300 hover:text-white border border-white/10 font-mono text-[11px] transition-colors"
                >
                  + {loc}
                </button>
              ))}
            </div>

          </div>
        </section>

        {/* ── 5. OPERATIONAL PROCESS TIMELINE (Requirement 3: POST ➔ MATCH ➔ CONTACT ➔ BOOK ➔ TRACK Spine) ── */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <Badge variant="primary" size="sm" className="font-mono uppercase text-[10px]">
              OPERATIONAL SPINE WORKFLOW
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              5-Stage Direct Freight Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-surface-400 font-sans">
              End-to-end transparent freight execution model with zero broker intervention.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {operationalMechanism.map((m, idx) => {
              const Icon = m.icon
              return (
                <div
                  key={m.step}
                  className="bg-[#0F131D] rounded-2xl p-5 border border-white/10 flex flex-col justify-between space-y-4 hover:border-primary-500/50 transition-all relative group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-mono font-black text-primary-400">
                        {m.step}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-surface-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {m.code}
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center">
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors font-sans">
                      {m.title}
                    </h3>

                    <p className="text-xs text-surface-400 leading-relaxed font-sans">
                      {m.desc}
                    </p>
                  </div>

                  {idx < 4 && (
                    <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-primary-500 text-xs font-mono font-bold">
                      ➔
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 6. OPERATIONAL FREIGHT CORRIDORS (Requirement 4 & Solid cards) ── */}
        <section className="py-20 bg-[#0B0E17] border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
              <div>
                <Badge variant="primary" size="sm" className="mb-2 font-mono text-[10px]">
                  ACTIVE FREIGHT CORRIDORS
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  High-Volume Operational Corridors
                </h2>
              </div>

              <Link
                href="/search?type=truck"
                className="text-xs sm:text-sm font-bold text-primary-400 hover:text-primary-300 inline-flex items-center gap-1.5 group font-mono"
              >
                <span>EXPLORE ALL CORRIDORS</span>
                <ArrowRightIcon className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {liveRoutes.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#0F131D] rounded-2xl p-5 border border-white/10 flex flex-col justify-between space-y-5 hover:border-primary-500/40 transition-all group"
                >
                  <div className="space-y-4">
                    
                    {/* Emphasize Live Availability & Distance & ETA */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>{c.trucksAvailable} Trucks Avail.</span>
                      </div>

                      <span className="text-surface-400 flex items-center gap-1 font-bold">
                        <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                        {c.etaHours} HRS
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-surface-400 uppercase tracking-wider">
                        <span>HIGHWAY CORRIDOR</span>
                        <span className="font-bold text-primary-400">{c.distanceKm} KM</span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1 group-hover:text-primary-400 transition-colors font-sans">
                        {c.origin} ➔ {c.destination}
                      </h3>
                    </div>

                    {/* Commercial Rate Benchmark Telemetry Box */}
                    <div className="bg-[#070A11] p-3 rounded-xl border border-white/5 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-surface-400">Rate Benchmark:</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          ₹{c.commercialRate.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-surface-500">Rate per KM:</span>
                        <span className="text-surface-300 font-bold">₹{c.ratePerKm}/KM</span>
                      </div>
                    </div>

                    {/* Cargo Type & Truck Body */}
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-surface-400 block font-bold">CARGO TYPE</span>
                        <span className="text-xs text-surface-200 font-medium font-sans">{c.cargoType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-surface-400 block font-bold">FLEET TYPE</span>
                        <span className="text-xs text-surface-300 font-sans">{c.truckBody}</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <Link
                    href={`/search?type=truck&location=${encodeURIComponent(c.origin)}`}
                    className="w-full text-center text-xs font-mono font-bold text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 py-2.5 rounded-xl border border-primary-500/20 transition-colors block uppercase tracking-wider"
                  >
                    Match Freight on Route ➔
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. TRACKING CONTROL TOWER (Requirement 5 & Selective Glass #3) ── */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Feature Context */}
            <div className="lg:col-span-5 space-y-5">
              <Badge variant="info" size="sm" className="font-mono text-[10px] uppercase">
                SIGNATURE PRODUCT FEATURE
              </Badge>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Transit Intelligence & Checkpoint Telemetry
              </h2>

              <p className="text-xs sm:text-sm text-surface-300 leading-relaxed font-sans">
                Monitor active freight along national highway toll gates in real time. Automated FASTag checkpoint logging, digital bill of lading, and instant POD balance alerts.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-xs text-surface-300">
                  <CheckBadgeIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-sans">Highway toll gate FASTag checkpoint tracking</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-surface-300">
                  <CheckBadgeIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-sans">Automated 50/50 advance & digital POD payout alerts</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-surface-300">
                  <CheckBadgeIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-sans">Vahan & E-Way Bill verified transport compliance</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => router.push('/tracking')}
                  leftIcon={<SparklesIcon className="w-4 h-4 shrink-0 text-primary-400" />}
                  className="font-mono font-bold text-xs sm:text-sm border-white/10"
                >
                  [ OPEN CONTROL TOWER DEMO ]
                </Button>
              </div>
            </div>

            {/* Right Column: Interactive Command Control Tower Panel (Selective Glass #3) */}
            <div className="lg:col-span-7">
              <div className="bg-[#0F131D]/90 backdrop-blur-xl rounded-[24px] border border-white/15 p-6 shadow-modal space-y-5">
                
                {/* Control Tower Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-surface-400 tracking-wider font-bold">
                      ACTIVE SHIPMENT TELEMETRY
                    </span>
                    <h3 className="text-base font-mono font-bold text-white mt-0.5">
                      BOOKING #BK-88492 <span className="text-primary-400 text-xs font-normal">(IN TRANSIT)</span>
                    </h3>
                  </div>
                  <Badge variant="success" size="sm" className="font-mono text-[10px] font-bold">
                    ON SCHEDULE
                  </Badge>
                </div>

                {/* Live Progress Bar & Route Telemetry */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-surface-300 font-bold">Kolkata Port ➔ Delhi NCR</span>
                    <span className="text-emerald-400 font-black">820 / 1,420 KM (57%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#070A11] border border-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-emerald-400 w-[57%] rounded-full shadow-glow-primary" />
                  </div>
                </div>

                {/* Checkpoint Milestone Flow */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase text-surface-400 tracking-wider font-bold block">
                    CHECKPOINT TIMELINE LOGS:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    
                    <div className="bg-[#070A11] p-2.5 rounded-xl border border-emerald-500/30">
                      <span className="text-[9px] text-emerald-400 block font-bold">01. ORIGIN</span>
                      <span className="font-bold text-white truncate block">Kolkata Port</span>
                      <span className="text-[9px] text-surface-400 block mt-0.5">06:10 IST</span>
                    </div>

                    <div className="bg-[#070A11] p-2.5 rounded-xl border border-primary-500/40">
                      <span className="text-[9px] text-primary-400 block font-bold">02. CHECKPOINT</span>
                      <span className="font-bold text-white truncate block">Ambala Toll</span>
                      <span className="text-[9px] text-emerald-400 block mt-0.5">14:20 IST</span>
                    </div>

                    <div className="bg-[#070A11] p-2.5 rounded-xl border border-white/5">
                      <span className="text-[9px] text-surface-400 block font-bold">03. NEXT GATE</span>
                      <span className="font-bold text-surface-300 truncate block">Ludhiana Bypass</span>
                      <span className="text-[9px] text-surface-400 block mt-0.5">ETA: 2.5 Hrs</span>
                    </div>

                    <div className="bg-[#070A11] p-2.5 rounded-xl border border-white/5">
                      <span className="text-[9px] text-surface-400 block font-bold">04. DESTINATION</span>
                      <span className="font-bold text-surface-300 truncate block">Delhi NCR</span>
                      <span className="text-[9px] text-surface-400 block mt-0.5">ETA: 6.0 Hrs</span>
                    </div>

                  </div>
                </div>

                {/* Telematics Readout Box */}
                <div className="bg-[#070A11] p-3 rounded-xl border border-white/5 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-surface-400">FASTag Toll Gate Scan:</span>
                    <span className="text-emerald-400 font-bold">CONFIRMED (VERIFIED)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-surface-400">Commercial State:</span>
                    <span className="text-primary-400 font-bold">50% Advance Paid (₹26,000)</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ── 8. DIRECT MARKETPLACE VS TRADITIONAL BROKER COMPARISON TABLE (Solid Background) ── */}
        <section className="py-20 bg-[#0B0E17] border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
              <Badge variant="warning" size="sm" className="font-mono text-[10px] uppercase">
                COMMERCIAL COMPARISON
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Direct Marketplace vs Broker Model
              </h2>
            </div>

            {/* Solid Table Container per Rule #7 */}
            <div className="bg-[#0F131D] rounded-[20px] border border-white/15 overflow-hidden shadow-modal">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#070A11] text-surface-400 uppercase tracking-[0.06em] font-semibold font-mono text-[11px] border-b border-white/10">
                    <tr>
                      <th className="p-4 sm:p-5">Operational Parameter</th>
                      <th className="p-4 sm:p-5 text-emerald-400">LorryCarry Direct</th>
                      <th className="p-4 sm:p-5 text-surface-400">Traditional Broker</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {comparisons.map((row) => (
                      <tr key={row.parameter} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 sm:p-5 font-bold text-white">
                          {row.parameter}
                        </td>
                        <td className="p-4 sm:p-5 font-bold text-emerald-400 font-mono">
                          ✓ {row.lorryCarry}
                        </td>
                        <td className="p-4 sm:p-5 text-surface-400">
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

        {/* ── 9. RESTRAINED AMBIENT GLOW + GLASS CTA PANEL (Requirement 8 & Selective Glass #4) ── */}
        <section className="relative py-20 bg-[#070A11] overflow-hidden">
          {/* Restrained Orange Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-r from-primary-500/15 via-orange-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Glass CTA Panel */}
            <div className="bg-[#0F131D]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-14 shadow-modal text-center space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-xs font-mono font-bold text-primary-400 uppercase tracking-wider">
                <span>START DIRECT FREIGHT OPERATIONS TODAY</span>
              </div>

              {/* Requirement 8 Exact Text */}
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight font-sans">
                Eliminate Middlemen. Connect Directly.
              </h2>

              <p className="text-xs sm:text-sm text-surface-300 max-w-xl mx-auto leading-relaxed font-sans">
                Join thousands of Vahan-verified lorry owners and industrial cargo shippers across India. Zero commission, 50km radial matching, and transparent terms.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => router.push('/post-load')}
                  className="font-bold px-8 py-3.5 text-xs sm:text-sm shadow-glow-primary hover:scale-[1.02] transition-transform"
                >
                  Post a Freight Load
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => router.push('/login?redirect=/dashboard/truck-owner')}
                  className="font-bold px-8 py-3.5 text-xs sm:text-sm border-white/10 hover:border-white/30"
                >
                  Register Your Lorry
                </Button>
              </div>

            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
