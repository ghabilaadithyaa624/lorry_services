'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TruckIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  DocumentCheckIcon,
  SparklesIcon,
  ArrowLongRightIcon,
} from '@heroicons/react/24/outline'
import { Navbar, Footer } from '@/components/layout'
import { Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

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
    if (searchTab === 'trucks') {
      query.set('type', 'truck')
    } else {
      query.set('type', 'load')
    }
    if (origin.trim()) query.set('location', origin.trim())
    if (truckType) query.set('truckType', truckType)
    if (radius) query.set('radius', radius)

    router.push(`/search?${query.toString()}`)
  }

  const features = [
    {
      title: 'Verified Transporters',
      desc: 'Complete RC and Vahan document verification for every registered lorry on our platform.',
      icon: ShieldCheckIcon,
      badge: 'RC & Vahan Verified',
    },
    {
      title: '50km Geo-Matching',
      desc: 'Real-time proximity discovery connects you with trucks nearest to your warehouse or loading point.',
      icon: MapPinIcon,
      badge: 'Zero Empty Runs',
    },
    {
      title: 'WhatsApp Connect',
      desc: 'Direct mobile and WhatsApp connection with drivers and vehicle owners. No middleman hold-ups.',
      icon: ChatBubbleLeftRightIcon,
      badge: 'Instant Contact',
    },
    {
      title: 'Zero Brokerage',
      desc: 'Direct commercial connection without commission cuts or hidden transaction margins.',
      icon: CurrencyRupeeIcon,
      badge: '100% Direct Terms',
    },
  ]

  const workflowSteps = [
    {
      step: '01',
      title: 'Post or Search',
      desc: 'Publish your cargo tonnage and vehicle specs, or search available lorries within 50km radius.',
    },
    {
      step: '02',
      title: 'Connect Directly',
      desc: 'Unlock direct phone & WhatsApp access. Agree on standard 50/50 advance commercial terms.',
    },
    {
      step: '03',
      title: 'Track & Deliver',
      desc: 'Follow milestone checkpoint updates along the national corridor and confirm safe unloading.',
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
      destination: 'Bengaluru Industrial',
      distance: '345 km',
      duration: '8–12 hrs',
      freight: ['Electronics', 'Automotive', 'Textiles'],
    },
    {
      origin: 'Ahmedabad',
      destination: 'Mumbai',
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

  const trustBadges = [
    { label: 'RC Verified Vehicles', icon: DocumentCheckIcon },
    { label: 'Vahan Verified Transporters', icon: ShieldCheckIcon },
    { label: 'Direct Transporter Contact', icon: ChatBubbleLeftRightIcon },
    { label: 'Transparent Payment Terms', icon: CurrencyRupeeIcon },
  ]

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-background-dark text-surface-900 dark:text-surface-100 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ── 1. Hero Section: Left Copy + Right Logistics Route Card ── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary-500/5 via-surface-50 to-surface-50 dark:from-primary-950/20 dark:via-background-dark dark:to-background-dark pt-10 pb-16 sm:pt-16 sm:pb-24 border-b border-surface-200/60 dark:border-surface-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              
              {/* Left Column: Hero Copy */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider">
                  <SparklesIcon className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                  <span>Direct Truck Load Marketplace for India</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black tracking-tight text-surface-900 dark:text-white leading-[1.15]">
                  Find Trucks. Find Loads.{' '}
                  <span className="text-primary-600 dark:text-primary-400 block mt-1">
                    Book in Minutes.
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-surface-600 dark:text-surface-300 max-w-xl leading-relaxed">
                  Direct connection between cargo owners, traders, and verified truck operators across India.
                  Zero broker fees. Transparent pricing.
                </p>

                {/* Hero CTAs */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => router.push('/post-load')}
                    leftIcon={<TruckIcon className="w-5 h-5 shrink-0" />}
                    className="font-bold"
                  >
                    Post a Freight Load
                  </Button>

                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => router.push('/search?type=truck')}
                    leftIcon={<MagnifyingGlassIcon className="w-5 h-5 shrink-0" />}
                    className="font-bold"
                  >
                    Find Nearby Trucks
                  </Button>
                </div>

                {/* Micro trust stats */}
                <div className="flex flex-wrap items-center gap-6 pt-4 text-xs text-surface-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-success-500 shrink-0" />
                    <span>100% Direct Transporter Access</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-success-500 shrink-0" />
                    <span>50km Proximity Engine</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Freight Route Visualization */}
              <div className="lg:col-span-5">
                <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-elevated p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-success-500 animate-pulse" />
                      <span className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                        Live Freight Corridor
                      </span>
                    </div>
                    <Badge variant="success" size="sm">
                      Active Transporters
                    </Badge>
                  </div>

                  {/* Route Overview */}
                  <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-4 space-y-3 border border-surface-100 dark:border-surface-700">
                    <div className="flex items-center justify-between text-xs font-semibold text-surface-500">
                      <span>Primary Highway</span>
                      <span>NH-48 Corridor</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-surface-400 uppercase">Origin</p>
                        <p className="text-sm font-black text-surface-900 dark:text-white">Delhi NCR</p>
                      </div>
                      <ArrowLongRightIcon className="w-6 h-6 text-primary-500 shrink-0" />
                      <div className="text-right">
                        <p className="text-xs font-bold text-surface-400 uppercase">Destination</p>
                        <p className="text-sm font-black text-surface-900 dark:text-white">Mumbai (JNPT)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-200/60 dark:border-surface-700 text-center">
                      <div>
                        <span className="text-[10px] text-surface-400 block">Distance</span>
                        <span className="text-xs font-bold text-surface-800 dark:text-surface-200">1,420 km</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-surface-400 block">Avg Duration</span>
                        <span className="text-xs font-bold text-surface-800 dark:text-surface-200">36–44 hrs</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-surface-400 block">Typical Rate</span>
                        <span className="text-xs font-bold text-primary-600 dark:text-primary-400">Direct ₹</span>
                      </div>
                    </div>
                  </div>

                  {/* Verified Vehicle Sample Card */}
                  <div className="p-3.5 rounded-xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shrink-0">
                        <TruckIcon className="w-5 h-5 shrink-0" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-surface-900 dark:text-white">16 Ton Open Body</p>
                          <span className="text-[10px] text-success-600 dark:text-success-400 font-bold">✓ RC Verified</span>
                        </div>
                        <p className="text-[11px] text-surface-500">Available within 25km • Direct contact</p>
                      </div>
                    </div>
                    <Badge variant="primary" size="sm">
                      Ready
                    </Badge>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── 2. Marketplace Search Panel ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-20">
          <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-elevated border border-surface-200/90 dark:border-surface-700 p-4 sm:p-6">
            
            {/* Search Type Tabs */}
            <div className="flex items-center gap-2 pb-4 border-b border-surface-100 dark:border-surface-800">
              <button
                type="button"
                onClick={() => setSearchTab('trucks')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all',
                  searchTab === 'trucks'
                    ? 'bg-primary-500 text-white shadow-xs'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                )}
              >
                <TruckIcon className="w-4 h-4 shrink-0" />
                <span>Find Available Trucks</span>
              </button>

              <button
                type="button"
                onClick={() => setSearchTab('loads')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all',
                  searchTab === 'loads'
                    ? 'bg-primary-500 text-white shadow-xs'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                )}
              >
                <MagnifyingGlassIcon className="w-4 h-4 shrink-0" />
                <span>Find Freight Loads</span>
              </button>
            </div>

            {/* Form Fields Grid */}
            <form onSubmit={handleSearchSubmit} className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Pickup / Origin */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-600 dark:text-surface-400 mb-1">
                  Pickup City / Origin
                </label>
                <div className="relative">
                  <MapPinIcon className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Mumbai, Delhi"
                    className="input pl-9 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-600 dark:text-surface-400 mb-1">
                  Destination (Optional)
                </label>
                <div className="relative">
                  <MapPinIcon className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Bengaluru, Chennai"
                    className="input pl-9 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Truck Type */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-600 dark:text-surface-400 mb-1">
                  Vehicle Body Type
                </label>
                <select
                  value={truckType}
                  onChange={(e) => setTruckType(e.target.value)}
                  className="input text-xs sm:text-sm"
                >
                  <option value="Open">Open Body</option>
                  <option value="Container">Closed Container</option>
                  <option value="OpenBody">Trailer</option>
                </select>
              </div>

              {/* Radius */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-600 dark:text-surface-400 mb-1">
                  Search Radius
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="input text-xs sm:text-sm"
                >
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km</option>
                  <option value="100">Within 100 km</option>
                  <option value="200">Within 200 km</option>
                </select>
              </div>

              {/* Submit CTA */}
              <div className="flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<MagnifyingGlassIcon className="w-4 h-4 shrink-0" />}
                  className="font-bold py-2.5"
                >
                  Search {searchTab === 'trucks' ? 'Trucks' : 'Loads'}
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* ── 3. Compact 2x2 Feature Cards ── */}
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="primary" size="sm" className="mb-2">
              Platform Features
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight">
              Why Shippers & Transporters Choose LorryCarry
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="bg-white dark:bg-surface-900 rounded-xl p-5 sm:p-6 border border-surface-200/80 dark:border-surface-800 shadow-card flex items-start gap-4 hover:shadow-card-hover transition-shadow"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 border border-primary-100 dark:border-primary-900/60">
                    <Icon className="w-6 h-6 shrink-0 stroke-[2]" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-surface-900 dark:text-white">
                        {feat.title}
                      </h3>
                      <Badge variant="primary" size="sm">
                        {feat.badge}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 4. How LorryCarry Works: 3-Step Horizontal Workflow ── */}
        <section className="py-16 bg-white dark:bg-surface-900 border-y border-surface-200/70 dark:border-surface-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge variant="info" size="sm" className="mb-2">
                3-Step Process
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight">
                How LorryCarry Works
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {workflowSteps.map((step, idx) => (
                <div
                  key={step.step}
                  className="bg-surface-50 dark:bg-surface-800/50 rounded-2xl p-6 border border-surface-200/60 dark:border-surface-700/60 relative space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-primary-600 dark:text-primary-400 font-mono">
                      {step.step}
                    </span>
                    {idx < 2 && (
                      <span className="hidden md:inline-block text-xs font-bold text-surface-400">
                        ➔
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-surface-900 dark:text-white">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. National Freight Corridors ── */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <Badge variant="primary" size="sm" className="mb-2">
                Active Freight Routes
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight">
                High-Demand National Corridors
              </h2>
            </div>

            <Link
              href="/search?type=truck"
              className="text-xs sm:text-sm font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              <span>Explore All Corridors</span>
              <ArrowRightIcon className="w-4 h-4 shrink-0" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {corridors.map((c) => (
              <div
                key={c.origin + c.destination}
                className="bg-white dark:bg-surface-900 rounded-xl p-5 border border-surface-200/80 dark:border-surface-800 shadow-card flex flex-col justify-between space-y-4 hover:shadow-card-hover transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded">
                      {c.distance}
                    </span>
                    <span className="text-surface-400 flex items-center gap-1 font-medium">
                      <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                      {c.duration}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-surface-400 font-semibold uppercase">Route</p>
                    <p className="text-sm font-bold text-surface-900 dark:text-white">
                      {c.origin} ➔ {c.destination}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-surface-100 dark:border-surface-800">
                    <p className="text-[11px] text-surface-400 font-medium">Common Cargo:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.freight.map((f) => (
                        <span
                          key={f}
                          className="text-[10px] bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 px-1.5 py-0.5 rounded"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/search?type=truck&location=${encodeURIComponent(c.origin)}`}
                  className="w-full text-center text-xs font-bold text-primary-600 bg-primary-50/60 dark:bg-primary-950/30 hover:bg-primary-100 py-2 rounded-lg transition-colors block"
                >
                  Find Trucks on Route
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. Comparison Table: LorryCarry Direct vs Traditional Broker ── */}
        <section className="py-16 bg-surface-50 dark:bg-background-dark border-t border-surface-200/60 dark:border-surface-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-10">
              <Badge variant="warning" size="sm" className="mb-2">
                Cost & Transparency
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight">
                LorryCarry Direct vs Traditional Broker
              </h2>
            </div>

            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-surface-100/70 dark:bg-surface-800/70 text-surface-700 dark:text-surface-300 uppercase tracking-wider font-bold text-[11px]">
                    <tr>
                      <th className="p-4 sm:p-5">Parameter</th>
                      <th className="p-4 sm:p-5 text-primary-600 dark:text-primary-400">LorryCarry Direct</th>
                      <th className="p-4 sm:p-5 text-surface-400">Traditional Broker</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                    {comparisons.map((row) => (
                      <tr key={row.parameter} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
                        <td className="p-4 sm:p-5 font-bold text-surface-900 dark:text-white">
                          {row.parameter}
                        </td>
                        <td className="p-4 sm:p-5 font-bold text-success-600 dark:text-success-400">
                          ✓ {row.lorryCarry}
                        </td>
                        <td className="p-4 sm:p-5 text-surface-500 dark:text-surface-400">
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

        {/* ── 7. Compact Trust Badges Strip ── */}
        <section className="py-10 bg-white dark:bg-surface-900 border-y border-surface-200/70 dark:border-surface-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trustBadges.map((t) => {
                const Icon = t.icon
                return (
                  <div
                    key={t.label}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200/60 dark:border-surface-700 justify-center"
                  >
                    <Icon className="w-5 h-5 text-success-500 shrink-0 stroke-[2]" />
                    <span className="text-xs font-bold text-surface-800 dark:text-surface-200">
                      {t.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 8. Final Call to Action ── */}
        <section className="bg-gradient-to-r from-primary-600 via-primary-500 to-amber-600 text-white py-14 sm:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Ready to Streamline Your Freight Operations?
            </h2>
            <p className="text-xs sm:text-sm text-primary-100 max-w-xl mx-auto leading-relaxed">
              Join transporters, fleet operators, and industrial shippers connecting directly on LorryCarry today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => router.push('/post-load')}
                className="bg-white text-primary-700 hover:bg-surface-100 font-bold px-6 py-3 shadow-md"
              >
                Post a Freight Load
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => router.push('/login?redirect=/dashboard/truck-owner')}
                className="text-white border border-white/30 hover:bg-white/10 font-bold px-6 py-3"
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
