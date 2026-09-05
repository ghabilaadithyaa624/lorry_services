'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { DEFAULT_RETURN_LOAD_RADIUS_KM } from '@lorrycarry/shared'
import { matchesApi, type ReturnLoadsResponse } from '@/lib/api'
import { formatINR } from '@/lib/utils'

interface FleetTruck {
  id: string
  registrationNumber: string
  verificationStatus: string
}

type DiscoveryState =
  | { status: 'loading' | 'error'; truckId: string; radius: number }
  | { status: 'ready'; truckId: string; radius: number; data: ReturnLoadsResponse }

/** All recommendations and contact decisions come from the authenticated API. */
export function ReturnLoadsPanel({ trucks }: { trucks: FleetTruck[] }) {
  const [selectedTruckId, setSelectedTruckId] = useState('')
  const [radius, setRadius] = useState(DEFAULT_RETURN_LOAD_RADIUS_KM)
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<DiscoveryState | null>(null)
  const primaryTruck = trucks.find((truck) => truck.verificationStatus === 'Verified') || trucks[0]
  const truckId = trucks.find((truck) => truck.id === selectedTruckId)?.id || primaryTruck?.id

  useEffect(() => {
    if (!truckId) {
      setState(null)
      return
    }
    const controller = new AbortController()
    setState({ status: 'loading', truckId, radius })
    matchesApi.getReturnLoads(truckId, { radius, limit: 3 }, controller.signal)
      .then(({ data }) => {
        if (!controller.signal.aborted) setState({ status: 'ready', truckId, radius, data })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error', truckId, radius })
      })
    return () => controller.abort()
  }, [truckId, radius, revision])

  if (!truckId) {
    return (
      <p className="text-sm text-surface-400">
        Register a truck with a current location to find return-load opportunities.
        {' '}<Link href="/my-trucks" className="text-primary-400 underline">Manage your fleet</Link>
      </p>
    )
  }

  // Never show a previous truck's contacts while a new selection is loading.
  const current = state?.truckId === truckId && state.radius === radius ? state : null
  const data = current?.status === 'ready' ? current.data : null
  const loading = !current || current.status === 'loading'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-0 text-xs text-surface-400">
          Truck
          <select
            aria-label="Truck for return loads"
            value={truckId}
            onChange={(event) => setSelectedTruckId(event.target.value)}
            className="mt-1 block w-full rounded-lg bg-surface-950 border border-white/10 p-2 text-white"
          >
            {trucks.map((truck) => <option key={truck.id} value={truck.id}>{truck.registrationNumber}</option>)}
          </select>
        </label>
        <label className="text-xs text-surface-400">
          Pickup radius
          <select
            aria-label="Return-load pickup radius"
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
            className="mt-1 block rounded-lg bg-surface-950 border border-white/10 p-2 text-white"
          >
            {[10, 25, 50].map((km) => <option key={km} value={km}>{km} km</option>)}
          </select>
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
          className="p-2 text-xs font-semibold text-primary-400 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div aria-live="polite" aria-busy={loading} className="space-y-3">
        {loading ? (
          <p className="p-5 text-center text-xs text-surface-400">Scanning open loads within {radius} km…</p>
        ) : current?.status === 'error' ? (
          <div role="alert" className="p-4 rounded-xl bg-surface-950/60 border border-amber-500/30 text-xs text-surface-300">
            <p>Return-load opportunities could not be loaded. This is not an empty load board.</p>
            <button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-2 text-primary-400 font-semibold">
              Try again
            </button>
          </div>
        ) : data && (
          <>
            <p className="text-xs text-surface-400">
              <span className="text-surface-200">{data.anchor.label}</span> · {data.anchor.detail}
            </p>
            {data.anchor.source !== 'unresolved' && (
              <p className="text-[11px] font-mono text-surface-500">
                {data.candidatesEvaluated} nearby candidate(s) evaluated · {data.radiusKm} km pickup radius
              </p>
            )}

            {data.opportunities.length === 0 ? (
              <div className="p-5 rounded-xl bg-surface-950/60 border border-white/5 text-center space-y-2">
                <p className="text-sm font-bold text-white">
                  {data.anchor.source === 'unresolved' ? 'Vehicle location needed' : 'No nearby return loads right now'}
                </p>
                <p className="text-xs text-surface-400">
                  {data.anchor.source === 'unresolved'
                    ? 'Update your truck location or complete a trip with destination coordinates. A corridor name alone cannot establish pickup proximity.'
                    : `No eligible open freight was found within ${data.radiusKm} km. Try again after updating your location or when new loads are posted.`}
                </p>
              </div>
            ) : data.opportunities.map((opportunity) => (
              <article key={opportunity.loadId} className="p-3.5 rounded-xl bg-surface-950/80 border border-white/10 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white">{opportunity.routeLabel}</h4>
                    <p className="text-[11px] text-surface-400 mt-1">
                      {opportunity.tonnageRequired}T {opportunity.truckType} · {opportunity.pickupDistanceFromDestinationKm.toFixed(1)} km to pickup
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-primary-300 shrink-0">
                    #{opportunity.rank} · {opportunity.rankScore}/100
                  </span>
                </div>
                <p className="text-xs font-mono text-emerald-300">
                  {formatINR(opportunity.estimatedFreight)} indicative · {opportunity.payloadUtilizationPct}% payload
                </p>
                {(!opportunity.bodyTypeCompatible || !opportunity.budgetFit) && (
                  <p className="text-xs text-amber-300">
                    {!opportunity.bodyTypeCompatible && 'Body type mismatch. '}
                    {!opportunity.budgetFit && 'Budget below benchmark. '}
                    Confirm suitability before booking.
                  </p>
                )}
                <details className="text-[11px] text-surface-400">
                  <summary className="cursor-pointer text-primary-400">Why this rank?</summary>
                  <ul className="mt-2 space-y-1">
                    {opportunity.rankFactors.map((factor) => (
                      <li key={factor.key} title={factor.detail}>
                        {factor.label}: {factor.value} ({factor.score}/{factor.maxScore})
                      </li>
                    ))}
                  </ul>
                </details>
                {opportunity.contact.locked ? (
                  <Link href="/subscription" className="inline-block text-xs font-semibold text-primary-400 underline">
                    Subscribe to unlock shipper contact
                  </Link>
                ) : opportunity.contact.phone ? (
                  <a href={`tel:${opportunity.contact.phone}`} className="inline-block text-xs font-semibold text-primary-400 underline">
                    Call {opportunity.contact.name || 'shipper'} · {opportunity.contact.phone}
                  </a>
                ) : <p className="text-xs text-surface-400">Shipper contact unavailable.</p>}
                <p className="text-[10px] text-surface-500">{opportunity.disclaimer}</p>
              </article>
            ))}
            {data.opportunities.length > 0 && <p className="text-[10px] text-surface-500">{data.disclaimer}</p>}
          </>
        )}
      </div>
    </div>
  )
}
