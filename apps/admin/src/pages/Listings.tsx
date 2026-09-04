import React, { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Truck,
  ShieldCheck,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Award,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatPhone, cn } from '../lib/utils'

interface Stats {
  totalLoads: number
  totalTrucks: number
  totalBookings: number
  pendingDocuments: number
}

interface PendingDoc {
  id: string
  type: string
  truck: {
    id: string
    registrationNumber: string
    bodyType: string
    user: { name: string | null; phone: string }
  }
}

interface TruckGroup {
  truckId: string
  registrationNumber: string
  bodyType: string
  ownerName: string | null
  ownerPhone: string
  pendingDocs: number
}

interface UserContributor {
  id: string
  name: string | null
  phone: string
  role: string
  _count: { loads: number; trucks: number; subscriptions: number }
}

interface VerifyModalState {
  truckId: string
  registration: string
  action: 'Verified' | 'Rejected'
}

export function Listings() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [truckGroups, setTruckGroups] = useState<TruckGroup[]>([])
  const [contributors, setContributors] = useState<UserContributor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifyModal, setVerifyModal] = useState<VerifyModalState | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, docsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/documents/pending'),
        api.get('/admin/users?limit=100'),
      ])

      setStats({
        totalLoads: statsRes.data.totalLoads,
        totalTrucks: statsRes.data.totalTrucks,
        totalBookings: statsRes.data.totalBookings,
        pendingDocuments: statsRes.data.pendingDocuments,
      })

      // Group pending documents by truck
      const docs: PendingDoc[] = docsRes.data
      const groupMap = new Map<string, TruckGroup>()
      docs.forEach((doc) => {
        const existing = groupMap.get(doc.truck.id)
        if (existing) {
          existing.pendingDocs += 1
        } else {
          groupMap.set(doc.truck.id, {
            truckId: doc.truck.id,
            registrationNumber: doc.truck.registrationNumber,
            bodyType: doc.truck.bodyType,
            ownerName: doc.truck.user.name,
            ownerPhone: doc.truck.user.phone,
            pendingDocs: 1,
          })
        }
      })
      setTruckGroups(Array.from(groupMap.values()))

      // Top contributors
      const users: UserContributor[] = usersRes.data.users
      const sorted = [...users]
        .sort((a, b) => b._count.loads + b._count.trucks - (a._count.loads + a._count.trucks))
        .slice(0, 10)
      setContributors(sorted)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch listings information'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleTruckVerify = async () => {
    if (!verifyModal) return
    setActionLoading(verifyModal.truckId)
    setStatusMessage(null)

    try {
      await api.patch(`/admin/trucks/${verifyModal.truckId}/verify`, {
        status: verifyModal.action,
      })
      setTruckGroups((prev) => prev.filter((t) => t.truckId !== verifyModal.truckId))
      setStatusMessage({
        text: `Truck ${verifyModal.registration} has been marked as ${verifyModal.action.toLowerCase()}.`,
        type: 'success',
      })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update truck status'
      setStatusMessage({ text: msg, type: 'error' })
    } finally {
      setActionLoading(null)
      setVerifyModal(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-surface-800 rounded w-48"></div>
          <div className="h-9 bg-surface-800 rounded w-24"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface-800 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-surface-800 rounded-xl"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-12 text-center flex flex-col items-center">
        <AlertCircle className="w-12 h-12 text-danger-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Failed to load Listings</h2>
        <p className="text-surface-400 text-sm max-w-md mb-6">{error}</p>
        <button onClick={fetchData} className="btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Listings & Fleet Overview</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Freight loads, registered vehicles, and marketplace contributor stats
          </p>
        </div>
        <button
          onClick={fetchData}
          className="btn-secondary flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Data
        </button>
      </div>

      {/* Notification Toast Banner */}
      {statusMessage && (
        <div
          className={cn(
            'p-4 rounded-xl text-sm font-medium flex items-center justify-between',
            statusMessage.type === 'success'
              ? 'bg-success-500/15 text-success-400 border border-success-500/30'
              : 'bg-danger-500/15 text-danger-400 border border-danger-500/30'
          )}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs underline opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border-l-4 border-l-warning-500">
            <div className="p-2 rounded-lg bg-warning-500/10 w-fit mb-2">
              <Package className="w-4 h-4 text-warning-400" />
            </div>
            <p className="text-2xl font-black text-white">{stats.totalLoads}</p>
            <p className="text-xs text-surface-400 font-medium">Total Loads Posted</p>
          </div>

          <div className="card p-4 border-l-4 border-l-success-500">
            <div className="p-2 rounded-lg bg-success-500/10 w-fit mb-2">
              <Truck className="w-4 h-4 text-success-400" />
            </div>
            <p className="text-2xl font-black text-white">{stats.totalTrucks}</p>
            <p className="text-xs text-surface-400 font-medium">Total Trucks Registered</p>
          </div>

          <div className="card p-4 border-l-4 border-l-danger-500">
            <div className="p-2 rounded-lg bg-danger-500/10 w-fit mb-2">
              <ShieldCheck className="w-4 h-4 text-danger-400" />
            </div>
            <p className="text-2xl font-black text-white">{stats.pendingDocuments}</p>
            <p className="text-xs text-surface-400 font-medium">Pending KYC Documents</p>
          </div>

          <div className="card p-4 border-l-4 border-l-primary-500">
            <div className="p-2 rounded-lg bg-primary-500/10 w-fit mb-2">
              <CalendarDays className="w-4 h-4 text-primary-400" />
            </div>
            <p className="text-2xl font-black text-white">{stats.totalBookings}</p>
            <p className="text-xs text-surface-400 font-medium">Completed Bookings</p>
          </div>
        </div>
      )}

      {/* Trucks Pending Direct Verification */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-warning-400" />
            <h2 className="text-sm font-bold text-white">Trucks Pending Verification</h2>
          </div>
          <span className="badge bg-warning-500/10 text-warning-400 border border-warning-500/20">
            {truckGroups.length} pending
          </span>
        </div>

        {truckGroups.length === 0 ? (
          <div className="py-12 text-center text-surface-400 text-sm flex flex-col items-center">
            <CheckCircle2 className="w-10 h-10 text-success-400 mb-2" />
            All registered trucks are verified and active in the marketplace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-800/80 border-b border-surface-700/60 text-[10px] font-bold uppercase tracking-wider text-surface-400">
                  <th className="text-left px-6 py-3.5">Registration Number</th>
                  <th className="text-left px-6 py-3.5">Body Type</th>
                  <th className="text-left px-6 py-3.5">Owner Details</th>
                  <th className="text-left px-6 py-3.5">Pending Docs</th>
                  <th className="text-right px-6 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/40">
                {truckGroups.map((t) => (
                  <tr key={t.truckId} className="hover:bg-surface-700/20 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-white text-xs">
                      {t.registrationNumber}
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge bg-surface-700 text-surface-200">
                        {t.bodyType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">{t.ownerName || '—'}</p>
                      <p className="text-xs text-surface-400 font-mono">{formatPhone(t.ownerPhone)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge bg-warning-500/10 text-warning-400 border border-warning-500/20">
                        {t.pendingDocs} pending doc{t.pendingDocs !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={actionLoading === t.truckId}
                          onClick={() => setVerifyModal({ truckId: t.truckId, registration: t.registrationNumber, action: 'Verified' })}
                          className="btn-primary text-xs py-1.5 px-3 bg-success-600 hover:bg-success-700 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verify
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === t.truckId}
                          onClick={() => setVerifyModal({ truckId: t.truckId, registration: t.registrationNumber, action: 'Rejected' })}
                          className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Marketplace Contributors */}
      {contributors.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-700/60 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-400" />
            <h2 className="text-sm font-bold text-white">Top Marketplace Contributors</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-800/80 border-b border-surface-700/60 text-[10px] font-bold uppercase tracking-wider text-surface-400">
                  <th className="text-left px-6 py-3.5">User</th>
                  <th className="text-left px-6 py-3.5">Role</th>
                  <th className="text-center px-6 py-3.5">Loads Posted</th>
                  <th className="text-center px-6 py-3.5">Trucks Registered</th>
                  <th className="text-center px-6 py-3.5">Subscriptions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/40">
                {contributors.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-700/20 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-white">{u.name || formatPhone(u.phone)}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={cn(
                          'badge font-semibold',
                          u.role === 'factory_owner'
                            ? 'bg-info-500/10 text-info-400 border border-info-500/20'
                            : u.role === 'truck_driver'
                            ? 'bg-success-500/10 text-success-400 border border-success-500/20'
                            : 'bg-danger-500/10 text-danger-400 border border-danger-500/20'
                        )}
                      >
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold text-white">{u._count.loads}</td>
                    <td className="px-6 py-3.5 text-center font-bold text-white">{u._count.trucks}</td>
                    <td className="px-6 py-3.5 text-center font-bold text-white">{u._count.subscriptions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {verifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setVerifyModal(null)} />
          <div className="relative z-10 w-full max-w-md bg-surface-800 border border-surface-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {verifyModal.action === 'Verified' ? 'Verify Truck' : 'Reject Truck'}
            </h3>
            <p className="text-sm text-surface-300">
              {verifyModal.action === 'Verified'
                ? `Confirm manual verification for truck ${verifyModal.registration}. This will mark the vehicle as verified in the marketplace.`
                : `Are you sure you want to reject truck ${verifyModal.registration}?`}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setVerifyModal(null)} className="btn-secondary text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={handleTruckVerify}
                className={cn(
                  'text-sm font-semibold py-2 px-4 rounded-button shadow-sm text-white',
                  verifyModal.action === 'Verified'
                    ? 'bg-success-600 hover:bg-success-700'
                    : 'bg-danger-600 hover:bg-danger-700'
                )}
              >
                {actionLoading ? 'Processing...' : verifyModal.action === 'Verified' ? 'Confirm Verification' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Listings
