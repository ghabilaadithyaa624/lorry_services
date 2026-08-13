'use client'

import React from 'react'
import Link from 'next/link'
import {
  TruckIcon,
  ShieldCheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline'
import { whatsappLink } from '@/lib/utils'

export function Footer() {
  const freightCorridors = [
    { from: 'Delhi NCR', to: 'Mumbai (JNPT)', time: '36-48 hrs' },
    { from: 'Chennai', to: 'Bengaluru Industrial', time: '8-12 hrs' },
    { from: 'Ahmedabad', to: 'Mumbai', time: '12-16 hrs' },
    { from: 'Hyderabad', to: 'Chennai Port', time: '14-18 hrs' },
    { from: 'Kolkata', to: 'Delhi NCR', time: '40-52 hrs' },
    { from: 'Pune', to: 'Bengaluru', time: '18-24 hrs' },
  ]

  const trustBadges = [
    {
      title: 'Verified Transporters',
      desc: 'RC and Vahan verification for every registered vehicle.',
      icon: ShieldCheckIcon,
    },
    {
      title: 'Zero Brokerage',
      desc: 'Direct deal between cargo owner and truck owner.',
      icon: CheckBadgeIcon,
    },
    {
      title: 'Real-Time Geo-Proximity',
      desc: 'Locate trucks and loads within 50km loading radius.',
      icon: MapPinIcon,
    },
  ]

  return (
    <footer className="bg-[#0F131D] text-surface-300 border-t border-white/10 pb-24 md:pb-0">
      {/* Trust Highlights Section */}
      <div className="border-b border-white/10 bg-[#070A11]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trustBadges.map((badge) => {
              const Icon = badge.icon
              return (
                <div key={badge.title} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">{badge.title}</h3>
                    <p className="text-xs text-surface-400 leading-relaxed">{badge.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand & Mission Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-sm">
                <TruckIcon className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className="text-xl font-black tracking-tight text-white leading-none">
                Lorry<span className="text-primary-500">Carry</span>
              </span>
            </Link>

            <p className="text-sm text-surface-400 leading-relaxed max-w-sm">
              India&apos;s open marketplace for full-truckload freight. We connect cargo owners,
              traders, and manufacturers directly with verified truck owners and fleet operators.
            </p>

            <div className="flex flex-col gap-2 pt-2 text-xs text-surface-400">
              <div className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4 text-primary-400 shrink-0" />
                <span>Helpline: +91 80720 25106 (9 AM - 8 PM IST)</span>
              </div>
              <div className="flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 text-primary-400 shrink-0" />
                <span>Support: support@lorrycarry.com</span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={whatsappLink('918072025106', 'Hi LorryCarry Team, I need assistance with a load/truck booking.')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold transition-colors"
              >
                <span>💬 WhatsApp Instant Support</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Marketplace</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/search?type=truck" className="hover:text-white transition-colors">
                  Find Available Trucks
                </Link>
              </li>
              <li>
                <Link href="/search?type=load" className="hover:text-white transition-colors">
                  Find Freight Loads
                </Link>
              </li>
              <li>
                <Link href="/post-load" className="hover:text-white transition-colors">
                  Post Freight Load
                </Link>
              </li>
              <li>
                <Link href="/subscribe" className="hover:text-white transition-colors">
                  Pricing Plans & Passes
                </Link>
              </li>
            </ul>
          </div>

          {/* Direct Corridors */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Major Corridors</h4>
            <ul className="space-y-2 text-xs">
              {freightCorridors.map((c) => (
                <li key={c.from + c.to} className="flex items-center justify-between text-surface-400">
                  <span className="hover:text-surface-200 cursor-pointer">
                    {c.from} ➔ {c.to}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Standards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Transparency</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-surface-400 hover:text-white cursor-pointer">
                  Direct Payment Terms
                </span>
              </li>
              <li>
                <span className="text-surface-400 hover:text-white cursor-pointer">
                  Carrier Liability Guidelines
                </span>
              </li>
              <li>
                <span className="text-surface-400 hover:text-white cursor-pointer">
                  E-Way Bill Compliance
                </span>
              </li>
              <li>
                <span className="text-surface-400 hover:text-white cursor-pointer">
                  Privacy Policy
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Disclaimer */}
        <div className="mt-12 pt-8 border-t border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-surface-500">
          <p>© {new Date().getFullYear()} LorryCarry. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for Indian Road Freight • 100% Direct Transporter Connection
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
