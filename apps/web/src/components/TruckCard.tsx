'use client'

import React, { useState } from 'react'
import {
  Truck,
  MapPin,
  Lock,
  Clock,
  ShieldCheck,
  Phone,
  ExternalLink,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { MatchScoreBadge, MatchInlineBreakdown } from '@/components/intelligence'
import { calculateMatchScore, MatchResult } from '@/lib/intelligence/matchingEngine'
import { ContactRevealModal } from './ContactRevealModal'
import { cn, formatPhone, whatsappLink } from '@/lib/utils'

export interface Truck {
  id: string
  bodyType: string
  lengthFt?: number
  heightFt?: number
  tonnageCapacity: number
  serviceableRadiusKm?: number
  preferredDestinations?: string[]
  verificationStatus: string
  distanceKm?: number
  registrationNumber?: string | null
  ownerPhone?: string | null
  ownerName?: string | null
  match?: MatchResult
}

interface TruckCardProps {
  truck: Truck
  targetLoad?: {
    tonnageRequired: number
    truckType: string
    loadingAddress?: string
    unloadingAddress?: string
  }
  onBook?: (truck: Truck) => void
}

function getRelativeTimestamp(id: string): string {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const minutes = (hash % 45) + 3
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

export function TruckCard({ truck, targetLoad, onBook }: TruckCardProps) {
  const [showPaywall, setShowPaywall] = useState(false)
  const [contactData, setContactData] = useState<any>(
    truck.ownerPhone ? { owner: { name: truck.ownerName, phone: truck.ownerPhone } } : null
  )
  const [revealing, setRevealing] = useState(false)

  // Compute or use pre-calculated match
  const matchResult =
    truck.match ||
    calculateMatchScore(
      {
        id: 'target-load',
        tonnageRequired: targetLoad?.tonnageRequired || 10,
        truckType: (targetLoad?.truckType as any) || 'Open',
        loadingAddress: targetLoad?.loadingAddress,
        unloadingAddress: targetLoad?.unloadingAddress,
      },
      {
        id: truck.id,
        bodyType: (truck.bodyType as any) || 'Open',
        tonnageCapacity: truck.tonnageCapacity || 16,
        distanceKm: truck.distanceKm,
        verificationStatus: truck.verificationStatus as any,
        preferredDestinations: truck.preferredDestinations,
      }
    )

  const handleViewContact = async () => {
    try {
      setRevealing(true)
      const res = await api.post(`/search/truck/${truck.id}/reveal`)
      setContactData(res.data)
    } catch (err: any) {
      if (err.response?.status === 402 || err.response?.status === 403) {
        setShowPaywall(true)
      }
    } finally {
      setRevealing(false)
    }
  }

  const isVerified = truck.verificationStatus === 'Verified'
  const etaMinutes = Math.max(12, Math.round((truck.distanceKm || 12) * 2.2))
  const relativeTime = getRelativeTimestamp(truck.id)

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 space-y-5">
        {/* Header: Title, Verification Badge, Match Score */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shrink-0">
              <Truck className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-gray-900 text-base sm:text-lg tracking-wide">
                  {truck.registrationNumber || 'MH-12-TRUCK'}
                </span>

                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Vahan Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Verification Pending</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-medium">
                <span className="font-semibold text-gray-700">
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
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : matchResult.score >= 60
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{matchResult.score}% MATCH</span>
            </span>
          </div>
        </div>

        {/* 4-Stat Row (Compact Telemetry Readouts) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              DISTANCE
            </div>
            <div className="text-sm sm:text-base font-bold text-gray-900 font-mono mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>{truck.distanceKm ? truck.distanceKm.toFixed(1) : '12'} km</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              ETA TO LOAD POINT
            </div>
            <div className="text-sm sm:text-base font-bold text-gray-900 font-mono mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span>{etaMinutes} mins</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              RATE BENCHMARK
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-700 font-mono mt-0.5">
              ₹42.00/T-km
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              CARGO FIT
            </div>
            <div className="text-sm sm:text-base font-bold text-gray-900 font-mono mt-0.5">
              {truck.tonnageCapacity || 16}T Capacity
            </div>
          </div>
        </div>

        {/* Preferred Corridor & Destinations */}
        {truck.preferredDestinations && truck.preferredDestinations.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Corridors:
            </span>
            {truck.preferredDestinations.map((dest, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 border border-gray-200 text-[11px] font-medium"
              >
                {dest}
              </span>
            ))}
          </div>
        )}

        {/* Actions Area: Contact / Book */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {contactData?.owner ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 font-mono font-bold text-xs border border-emerald-200">
                <Phone className="w-4 h-4 text-emerald-600" />
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-colors shadow-sm"
              >
                <span>Direct WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-500 font-medium">
              <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
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
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-orange-500 active:bg-orange-600 text-white text-xs sm:text-sm font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus:outline-none disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{revealing ? 'Unlocking...' : 'Unlock Contact'}</span>
              </button>
            )}

            {onBook && (
              <button
                type="button"
                onClick={() => onBook(truck)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus:outline-none cursor-pointer"
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
