'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import { loadsApi, trucksApi } from '@/lib/api'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Select,
  Skeleton,
  Tabs,
  type BadgeVariant,
} from '@/components/ui'
import { EditLoadModal } from '@/components/freight/EditLoadModal'
import { toast } from '@/lib/toast'
import { formatINR, timeAgo } from '@/lib/utils'
import { getListingsAccess, type ListingsTabKey } from '@/lib/roles'

/**
 * MyListingsWorkspace — unified "My Listings" page for /my-listings (Prompt 8).
 *
 * Transporters operate both sides of the marketplace, so this screen puts their
 * freight posts and truck posts behind two tabs in one place. Other roles see
 * the tab they manage as the default; the opposite tab renders an onboarding
 * CTA ("Register as transporter") rather than a request the API would reject
 * (see `getListingsAccess` in @/lib/roles).
 *
 * Ownership: the `/loads/my-loads` and `/trucks/my-trucks` endpoints only ever
 * return the signed-in user's rows and every mutation re-checks ownership
 * server-side. The `isOwnRecord` gate below is defence in depth — a foreign
 * row leaking into a list can never render Edit/Delete here.
 *
 * All surfaces use the design system primitives (Card, Badge, Button, Tabs,
 * EmptyState, ErrorState, ConfirmDialog, Modal-backed editors) so the page
 * follows the active theme without bespoke colours.
 */

/** Row shape returned by `GET /loads/my-loads` (subset this page renders). */
export interface ListingLoadRow {
  id: string
  userId?: string
  loadingAddress: string
  unloadingAddress: string
  loadingPin?: string | null
  unloadingPin?: string | null
  tonnageRequired: number | string
  truckType: string
  status: string
  urgent?: boolean
  maxPrice?: number | string | null
  minLengthFt?: number | string | null
  minHeightFt?: number | string | null
  expectedDeliveryAt?: string | null
  distanceKm?: number | null
  createdAt: string
  _count?: { bookings?: number }
}

/** Row shape returned by `GET /trucks/my-trucks` (subset this page renders). */
export interface ListingTruckRow {
  id: string
  userId?: string
  registrationNumber?: string | null
  bodyType: string
  lengthFt?: number | null
  heightFt?: number | null
  tonnageCapacity: number | string
  serviceableRadiusKm?: number | null
  verificationStatus: string
  vahanValidatedAt?: string | null
  currentLocationName?: string | null
  preferredDestinations?: string[] | null
  createdAt?: string
  documents?: Array<{ id: string; type: string; verificationStatus: string }>
}

/**
 * Rows from the ownership-scoped endpoints that carry a `userId` must match
 * the session user before destructive controls render; a missing `userId` is
 * trusted as an own row because the list endpoint itself is owner-scoped.
 */
export function isOwnRecord(
  rowUserId: string | undefined,
  currentUserId?: string | null
): boolean {
  if (!rowUserId) return true
  return !currentUserId || rowUserId === currentUserId
}

const LOAD_STATUS_TONE: Record<string, BadgeVariant> = {
  Open: 'info',
  Matched: 'warning',
  Assigned: 'primary',
  Booked: 'primary',
  Pickup: 'primary',
  InTransit: 'primary',
  Delivered: 'success',
  Completed: 'success',
  Cancelled: 'danger',
}

const VERIFICATION_TONE: Record<string, BadgeVariant> = {
  Verified: 'success',
  Pending: 'warning',
  Rejected: 'danger',
}

function loadStatusLabel(status: string): string {
  if (status === 'InTransit') return 'In transit'
  return status
}

/* ──────────────────────────────────────────────────────────────────────────
 * Freight Posts tab — own loads with status + edit/delete
 * ────────────────────────────────────────────────────────────────────────── */

interface FreightPanelProps {
  loads: ListingLoadRow[]
  loading: boolean
  error?: string
  currentUserId?: string | null
  onRetry: () => void | Promise<void>
  onRefresh: () => void | Promise<void>
}

export function ListingsFreightPanel({
  loads,
  loading,
  error,
  currentUserId,
  onRetry,
  onRefresh,
}: FreightPanelProps) {
  const [editing, setEditing] = useState<ListingLoadRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ListingLoadRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await loadsApi.deleteLoad(deleteTarget.id)
      toast.success('Freight post removed')
      setDeleteTarget(null)
      await onRefresh()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete load')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section aria-label="Freight posts" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Your posted cargo — edit or remove a load while it is still <span className="font-semibold text-ink">Open</span>.
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/my-loads"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            <span>Full load manager</span>
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          <Button as="a" href="/post-load" size="sm" leftIcon={<PlusCircleIcon className="w-4 h-4" />}>
            Post freight
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton.Card />
          <Skeleton.Card />
        </div>
      ) : error ? (
        <ErrorState title="Could not load your freight posts" message={error} onRetry={onRetry} />
      ) : loads.length === 0 ? (
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title="No freight posts yet"
          description="Publish the cargo you need moved and verified lorries within 50 km of the pickup point will see it."
          primaryAction={{ label: 'Post your first load', href: '/post-load' }}
          secondaryAction={{ label: 'Browse the marketplace', href: '/search?type=truck' }}
        />
      ) : (
        <ul className="space-y-3">
          {loads.map((load) => {
            const own = isOwnRecord(load.userId, currentUserId)
            // Server refuses load edits once a load leaves Open — mirror it here.
            const mutable = own && load.status === 'Open'
            return (
              <li key={load.id}>
                <Card padding="sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="neutral" size="sm">
                          <span className="font-mono">LOAD-{load.id.slice(0, 8).toUpperCase()}</span>
                        </Badge>
                        <Badge variant={LOAD_STATUS_TONE[load.status] ?? 'default'} size="sm" dot>
                          {loadStatusLabel(load.status)}
                        </Badge>
                        {load.urgent && (
                          <Badge variant="danger" size="sm">
                            Urgent
                          </Badge>
                        )}
                        {load.createdAt && (
                          <span className="text-xs text-subtle">{timeAgo(load.createdAt)}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-ink">
                        {load.loadingAddress}
                        <span className="text-primary-500 mx-1.5" aria-hidden="true">→</span>
                        {load.unloadingAddress}
                      </p>
                      <p className="text-xs text-muted">
                        <span className="font-mono text-body">{load.tonnageRequired}T</span> • {load.truckType}
                        {load.maxPrice ? (
                          <>
                            {' '}• target <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatINR(load.maxPrice)}</span>
                          </>
                        ) : null}
                        {load.distanceKm ? <> • {load.distanceKm} km</> : null}
                        {typeof load._count?.bookings === 'number' ? (
                          <> • {load._count.bookings} quote{load._count.bookings === 1 ? '' : 's'}</>
                        ) : null}
                      </p>
                    </div>

                    {mutable && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<PencilSquareIcon className="w-4 h-4" />}
                          onClick={() => setEditing(load)}
                          aria-label={`Edit load ${load.loadingAddress} to ${load.unloadingAddress}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<TrashIcon className="w-4 h-4" />}
                          onClick={() => setDeleteTarget(load)}
                          className="text-danger-600 dark:text-danger-400 border-danger-500/25 hover:bg-danger-500/5"
                          aria-label={`Delete load ${load.loadingAddress} to ${load.unloadingAddress}`}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                    {own && !mutable && (
                      <span className="text-[11px] text-subtle shrink-0 self-end sm:self-center">
                        {load.status === 'Cancelled' ? 'Cancelled — locked' : 'Locked from edits once matched'}
                      </span>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {/* Owner-only editor for an open load (design-system Modal form). */}
      {editing && (
        <EditLoadModal
          load={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await onRefresh()
          }}
        />
      )}

      {/* Destructive actions always confirm. */}
      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => (deleting ? undefined : setDeleteTarget(null))}
          onConfirm={handleDelete}
          title="Delete this load?"
          destructive
          loading={deleting}
          confirmLabel="Delete load"
          message={
            <>
              This permanently removes{' '}
              <span className="font-semibold text-ink">
                {deleteTarget.loadingAddress} → {deleteTarget.unloadingAddress}
              </span>{' '}
              from the marketplace. Nearby lorries will no longer see this freight,
              and this cannot be undone.
            </>
          }
        />
      )}
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Truck Posts tab — own fleet with verification status + edit/delete
 * ────────────────────────────────────────────────────────────────────────── */

const TRUCK_BODY_TYPES = ['Open', 'Container', 'OpenBody'] as const

interface EditTruckModalProps {
  truck: ListingTruckRow
  onClose: () => void
  onSaved: () => void | Promise<void>
}

/**
 * Compact, spec-only truck editor. The registration number is Vahan-verified
 * and immutable; location moves go through the dedicated re-geocoding
 * endpoint so proximity matching re-runs (mirrors /my-trucks).
 */
function EditTruckModal({ truck, onClose, onSaved }: EditTruckModalProps) {
  const [bodyType, setBodyType] = useState(
    TRUCK_BODY_TYPES.includes(truck.bodyType as (typeof TRUCK_BODY_TYPES)[number]) ? truck.bodyType : 'Open'
  )
  const [capacity, setCapacity] = useState(String(truck.tonnageCapacity ?? ''))
  const [lengthFt, setLengthFt] = useState(truck.lengthFt ? String(truck.lengthFt) : '')
  const [heightFt, setHeightFt] = useState(truck.heightFt ? String(truck.heightFt) : '')
  const [radius, setRadius] = useState(truck.serviceableRadiusKm ? String(truck.serviceableRadiusKm) : '50')
  const [destinations, setDestinations] = useState((truck.preferredDestinations || []).join(', '))
  const [location, setLocation] = useState(truck.currentLocationName || '')
  const [saving, setSaving] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await trucksApi.updateTruck(truck.id, {
        bodyType,
        tonnageCapacity: parseFloat(capacity) || undefined,
        lengthFt: lengthFt.trim() ? parseFloat(lengthFt) : undefined,
        heightFt: heightFt.trim() ? parseFloat(heightFt) : undefined,
        serviceableRadiusKm: radius.trim() ? parseFloat(radius) : undefined,
        preferredDestinations: destinations
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
      })

      const newLocation = location.trim()
      if (newLocation && newLocation !== (truck.currentLocationName || '')) {
        await trucksApi.updateTruckLocation(truck.id, newLocation)
      }

      toast.success('Truck listing updated')
      await onSaved()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update truck listing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Edit vehicle specifications"
      description={`${
        truck.registrationNumber || `TRUCK-${truck.id.slice(0, 8).toUpperCase()}`
      } — registration is Vahan-verified and cannot be changed.`}
    >
      <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Body type" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
              <option value="Open">Open body lorry</option>
              <option value="Container">Closed container</option>
              <option value="OpenBody">Open body trailer</option>
            </Select>
            <Input
              label="Payload capacity (T)"
              type="number"
              step="0.5"
              min="0.5"
              max="100"
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
            <Input
              label="Deck length (ft)"
              type="number"
              min="8"
              value={lengthFt}
              onChange={(e) => setLengthFt(e.target.value)}
              placeholder="24"
            />
            <Input
              label="Deck height (ft)"
              type="number"
              min="6"
              value={heightFt}
              onChange={(e) => setHeightFt(e.target.value)}
              placeholder="8"
            />
            <Input
              label="Serviceable radius (km)"
              type="number"
              min="10"
              max="500"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              hint="How far from base you accept trips."
            />
            <Input
              label="Current location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bhiwandi, Maharashtra"
              hint="Changing this re-geocodes the vehicle and re-runs matching."
            />
            <div className="sm:col-span-2">
              <Input
                label="Preferred corridors (comma-separated)"
                value={destinations}
                onChange={(e) => setDestinations(e.target.value)}
                placeholder="Mumbai, Pune, Bengaluru"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} loadingText="Saving…">
              Save changes
            </Button>
          </div>
      </form>
    </Modal>
  )
}

interface TruckPanelProps {
  trucks: ListingTruckRow[]
  loading: boolean
  error?: string
  currentUserId?: string | null
  onRetry: () => void | Promise<void>
  onRefresh: () => void | Promise<void>
}

export function ListingsTruckPanel({
  trucks,
  loading,
  error,
  currentUserId,
  onRetry,
  onRefresh,
}: TruckPanelProps) {
  const [editing, setEditing] = useState<ListingTruckRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ListingTruckRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await trucksApi.deleteTruck(deleteTarget.id)
      toast.success('Truck listing removed')
      setDeleteTarget(null)
      await onRefresh()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete truck')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section aria-label="Truck posts" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Your listed fleet — keep specs current; verified listings win more match requests.
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/my-trucks"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            <span>Fleet manager</span>
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          <Button as="a" href="/need-vehicle" size="sm" leftIcon={<PlusCircleIcon className="w-4 h-4" />}>
            Register truck
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton.Card />
          <Skeleton.Card />
        </div>
      ) : error ? (
        <ErrorState title="Could not load your truck posts" message={error} onRetry={onRetry} />
      ) : trucks.length === 0 ? (
        <EmptyState
          icon={TruckIcon}
          title="No trucks listed yet"
          description="Register a vehicle with its RC and insurance — Vahan verification unlocks it in marketplace search for factories nearby."
          primaryAction={{ label: 'Register your first truck', href: '/need-vehicle' }}
          secondaryAction={{ label: 'Upload documents later in Documents', href: '/documents' }}
        />
      ) : (
        <ul className="space-y-3">
          {trucks.map((truck) => {
            const own = isOwnRecord(truck.userId, currentUserId)
            const verification = VERIFICATION_TONE[truck.verificationStatus] ?? 'default'
            const docCount = truck.documents?.length ?? 0
            return (
              <li key={truck.id}>
                <Card padding="sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-ink text-sm sm:text-base">
                          {truck.registrationNumber || `TRUCK-${truck.id.slice(0, 8).toUpperCase()}`}
                        </span>
                        <Badge variant={verification} size="sm" dot>
                          {truck.verificationStatus === 'Verified'
                            ? 'Vahan verified'
                            : `${truck.verificationStatus} verification`}
                        </Badge>
                        {truck.vahanValidatedAt && (
                          <span className="text-xs text-subtle">checked {timeAgo(truck.vahanValidatedAt)}</span>
                        )}
                        {truck.createdAt && !truck.vahanValidatedAt && (
                          <span className="text-xs text-subtle">{timeAgo(truck.createdAt)}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted">
                        {truck.bodyType === 'Open'
                          ? 'Open body'
                          : truck.bodyType === 'Container'
                          ? 'Closed container'
                          : truck.bodyType === 'OpenBody'
                          ? 'Open body trailer'
                          : truck.bodyType}{' '}
                        • <span className="font-mono text-body">{truck.tonnageCapacity}T</span> capacity
                        {truck.lengthFt ? <> • {truck.lengthFt}ft × {truck.heightFt || 8}ft deck</> : null}
                        {truck.serviceableRadiusKm ? (
                          <> • <span className="font-mono">{truck.serviceableRadiusKm} km</span> radius</>
                        ) : null}
                        {truck.currentLocationName ? <> • near {truck.currentLocationName}</> : null}
                        {docCount > 0 ? <> • {docCount} document{docCount === 1 ? '' : 's'} on file</> : null}
                      </p>
                      {truck.preferredDestinations && truck.preferredDestinations.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                            Corridors
                          </span>
                          {truck.preferredDestinations.map((dest) => (
                            <span
                              key={dest}
                              className="px-2 py-0.5 rounded-badge bg-sunken border border-hairline text-[11px] font-medium text-body"
                            >
                              {dest}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {own && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<PencilSquareIcon className="w-4 h-4" />}
                          onClick={() => setEditing(truck)}
                          aria-label={`Edit truck ${truck.registrationNumber || truck.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<TrashIcon className="w-4 h-4" />}
                          onClick={() => setDeleteTarget(truck)}
                          className="text-danger-600 dark:text-danger-400 border-danger-500/25 hover:bg-danger-500/5"
                          aria-label={`Delete truck ${truck.registrationNumber || truck.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <EditTruckModal
          truck={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await onRefresh()
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => (deleting ? undefined : setDeleteTarget(null))}
          onConfirm={handleDelete}
          title="Delete this vehicle listing?"
          destructive
          loading={deleting}
          confirmLabel="Delete vehicle"
          message={
            <>
              This permanently removes{' '}
              <span className="font-mono font-semibold text-ink">
                {deleteTarget.registrationNumber || deleteTarget.id}
              </span>{' '}
              from your fleet and the marketplace — it stops being matched to freight
              immediately. Trucks with active or past bookings cannot be deleted, and
              this action cannot be undone.
            </>
          }
        />
      )}
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * CTA panel — the side the current role cannot manage (product decision:
 * keep the tab visible with an onboarding path rather than hiding it).
 * ────────────────────────────────────────────────────────────────────────── */

interface ListingsRoleCtaProps {
  side: ListingsTabKey
}

export function ListingsRoleCta({ side }: ListingsRoleCtaProps) {
  if (side === 'trucks') {
    return (
      <EmptyState
        icon={TruckIcon}
        title="List trucks with a Transporter account"
        description="Factory-owner accounts post freight only. A Transporter account can list its fleet here too — Vahan verification, corridor preferences and return-load matching included."
        primaryAction={{ label: 'Register as transporter', href: '/role-select' }}
        secondaryAction={{ label: 'Find trucks to hire instead', href: '/search?type=truck' }}
      />
    )
  }
  return (
    <EmptyState
      icon={ClipboardDocumentListIcon}
      title="Post freight with a Transporter account"
      description="Driving accounts find and carry loads. A Transporter account can also publish cargo — handy when you move more than your own fleet can carry."
      primaryAction={{ label: 'Register as transporter', href: '/role-select' }}
      secondaryAction={{ label: 'Find loads to carry', href: '/search?type=load' }}
    />
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Workspace container — tabs, data loading, role gating
 * ────────────────────────────────────────────────────────────────────────── */

export interface MyListingsWorkspaceProps {
  /** Canonical or legacy role label from the session (normalized internally). */
  role?: string | null
  /** Signed-in user id used for the client-side ownership gate. */
  currentUserId?: string | null
  /** False while the page is still resolving the session; renders skeletons. */
  resolved?: boolean
}

const VALID_TABS: ListingsTabKey[] = ['freight', 'trucks']

export function MyListingsWorkspace({ role, currentUserId, resolved = true }: MyListingsWorkspaceProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const access = useMemo(() => getListingsAccess(role), [role])

  const tabParam = searchParams?.get('tab') as ListingsTabKey | null
  const activeTab: ListingsTabKey =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : access.defaultTab

  const setTab = useCallback(
    (tab: string) => {
      const next = VALID_TABS.includes(tab as ListingsTabKey) ? tab : 'freight'
      const url = `${pathname || '/my-listings'}?tab=${next}`
      router.replace(url, { scroll: false })
    },
    [pathname, router]
  )

  const [loads, setLoads] = useState<ListingLoadRow[]>([])
  const [freightLoading, setFreightLoading] = useState(false)
  const [freightError, setFreightError] = useState('')

  const [trucks, setTrucks] = useState<ListingTruckRow[]>([])
  const [fleetLoading, setFleetLoading] = useState(false)
  const [fleetError, setFleetError] = useState('')

  /**
   * Fetch only the sides this role is allowed to open — the API returns 403
   * for the other side (`@Roles` on both my-loads and my-trucks), and the tab
   * renders the onboarding CTA instead of data anyway.
   */
  const fetchFreight = useCallback(async () => {
    setFreightLoading(true)
    setFreightError('')
    try {
      const res = await loadsApi.getMyLoads()
      setLoads(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
      setFreightError(err?.response?.data?.message || 'Failed to load your freight posts.')
    } finally {
      setFreightLoading(false)
    }
  }, [])

  const fetchFleet = useCallback(async () => {
    setFleetLoading(true)
    setFleetError('')
    try {
      const res = await trucksApi.getMyTrucks()
      setTrucks(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
      setFleetError(err?.response?.data?.message || 'Failed to load your truck listings.')
    } finally {
      setFleetLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!resolved) return
    if (access.canFreight) void fetchFreight()
    if (access.canFleet) void fetchFleet()
  }, [resolved, access.canFreight, access.canFleet, fetchFreight, fetchFleet])

  const tabItems = [
    {
      id: 'freight',
      label: 'Freight Posts',
      icon: ClipboardDocumentListIcon,
      count: access.canFreight && !freightLoading ? loads.length : undefined,
    },
    {
      id: 'trucks',
      label: 'Truck Posts',
      icon: TruckIcon,
      count: access.canFleet && !fleetLoading ? trucks.length : undefined,
    },
  ]

  if (!resolved) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading your listings">
        <Skeleton className="h-10 w-72" />
        <Skeleton.Card />
        <Skeleton.Card />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Tabs items={tabItems} value={activeTab} onChange={setTab} variant="underline" ariaLabel="Listing types" />

      <div role="tabpanel" aria-label={activeTab === 'freight' ? 'Freight posts' : 'Truck posts'} className="animate-fade-in">
        {activeTab === 'freight' ? (
          access.canFreight ? (
            <ListingsFreightPanel
              loads={loads}
              loading={freightLoading}
              error={freightError}
              currentUserId={currentUserId}
              onRetry={fetchFreight}
              onRefresh={fetchFreight}
            />
          ) : (
            <ListingsRoleCta side="freight" />
          )
        ) : access.canFleet ? (
          <ListingsTruckPanel
            trucks={trucks}
            loading={fleetLoading}
            error={fleetError}
            currentUserId={currentUserId}
            onRetry={fetchFleet}
            onRefresh={fetchFleet}
          />
        ) : (
          <ListingsRoleCta side="trucks" />
        )}
      </div>
    </div>
  )
}

export default MyListingsWorkspace
