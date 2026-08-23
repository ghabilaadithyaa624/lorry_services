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
  Signal,
  Sparkles,
  FileText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  IndianRupee,
  ChevronDown,
  MessageSquareQuote,
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

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

  // Testimonial Placeholders — replace with real customer testimonials once available
  const testimonials = [
    {
      quote: 'Placeholder — replace with real customer quote about direct fleet access and zero brokerage experience.',
      name: 'Placeholder Name',
      role: 'Fleet Manager',
      company: 'Placeholder Company',
    },
    {
      quote: 'Placeholder — replace with real customer quote about Vahan-verified trucks and checkpoint tracking transparency.',
      name: 'Placeholder Name',
      role: 'Logistics Head',
      company: 'Placeholder Company',
    },
    {
      quote: 'Placeholder — replace with real customer quote about 50km proximity matching and direct driver connect.',
      name: 'Placeholder Name',
      role: 'Transport Owner',
      company: 'Placeholder Company',
    },
  ]

  const faqItems = [
    {
      question: 'How is payment handled on LorryCarry?',
      answer:
        'LorryCarry follows a standard 50% advance at loading and 50% balance on POD (Proof of Delivery) confirmation. All payment is settled directly between shipper and transporter — money moves outside the app.',
    },
    {
      question: 'How are trucks verified on the platform?',
      answer:
        'Every truck is verified through the government Vahan database, including RC (Registration Certificate) authentication, insurance validation, and owner identity checks before appearing in search results.',
    },
    {
      question: 'When do I get contact details for a matched truck?',
      answer:
        'Driver phone and WhatsApp contact details are unlocked through an active LorryCarry subscription plan. Once subscribed, you get direct access to verified transporter credentials on every match.',
    },
    {
      question: 'Can I track my shipment after booking?',
      answer:
        'Yes — LorryCarry provides checkpoint-based milestone tracking using highway toll gate (FASTag) logs. This is not continuous live GPS; it gives you verified transit progress at major toll checkpoints along the route.',
    },
    {
      question: 'What does "50km proximity matching" mean?',
      answer:
        'Our matching engine finds Vahan-verified trucks currently located within a 50km radius of your loading point, so you connect with the nearest available fleet rather than distant trucks that add deadhead cost.',
    },
    {
      question: 'Is there any broker commission or platform fee per trip?',
      answer:
        'There is zero per-trip broker commission. LorryCarry is a direct marketplace — shippers and truck owners negotiate and settle freight charges directly between themselves.',
    },
  ]

  return (
    <div className="min-h-screen bg-[#070A11] text-surface-100 flex flex-col font-sans selection:bg-primary-500 selection:text-white">
      <Navbar />

      <main className="flex-1 overflow-x-hidden">
        {/* ── SECTION 1: ENTERPRISE HERO ── */}
        <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-24 border-b border-white/10 overflow-hidden bg-[#070A11]">
          {/* Subtle Ambient Warm Glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-primary-500/15 via-primary-950/20 to-transparent rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: Hero Value Proposition */}
              <div className="lg:col-span-5 space-y-6 text-left">
                {/* Enterprise Badge */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-xs font-mono font-bold text-primary-400 shadow-glow-sm">
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-ping" />
                  <span>DIRECT FREIGHT DISPATCH PLATFORM</span>
                </div>

                {/* Requirement Headline */}
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.08] font-sans">
                  INDIA&apos;S LIVE <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-primary-500 to-amber-400">
                    FREIGHT OPERATING NETWORK
                  </span>
                </h1>

                {/* Requirement Subheading */}
                <p className="text-xs sm:text-sm text-surface-300 max-w-xl leading-relaxed font-sans">
                  Direct freight dispatch connecting shippers with verified carriers across India&apos;s major freight corridors within a 50km loading radius.
                </p>

                {/* Hero CTAs */}
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => router.push('/post-load')}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:outline-none cursor-pointer uppercase tracking-wider border border-primary-400/30"
                  >
                    <Truck className="w-4 h-4 shrink-0" />
                    <span>POST FREIGHT LOAD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/search?type=truck')}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-surface-900/80 hover:bg-surface-800 border border-white/10 hover:border-white/20 text-white text-xs sm:text-sm font-bold transition-all shadow-card focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer uppercase tracking-wider"
                  >
                    <Search className="w-4 h-4 shrink-0 text-primary-400" />
                    <span>EXPLORE VERIFIED FLEET</span>
                  </button>
                </div>

                {/* Hero Proof Metrics */}
                <div className="pt-6 grid grid-cols-3 gap-3 border-t border-white/10">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                      VERIFIED FLEET
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-white">2,480+</span>
                    <span className="text-[10px] text-surface-400 block font-sans">Vahan Authenticated</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                      PROXIMITY MATCH
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-primary-400">50 KM</span>
                    <span className="text-[10px] text-surface-400 block font-sans">Loading Radius</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                      BROKER MARGIN
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-emerald-400">₹0</span>
                    <span className="text-[10px] text-surface-400 block font-sans">100% Direct Deal</span>
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
        <section className="bg-[#0B0F19]/80 backdrop-blur-md border-b border-white/10 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {capabilityRail.map((item) => (
                <div
                  key={item.label}
                  className="bg-[#0F131D]/80 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center space-y-1 shadow-card"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                    {item.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-white block">
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 2: LIVE FREIGHT NETWORK ── */}
        <section id="live-network" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0F131D] rounded-[20px] border border-white/10 p-6 sm:p-8 shadow-modal space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-5 gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 text-[10px] font-mono font-bold uppercase mb-2">
                  SECTION 02 — LIVE FREIGHT NETWORK
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
                  Live Freight Matching Engine
                </h2>
                <p className="text-xs sm:text-sm text-surface-300 font-sans mt-1">
                  Real-time availability, distance, ETA, proximity, and rate benchmarks across primary Indian highways.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-glow-sm" />
                <span className="text-xs font-mono text-emerald-300 font-bold bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  REAL-TIME DISPATCH ONLINE
                </span>
              </div>
            </div>

            {/* Route Selector Command Tabs */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                SELECT OPERATIONAL FREIGHT CORRIDOR:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                {liveRoutes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRouteId(r.id)}
                    className={cn(
                      'px-4 py-2.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
                      activeRouteId === r.id
                        ? 'bg-primary-500 text-white shadow-glow-primary'
                        : 'bg-surface-950/80 border border-white/10 text-surface-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {r.origin} ➔ {r.destination}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Route Enterprise Product Preview Box */}
            <div className="bg-surface-950/80 rounded-2xl p-5 border border-white/5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                    ACTIVE FREIGHT ROUTE
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white mt-0.5 font-sans">
                    {currentRoute.route}
                  </h3>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold shrink-0 self-start sm:self-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{currentRoute.trucksAvailable} LORRIES AVAILABLE (50KM)</span>
                </div>
              </div>

              {/* Operational Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#0F131D]/90 p-4 rounded-xl border border-white/10 shadow-card">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                    DISTANCE
                  </span>
                  <span className="text-base sm:text-lg font-mono font-black text-white">
                    {currentRoute.distanceKm} KM
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                    ESTIMATED ETA
                  </span>
                  <span className="text-base sm:text-lg font-mono font-black text-white">
                    {currentRoute.etaHours} HRS
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                    PROXIMITY
                  </span>
                  <span className="text-base sm:text-lg font-mono font-black text-primary-400">
                    &lt; {currentRoute.proximityKm} KM
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                    RATE BENCHMARK
                  </span>
                  <div className="flex flex-col">
                    <span className="text-base sm:text-lg font-mono font-black text-emerald-400">
                      ₹{currentRoute.commercialRate.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-mono text-surface-400 font-bold">
                      ₹{currentRoute.ratePerKm}/KM
                    </span>
                  </div>
                </div>
              </div>

              {/* Cargo & Body Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-surface-300 pt-1 border-t border-white/5 font-sans">
                <div className="flex items-center gap-2">
                  <span className="text-surface-400 font-sans text-[11px] uppercase font-semibold">Fleet Type:</span>
                  <span className="font-semibold text-white truncate">{currentRoute.truckBody}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-surface-400 font-sans text-[11px] uppercase font-semibold">Cargo Profile:</span>
                  <span className="font-semibold text-white truncate">{currentRoute.cargoType}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href={`/search?type=truck&location=${encodeURIComponent(currentRoute.origin)}`}
                  className="w-full sm:flex-1 text-center text-xs sm:text-sm font-bold text-surface-200 bg-surface-900/80 hover:bg-surface-800 border border-white/10 hover:border-white/20 py-3 rounded-xl transition-colors shadow-card flex items-center justify-center gap-2 cursor-pointer font-sans focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none"
                >
                  <Sparkles className="w-4 h-4 text-primary-400" />
                  <span>See Live Corridors</span>
                </Link>

                <Link
                  href={`/search?type=truck&location=${encodeURIComponent(currentRoute.origin)}`}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-mono font-bold transition-all shadow-glow-primary flex items-center justify-center gap-2 uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none border border-primary-400/30"
                >
                  <span>View Matches</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Live Ticker Bar */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-surface-400 bg-surface-950/60 px-4 py-2.5 rounded-xl border border-white/5">
              <RefreshCw className="w-3.5 h-3.5 text-primary-400 shrink-0 animate-spin" />
              <span className="truncate">
                Matched {currentRoute.lastMatched}: <strong className="text-white">{currentRoute.truckBody}</strong> on {currentRoute.origin} ➔ {currentRoute.destination} (<strong className="text-emerald-400 font-bold">₹0 Brokerage</strong>)
              </span>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: HOW LORRYCARRY WORKS ── */}
        <section id="solutions" className="py-24 bg-[#070A11] border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 font-mono uppercase text-[10px] font-bold">
                SECTION 03 — HOW THE NETWORK WORKS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                5-Stage Enterprise Workflow
              </h2>
              <p className="text-xs sm:text-sm text-surface-400 font-sans">
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
                    className="bg-[#0F131D] rounded-[20px] p-6 border border-white/10 flex flex-col justify-between space-y-5 hover:border-primary-500/40 shadow-modal transition-all relative group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-mono font-black text-primary-400">
                          {m.step}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-surface-400 bg-surface-950 px-2.5 py-1 rounded border border-white/5">
                          {m.code}
                        </span>
                      </div>

                      <div className="w-11 h-11 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center">
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
                      <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-primary-400 text-xs font-mono font-bold">
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
          <div className="bg-[#0F131D] rounded-[20px] border border-white/10 shadow-modal p-6 sm:p-8 space-y-6">
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-5 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-mono text-xs font-bold">
                  SYS
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                    SECTION 04 — SEARCH COMMAND PANEL
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-white font-mono tracking-tight">
                    SEARCH VERIFIED FLEET PREVIEW
                  </h2>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center bg-surface-950 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setSearchTab('trucks')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
                    searchTab === 'trucks'
                      ? 'bg-primary-500 text-white shadow-glow-primary'
                      : 'text-surface-400 hover:text-white'
                  )}
                >
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>FLEET DISCOVERY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchTab('loads')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none',
                    searchTab === 'loads'
                      ? 'bg-primary-500 text-white shadow-glow-primary'
                      : 'text-surface-400 hover:text-white'
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
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-surface-400 font-sans">
                  ORIGIN LOCATION
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-primary-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Pune, Delhi NCR"
                    className="w-full pl-10 pr-4 py-3 bg-surface-950/90 border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium font-sans"
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-surface-400 font-sans">
                  DESTINATION NODE
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-surface-500 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Bengaluru, JNPT Port"
                    className="w-full pl-10 pr-4 py-3 bg-surface-950/90 border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium font-sans"
                  />
                </div>
              </div>

              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-surface-400 font-sans">
                  VEHICLE TYPE
                </label>
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-950/90 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium font-sans"
                >
                  <option value="Open">Open Body Lorry</option>
                  <option value="Container">Closed Container</option>
                  <option value="OpenBody">Trailer / Flatbed</option>
                </select>
              </div>

              {/* Radius */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-surface-400 font-sans">
                  PROXIMITY RADIUS
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-950/90 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium font-sans"
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
                  className="w-full inline-flex items-center justify-center gap-2 font-mono font-bold py-3 text-xs sm:text-sm bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl shadow-glow-primary uppercase tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer border border-primary-400/30"
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span>SEARCH FLEET</span>
                </button>
              </div>
            </form>

            {/* Quick Origin Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-[11px]">
              <span className="font-semibold uppercase tracking-wider text-surface-400 text-[10px] font-sans">
                QUICK ORIGIN PRESETS:
              </span>
              {quickLocations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setOrigin(loc)}
                  className="px-3 py-1 rounded-lg bg-surface-950 hover:bg-surface-900 text-surface-300 hover:text-white border border-white/10 font-mono text-[11px] transition-colors cursor-pointer"
                >
                  + {loc}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: ACTIVE FREIGHT CORRIDORS ── */}
        <section id="active-corridors" className="py-24 bg-[#070A11] border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 font-mono text-[10px] uppercase font-bold mb-2">
                  SECTION 05 — ACTIVE FREIGHT CORRIDORS
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                  High-Volume Operational Corridors
                </h2>
              </div>

              <Link
                href="/search?type=truck"
                className="text-xs sm:text-sm font-bold text-primary-400 hover:text-primary-300 inline-flex items-center gap-1.5 group font-mono"
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
                  className="bg-[#0F131D] rounded-[20px] p-6 border border-white/10 flex flex-col justify-between space-y-6 shadow-modal hover:border-primary-500/30 transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>{c.trucksAvailable} Trucks Avail.</span>
                      </div>

                      <span className="text-surface-400 flex items-center gap-1 font-bold">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {c.etaHours} HRS
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-surface-400 font-sans">
                        <span>HIGHWAY CORRIDOR</span>
                        <span className="font-bold text-primary-400 font-mono">{c.distanceKm} KM</span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1 group-hover:text-primary-400 transition-colors font-sans">
                        {c.origin} ➔ {c.destination}
                      </h3>
                    </div>

                    {/* Rate Telemetry Box */}
                    <div className="bg-surface-950/80 p-3.5 rounded-xl border border-white/5 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-surface-400">Rate Benchmark:</span>
                        <span className="font-bold text-white text-sm">
                          ₹{c.commercialRate.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-surface-500">Rate per KM:</span>
                        <span className="text-primary-400 font-bold">₹{c.ratePerKm}/KM</span>
                      </div>
                    </div>

                    {/* Specs */}
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 font-sans block">
                          CARGO TYPE
                        </span>
                        <span className="text-xs text-surface-300 font-medium font-sans">{c.cargoType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 font-sans block">
                          FLEET TYPE
                        </span>
                        <span className="text-xs text-surface-400 font-sans">{c.truckBody}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/search?type=truck&location=${encodeURIComponent(c.origin)}`}
                    className="w-full text-center text-xs font-mono font-bold text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 py-3 rounded-xl border border-primary-500/30 transition-colors block uppercase tracking-wider shadow-card"
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
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 font-mono text-[10px] uppercase font-bold">
                SECTION 06 — SIGNATURE PRODUCT FEATURE
              </span>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-sans">
                Transit Intelligence & Checkpoint Telemetry
              </h2>

              <p className="text-xs sm:text-sm text-surface-300 leading-relaxed font-sans">
                LorryCarry provides operational visibility after booking. Monitor active freight along national highway toll gates with FASTag checkpoint logs, digital bill of lading, and instant POD balance alerts.
              </p>

              <div className="space-y-3 pt-2 font-sans">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-surface-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Highway toll gate FASTag checkpoint logging</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-surface-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Automated 50% advance / 50% digital POD payout alerts</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-surface-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Vahan & E-Way Bill verified transport compliance</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => router.push('/tracking')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-900/80 hover:bg-surface-800 border border-white/10 hover:border-white/20 text-white font-mono font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors shadow-card focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-primary-400" />
                  <span>OPEN CONTROL TOWER DEMO</span>
                </button>
              </div>
            </div>

            {/* Static Telemetry UI Preview Panel */}
            <div className="lg:col-span-7">
              <div className="bg-[#0F131D] rounded-[20px] border border-white/10 p-6 sm:p-8 shadow-modal space-y-6">
                {/* Control Tower Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                      ACTIVE SHIPMENT TELEMETRY
                    </span>
                    <h3 className="text-base font-mono font-bold text-white mt-0.5">
                      BOOKING #BK-88492 <span className="text-primary-400 text-xs font-normal">(IN TRANSIT)</span>
                    </h3>
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                    ON SCHEDULE
                  </span>
                </div>

                {/* Progress Bar & Route */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white font-bold">Kolkata Port ➔ Delhi NCR</span>
                    <span className="text-emerald-400 font-black">820 / 1,420 KM (57%)</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-surface-950 border border-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 w-[57%] rounded-full shadow-glow-primary" />
                  </div>
                </div>

                {/* Checkpoint Milestone Logs */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block font-sans">
                    CHECKPOINT TIMELINE LOGS:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                    <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30">
                      <span className="text-[9px] text-emerald-400 block font-bold">01. ORIGIN</span>
                      <span className="font-bold text-white truncate block">Kolkata Port</span>
                      <span className="text-[9px] text-surface-400 block mt-0.5">06:10 IST</span>
                    </div>

                    <div className="bg-primary-950/40 p-3 rounded-xl border border-primary-500/30">
                      <span className="text-[9px] text-primary-400 block font-bold">02. CHECKPOINT</span>
                      <span className="font-bold text-white truncate block">Ambala Toll</span>
                      <span className="text-[9px] text-emerald-400 block mt-0.5 font-bold">14:20 IST</span>
                    </div>

                    <div className="bg-surface-950 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] text-surface-500 block font-bold">03. NEXT GATE</span>
                      <span className="font-bold text-surface-300 truncate block">Ludhiana Bypass</span>
                      <span className="text-[9px] text-surface-500 block mt-0.5">ETA: 2.5 Hrs</span>
                    </div>

                    <div className="bg-surface-950 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] text-surface-500 block font-bold">04. DESTINATION</span>
                      <span className="font-bold text-surface-300 truncate block">Delhi NCR</span>
                      <span className="text-[9px] text-surface-500 block mt-0.5">ETA: 6.0 Hrs</span>
                    </div>
                  </div>
                </div>

                {/* Status Box */}
                <div className="bg-surface-950/80 p-4 rounded-xl border border-white/5 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-surface-400">FASTag Toll Gate Scan:</span>
                    <span className="text-emerald-400 font-bold">CONFIRMED (VERIFIED)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-surface-400">Commercial Payout State:</span>
                    <span className="text-primary-400 font-bold">50% Advance Paid (₹26,000)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-surface-400">POD Payout Balance:</span>
                    <span className="text-surface-300 font-bold">50% Due on Unloading Confirmation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 7: COMMERCIAL TRANSPARENCY (DIRECT VS BROKER) ── */}
        <section id="comparison" className="py-24 bg-[#070A11] border-t border-white/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono text-[10px] uppercase font-bold">
                SECTION 07 — COMMERCIAL TRANSPARENCY
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                Direct Marketplace vs Traditional Broker
              </h2>
              <p className="text-xs sm:text-sm text-surface-400 font-sans">
                Executive operational comparison between LorryCarry direct network and legacy freight brokers.
              </p>
            </div>

            {/* Executive Comparison Grid */}
            <div className="bg-[#0F131D] rounded-[20px] border border-white/10 overflow-hidden shadow-modal">
              {/* Header Row */}
              <div className="grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[2fr_1.5fr_1.5fr] bg-surface-950/80 border-b border-white/10 px-5 py-4 gap-4">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400 font-mono">
                  Operational Parameter
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-400 font-mono text-center">
                  LorryCarry Direct
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-500 font-mono text-center">
                  Traditional Broker
                </span>
              </div>

              {/* Comparison Rows */}
              {comparisons.map((row, idx) => (
                <div
                  key={row.parameter}
                  className={cn(
                    'grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[2fr_1.5fr_1.5fr] px-5 py-5 gap-4 items-start transition-colors hover:bg-white/5',
                    idx < comparisons.length - 1 && 'border-b border-white/5'
                  )}
                >
                  {/* Parameter Name */}
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-white font-sans">
                      {row.parameter}
                    </span>
                  </div>

                  {/* LorryCarry — emerald check */}
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-[11px] sm:text-xs text-emerald-300 font-medium font-sans leading-snug">
                      {row.lorryCarry}
                    </span>
                  </div>

                  {/* Traditional — gray cross */}
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <XCircle className="w-5 h-5 text-surface-600 shrink-0" />
                    <span className="text-[11px] sm:text-xs text-surface-400 font-sans leading-snug">
                      {row.traditional}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 7B: TESTIMONIALS ── */}
        <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 font-mono text-[10px] uppercase font-bold">
                WHAT OPERATORS SAY
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                Trusted by Freight Operators
              </h2>
              <p className="text-xs sm:text-sm text-surface-400 font-sans">
                Hear from shippers and transport owners who use LorryCarry&apos;s direct freight network.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, idx) => (
                <div
                  key={idx}
                  className="bg-[#0F131D] rounded-[20px] border border-white/10 p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-modal hover:border-primary-500/30 transition-all"
                >
                  <div className="space-y-4">
                    <MessageSquareQuote className="w-8 h-8 text-primary-400/60" />
                    <p className="text-sm text-surface-300 leading-relaxed font-sans italic">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                    {/* Avatar Placeholder */}
                    <div className="w-10 h-10 rounded-full bg-surface-950 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-surface-400 shrink-0">
                      {t.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 block font-sans">
                        OPERATOR
                      </span>
                      <span className="text-xs font-bold text-white font-sans block">
                        {t.name}
                      </span>
                      <span className="text-[11px] text-surface-400 font-sans">
                        {t.role}, {t.company}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 7C: FAQ ACCORDION ── */}
        <section className="py-24 bg-[#070A11] border-y border-white/10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 font-mono text-[10px] uppercase font-bold">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                How LorryCarry Works
              </h2>
              <p className="text-xs sm:text-sm text-surface-400 font-sans">
                Common questions about the platform, verification, payments, and tracking.
              </p>
            </div>

            <div className="space-y-3">
              {faqItems.map((faq, idx) => {
                const isOpen = openFaqIndex === idx
                return (
                  <div
                    key={idx}
                    className="bg-[#0F131D] rounded-[20px] border border-white/10 shadow-modal overflow-hidden transition-all hover:border-white/20"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none"
                    >
                      <span className="text-sm sm:text-base font-bold text-white font-sans">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={cn(
                          'w-5 h-5 text-primary-400 shrink-0 transition-transform duration-200',
                          isOpen && 'rotate-180'
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        'grid transition-all duration-200 ease-in-out',
                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="px-6 pb-5 pt-0">
                          <p className="text-xs sm:text-sm text-surface-300 leading-relaxed font-sans">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── SECTION 8: FINAL CTA ── */}
        <section className="relative py-24 bg-[#070A11] overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Dark Glass Premium Surface Panel */}
            <div className="bg-gradient-to-b from-[#0F131D] to-surface-950 border border-white/15 rounded-3xl p-8 sm:p-14 shadow-modal text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/30 text-xs font-mono font-bold text-primary-300 uppercase tracking-wider shadow-glow-sm">
                <span>START DIRECT FREIGHT OPERATIONS TODAY</span>
              </div>

              {/* Requirement Headline */}
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight font-sans uppercase">
                ELIMINATE MIDDLEMEN.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-amber-400">
                  CONNECT DIRECTLY.
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-surface-300 max-w-xl mx-auto leading-relaxed font-sans">
                Join thousands of Vahan-verified lorry owners and industrial cargo shippers moving freight across India. Zero commission, 50km radial matching, and transparent terms.
              </p>

              {/* Requirement Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/post-load')}
                  className="font-bold px-8 py-4 text-xs sm:text-sm bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl shadow-glow-primary uppercase tracking-wider font-mono transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer border border-primary-400/30"
                >
                  POST FREIGHT LOAD
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/login?redirect=/dashboard/truck-owner')}
                  className="font-bold px-8 py-4 text-xs sm:text-sm bg-surface-900/80 hover:bg-surface-800 border border-white/10 text-white rounded-xl shadow-card uppercase tracking-wider font-mono transition-all focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer"
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
