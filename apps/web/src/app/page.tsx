'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  TruckIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  ArrowRightIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import { Navbar, Footer } from '@/components/layout'
import { Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

// Lazy-loaded 3D Hero Truck Canvas with SSR disabled for optimal client-side performance
const HeroTruckCanvas = dynamic(() => import('@/components/3d/HeroTruckCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] sm:h-[480px] lg:h-[540px] rounded-[20px] bg-surface-950/80 border border-white/10 flex items-center justify-center animate-pulse">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-primary-500/20 text-primary-400 flex items-center justify-center mx-auto">
          <TruckIcon className="w-6 h-6 animate-bounce" />
        </div>
        <p className="text-[11px] font-sans font-semibold text-surface-500 uppercase tracking-[0.06em]">
          Loading 3D telemetry engine...
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = new URLSearchParams()
    query.set('type', searchTab === 'trucks' ? 'truck' : 'load')
    if (origin.trim()) query.set('location', origin.trim())
    if (truckType) query.set('truckType', truckType)
    if (radius) query.set('radius', radius)

    router.push(`/search?${query.toString()}`)
  }

  const features = [
    {
      title: 'Vahan & RC Verified Fleet',
      desc: 'Complete digital verification for every registered lorry on our platform via government databases.',
      icon: ShieldCheckIcon,
      badge: 'Vahan Verified',
    },
    {
      title: '50km Proximity Engine',
      desc: 'Real-time geo-location matching connects cargo with nearest available trucks, eliminating empty deadhead runs.',
      icon: MapPinIcon,
      badge: 'Zero Empty Miles',
    },
    {
      title: 'Direct WhatsApp Connect',
      desc: 'Direct mobile and WhatsApp connection with drivers and vehicle owners. No middleman hold-ups.',
      icon: ChatBubbleLeftRightIcon,
      badge: 'Instant Access',
    },
    {
      title: 'Zero Brokerage Margin',
      desc: '100% direct commercial agreement between shippers and fleet operators with standard 50/50 advance terms.',
      icon: CurrencyRupeeIcon,
      badge: '100% Direct',
    },
  ]

  const workflowSteps = [
    {
      step: '01',
      title: 'Post Freight Cargo',
      desc: 'Publish tonnage specs and destination requirements or discover lorries within a 50km radius.',
    },
    {
      step: '02',
      title: 'Direct Driver Contact',
      desc: 'Unlock direct driver WhatsApp & phone numbers. Agree on direct commercial freight rates.',
    },
    {
      step: '03',
      title: 'Corridor Tracking',
      desc: 'Follow highway checkpoint updates along national freight routes until POD unloading confirmation.',
    },
  ]

  const corridors = [
    {
      origin: 'Delhi NCR',
      destination: 'Mumbai (JNPT)',
      distance: '1,420 km',
      duration: '36–44 hrs',
      freight: ['Industrial Goods', 'FMCG', 'Auto Parts'],
    },
    {
      origin: 'Chennai',
      destination: 'Bengaluru ICD',
      distance: '345 km',
      duration: '8–12 hrs',
      freight: ['Electronics', 'Automotive', 'Textiles'],
    },
    {
      origin: 'Ahmedabad',
      destination: 'Mumbai Port',
      distance: '525 km',
      duration: '12–16 hrs',
      freight: ['Chemicals', 'Plastics', 'Machinery'],
    },
    {
      origin: 'Hyderabad',
      destination: 'Chennai Port',
      distance: '630 km',
      duration: '14–18 hrs',
      freight: ['Pharma', 'Engineering', 'Agri Products'],
    },
  ]

  const comparisons = [
    {
      parameter: 'Broker Commission',
      lorryCarry: '₹0 (Zero commission)',
      traditional: '3% – 8% trip deduction',
    },
    {
      parameter: 'Transporter Identity',
      lorryCarry: 'Direct driver phone & WhatsApp',
      traditional: 'Hidden behind broker phone lines',
    },
    {
      parameter: 'Vehicle Verification',
      lorryCarry: 'Digital Vahan & RC document checks',
      traditional: 'Unverified manual paper records',
    },
    {
      parameter: 'Transit Updates',
      lorryCarry: 'Digital corridor checkpoints',
      traditional: 'Manual driver phone calling',
    },
    {
      parameter: 'Payment Commercials',
      lorryCarry: 'Standard 50% advance / 50% on POD',
      traditional: 'Unpredictable payment delays',
    },
  ]

  return (
    <div className="min-h-screen bg-[#070A11] text-surface-100 flex flex-col font-sans selection:bg-primary-500 selection:text-white">
      <Navbar />

      <main className="flex-1 overflow-x-hidden">
        {/* ── 1. CINEMATIC HERO SECTION (Full-Screen Visual + 3D Truck Canvas) ── */}
        <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-32 border-b border-white/10 overflow-hidden">
          {/* Background Ambient Lights & Grid */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-primary-600/20 via-sky-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Left Hero Copy */}
              <div className="lg:col-span-6 space-y-6 text-left">
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface-900/90 border border-white/10 text-xs font-mono font-bold text-primary-400  shadow-inner-light">
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-ping" />
                  <span>NEXT-GEN LOGISTICS MARKETPLACE</span>
                </div>

                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[0.95]">
                  Cinematic <br />
                  <span className="bg-primary-500 bg-clip-text text-transparent">
                    Freight Intelligence
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-surface-300 max-w-xl leading-relaxed font-sans">
                  Direct connection between cargo shippers and Vahan-verified truck operators across India. Zero broker fees. 50km proximity geo-matching.
                </p>

                {/* Hero CTAs */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => router.push('/post-load')}
                    leftIcon={<TruckIcon className="w-5 h-5 shrink-0" />}
                    className="font-bold text-sm px-7 py-3.5 shadow-glow-primary hover:scale-[1.02] transition-transform"
                  >
                    Post a Freight Load
                  </Button>

                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => router.push('/search?type=truck')}
                    leftIcon={<MagnifyingGlassIcon className="w-5 h-5 shrink-0" />}
                    className="font-bold text-sm px-7 py-3.5 border-white/10 hover:border-white/30 "
                  >
                    Explore Fleet
                  </Button>
                </div>

                {/* Live Network Metrics Bar */}
                <div className="pt-6 grid grid-cols-3 gap-4 border-t border-white/10">
                  <div>
                    <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-surface-500 block">Verified lorries</span>
                    <span className="text-lg font-mono font-black text-white">2,480+</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-surface-500 block">Corridor radius</span>
                    <span className="text-lg font-mono font-black text-primary-400">50 KM</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-sans font-semibold uppercase tracking-[0.06em] text-surface-500 block">Broker commission</span>
                    <span className="text-lg font-mono font-black text-emerald-400">₹0 DIRECT</span>
                  </div>
                </div>
              </div>

              {/* Right Column: 3D Truck Canvas */}
              <div className="lg:col-span-6">
                <HeroTruckCanvas />
              </div>

            </div>
          </div>
        </section>

        {/* ── 2. GLASSMORPHIC MARKETPLACE SEARCH PANEL ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-14 relative z-20">
          <div className="bg-[#0F131D] rounded-[20px] border border-white/15 shadow-modal p-5 sm:p-7">
            
            {/* Search Type Tabs */}
            <div className="flex items-center gap-3 pb-5 border-b border-white/10">
              <button
                type="button"
                onClick={() => setSearchTab('trucks')}
                className={cn(
                  'flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200',
                  searchTab === 'trucks'
                    ? 'bg-primary-500 text-white shadow-glow-primary'
                    : 'text-surface-400 hover:text-white hover:bg-white/5'
                )}
              >
                <TruckIcon className="w-4 h-4 shrink-0" />
                <span>Find Available Lorries</span>
              </button>

              <button
                type="button"
                onClick={() => setSearchTab('loads')}
                className={cn(
                  'flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200',
                  searchTab === 'loads'
                    ? 'bg-primary-500 text-white shadow-glow-primary'
                    : 'text-surface-400 hover:text-white hover:bg-white/5'
                )}
              >
                <MagnifyingGlassIcon className="w-4 h-4 shrink-0" />
                <span>Find Freight Cargo</span>
              </button>
            </div>

            {/* Form Fields Grid */}
            <form onSubmit={handleSearchSubmit} className="pt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Origin */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans mb-1.5">
                  Pickup City / Origin
                </label>
                <div className="relative">
                  <MapPinIcon className="w-4 h-4 text-primary-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Pune, Delhi"
                    className="w-full pl-10 pr-4 py-3 bg-surface-950/80 border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans mb-1.5">
                  Destination (Optional)
                </label>
                <div className="relative">
                  <MapPinIcon className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Bengaluru, JNPT"
                    className="w-full pl-10 pr-4 py-3 bg-surface-950/80 border border-white/10 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium"
                  />
                </div>
              </div>

              {/* Truck Type */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans mb-1.5">
                  Vehicle Body Type
                </label>
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-950/80 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium"
                >
                  <option value="Open">Open Body</option>
                  <option value="Container">Closed Container</option>
                  <option value="OpenBody">Trailer / Flatbed</option>
                </select>
              </div>

              {/* Radius */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans mb-1.5">
                  Search Radius
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-950/80 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 text-xs sm:text-sm font-medium"
                >
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km</option>
                  <option value="100">Within 100 km</option>
                  <option value="200">Within 200 km</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
                  className="font-bold py-3 text-xs sm:text-sm shadow-glow-primary"
                >
                  Search {searchTab === 'trucks' ? 'Trucks' : 'Loads'}
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* ── 3. FEATURE MATRIX (Cinematic Glass Cards) ── */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <Badge variant="primary" size="sm">
              Platform Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Engineered for Industrial Freight
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="bg-[#0F131D] rounded-2xl p-6 border border-white/10 hover:border-primary-500/40 transition-all duration-300 group flex items-start gap-5"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center shrink-0 border border-primary-500/20 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 shrink-0 stroke-[2]" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-white group-hover:text-primary-400 transition-colors">
                        {feat.title}
                      </h3>
                      <Badge variant="primary" size="sm" className="font-mono text-[10px]">
                        {feat.badge}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-surface-400 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 4. 3-STEP HORIZONTAL WORKFLOW ── */}
        <section className="py-20 bg-surface-900/40 border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
              <Badge variant="info" size="sm">
                3-Step Process
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                How LorryCarry Operates
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {workflowSteps.map((step, idx) => (
                <div
                  key={step.step}
                  className="bg-[#0F131D] rounded-2xl p-7 border border-white/10 relative space-y-4 hover:border-white/25 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-mono font-black text-primary-400">
                      {step.step}
                    </span>
                    {idx < 2 && (
                      <span className="hidden md:inline-block text-xs font-mono font-bold text-surface-500">
                        NEXT ➔
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-surface-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. NATIONAL FREIGHT CORRIDORS ── */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <Badge variant="primary" size="sm" className="mb-2">
                Active Freight Routes
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                High-Volume National Corridors
              </h2>
            </div>

            <Link
              href="/search?type=truck"
              className="text-xs sm:text-sm font-bold text-primary-400 hover:text-primary-300 inline-flex items-center gap-1.5 group"
            >
              <span>Explore All National Routes</span>
              <ArrowRightIcon className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {corridors.map((c) => (
              <div
                key={c.origin + c.destination}
                className="bg-[#0F131D] rounded-2xl p-6 border border-white/10 flex flex-col justify-between space-y-5 hover:border-primary-500/40 transition-all group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded-lg border border-primary-500/20">
                      {c.distance}
                    </span>
                    <span className="text-surface-400 flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                      {c.duration}
                    </span>
                  </div>

                  <div>
                    <p className="text-[11px] font-sans font-semibold text-surface-500 uppercase tracking-[0.06em]">Highway route</p>
                    <p className="text-base font-bold text-white mt-0.5 group-hover:text-primary-400 transition-colors">
                      {c.origin} ➔ {c.destination}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[11px] text-surface-400 font-medium mb-1.5">Typical Cargo:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.freight.map((f) => (
                        <span
                          key={f}
                          className="text-[10px] bg-white/5 text-surface-300 px-2 py-0.5 rounded-md font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/search?type=truck&location=${encodeURIComponent(c.origin)}`}
                  className="w-full text-center text-xs font-bold text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 py-2.5 rounded-xl border border-primary-500/20 transition-colors block"
                >
                  Find Trucks on Route
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. COMPARISON TABLE (Direct vs Traditional Broker) ── */}
        <section className="py-20 bg-surface-900/40 border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
              <Badge variant="warning" size="sm">
                Cost & Transparency
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Direct Marketplace vs Broker Model
              </h2>
            </div>

            <div className="bg-[#0F131D] rounded-[20px] border border-white/10 overflow-hidden shadow-modal">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-white/5 text-surface-300 uppercase tracking-[0.06em] font-semibold font-sans text-[11px]">
                    <tr>
                      <th className="p-5">Parameter</th>
                      <th className="p-5 text-emerald-400">LorryCarry Direct</th>
                      <th className="p-5 text-surface-400">Traditional Broker</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {comparisons.map((row) => (
                      <tr key={row.parameter} className="hover:bg-white/5 transition-colors">
                        <td className="p-5 font-bold text-white">
                          {row.parameter}
                        </td>
                        <td className="p-5 font-bold text-emerald-400 font-mono">
                          ✓ {row.lorryCarry}
                        </td>
                        <td className="p-5 text-surface-400">
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

        {/* ── 7. FINAL CALL TO ACTION ── */}
        <section className="relative py-20 bg-primary-500 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Ready to Streamline Your Logistics Operations?
            </h2>
            <p className="text-sm sm:text-base text-primary-100 max-w-xl mx-auto leading-relaxed">
              Connect directly with verified transporters and industrial cargo shippers across India today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => router.push('/post-load')}
                className="bg-white text-primary-700 hover:bg-surface-100 font-bold px-8 py-3.5 shadow-xl text-sm"
              >
                Post a Freight Load
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => router.push('/login?redirect=/dashboard/truck-owner')}
                className="text-white border border-white/40 hover:bg-white/10 font-bold px-8 py-3.5 text-sm"
              >
                Register Your Lorry
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
