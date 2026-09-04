'use client'

import React, { useState } from 'react'
import {
  Truck,
  MapPin,
  Lock,
  Clock,
  Phone,
  ExternalLink,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { calculateMatchScore, MatchResult } from '@/lib/intelligence/matchingEngine'
import { ContactRevealModal } from './ContactRevealModal'
import { VerifiedBadge } from './VerifiedBadge'
import { cn, formatPhone, whatsappLink } from '@/lib/utils'

export interface Truck {
  id: string
  bodyType: string
  lengthFt?: number
  heightFt?: number
  tonnageCapacity: number
  serviceableRadiusKm?: number
  status: string
  verificationStatus: string
  /** ISO timestamp of the last Vahan RC validation (drives the verified badge). */
  vahanVerifiedAt?: string | null
  currentLocationName?: string
  distanceKm?: number
  preferredDestinations?: string[]
  updatedAt?: string
  registrationNumber?: string | null
  /** Optional commercial rate per tonne in INR, shown in the search engine card. */
  ratePerTon?: number
  owner?: {
    id: string
    name?: string
    companyName?: string | null
    phone: string
  }
}

interface TruckCardProps {
  truck: Truck
  onBook?: (truck: Truck) => void
  userLocation?: { lat: number; lng: number }
  userRole?: string
  searchParams?: {
    truckType?: string
    tonnage?: number
    origin?: string
    destination?: string
  }
  match?: MatchResult
}

export function TruckCard({
  truck,
  onBook,
  match,
}: TruckCardProps) {
  const [showPaywall, setShowPaywall] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [contactData, setContactData] = useState<{
    owner?: { name?: string; phone: string }
    token?: string
  } | null>(truck.owner ? { owner: truck.owner } : null)

  const isVerified = truck.verificationStatus === 'Verified'

  // Match score evaluation
  const matchResult =
    match ||
    calculateMatchScore(
      {
        id: 'target-load',
        truckType: (truck.bodyType as any) || 'Open',
        tonnageRequired: truck.tonnageCapacity || 16,
        loadingLat: 18.5204,
        loadingLng: 73.8567,
      },
      {
        id: truck.id,
        bodyType: (truck.bodyType as any) || 'Open',
        tonnageCapacity: truck.tonnageCapacity || 16,
        currentLat: 18.5304,
        currentLng: 73.8667,
        verificationStatus: (truck.verificationStatus as any) || 'Verified',
        serviceableRadiusKm: truck.serviceableRadiusKm || 50,
      }
    )

  const handleViewContact = async () => {
    try {
      setRevealing(true)
      const res = await api.get<any>(`/search/truck/${truck.id}/reveal`)
      const payload = res.data?.data || res.data

      if (payload?.owner) {
        setContactData(payload)
      } else {
        setShowPaywall(true)
      }
    } catch (err: any) {
      if (err.status === 403 || err.message?.includes('subscription')) {
        setShowPaywall(true)
      } else {
        setShowPaywall(true)
      }
    } finally {
      setRevealing(false)
    }
  }

  const etaMinutes = truck.distanceKm ? Math.round((truck.distanceKm / 35) * 60) : 25
  const relativeTime = '5m ago'

  return (
    <>
      <div className="bg-panel rounded-2xl border border-white/10 p-5 sm:p-6 shadow-modal hover:border-primary-500/30 transition-all duration-200 space-y-5 text-white">
        {/* Header: Title, Verification Badge, Match Score */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-surface-950 text-primary-400 flex items-center justify-center border border-white/10 shrink-0">
              <Truck className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-white text-base sm:text-lg tracking-wide">
                  {truck.registrationNumber || 'MH-12-TRUCK'}
                </span>

                {isVerified ? (
                  <VerifiedBadge verified source="vahan" validatedAt={truck.vahanVerifiedAt} variant="dark" />
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-900 text-surface-400 border border-white/10 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5 text-surface-400" />
                    <span>Verification Pending</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-surface-400 font-medium">
                {truck.owner?.companyName && (
                  <span className="font-semibold text-surface-200">{truck.owner.companyName}</span>
                )}
                <span className="font-semibold text-surface-200">
                  {truck.bodyType} Body Truck
                </span>
                {truck.lengthFt && <span>• {truck.lengthFt}ft Length</span>}
                <span>• Updated {relativeTime}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border',
                matchResult.score >= 80
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : matchResult.score >= 60
                  ? 'bg-primary-500/20 text-primary-300 border-primary-500/30'
                  : 'bg-surface-900 text-surface-400 border-white/10'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{matchResult.score}% MATCH</span>
            </span>
          </div>
        </div>

        {/* 4-Stat Row (Compact Telemetry Readouts) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              DISTANCE
            </div>
            <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0" />
              <span>{truck.distanceKm ? truck.distanceKm.toFixed(1) : '12'} km</span>
            </div>
          </div>

          <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              ETA TO LOAD POINT
            </div>
            <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-surface-400 shrink-0" />
              <span>{etaMinutes} mins</span>
            </div>
          </div>

          <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              RATE PER TON
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono mt-0.5">
              ₹{(truck.ratePerTon ?? 42.0).toFixed(2)}/T
            </div>
          </div>

          <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              CARGO FIT
            </div>
            <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
              {truck.tonnageCapacity || 16}T Capacity
            </div>
          </div>
        </div>

        {/* Preferred Corridor & Destinations */}
        {truck.preferredDestinations && truck.preferredDestinations.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
              Corridors:
            </span>
            {truck.preferredDestinations.map((dest, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-surface-950 text-surface-300 border border-white/5 text-[11px] font-medium"
              >
                {dest}
              </span>
            ))}
          </div>
        )}

        {/* Actions Area: Contact / Book */}
        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {contactData?.owner ? (
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`tel:${contactData.owner.phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>{contactData.owner.name ? `Call ${contactData.owner.name}` : 'Call Now'}</span>
              </a>
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/60 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>{formatPhone(contactData.owner.phone)}</span>
                {contactData.owner.name && <span>({contactData.owner.name})</span>}
              </span>

              <a
                href={whatsappLink(
                  contactData.owner.phone,
                  `Hi ${contactData.owner.name || 'Transporter'}, I found your ${truck.bodyType} truck on LorryCarry and have a freight consignment.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-all shadow-glow-sm"
              >
                <span>Direct WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-surface-400 font-medium">
              <div className="w-7 h-7 rounded-lg bg-surface-950 text-surface-400 border border-white/10 flex items-center justify-center shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span>Contact details sealed until subscription unlock</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            {!contactData?.owner && (
              <button
                type="button"
                onClick={handleViewContact}
                disabled={revealing}
                aria-label={`Unlock Contact - ${truck.registrationNumber || 'truck'}${truck.owner?.companyName ? ` by ${truck.owner.companyName}` : ''}`}
                aria-busy={revealing}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-900/80 hover:bg-surface-800 border border-white/10 text-white text-xs sm:text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none disabled:opacity-50 cursor-pointer shadow-card"
              >
                <Lock className="w-3.5 h-3.5 text-primary-400" />
                <span>{revealing ? 'Unlocking...' : 'Unlock Contact'}</span>
              </button>
            )}

            {onBook && (
              <button
                type="button"
                onClick={() => onBook(truck)}
                aria-label={`Book Lorry - ${truck.registrationNumber || 'truck'}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer border border-primary-400/30"
              >
                <span>Book Lorry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showPaywall && (
        <ContactRevealModal
          onClose={() => setShowPaywall(false)}
          onSubscribe={() => {
            setShowPaywall(false)
            window.location.href = '/subscribe'
          }}
        />
      )}
    </>
  )
}
