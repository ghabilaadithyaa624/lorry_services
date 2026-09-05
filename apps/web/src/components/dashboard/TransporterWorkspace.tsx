'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  ExternalLink,
  Loader2,
  Package,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  Truck,
} from 'lucide-react'
import { api, loadsApi, trucksApi } from '@/lib/api'
import { toast } from '@/lib/toast'
import { cn, formatINR, timeAgo } from '@/lib/utils'

/**
 * Transporter workspace panels (Prompt 5).
 *
 * Transporters operate BOTH marketplace sides from one account: they post
 * freight like a factory owner and list lorries like a truck driver. These
 * panels render each side's own posts with edit/delete actions, plus a
 * read-only marketplace shortcut. Ownership is enforced server-side (the
 * `/loads/my-loads` and `/trucks/my-trucks` endpoints only ever return the
 * caller's rows, and mutations re-assert ownership); the client-side
 * `isOwnPost` check is defense in depth so a foreign row can never render
 * destructive actions even if one leaked into a list.
 */

export interface TransporterLoadPost {
  id: string
  userId?: string
  loadingAddress: string
  unloadingAddress: string
  truckType: string
  tonnageRequired: number
  maxPrice?: number | string | null
  urgent?: boolean
  status: string
  createdAt: string
  _count?: { bookings: number }
}

export interface TransporterTruckPost {
  id: string
  userId?: string
  registrationNumber?: string | null
  bodyType: string
  lengthFt?: number
  heightFt?: number
  tonnageCapacity: number
  serviceableRadiusKm?: number
  verificationStatus: string
  createdAt?: string
  activeBooking?: { id: string } | null
  documents?: Array<{ id: string; type: string; verificationStatus: string }>
}

interface MarketplaceRow {
  id: string
  loadingAddress?: string
  unloadingAddress?: string
  tonnageRequired?: number
  maxPrice?: number | string | null
  urgent?: boolean
  truckType?: string
  bodyType?: string
  tonnageCapacity?: number
  distanceKm?: number | string | null
}

const TRUCK_TYPE_OPTIONS = ['Open', 'Container', 'OpenBody'] as const

/**
 * Rows fetched from the "my posts" endpoints are scoped to the caller by the
 * API. When the row carries a userId it must match the session user before any
 * edit/delete control renders; a missing userId is trusted as an own row
 * because the list itself is ownership-scoped.
 */
function isOwnPost(rowUserId: string | undefined, currentUserId?: string | null): boolean {
  if (!rowUserId) return true
  return !currentUserId || rowUserId === currentUserId
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'Open' || status === 'Verified'
      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
      : status === 'Matched' || status === 'Pending'
        ? 'bg-amber-950/50 text-amber-300 border-amber-500/30'
        : status === 'Cancelled' || status === 'Rejected'
          ? 'bg-danger-950/50 text-danger-300 border-danger-500/30'
          : 'bg-primary-500/10 text-primary-300 border-primary-500/20'
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full border text-xs font-semibold', tone)}>
      {status}
    </span>
  )
}

function PanelHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20 shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
          <p className="text-xs text-surface-400">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function PanelSkeletonRow() {
  return (
    <div className="p-4 rounded-xl bg-surface-950/80 border border-white/5 space-y-2">
      <div className="h-3.5 w-2/5 rounded bg-surface-900 animate-pulse" />
      <div className="h-3 w-3/5 rounded bg-surface-900 animate-pulse" />
      <div className="h-3 w-1/4 rounded bg-surface-900 animate-pulse" />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * 1. My Freight Posts — own loads with edit/delete
 * ────────────────────────────────────────────────────────────────────────── */

interface MyFreightPostsPanelProps {
  loads: TransporterLoadPost[]
  loading?: boolean
  currentUserId?: string | null
  /** Reloads the dashboard snapshot after a successful mutation. */
  onRefresh?: () => void | Promise<void>
}

export function MyFreightPostsPanel({ loads, loading, currentUserId, onRefresh }: MyFreightPostsPanelProps) {
  const [editing, setEditing] = useState<TransporterLoadPost | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (load: TransporterLoadPost) => {
    if (!window.confirm(`Remove this freight post (${load.loadingAddress} → ${load.unloadingAddress})?`)) return
    setDeletingId(load.id)
    try {
      await loadsApi.deleteLoad(load.id)
      toast.success('Freight post removed')
      await onRefresh?.()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete load')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="bg-panel rounded-2xl border border-white/10 shadow-modal p-5 sm:p-7 space-y-5" aria-label="My freight posts">
      <PanelHeader
        icon={<ClipboardList className="w-5 h-5" />}
        title="My Freight Posts"
        subtitle="Your live Need Load postings — edit or remove while still open"
        action={
          <Link
            href="/need-load"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary border border-primary-400/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post Freight Load</span>
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <PanelSkeletonRow />
          <PanelSkeletonRow />
        </div>
      ) : loads.length === 0 ? (
        <div className="p-8 sm:p-12 text-center space-y-3 bg-surface-950/60 rounded-2xl border border-white/5">
          <div className="w-14 h-14 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center mx-auto border border-primary-500/20">
            <Package className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">Post your first freight load</h3>
          <p className="text-xs sm:text-sm text-surface-400 max-w-md mx-auto leading-relaxed">
            Publish the cargo you need moved and LorryCarry will broadcast it to Vahan-verified lorries within 50 km of your pickup point.
          </p>
          <div className="pt-2">
            <Link
              href="/need-load"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 text-primary-300 border border-primary-500/30 text-xs sm:text-sm font-semibold transition-colors"
            >
              <span>Post your first freight load</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {loads.map((load) => {
            const own = isOwnPost(load.userId, currentUserId)
            const mutable = own && load.status === 'Open'
            return (
              <div
                key={load.id}
                className="p-4 rounded-xl bg-surface-950/80 border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs sm:text-sm">
                      LOAD-{load.id.slice(0, 8).toUpperCase()}
                    </span>
                    <StatusPill status={load.status} />
                    {load.urgent && (
                      <span className="px-2 py-0.5 rounded-full bg-danger-950/50 text-danger-300 border border-danger-500/30 text-xs font-semibold">
                        Urgent
                      </span>
                    )}
                    {load.createdAt && (
                      <span className="text-xs text-surface-500">{timeAgo(load.createdAt)}</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">
                    {load.loadingAddress}
                    <span className="text-primary-400 mx-2">→</span>
                    {load.unloadingAddress}
                  </p>
                  <p className="text-xs text-surface-400">
                    {load.truckType} body • <span className="font-mono">{load.tonnageRequired}T</span>
                    {load.maxPrice ? <> • target <span className="font-mono text-emerald-400">{formatINR(load.maxPrice)}</span></> : null}
                    {typeof load._count?.bookings === 'number' ? <> • {load._count.bookings} quote{load._count.bookings === 1 ? '' : 's'}</> : null}
                  </p>
                </div>

                {own && (
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setEditing(load)}
                      disabled={!mutable}
                      title={mutable ? 'Edit this load' : 'Only open loads can be edited'}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                        mutable
                          ? 'bg-surface-900 hover:bg-surface-800 border-white/10 text-surface-200 hover:text-white cursor-pointer'
                          : 'bg-surface-950 border-white/5 text-surface-600 cursor-not-allowed'
                      )}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(load)}
                      disabled={!mutable || deletingId === load.id}
                      title={mutable ? 'Delete this load' : 'Only open loads can be deleted'}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                        mutable
                          ? 'bg-danger-950/40 hover:bg-danger-950/70 border-danger-900/50 text-danger-300 cursor-pointer'
                          : 'bg-surface-950 border-white/5 text-surface-600 cursor-not-allowed'
                      )}
                    >
                      {deletingId === load.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <EditLoadModal
          load={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await onRefresh?.()
          }}
        />
      )}
    </section>
  )
}

function EditLoadModal({
  load,
  onClose,
  onSaved,
}: {
  load: TransporterLoadPost
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [tonnage, setTonnage] = useState(String(load.tonnageRequired ?? ''))
  const [truckType, setTruckType] = useState(
    TRUCK_TYPE_OPTIONS.includes(load.truckType as (typeof TRUCK_TYPE_OPTIONS)[number]) ? load.truckType : 'Open'
  )
  const [maxPrice, setMaxPrice] = useState(load.maxPrice ? String(load.maxPrice) : '')
  const [urgent, setUrgent] = useState(Boolean(load.urgent))
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await loadsApi.updateLoad(load.id, {
        tonnageRequired: parseFloat(tonnage),
        truckType,
        urgent,
        ...(maxPrice.trim() ? { maxPrice: parseFloat(maxPrice) } : {}),
      })
      toast.success('Freight post updated')
      await onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update load')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Edit freight post">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-lg bg-panel border border-white/10 rounded-2xl shadow-modal p-6 space-y-5"
      >
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Edit freight post</h3>
          <p className="text-xs text-surface-400 font-mono">
            LOAD-{load.id.slice(0, 8).toUpperCase()} • {load.loadingAddress} → {load.unloadingAddress}
          </p>
          <p className="text-xs text-surface-500">Route changes require a new post — matching is geocoded at posting time.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold text-surface-300">Tonnage (T)</span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="100"
              required
              value={tonnage}
              onChange={(e) => setTonnage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-950/80 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-primary-500"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold text-surface-300">Truck type</span>
            <select
              value={truckType}
              onChange={(e) => setTruckType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-950/80 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500"
            >
              {TRUCK_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold text-surface-300">Target price (₹, optional)</span>
            <input
              type="number"
              min="1000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Open budget"
              className="w-full px-3 py-2 rounded-xl bg-surface-950/80 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-primary-500"
            />
          </label>
          <label className="flex items-center gap-2.5 pt-6 cursor-pointer">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              className="w-4 h-4 rounded accent-primary-500"
            />
            <span className="text-xs font-semibold text-surface-300">Mark urgent</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-surface-300 hover:text-white bg-surface-900 hover:bg-surface-800 border border-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary border border-primary-400/30 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{saving ? 'Saving…' : 'Save changes'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * 2. My Truck Posts — own fleet with edit/delete
 * ────────────────────────────────────────────────────────────────────────── */

interface MyTruckPostsPanelProps {
  trucks: TransporterTruckPost[]
  loading?: boolean
  currentUserId?: string | null
  onRefresh?: () => void | Promise<void>
}

export function MyTruckPostsPanel({ trucks, loading, currentUserId, onRefresh }: MyTruckPostsPanelProps) {
  const [editing, setEditing] = useState<TransporterTruckPost | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (truck: TransporterTruckPost) => {
    if (!window.confirm(`Remove lorry ${truck.registrationNumber || ''} from your fleet listing?`)) return
    setDeletingId(truck.id)
    try {
      await trucksApi.deleteTruck(truck.id)
      toast.success('Truck listing removed')
      await onRefresh?.()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete truck')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="bg-panel rounded-2xl border border-white/10 shadow-modal p-5 sm:p-7 space-y-5" aria-label="My truck posts">
      <PanelHeader
        icon={<Truck className="w-5 h-5" />}
        title="My Truck Posts"
        subtitle="Your listed fleet — edit specifications or remove a listing"
        action={
          <Link
            href="/need-vehicle"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary border border-primary-400/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Truck</span>
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <PanelSkeletonRow />
          <PanelSkeletonRow />
        </div>
      ) : trucks.length === 0 ? (
        <div className="p-8 sm:p-12 text-center space-y-3 bg-surface-950/60 rounded-2xl border border-white/5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <Truck className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">Register your first lorry</h3>
          <p className="text-xs sm:text-sm text-surface-400 max-w-md mx-auto leading-relaxed">
            List a vehicle with its RC and insurance — Vahan verification unlocks it in marketplace search for factories near its location.
          </p>
          <div className="pt-2">
            <Link
              href="/need-vehicle"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs sm:text-sm font-semibold transition-colors"
            >
              <span>Register your first lorry</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {trucks.map((truck) => {
            const own = isOwnPost(truck.userId, currentUserId)
            const deletable = own && !truck.activeBooking
            return (
              <div
                key={truck.id}
                className="p-4 rounded-xl bg-surface-950/80 border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs sm:text-sm">
                      {truck.registrationNumber || `TRUCK-${truck.id.slice(0, 8).toUpperCase()}`}
                    </span>
                    <StatusPill status={truck.verificationStatus} />
                    {truck.activeBooking && (
                      <span className="px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/20 text-xs font-semibold">
                        On trip — deletion locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-400">
                    {truck.bodyType} body • <span className="font-mono">{truck.tonnageCapacity}T</span> capacity
                    {truck.lengthFt ? <> • {truck.lengthFt}ft</> : null}
                    {truck.serviceableRadiusKm ? <> • {truck.serviceableRadiusKm}km radius</> : null}
                  </p>
                </div>

                {own && (
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setEditing(truck)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-900 hover:bg-surface-800 border border-white/10 text-surface-200 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(truck)}
                      disabled={!deletable || deletingId === truck.id}
                      title={deletable ? 'Delete this truck listing' : 'Trucks with bookings cannot be deleted'}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                        deletable
                          ? 'bg-danger-950/40 hover:bg-danger-950/70 border-danger-900/50 text-danger-300 cursor-pointer'
                          : 'bg-surface-950 border-white/5 text-surface-600 cursor-not-allowed'
                      )}
                    >
                      {deletingId === truck.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <EditTruckModal
          truck={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await onRefresh?.()
          }}
        />
      )}
    </section>
  )
}

function EditTruckModal({
  truck,
  onClose,
  onSaved,
}: {
  truck: TransporterTruckPost
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [bodyType, setBodyType] = useState(
    TRUCK_TYPE_OPTIONS.includes(truck.bodyType as (typeof TRUCK_TYPE_OPTIONS)[number]) ? truck.bodyType : 'Open'
  )
  const [capacity, setCapacity] = useState(String(truck.tonnageCapacity ?? ''))
  const [lengthFt, setLengthFt] = useState(truck.lengthFt ? String(truck.lengthFt) : '')
  const [heightFt, setHeightFt] = useState(truck.heightFt ? String(truck.heightFt) : '')
  const [radius, setRadius] = useState(truck.serviceableRadiusKm ? String(truck.serviceableRadiusKm) : '50')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await trucksApi.updateTruck(truck.id, {
        bodyType,
        tonnageCapacity: parseFloat(capacity),
        ...(lengthFt.trim() ? { lengthFt: parseInt(lengthFt, 10) } : {}),
        ...(heightFt.trim() ? { heightFt: parseInt(heightFt, 10) } : {}),
        ...(radius.trim() ? { serviceableRadiusKm: parseInt(radius, 10) } : {}),
      })
      toast.success('Truck listing updated')
      await onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update truck')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Edit truck listing">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-lg bg-panel border border-white/10 rounded-2xl shadow-modal p-6 space-y-5"
      >
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Edit truck listing</h3>
          <p className="text-xs text-surface-400 font-mono">{truck.registrationNumber || `TRUCK-${truck.id.slice(0, 8).toUpperCase()}`}</p>
          <p className="text-xs text-surface-500">Registration number is Vahan-verified and cannot be changed.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold text-surface-300">Body type</span>
            <select
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-950/80 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500"
            >
              {TRUCK_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold text-surface-300">Capacity (T)</span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="100"
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-950/80 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-primary-500"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold text-surface-300">Length (ft)</span>
            <input
              type="number"
              min="8"
              max="60"
              value={lengthFt}
              onChange={(e) => setLengthFt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-950/80 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-primary-500"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-semibold text-surface-300">Height (ft)</span>
            <input
              type="number"
              min="6"
              max="15"
              value={heightFt}
              onChange={(e) => setHeightFt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-950/80 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-primary-500"
            />
          </label>
          <label className="space-y-1.5 block col-span-2">
            <span className="text-xs font-semibold text-surface-300">Serviceable radius (km)</span>
            <input
              type="number"
              min="10"
              max="500"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-950/80 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-primary-500"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-surface-300 hover:text-white bg-surface-900 hover:bg-surface-800 border border-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-all shadow-glow-primary border border-primary-400/30 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{saving ? 'Saving…' : 'Save changes'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * 3. Marketplace shortcut — public trucks & loads, strictly read-only
 * ────────────────────────────────────────────────────────────────────────── */

const MARKETPLACE_PREVIEW_COORDS = { lat: '19.0760', lng: '72.8777' } // Mumbai

export function MarketplaceShortcutsPanel() {
  const [trucks, setTrucks] = useState<MarketplaceRow[]>([])
  const [loads, setLoads] = useState<MarketplaceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const { lat, lng } = MARKETPLACE_PREVIEW_COORDS
    const query = `lat=${lat}&lng=${lng}&radius=100`
    const rowsFrom = (
      result: PromiseSettledResult<{ data?: MarketplaceRow[] } | undefined>
    ): MarketplaceRow[] => (result.status === 'fulfilled' && Array.isArray(result.value?.data) ? result.value.data : [])
    void Promise.allSettled([
      api.get<MarketplaceRow[]>(`/search/trucks?${query}`, { signal: controller.signal }),
      api.get<MarketplaceRow[]>(`/search/loads?${query}`, { signal: controller.signal }),
    ]).then(([trucksRes, loadsRes]) => {
      if (controller.signal.aborted) return
      setTrucks(rowsFrom(trucksRes))
      setLoads(rowsFrom(loadsRes))
      setUnavailable(trucksRes.status === 'rejected' && loadsRes.status === 'rejected')
      setLoading(false)
    })
    return () => controller.abort()
  }, [])

  const marketplaces = useMemo(
    () => [
      {
        key: 'loads' as const,
        title: 'Freight loads nearby',
        description: 'Open cargo posted by factories — quote with your fleet.',
        href: '/search?type=load',
        rows: loads,
        renderRow: (row: MarketplaceRow) => (
          <>
            <span className="font-semibold text-white truncate">
              {row.loadingAddress} <span className="text-primary-400">→</span> {row.unloadingAddress}
            </span>
            <span className="text-surface-400">
              {row.tonnageRequired}T • {row.truckType}
              {row.maxPrice ? <> • <span className="font-mono text-emerald-400">{formatINR(row.maxPrice)}</span></> : null}
            </span>
          </>
        ),
      },
      {
        key: 'trucks' as const,
        title: 'Lorries nearby',
        description: 'Vahan-verified vehicles available within 100 km.',
        href: '/search?type=truck',
        rows: trucks,
        renderRow: (row: MarketplaceRow) => (
          <>
            <span className="font-semibold text-white truncate">
              {row.bodyType} body • <span className="font-mono">{row.tonnageCapacity}T</span>
            </span>
            <span className="text-surface-400">
              Verified
              {row.distanceKm ? <> • <span className="font-mono">{Number(row.distanceKm).toFixed(0)} km away</span></> : null}
            </span>
          </>
        ),
      },
    ],
    [loads, trucks]
  )

  return (
    <section className="bg-panel rounded-2xl border border-white/10 shadow-modal p-5 sm:p-7 space-y-5" aria-label="Marketplace shortcuts">
      <PanelHeader
        icon={<Search className="w-5 h-5" />}
        title="Marketplace"
        subtitle="Browse public loads and available lorries — read-only, others' posts can't be edited here"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {marketplaces.map((market) => (
          <div key={market.key} className="rounded-2xl bg-surface-950/70 border border-white/5 p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {market.key === 'loads' ? <Package className="w-4 h-4 text-primary-400" /> : <Truck className="w-4 h-4 text-emerald-400" />}
                  {market.title}
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">{market.description}</p>
              </div>
              <Link
                href={market.href}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary-400 hover:text-primary-300 shrink-0"
              >
                <span>View all</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <PanelSkeletonRow />
            ) : unavailable ? (
              <p className="text-xs text-surface-500 py-2">
                Live marketplace preview is unavailable right now — open search to browse.
              </p>
            ) : market.rows.length === 0 ? (
              <p className="text-xs text-surface-500 py-2">
                Nothing listed within 100 km of the preview location yet — open search to widen the area.
              </p>
            ) : (
              <ul className="space-y-2">
                {market.rows.slice(0, 3).map((row) => (
                  <li
                    key={row.id}
                    className="p-3 rounded-xl bg-panel/80 border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 text-xs space-y-0.5">{market.renderRow(row)}</div>
                    <Link
                      href={market.href}
                      className="px-2.5 py-1 rounded-lg bg-surface-900 hover:bg-surface-800 border border-white/10 text-surface-200 text-[11px] font-bold shrink-0 transition-colors"
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-surface-500 flex items-center gap-1.5">
        <Briefcase className="w-3.5 h-3.5 shrink-0" />
        Marketplace entries belong to other operators: contact details unlock on match, and edit/delete only exists on your own posts.
      </p>
    </section>
  )
}
