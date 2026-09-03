'use client'

import React from 'react'
import Link from 'next/link'

interface HeroSectionProps {
  headline?: string
  subtext?: string
  backgroundImageUrl?: string
}

export default function HeroSection({
  headline = "India's Direct Freight Operating Network",
  subtext = "Connecting shippers directly with Vahan-verified lorry owners across India's major highway corridors.",
  backgroundImageUrl = "/images/highway-trucks-hero.jpg",
}: HeroSectionProps) {
  return (
    <section className="relative min-h-[580px] lg:min-h-[640px] flex items-center justify-center overflow-hidden bg-slate-950 text-white">
      {/* Background Image Container */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 scale-105"
        style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
        aria-hidden="true"
      />

      {/* Semi-Transparent Overlays for Optimal Text Readability & Brand Warmth */}
      {/* 1. Base dark vignette overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-[1.5px]" 
        aria-hidden="true" 
      />
      {/* 2. Gradient overlay: Darker on bottom and top to blend with fixed header */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/65 to-slate-950/95" 
        aria-hidden="true" 
      />
      {/* 3. Subtle brand orange ambient glow in the center */}
      <div 
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary-500/15 rounded-full blur-3xl pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Foreground Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 text-center">
        
        {/* Trust Badge Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md text-xs sm:text-sm text-orange-200 mb-6 sm:mb-8 transition-colors shadow-sm">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-white tracking-wide uppercase text-[11px] sm:text-xs">
            Direct Shipper-Carrier Portal
          </span>
          <span className="text-white/40">•</span>
          <span className="text-orange-300 font-medium">Zero Broker Fees</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight sm:leading-tight lg:leading-tight mb-6 drop-shadow-sm">
          {headline.split('Direct Freight').length > 1 ? (
            <>
              {headline.split('Direct Freight')[0]}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-orange-500 to-amber-400">
                Direct Freight
              </span>
              {headline.split('Direct Freight')[1]}
            </>
          ) : (
            headline
          )}
        </h1>

        {/* Subtext */}
        <p className="max-w-3xl mx-auto text-base sm:text-xl text-gray-200 sm:text-gray-100 font-normal leading-relaxed mb-10 drop-shadow">
          {subtext}
        </p>

        {/* Action Buttons: Find Trucks & Find Loads */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 mb-12 sm:mb-14">
          {/* Primary CTA: Find Trucks */}
          <Link
            href="/search?type=truck"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold text-base sm:text-lg px-8 py-4 rounded-xl shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-primary-500/30"
          >
            {/* Truck Icon */}
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8m-8 4h5m5 0a3 3 0 013 3v4a2 2 0 01-2 2h-1m-10 0H8a2 2 0 01-2-2V9a2 2 0 012-2h8a2 2 0 012 2v2m-6 9a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            <span>Find Trucks</span>
          </Link>

          {/* Secondary High-Contrast CTA: Find Loads */}
          <Link
            href="/search?type=load"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-bold text-base sm:text-lg px-8 py-4 rounded-xl border border-white/30 backdrop-blur-md hover:border-white/50 shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            {/* Load / Cargo Box Icon */}
            <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Find Loads</span>
          </Link>
        </div>

        {/* Highway Corridors & Verification Trust Tickers */}
        <div className="pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-xs sm:text-sm text-gray-300 font-medium">
          <div className="flex items-center justify-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Vahan API Verified</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>50km Radius Match</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Direct WhatsApp Alerts</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Zero Broker Commission</span>
          </div>
        </div>

      </div>
    </section>
  )
}
