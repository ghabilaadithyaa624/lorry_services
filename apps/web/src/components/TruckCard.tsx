'use client'

import React, { useState } from 'react'
import {
  TruckIcon,
  MapPinIcon,
  LockClosedIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { Badge, Button } from '@/components/ui'
import { MatchScoreBadge, MatchInlineBreakdown } from '@/components/intelligence'
import { calculateMatchScore, MatchResult } from '@/lib/intelligence/matchingEngine'
import { ContactRevealModal } from './ContactRevealModal'
import { formatPhone, whatsappLink } from '@/lib/utils'

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

  return (
    <>
      <div className="bg-[#0F131D] rounded-2xl border border-white/10 p-5 shadow-card hover:border-primary-500/40 transition-all duration-300 flex flex-col justify-between space-y-4 group">
        {/* Header: Title, Verification Badge, Match Score */}
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-black text-white flex items-center gap-2 group-hover:text-primary-400 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20">
                  <TruckIcon className="w-4 h-4 shrink-0" />
                </div>
                {truck.bodyType} Body
              </span>
              <Badge variant={isVerified ? 'success' : 'warning'} size="sm" className="font-mono text-[10px]">
                {isVerified ? '✓ Vahan Verified' : 'Pending'}
              </Badge>
            </div>
            <MatchScoreBadge match={matchResult} />
          </div>

          {/* Registration & Distance */}
          <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
            <span className="font-mono text-white font-bold tracking-wider">
              {truck.registrationNumber || 'MH-12-XXXX'}
            </span>
            <span className="inline-flex items-center gap-1 text-primary-400 font-bold font-mono">
              <MapPinIcon className="w-3.5 h-3.5" />
              {typeof truck.distanceKm === 'number' ? `${truck.distanceKm.toFixed(1)} km away` : 'Nearby'}
            </span>
          </div>
        </div>

        {/* Match Intelligence Breakdown */}
        <MatchInlineBreakdown match={matchResult} />

        {/* Technical Specs Summary */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-950/80 border border-white/5 text-center text-xs">
          <div>
            <span className="text-[10px] font-mono text-surface-400 uppercase tracking-widest block">
              Capacity
            </span>
            <span className="font-mono font-black text-sm text-emerald-400 mt-0.5 block">
              {truck.tonnageCapacity}T
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-surface-400 uppercase tracking-widest block">
              Length
            </span>
            <span className="font-mono font-bold text-xs text-surface-200 mt-0.5 block">
              {truck.lengthFt ? `${truck.lengthFt}ft` : 'Standard'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-surface-400 uppercase tracking-widest block">
              Radius
            </span>
            <span className="font-mono font-bold text-xs text-surface-200 mt-0.5 block">
              {truck.serviceableRadiusKm ? `${truck.serviceableRadiusKm}km` : '50km'}
            </span>
          </div>
        </div>

        {/* Preferred Corridor & Destinations */}
        {truck.preferredDestinations && truck.preferredDestinations.length > 0 && (
          <div className="text-xs space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-surface-400 uppercase tracking-widest flex items-center gap-1">
              <ArrowPathRoundedSquareIcon className="w-3.5 h-3.5 text-primary-400" />
              Freight Corridor:
            </span>
            <div className="flex flex-wrap gap-1">
              {truck.preferredDestinations.map((dest, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-white/5 text-surface-300 text-[10px] font-mono border border-white/5"
                >
                  {dest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions Area: Contact / Book */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          {contactData?.owner ? (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-200">
                  {contactData.owner.name || 'Transporter'}
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatPhone(contactData.owner.phone)}
                </span>
              </div>
              <a
                href={whatsappLink(
                  contactData.owner.phone,
                  `Hi ${contactData.owner.name || 'Transporter'}, I found your ${truck.bodyType} truck on LorryCarry and have a freight consignment.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors shadow-glow-primary"
              >
                <span>💬 Direct WhatsApp</span>
              </a>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleViewContact}
                disabled={revealing}
                className="flex-1 py-2.5 px-3 rounded-xl border border-white/10 bg-surface-950/80 hover:bg-white/5 text-xs font-bold text-surface-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <LockClosedIcon className="w-3.5 h-3.5 text-primary-400" />
                <span>{revealing ? 'Unlocking...' : 'Reveal Contact'}</span>
              </button>

              {onBook && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onBook(truck)}
                  className="font-bold shadow-glow-primary px-4"
                >
                  Book
                </Button>
              )}
            </div>
          )}
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
