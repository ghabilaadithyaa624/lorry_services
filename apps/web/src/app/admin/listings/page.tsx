'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CubeIcon,
  TruckIcon,
  DocumentCheckIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { Badge, Button, Modal, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatPhone } from '@/lib/utils'

interface Stats {
  totalLoads: number
  totalTrucks: number
  totalBookings: number
  pendingDocuments: number
}

interface PendingDoc {
  id: string
  type: string
  docNumber: string | null
  s3Url: string
  createdAt: string
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

interface UserSummary {
  id: string
  name: string | null
  phone: string
  role: string
  _count: { loads: number; trucks: number; subscriptions: number }
}

interface VerifyState {
  truckId: string
  registration: string
  action: 'Verified' | 'Rejected'
}

export default function ListingsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [truckGroups, setTruckGroups] = useState<TruckGroup[]>([])
  const [topUsers, setTopUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifyModal, setVerifyModal] = useState<VerifyState | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

      // Group pending docs by truck
      const docs: PendingDoc[] = docsRes.data
      const groupMap = new Map<string, TruckGroup>()
      docs.forEach(doc => {
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

      // Top contributing users
      const users: UserSummary[] = usersRes.data.users
      const sorted = [...users]
        .sort((a, b) => (b._count.loads + b._count.trucks) - (a._count.loads + a._count.trucks))
        .slice(0, 10)
      setTopUsers(sorted)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load listings data'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTruckVerify = async () => {
    if (!verifyModal) return
    setActionLoading(verifyModal.truckId)
    try {
      await api.patch(`/admin/trucks/${verifyModal.truckId}/verify`, { status: verifyModal.action })
      toast.success(`Truck ${verifyModal.registration} ${verifyModal.action === 'Verified' ? 'verified' : 'rejected'}`)
      setTruckGroups(prev => prev.filter(t => t.truckId !== verifyModal.truckId))
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { message?: string } } })?.response?.data
      toast.error(errorData?.message || 'Failed to update truck status')
    } finally {
      setActionLoading(null)
      setVerifyModal(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton width={200} className="h-7" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="h-24 rounded-card" />
          ))}
        </div>
        <Skeleton variant="rectangular" className="h-48 rounded-card" />
        <Skeleton variant="rectangular" className="h-48 rounded-card" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mb-4" />
        <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Failed to load listings</h3>
        <p className="text-sm text-surface-500 mb-6">{error}</p>
        <button onClick={fetchData} className="btn-primary flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">Listings</h1>
          <p className="text-sm text-surface-500 mt-0.5">Loads, trucks, and marketplace overview</p>
        </div>
        <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm self-start">
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border-l-4 border-l-warning-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-warning-50 dark:bg-warning-500/10 flex items-center justify-center">
                <CubeIcon className="w-5 h-5 text-warning-600" />
              </div>
            </div>
            <p className="text-2xl font-black text-surface-900 dark:text-white">{stats.totalLoads}</p>
            <p className="text-xs text-surface-500 font-medium">Total Loads</p>
          </div>
          <div className="card p-4 border-l-4 border-l-success-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-success-50 dark:bg-success-500/10 flex items-center justify-center">
                <TruckIcon className="w-5 h-5 text-success-600" />
              </div>
            </div>
            <p className="text-2xl font-black text-surface-900 dark:text-white">{stats.totalTrucks}</p>
            <p className="text-xs text-surface-500 font-medium">Total Trucks</p>
          </div>
          <div className="card p-4 border-l-4 border-l-danger-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-danger-50 dark:bg-danger-500/10 flex items-center justify-center">
                <DocumentCheckIcon className="w-5 h-5 text-danger-600" />
              </div>
            </div>
            <p className="text-2xl font-black text-surface-900 dark:text-white">{stats.pendingDocuments}</p>
            <p className="text-xs text-surface-500 font-medium">Pending KYC</p>
          </div>
          <div className="card p-4 border-l-4 border-l-primary-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                <CalendarDaysIcon className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            <p className="text-2xl font-black text-surface-900 dark:text-white">{stats.totalBookings}</p>
            <p className="text-xs text-surface-500 font-medium">Total Bookings</p>
          </div>
        </div>
      )}

      {/* Trucks Pending Verification */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-warning-500" />
            <h2 className="text-sm font-bold text-surface-900 dark:text-white">Trucks Pending Verification</h2>
          </div>
          <Badge variant="warning" size="sm">{truckGroups.length}</Badge>
        </div>
        {truckGroups.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircleIcon className="w-10 h-10 text-success-400 mx-auto mb-3" />
            <p className="text-sm text-surface-500">All trucks are verified or have no pending docs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-700">
                  {['Registration', 'Type', 'Owner', 'Pending Docs', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {truckGroups.map(t => (
                  <tr key={t.truckId} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-surface-900 dark:text-white">{t.registrationNumber}</td>
                    <td className="px-4 py-3"><Badge variant="default" size="sm">{t.bodyType}</Badge></td>
                    <td className="px-4 py-3">
                      <p className="text-surface-900 dark:text-white text-xs font-medium">{t.ownerName || '—'}</p>
                      <p className="text-xs text-surface-500">{formatPhone(t.ownerPhone)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="warning" size="sm">{t.pendingDocs} pending</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="primary" size="sm" disabled={actionLoading === t.truckId}
                          onClick={() => setVerifyModal({ truckId: t.truckId, registration: t.registrationNumber, action: 'Verified' })}
                          leftIcon={<CheckCircleIcon className="w-4 h-4" />}>
                          Verify
                        </Button>
                        <Button variant="danger" size="sm" disabled={actionLoading === t.truckId}
                          onClick={() => setVerifyModal({ truckId: t.truckId, registration: t.registrationNumber, action: 'Rejected' })}
                          leftIcon={<XCircleIcon className="w-4 h-4" />}>
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Contributors */}
      {topUsers.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-800">
            <h2 className="text-sm font-bold text-surface-900 dark:text-white">Top Contributors</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-700">
                  {['User', 'Role', 'Loads', 'Trucks', 'Subscriptions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {topUsers.map(u => (
                  <tr key={u.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-surface-900 dark:text-white">{u.name || formatPhone(u.phone)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === 'load_owner' ? 'info' : u.role === 'truck_owner' ? 'success' : 'danger'} size="sm">
                        {u.role === 'load_owner' ? 'Load Owner' : u.role === 'truck_owner' ? 'Truck Owner' : 'Admin'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{u._count.loads}</td>
                    <td className="px-4 py-3 font-medium">{u._count.trucks}</td>
                    <td className="px-4 py-3 font-medium">{u._count.subscriptions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verify Truck Modal */}
      {verifyModal && (
        <Modal
          open={true}
          onClose={() => setVerifyModal(null)}
          title={verifyModal.action === 'Verified' ? 'Verify Truck' : 'Reject Truck'}
          description={`Truck: ${verifyModal.registration}`}
          size="sm"
        >
          <p className="text-sm text-surface-600 dark:text-surface-400">
            {verifyModal.action === 'Verified'
              ? 'Are you sure you want to directly verify this truck? This will mark it as verified regardless of document status.'
              : 'Are you sure you want to reject this truck? The owner will need to address issues before re-verification.'}
          </p>
          <Modal.Footer>
            <Button variant="secondary" size="md" onClick={() => setVerifyModal(null)}>Cancel</Button>
            <Button
              variant={verifyModal.action === 'Verified' ? 'primary' : 'danger'}
              size="md"
              loading={actionLoading !== null}
              disabled={actionLoading !== null}
              onClick={handleTruckVerify}
            >
              {verifyModal.action === 'Verified' ? 'Verify Truck' : 'Reject Truck'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  )
}
