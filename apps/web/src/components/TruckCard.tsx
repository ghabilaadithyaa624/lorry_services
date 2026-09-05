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
  ShieldCheck,
  Pencil,
  Trash2,
  FolderOpen,
  BadgeCheck,
} from 'lucide-react'
import { api } from '@/lib/api'
import { calculateMatchScore, MatchResult } from '@/lib/intelligence/matchingEngine'
import { marketplaceCardActions } from '@/lib/marketplaceActions'
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
  /** Backend-computed ownership (Prompt 9) — owner cards render owner controls. */
  isOwner?: boolean
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
  /** Owner-only controls (Prompt 9): rendered only when `truck.isOwner` is true. */
  onEdit?: (truck: Truck) => void
  onDelete?: (truck: Truck) => void
  onManageDocuments?: (truck: Truck) => void
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
  onEdit,
  onDelete,
  onManageDocuments,
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

  // Prompt 9: owner cards render owner controls (Edit/Delete/Manage Documents)
  // and never Unlock Contact / Book Lorry for the caller's own truck.
  const ownsThisTruck = truck.isOwner === true
  const cardActions = marketplaceCardActions('truck', ownsThisTruck)

  const ownerActionButtonClasses =
    'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-900/80 hover:bg-surface-800 border border-white/10 text-white text-xs sm:text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer shadow-card'

  return (
    <>
      <div className="bg-panel rounded-2xl border border-white/10 p-5 sm:p-6 shadow-modal hover:border-primary-500/30 transition-all duration-200 space-y-5 text-white">
        {/* Header: Title, Verification Badge, Match Score */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-surface-950 text-primary-400 flex items-center justify-center border border-white/10 shrink-0">
              <Truck className="w-6 h-6 stroke-[2.2]" aria-hidden="true" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-white text-base sm:text-lg tracking-wide">
                  {truck.registrationNumber || 'MH-12-TRUCK'}
                </span>

                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Vahan Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-900 text-surface-400 border border-white/10 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5 text-surface-400" aria-hidden="true" />
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
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
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
              <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0" aria-hidden="true" />
              <span>{truck.distanceKm ? truck.distanceKm.toFixed(1) : '12'} km</span>
            </div>
          </div>

          <div className="bg-surface-950/80 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              ETA TO LOAD POINT
            </div>
            <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-surface-400 shrink-0" aria-hidden="true" />
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

        {/* Actions Area: owner controls vs marketplace Contact / Book (Prompt 9) */}
        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {contactData?.owner ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/60 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                <Phone className="w-4 h-4 text-emerald-400" aria-hidden="true" />
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
                aria-label={`Chat on WhatsApp with ${contactData.owner.name || 'transporter'} for truck ${truck.registrationNumber || truck.bodyType}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-all shadow-glow-sm focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950 focus:outline-none"
              >
                <span>Direct WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          ) : ownsThisTruck ? (
            /* Own truck — never sealed, never paywalled for the owner */
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-surface-400 font-medium">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <span>Your truck — manage it from your fleet workspace</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-surface-400 font-medium">
              <div className="w-7 h-7 rounded-lg bg-surface-950 text-surface-400 border border-white/10 flex items-center justify-center shrink-0">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <span>Contact details sealed until subscription unlock</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            {cardActions.unlockContact && !contactData?.owner && (
              <button
                type="button"
                onClick={handleViewContact}
                disabled={revealing}
                aria-label={`Unlock contact details for truck ${truck.registrationNumber || truck.bodyType}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-900/80 hover:bg-surface-800 border border-white/10 text-white text-xs sm:text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none disabled:opacity-50 cursor-pointer shadow-card"
              >
                <Lock className="w-3.5 h-3.5 text-primary-400" aria-hidden="true" />
                <span>{revealing ? 'Unlocking...' : 'Unlock Contact'}</span>
              </button>
            )}

            {cardActions.contactOrBook && onBook && (
              <button
                type="button"
                onClick={() => onBook(truck)}
                aria-label={`Book lorry ${truck.registrationNumber || truck.bodyType}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none cursor-pointer border border-primary-400/30"
              >
                <span>Book Lorry</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}

            {cardActions.edit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(truck)}
                aria-label={`Edit your truck ${truck.registrationNumber || truck.bodyType}`}
                className={ownerActionButtonClasses}
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Edit</span>
              </button>
            )}

            {cardActions.manage && onManageDocuments && (
              <button
                type="button"
                onClick={() => onManageDocuments(truck)}
                aria-label={`Manage documents for your truck ${truck.registrationNumber || truck.bodyType}`}
                className={ownerActionButtonClasses}
              >
                <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{cardActions.manageLabel}</span>
              </button>
            )}

            {cardActions.remove && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(truck)}
                aria-label={`Delete your truck ${truck.registrationNumber || truck.bodyType}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-danger-950/40 hover:bg-danger-950/70 border border-danger-900/40 text-danger-300 text-xs sm:text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-danger-500 focus:outline-none cursor-pointer shadow-card"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Delete</span>
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
