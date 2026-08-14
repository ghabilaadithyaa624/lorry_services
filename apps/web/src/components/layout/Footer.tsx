'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { whatsappLink, cn } from '@/lib/utils'

export function Footer() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const footerGroups = [
    {
      title: 'PLATFORM',
      links: [
        { label: 'Live Matching Engine', href: '/#live-network' },
        { label: '50km Proximity Engine', href: '/#live-network font-mono' },
        { label: 'Transit Telemetry', href: '/#transit-intelligence' },
        { label: 'Vahan Verification', href: '/#comparison' },
        { label: 'Direct Freight OS', href: '/' },
      ],
    },
    {
      title: 'SOLUTIONS',
      links: [
        { label: 'For Shippers & Cargo Owners', href: '/search?type=truck' },
        { label: 'For Fleet Owners & Drivers', href: '/search?type=load' },
        { label: 'Industrial Freight', href: '/#active-corridors' },
        { label: 'FMCG & Heavy Haulage', href: '/#active-corridors' },
        { label: 'Port Container Dispatch', href: '/#active-corridors' },
      ],
    },
    {
      title: 'CORRIDORS',
      links: [
        { label: 'Delhi NCR ➔ JNPT Mumbai', href: '/search?type=truck&location=Delhi' },
        { label: 'Chennai ➔ Bengaluru ICD', href: '/search?type=truck&location=Chennai' },
        { label: 'Ahmedabad ➔ Mumbai Port', href: '/search?type=truck&location=Ahmedabad' },
        { label: 'Hyderabad ➔ Chennai Port', href: '/search?type=truck&location=Hyderabad' },
        { label: 'Kolkata ➔ Delhi NCR', href: '/search?type=truck&location=Kolkata' },
      ],
    },
    {
      title: 'RESOURCES',
      links: [
        { label: 'Freight Rate Benchmarks', href: '/subscribe' },
        { label: 'FASTag Toll Checkpoints', href: '/tracking' },
        { label: 'E-Way Bill Compliance', href: '/subscribe' },
        { label: 'Subscription Passes', href: '/subscribe' },
        { label: 'POD Verification Standards', href: '/#transit-intelligence' },
      ],
    },
    {
      title: 'COMPANY',
      links: [
        { label: 'About LorryCarry', href: '/' },
        { label: 'Direct Freight Charter', href: '/#comparison' },
        { label: 'Carrier Network Audit', href: '/' },
        { label: 'Investor Relations', href: '/' },
        { label: 'Careers & Hiring', href: '/' },
      ],
    },
    {
      title: 'SUPPORT',
      links: [
        { label: '24/7 Freight Helpline', href: 'tel:+918072025106' },
        { label: 'WhatsApp Dispatch Desk', href: whatsappLink('918072025106', 'Hi LorryCarry Support, I need assistance.') },
        { label: 'Dispute Resolution', href: '/#comparison' },
        { label: 'System Status Log', href: '/tracking' },
      ],
    },
    {
      title: 'LEGAL',
      links: [
        { label: 'Terms of Service', href: '/' },
        { label: 'Carrier Liability Policy', href: '/' },
        { label: 'Privacy & Data Security', href: '/' },
        { label: 'Zero-Brokerage Guarantee', href: '/#comparison' },
      ],
    },
  ]

  const trustBadges = [
    {
      title: 'Verified Transporters',
      desc: 'Government Vahan & RC authentication for every registered vehicle.',
      icon: ShieldCheckIcon,
    },
    {
      title: 'Zero Brokerage',
      desc: '100% direct contact & payment between shipper and lorry owner.',
      icon: CheckBadgeIcon,
    },
    {
      title: '50km Proximity Engine',
      desc: 'Instant radial matching for fast loading and reduced deadhead miles.',
      icon: MapPinIcon,
    },
  ]

  return (
    <footer className="bg-[#0F131D] text-surface-300 border-t border-white/10 font-sans">
      {/* Executive Value Highlights */}
      <div className="border-b border-white/10 bg-[#070A11]/80 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trustBadges.map((b) => {
              const Icon = b.icon
              return (
                <div key={b.title} className="flex items-start gap-3.5 p-3 rounded-xl bg-[#0F131D] border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{b.title}</h4>
                    <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Enterprise Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        {/* Brand & Direct Contact Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-10 border-b border-white/10 gap-6">
          <div className="space-y-3 max-w-xl">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center text-white shadow-glow-primary">
                <TruckIcon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-xl font-black tracking-tight text-white leading-none">
                Lorry<span className="text-primary-500">Carry</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-surface-400 leading-relaxed font-sans">
              India&apos;s Direct Freight Operating Network. Connecting shippers directly with Vahan-verified lorry owners across India&apos;s major highway corridors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="tel:+918072025106"
              className="px-4 py-2.5 rounded-xl bg-[#070A11] border border-white/10 hover:border-white/30 text-xs font-mono font-bold text-white flex items-center gap-2 transition-all"
            >
              <PhoneIcon className="w-4 h-4 text-primary-400" />
              <span>+91 80720 25106</span>
            </a>

            <a
              href={whatsappLink('918072025106', 'Hi LorryCarry Team, I need help with freight dispatch.')}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25 text-xs font-bold flex items-center gap-2 transition-all"
            >
              <EnvelopeIcon className="w-4 h-4" />
              <span>WhatsApp Helpline</span>
            </a>
          </div>
        </div>

        {/* Desktop 7-Column Footer Links Grid */}
        <div className="hidden md:grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-8 pt-10">
          {footerGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <h5 className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                {group.title}
              </h5>
              <ul className="space-y-2 text-xs">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-surface-400 hover:text-white transition-colors block truncate"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Mobile Accordion Groups */}
        <div className="md:hidden pt-8 space-y-3">
          {footerGroups.map((group) => {
            const isOpen = !!openSections[group.title]
            return (
              <div key={group.title} className="border-b border-white/10 pb-3">
                <button
                  type="button"
                  onClick={() => toggleSection(group.title)}
                  className="w-full flex items-center justify-between py-1 text-xs font-mono font-bold text-white uppercase tracking-wider text-left"
                >
                  <span>{group.title}</span>
                  <ChevronDownIcon
                    className={cn('w-4 h-4 text-surface-400 transition-transform duration-200', isOpen && 'rotate-180 text-primary-400')}
                  />
                </button>

                {isOpen && (
                  <ul className="pt-2 pb-1 space-y-2 text-xs">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <Link href={link.href} className="text-surface-400 hover:text-white transition-colors block py-0.5">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        {/* Bottom Legal / Copyright Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-surface-400">
          <p>© {new Date().getFullYear()} LorryCarry Operations Platform. All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-[11px] text-surface-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Direct Freight Operating System • Zero Middleman Brokerage</span>
          </p>
        </div>

      </div>
    </footer>
  )
}

export default Footer
