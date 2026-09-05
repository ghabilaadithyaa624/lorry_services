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
  CheckCircle2,
  XCircle,
  IndianRupee,
  ChevronDown,
} from 'lucide-react'
import { Navbar, Footer } from '@/components/layout'
import HeroSection from '@/components/HeroSection'
import { StructuredData } from '@/components/seo/StructuredData'
import { getFaqStructuredData, getBreadcrumbStructuredData } from '@/lib/seo/structuredData'
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

  // Reference freight corridors — static directory entries with indicative
  // rates only. No fabricated availability, match recency or contact data.
  const referenceCorridors = [
    {
      id: 'delhi-mumbai',
      corridorCode: 'DEL → BOM',
      origin: 'Delhi NCR',
      destination: 'Mumbai (JNPT)',
      distanceKm: 1420,
      etaHours: 38,
      indicativeRate: 52000,
      ratePerKm: 36.6,
      cargoType: 'Industrial Goods & FMCG',
      truckBody: '32ft Multi-Axle Container',
    },
    {
      id: 'chennai-bengaluru',
      corridorCode: 'MAA → BLR',
      origin: 'Chennai',
      destination: 'Bengaluru ICD',
      distanceKm: 345,
      etaHours: 10,
      indicativeRate: 18500,
      ratePerKm: 53.6,
      cargoType: 'Electronics & Auto Components',
      truckBody: '24ft Open Body Lorry',
    },
    {
      id: 'ahmedabad-mumbai',
      corridorCode: 'AMD → BOM',
      origin: 'Ahmedabad',
      destination: 'Mumbai (JNPT)',
      distanceKm: 525,
      etaHours: 14,
      indicativeRate: 24000,
      ratePerKm: 45.7,
      cargoType: 'Chemicals & Plastics',
      truckBody: '20ft Closed Body Trailer',
    },
    {
      id: 'hyderabad-chennai',
      corridorCode: 'HYD → MAA',
      origin: 'Hyderabad',
      destination: 'Chennai Port',
      distanceKm: 630,
      etaHours: 16,
      indicativeRate: 29500,
      ratePerKm: 46.8,
      cargoType: 'Pharma & Machinery',
      truckBody: '32ft High-Cube Container',
    },
  ]

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

  // Operational Benefits — factual platform capabilities only (no customer claims/metrics)
  const operationalBenefits = [
    {
      code: 'MATCHING',
      metric: '\u2264 50 KM',
      title: 'Geospatial Proximity Matching',
      desc: 'PostGIS-powered discovery within a customizable search radius, ranked by a deterministic 100-point compatibility score across capacity fit, body type, proximity, and verification.',
      icon: MapPin,
    },
    {
      code: 'VERIFICATION',
      metric: 'VAHAN RC',
      title: 'Government Database Verification',
      desc: 'Truck registration certificates are validated against the Vahan database with masked owner PII, insurance validity, fitness, and FASTag readiness surfaced on every listing.',
      icon: CheckCircle2,
    },
    {
      code: 'COMMERCIALS',
      metric: '50 / 50',
      title: 'Zero Brokerage Commercial Terms',
      desc: 'Standardised 50% advance at loading and 50% balance on POD confirmation, settled directly between shipper and transporter with no commission taken by the platform.',
      icon: IndianRupee,
    },
    {
      code: 'TRACKING',
      metric: '5 STAGE',
      title: 'Checkpoint Trip Telemetry',
      desc: 'Geofenced checkpoint trail with milestone crossing logs, ETA recalculation, incident reporting, and Proof of Delivery image submission.',
      icon: Signal,
    },
    {
      code: 'DOCUMENTS',
      metric: '7 STAGE',
      title: 'Digital Document Chain',
      desc: 'Booking, E-Way Bill, loading, transit, delivery, POD, and balance documents stored via private pre-signed upload and download URLs with admin verification.',
      icon: FileText,
    },
    {
      code: 'BACKHAUL',
      metric: '\u2264 300 KM',
      title: 'Return Load Radar',
      desc: 'Backhaul discovery resolves drop-off hubs from active bookings, truck GPS, or preferred corridors and ranks open return loads by deadhead distance and payload fit.',
      icon: Truck,
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
        'There is zero per-trip broker commission. LorryCarry is a direct marketplace — shippers and truck drivers negotiate and settle freight charges directly between themselves.',
    },
  ]

  // Structured data for SEO — FAQ and Breadcrumbs (rendered as JSON-LD for rich results)
  const faqStructuredData = getFaqStructuredData(faqItems)
  const breadcrumbStructuredData = getBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Search Trucks', url: '/search?type=truck' },
    { name: 'Search Loads', url: '/search?type=load' },
  ])

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* JSON-LD Structured Data for freight services — helps search engines surface rich results */}
      <StructuredData data={faqStructuredData} id="faq-ld" />
      <StructuredData data={breadcrumbStructuredData} id="breadcrumb-ld" />
      <Navbar />

      <main className="flex-1 overflow-x-hidden">
        {/* ── SECTION 1: HERO SECTION ── */}
        <HeroSection />

        {/* ── CAPABILITY TELEMETRY RAIL ── */}
        <section className="bg-white border-b border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {capabilityRail.map((item) => (
                <div
                  key={item.label}
                  className="bg-slate-50 p-3.5 rounded-2xl border border-gray-200 text-center space-y-1 shadow-2xs"
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

        {/* ── SECTION 2: HOW LORRYCARRY WORKS (5-STAGE ENTERPRISE WORKFLOW) ── */}
        <section id="solutions" className="py-20 bg-slate-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-mono uppercase text-[10px] font-bold">
                ENTERPRISE OPERATIONAL WORKFLOW
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight font-sans">
                5-Stage Direct Freight Workflow
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 font-sans">
                Streamlined direct freight dispatch pipeline connecting shippers with Vahan-verified fleet owners.
              </p>
            </div>

            {/* 5-Stage Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5 relative">
              {operationalWorkflow.map((m, idx) => {
                const Icon = m.icon
                return (
                  <div
                    key={m.step}
                    className="bg-white rounded-2xl p-6 border border-gray-200 flex flex-col justify-between space-y-5 hover:border-orange-300 shadow-sm hover:shadow-md transition-all relative group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-mono font-black text-orange-600">
                          {m.step}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-slate-100 px-2 py-0.5 rounded border border-gray-200">
                          {m.code}
                        </span>
                      </div>

                      <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
                        <Icon className="w-5 h-5 stroke-[2]" />
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors font-sans">
                        {m.title}
                      </h3>

                      <p className="text-xs text-gray-600 leading-relaxed font-sans">
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

        {/* ── SECTION 3: FREIGHT SEARCH COMMAND PANEL ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-gray-200 pb-5 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-mono text-xs font-bold">
                  SYS
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block font-sans">
                    SEARCH COMMAND PANEL
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
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 font-sans">
                  ORIGIN LOCATION
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Pune, Delhi NCR"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 text-xs sm:text-sm font-medium font-sans"
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 font-sans">
                  DESTINATION NODE
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Bengaluru, JNPT Port"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 text-xs sm:text-sm font-medium font-sans"
                  />
                </div>
              </div>

              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 font-sans">
                  VEHICLE TYPE
                </label>
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50/80 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 text-xs sm:text-sm font-medium font-sans"
                >
                  <option value="Open">Open Body Lorry</option>
                  <option value="Container">Closed Container</option>
                  <option value="OpenBody">Trailer / Flatbed</option>
                </select>
              </div>

              {/* Radius */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 font-sans">
                  PROXIMITY RADIUS
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50/80 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 text-xs sm:text-sm font-medium font-sans"
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
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-700 border border-gray-200 font-mono text-[11px] transition-colors cursor-pointer"
                >
                  + {loc}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: REFERENCE FREIGHT CORRIDORS ── */}
        <section id="active-corridors" className="py-20 bg-slate-50 border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-mono text-[10px] uppercase font-bold mb-2">
                  HIGHWAY CORRIDOR DIRECTORY
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight font-sans">
                  Popular Freight Corridors
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 font-sans max-w-xl">
                  Reference corridors with indicative rates — final freight is always negotiated directly between shipper and transporter.
                </p>
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
              {referenceCorridors.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-6 border border-gray-200 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-gray-200 text-gray-600 font-bold">
                        <span>{c.corridorCode}</span>
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

                    {/* Indicative Rate Box */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-200 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Indicative rate:</span>
                        <span className="font-bold text-gray-900 text-sm">
                          ₹{c.indicativeRate.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-400">Per KM reference:</span>
                        <span className="text-orange-600 font-bold">₹{c.ratePerKm}/KM</span>
                      </div>
                    </div>

                    {/* Specs */}
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 font-sans block">
                          TYPICAL CARGO
                        </span>
                        <span className="text-xs text-gray-700 font-medium font-sans">{c.cargoType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 font-sans block">
                          COMMON VEHICLE
                        </span>
                        <span className="text-xs text-gray-500 font-sans">{c.truckBody}</span>
                      </div>
                    </div>
                  </div>

                  {/* Standardized View Matches CTA */}
                  <Link
                    href={`/search?type=truck&location=${encodeURIComponent(c.origin)}`}
                    className="w-full text-center text-xs font-mono font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 py-3 rounded-xl border border-orange-200 transition-colors block uppercase tracking-wider shadow-2xs"
                  >
                    View Matches ➔
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-center text-[10px] sm:text-[11px] text-gray-400 font-sans">
              Rates shown are indicative market references for orientation only. LorryCarry does not set or guarantee freight rates.
            </p>
          </div>
        </section>

        {/* ── SECTION 5: TRANSIT INTELLIGENCE ── */}
        <section id="transit-intelligence" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Context */}
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-mono text-[10px] uppercase font-bold">
                SIGNATURE PRODUCT FEATURE
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
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-100 border border-gray-200 text-gray-900 font-mono font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-orange-500" />
                  <span>EXPLORE THE CONTROL TOWER</span>
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
                      PRODUCT PREVIEW — SAMPLE BOOKING
                    </span>
                    <h3 className="text-base font-mono font-bold text-gray-900 mt-0.5">
                      BOOKING #BK-88492 <span className="text-orange-600 text-xs font-normal">(IN TRANSIT)</span>
                    </h3>
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-gray-600 border border-gray-200 font-mono text-[10px] font-bold">
                    ILLUSTRATIVE EXAMPLE
                  </span>
                </div>

                {/* Progress Bar & Route */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-900 font-bold">Kolkata Port ➔ Delhi NCR</span>
                    <span className="text-emerald-700 font-black">820 / 1,420 KM (57%)</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 border border-gray-200 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 w-[57%] rounded-full shadow-2xs" />
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

                    <div className="bg-orange-50/80 p-3 rounded-xl border border-orange-200">
                      <span className="text-[9px] text-orange-700 block font-bold">02. CHECKPOINT</span>
                      <span className="font-bold text-gray-900 truncate block">Ambala Toll</span>
                      <span className="text-[9px] text-emerald-700 block mt-0.5 font-bold">14:20 IST</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                      <span className="text-[9px] text-gray-400 block font-bold">03. NEXT GATE</span>
                      <span className="font-bold text-gray-700 truncate block">Ludhiana Bypass</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">ETA: 2.5 Hrs</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                      <span className="text-[9px] text-gray-400 block font-bold">04. DESTINATION</span>
                      <span className="font-bold text-gray-700 truncate block">Delhi NCR</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">ETA: 6.0 Hrs</span>
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

        {/* ── SECTION 6: COMMERCIAL TRANSPARENCY (DIRECT VS BROKER) ── */}
        <section id="comparison" className="py-20 bg-slate-50 border-t border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-mono text-[10px] uppercase font-bold">
                COMMERCIAL TRANSPARENCY
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight font-sans">
                Direct Marketplace vs Traditional Broker
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 font-sans">
                Executive operational comparison between LorryCarry direct network and legacy freight brokers.
              </p>
            </div>

            {/* Executive Comparison Grid */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Header Row */}
              <div className="grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[2fr_1.5fr_1.5fr] bg-slate-100/80 border-b border-gray-200 px-5 py-4 gap-4">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-500 font-mono">
                  Operational Parameter
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-700 font-mono text-center">
                  LorryCarry Direct
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-500 font-mono text-center">
                  Traditional Broker
                </span>
              </div>

              {/* Comparison Rows */}
              {comparisons.map((row, idx) => (
                <div
                  key={row.parameter}
                  className={cn(
                    'grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[2fr_1.5fr_1.5fr] px-5 py-5 gap-4 items-start transition-colors hover:bg-slate-50/80',
                    idx < comparisons.length - 1 && 'border-b border-gray-100'
                  )}
                >
                  {/* Parameter Name */}
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-gray-900 font-sans">
                      {row.parameter}
                    </span>
                  </div>

                  {/* LorryCarry — emerald check chip */}
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] sm:text-xs text-emerald-800 font-medium font-sans leading-snug">
                      {row.lorryCarry}
                    </span>
                  </div>

                  {/* Traditional — gray/rose cross chip */}
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <XCircle className="w-5 h-5 text-gray-400 shrink-0" />
                    <span className="text-[11px] sm:text-xs text-gray-600 font-sans leading-snug">
                      {row.traditional}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 7: OPERATIONAL BENEFITS (FACTUAL PLATFORM CAPABILITIES) ── */}
        <section id="operational-benefits" className="relative py-20 bg-[#070A11] overflow-hidden">
          {/* Ambient brand glow */}
          <div
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[380px] bg-gradient-to-b from-orange-500/20 via-sky-500/10 to-transparent blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 font-mono text-[10px] uppercase font-bold tracking-widest">
                OPERATIONAL BENEFITS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
                What The Platform Actually Does
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-sans">
                Shipped product capabilities of the LorryCarry direct freight network — matching, verification, commercial terms, tracking, and documentation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {operationalBenefits.map((benefit) => {
                const Icon = benefit.icon
                return (
                  <div
                    key={benefit.code}
                    className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-7 space-y-5 shadow-xl transition-all hover:border-orange-500/40 hover:bg-slate-900/90"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/25 shrink-0">
                        <Icon className="w-5 h-5 text-orange-400" />
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                        {benefit.code}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <span className="block text-xl font-mono font-bold text-orange-400 tracking-tight">
                        {benefit.metric}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white font-sans leading-snug">
                        {benefit.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                        {benefit.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-slate-500">
              NO CUSTOMER TESTIMONIALS ARE PUBLISHED UNTIL VERIFIED OPERATOR QUOTES ARE AVAILABLE
            </p>
          </div>
        </section>

        {/* ── SECTION 8: FAQ ACCORDION ── */}
        <section className="py-20 bg-slate-50 border-y border-gray-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-mono text-[10px] uppercase font-bold">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight font-sans">
                How LorryCarry Works
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-sans">
                Clear answers regarding payments, verification, subscription access, and tracking accuracy.
              </p>
            </div>

            <div className="space-y-3">
              {faqItems.map((faq, idx) => {
                const isOpen = openFaqIndex === idx
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden transition-all hover:border-gray-300"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none"
                    >
                      <span className="text-sm sm:text-base font-bold text-gray-900 font-sans">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={cn(
                          'w-5 h-5 text-orange-500 shrink-0 transition-transform duration-200',
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
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-sans">
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

        {/* ── SECTION 9: FINAL CTA BANNER ── */}
        <section className="relative py-20 bg-slate-50 overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-8 sm:p-14 shadow-xl text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-xs font-mono font-bold text-orange-300 uppercase tracking-wider">
                <span>START DIRECT FREIGHT OPERATIONS TODAY</span>
              </div>

              {/* Headline */}
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight font-sans uppercase">
                ELIMINATE MIDDLEMEN.<br />
                <span className="text-orange-500">
                  CONNECT DIRECTLY.
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto leading-relaxed font-sans">
                Register as a shipper or lorry owner on LorryCarry&apos;s direct freight network. Zero broker commission, 50 km radial matching, and transparent, standardised commercial terms.
              </p>

              {/* Requirement Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/post-load')}
                  className="font-bold px-8 py-4 text-xs sm:text-sm bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl shadow-sm uppercase tracking-wider font-mono transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                >
                  POST FREIGHT LOAD
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/login?redirect=/dashboard/truck-driver')}
                  className="font-bold px-8 py-4 text-xs sm:text-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl shadow-2xs uppercase tracking-wider font-mono transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none cursor-pointer"
                >
                  REGISTER YOUR LORRY
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  )
}
