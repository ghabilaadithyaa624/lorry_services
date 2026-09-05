'use client'

import React from 'react'
import {
  ArrowRight,
  Eye,
  LogIn,
  Lock,
  MapPin,
  Package,
  Truck,
} from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { MatchScoreBadge } from '@/components/intelligence'
import { calculateMatchScore, estimateFreightRate } from '@/lib/intelligence'
import { cn, formatINR } from '@/lib/utils'
import { TelemetryCell } from './TelemetryCell'
import {
  DEMO_LOAD_PREVIEWS,
  DEMO_TRUCK_PREVIEWS,
  LOGIN_LIVE_MARKETPLACE_CTA,
  POST_LOAD_PATH,
  REGISTER_VEHICLE_PATH,
  SAMPLE_PREVIEW_DISCLAIMER,
  SAMPLE_PREVIEW_LABEL,
  bodyTypeLabel,
  loginRedirectUrl,
  searchUrlForMode,
  type SearchMode,
} from '@/lib/searchEmptyState'

export interface DemoPreviewCardsProps {
  mode: SearchMode
  /**
   * Number of real marketplace results currently rendered.
   *
   * Hard gate: this component refuses to render when real results exist, so
   * sample cards can never be interleaved with live data.
   */
  realResultCount: number
  /** Whether a browser session exists — decides between login CTAs and real ones. */
  isAuthenticated?: boolean
  /** Target consignment weight used for the sample match scores. */
  targetTonnage?: number
  /** Vehicle body filter, used for the sample match scores. */
  truckType?: string
  className?: string
}

/**
 * Clearly-labelled sample listings shown when a public search returns nothing.
 *
 * Purpose: `/search` is a public route, so a visitor who lands on an empty
 * marketplace otherwise sees a blank grid and no way to judge the product.
 * These cards show the *shape* of a live match instead.
 *
 * Non-negotiables baked into the markup:
 *  - every card and the section header carry the "Sample preview" label;
 *  - the preview types carry no contact fields, so no card can render a phone
 *    number or a WhatsApp link that looks like an unlocked contact;
 *  - the section renders nothing at all when real results exist.
 */
export function DemoPreviewCards({
  mode,
  realResultCount,
  isAuthenticated = false,
  targetTonnage = 10,
  truckType,
  className,
}: DemoPreviewCardsProps) {
  // Never mix sample cards with live results.
  if (realResultCount > 0) return null

  const isTruckMode = mode === 'trucks'
  const bodyTypeForMatch = (truckType as 'Open' | 'Container' | 'OpenBody') || 'Open'

  const liveSearchHref = loginRedirectUrl(searchUrlForMode(mode))
  // A shipper searching for trucks publishes freight; a transporter searching
  // for loads publishes a vehicle.
  const publishPath = isTruckMode ? POST_LOAD_PATH : REGISTER_VEHICLE_PATH
  const publishLabel = isTruckMode ? 'Post a load' : 'Register your truck'
  const alternatePath = isTruckMode ? REGISTER_VEHICLE_PATH : POST_LOAD_PATH
  const alternateLabel = isTruckMode ? 'Register your truck' : 'Post a load'

  return (
    <section
      data-demo-preview="true"
      aria-labelledby="search-sample-preview-title"
      className={cn('space-y-4', className)}
    >
      {/* ── Section header: unmistakable labelling ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Badge variant="warning" size="sm">
          <Eye className="w-3 h-3" aria-hidden="true" />
          <span>{SAMPLE_PREVIEW_LABEL}</span>
        </Badge>
        <h3
          id="search-sample-preview-title"
          className="text-sm sm:text-base font-bold text-ink tracking-tight"
        >
          What a live {isTruckMode ? 'truck' : 'load'} match looks like
        </h3>
      </div>

      <p className="text-xs text-muted max-w-3xl leading-relaxed -mt-1.5">
        {SAMPLE_PREVIEW_DISCLAIMER}
      </p>

      {/* ── Sample cards ── */}
      <div className="grid grid-cols-1 gap-4">
        {isTruckMode
          ? DEMO_TRUCK_PREVIEWS.map((truck) => {
              const match = calculateMatchScore(
                {
                  id: 'sample-target-load',
                  tonnageRequired: targetTonnage,
                  truckType: bodyTypeForMatch,
                  loadingAddress: 'Your loading point',
                },
                {
                  id: truck.id,
                  bodyType: truck.bodyType,
                  tonnageCapacity: truck.tonnageCapacity,
                  distanceKm: truck.distanceKm,
                  verificationStatus: truck.verificationStatus,
                  preferredDestinations: truck.preferredDestinations,
                }
              )
              const rateEstimate = estimateFreightRate({
                tonnage: truck.tonnageCapacity,
                truckType: truck.bodyType,
                distanceKm: truck.distanceKm,
              })

              return (
                <Card
                  key={truck.id}
                  padding="none"
                  className="p-5 sm:p-6 space-y-5 border-dashed border-hairline-strong"
                  data-sample-card={truck.id}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20 shrink-0">
                        <Truck className="w-6 h-6 stroke-[2.2]" aria-hidden="true" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-ink text-base sm:text-lg tracking-wide">
                            {truck.registrationNumber}
                          </span>

                          <Badge variant="warning" size="sm">
                            <span>{SAMPLE_PREVIEW_LABEL}</span>
                          </Badge>

                          <VerifiedBadge
                            verified={truck.verificationStatus === 'Verified'}
                            source="vahan"
                            variant="dark"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted font-medium">
                          <span className="font-semibold text-body">
                            {bodyTypeLabel(truck.bodyType)} Truck
                          </span>
                          <span>
                            • <span className="font-mono text-ink">{truck.lengthFt}ft</span> Length
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <MatchScoreBadge match={match} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <TelemetryCell
                      label="Distance"
                      icon={<MapPin className="w-3.5 h-3.5 text-primary-400" />}
                      value={`${truck.distanceKm.toFixed(1)} km`}
                    />
                    <TelemetryCell label="Payload Capacity" value={`${truck.tonnageCapacity} Tons`} />
                    <TelemetryCell
                      label="Rate Benchmark"
                      value={`₹${rateEstimate.ratePerTonKm.toFixed(2)}/T-km`}
                      valueClassName="text-emerald-600 dark:text-emerald-400"
                    />
                    <TelemetryCell
                      label="Corridors"
                      value={truck.preferredDestinations.join(', ')}
                    />
                  </div>

                  <SampleSealedContactRow />
                </Card>
              )
            })
          : DEMO_LOAD_PREVIEWS.map((load) => {
              const match = calculateMatchScore(
                {
                  id: load.id,
                  tonnageRequired: load.tonnageRequired,
                  truckType: load.truckType,
                  loadingAddress: load.loadingAddress,
                  unloadingAddress: load.unloadingAddress,
                },
                {
                  id: 'sample-truck',
                  bodyType: bodyTypeForMatch,
                  tonnageCapacity: targetTonnage,
                  distanceKm: load.distanceKm,
                  verificationStatus: 'Verified',
                }
              )
              const priceEstimate = estimateFreightRate({
                tonnage: load.tonnageRequired,
                truckType: load.truckType,
              })

              return (
                <Card
                  key={load.id}
                  padding="none"
                  className="p-5 sm:p-6 space-y-5 border-dashed border-hairline-strong"
                  data-sample-card={load.id}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20 shrink-0">
                        <Package className="w-6 h-6 stroke-[2.2]" aria-hidden="true" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-ink text-base sm:text-lg flex items-center gap-2">
                            <span>{load.loadingAddress}</span>
                            <ArrowRight className="w-4 h-4 text-primary-400 shrink-0" aria-hidden="true" />
                            <span>{load.unloadingAddress}</span>
                          </span>

                          <Badge variant="warning" size="sm">
                            <span>{SAMPLE_PREVIEW_LABEL}</span>
                          </Badge>

                          {load.urgent && (
                            <Badge variant="danger" size="sm">
                              <span>Urgent Load</span>
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted font-medium">
                          <span className="font-semibold text-body">
                            <span className="font-mono text-ink">{load.tonnageRequired}T</span> •{' '}
                            {load.truckType} Body Required
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <MatchScoreBadge match={match} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <TelemetryCell
                      label="Distance"
                      icon={<MapPin className="w-3.5 h-3.5 text-primary-400" />}
                      value={`${load.distanceKm.toFixed(1)} km`}
                    />
                    <TelemetryCell label="Required Payload" value={`${load.tonnageRequired} Tons`} />
                    <TelemetryCell
                      label="Rate Benchmark"
                      value={
                        load.maxPrice
                          ? formatINR(load.maxPrice)
                          : `Est. ${formatINR(priceEstimate.recommendedTarget)}`
                      }
                      valueClassName="text-emerald-600 dark:text-emerald-400"
                    />
                    <TelemetryCell label="Body Requirement" value={load.truckType} />
                  </div>

                  <SampleSealedContactRow />
                </Card>
              )
            })}
      </div>

      {/* ── Conversion row ── */}
      <Card padding="none" className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          {isAuthenticated
            ? 'You are signed in — these remain samples. Widen the radius or publish your own requirement to create live supply.'
            : 'Live inventory, verified contacts and direct WhatsApp connect unlock with a free account.'}
        </p>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isAuthenticated ? (
            <>
              <Button
                as="a"
                href={publishPath}
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                {publishLabel}
              </Button>
              <Button as="a" href={alternatePath} variant="secondary" size="sm">
                {alternateLabel}
              </Button>
            </>
          ) : (
            <>
              <Button
                as="a"
                href={liveSearchHref}
                size="sm"
                leftIcon={<LogIn className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                {LOGIN_LIVE_MARKETPLACE_CTA}
              </Button>
              <Button
                as="a"
                href={loginRedirectUrl(publishPath)}
                variant="secondary"
                size="sm"
              >
                {publishLabel}
              </Button>
              <Button
                as="a"
                href={loginRedirectUrl(alternatePath)}
                variant="secondary"
                size="sm"
              >
                {alternateLabel}
              </Button>
            </>
          )}
        </div>
      </Card>
    </section>
  )
}

/**
 * Sealed-contact row for a sample card.
 *
 * Deliberately renders *no* digits and *no* WhatsApp link: a preview must never
 * look like it has unlocked a real carrier's phone number.
 */
function SampleSealedContactRow() {
  return (
    <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 text-xs sm:text-sm text-muted font-medium">
        <div className="w-7 h-7 rounded-lg bg-sunken border border-white/10 text-subtle flex items-center justify-center shrink-0">
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <span>Contact sealed — sample listing, no reachable number</span>
      </div>
    </div>
  )
}

export default DemoPreviewCards
