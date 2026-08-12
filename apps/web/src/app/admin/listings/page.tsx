'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { adminApi } from '@/lib/api'
import { Badge, Button, Modal, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatPhone, cn } from '@/lib/utils'

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

type SectionTab = 'ALL' | 'ACTIVE_LOADS' | 'FLEET' | 'PENDING_VERIFICATION' | 'CONTRIBUTORS'

export default function MarketplaceListingsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [truckGroups, setTruckGroups] = useState<TruckGroup[]>([])
  const [topUsers, setTopUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [verifyModal, setVerifyModal] = useState<VerifyState | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SectionTab>('ALL')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, docsRes, usersRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getPendingDocuments(),
        adminApi.listUsers(undefined, 1, 100),
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

      // Top contributing users
      const users: UserSummary[] = usersRes.data.users || []
      const sorted = [...users]
        .sort((a, b) => b._count.loads + b._count.trucks - (a._count.loads + a._count.trucks))
        .slice(0, 10)
      setTopUsers(sorted)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load listings data'
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
    try {
      await adminApi.verifyTruck(verifyModal.truckId, verifyModal.action)
      toast.success(
        `Truck ${verifyModal.registration} marked as ${verifyModal.action === 'Verified' ? 'Verified' : 'Rejected'}!`
      )
      setTruckGroups((prev) => prev.filter((t) => t.truckId !== verifyModal.truckId))
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
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 font-mono">
        <Spinner size="lg" />
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">
          Loading marketplace & fleet operations telemetry...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 bg-[#0F131D] rounded-[20px] border border-white/10 text-center space-y-4 max-w-md mx-auto font-sans">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Failed to Load Marketplace Operations</h3>
        <p className="text-xs font-mono text-surface-400">{error}</p>
        <button
          onClick={fetchData}
          className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-mono text-xs font-bold shadow-glow-primary hover:bg-primary-500 transition-colors inline-flex items-center gap-2"
        >
          <ArrowPathIcon className="w-4 h-4" /> Retry Fetch
        </button>
      </div>
    )
  }

  const verifiedTrucksCount = stats ? Math.max(0, stats.totalTrucks - stats.pendingDocuments) : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F131D] p-6 rounded-[20px] border border-white/10 shadow-modal relative overflow-hidden">
        {/* Ambient Background Glow & Grid */}

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Marketplace & Fleet Operations
          </h1>
          <p className="text-xs font-mono text-surface-400 mt-1">
            Centralized cargo requirements, vehicle fleet capacity, Vahan verification queues, and top marketplace contributors.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-xs font-mono font-bold text-white transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <ArrowPathIcon className="w-4 h-4 text-primary-400" />
          <span>Refresh Operations</span>
        </button>
      </div>

      {/* Primary Summary KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          <div className="p-4 rounded-2xl bg-[#0F131D] border border-white/10 shadow-card space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">Total Loads</span>
            <span className="text-2xl font-black text-amber-300 block">{stats.totalLoads}</span>
            <span className="text-[10px] text-surface-400 block">Posted Requirements</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F131D] border border-white/10 shadow-card space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary-400 block">Active Loads</span>
            <span className="text-2xl font-black text-primary-300 block">{stats.totalLoads}</span>
            <span className="text-[10px] text-primary-400/80 block">Open Corridors</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F131D] border border-white/10 shadow-card space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Completed Bookings</span>
            <span className="text-2xl font-black text-emerald-300 block">{stats.totalBookings}</span>
            <span className="text-[10px] text-emerald-400/80 block">Delivered Freight</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F131D] border border-white/10 shadow-card space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-surface-400 block">Registered Trucks</span>
            <span className="text-2xl font-black text-white block">{stats.totalTrucks}</span>
            <span className="text-[10px] text-surface-400 block">Fleet Vehicles</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 shadow-card space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Verified Trucks</span>
            <span className="text-2xl font-black text-emerald-300 block">{verifiedTrucksCount}</span>
            <span className="text-[10px] text-emerald-300/80 block">Vahan Approved</span>
          </div>

          <div className="p-4 rounded-2xl bg-danger-950/40 border border-danger-500/30 shadow-card space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-danger-400 block">Pending Verification</span>
            <span className="text-2xl font-black text-danger-300 block">{stats.pendingDocuments}</span>
            <span className="text-[10px] text-danger-300/80 block">Docs Required</span>
          </div>
        </div>
      )}

      {/* Section Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-white/10 pb-3 font-mono">
        {[
          { id: 'ALL', label: 'All Operations' },
          { id: 'ACTIVE_LOADS', label: `Active Loads (${stats?.totalLoads || 0})` },
          { id: 'FLEET', label: `Registered Fleet (${stats?.totalTrucks || 0})` },
          { id: 'PENDING_VERIFICATION', label: `Pending Verification (${truckGroups.length})` },
          { id: 'CONTRIBUTORS', label: `Marketplace Contributors (${topUsers.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as SectionTab)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
              activeSection === tab.id
                ? 'bg-primary-500 text-white shadow-glow-primary'
                : 'bg-surface-900/80 text-surface-400 hover:text-white border border-white/10'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SECTION: PENDING VERIFICATION TRUCKS ── */}
      {(activeSection === 'ALL' || activeSection === 'PENDING_VERIFICATION') && (
        <div className="p-6 rounded-[20px] bg-[#0F131D] border border-white/10 shadow-modal space-y-4 font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-warning-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Pending Verification Vehicles ({truckGroups.length})
              </h2>
            </div>
            <Badge variant="warning" size="sm" className="font-mono text-[10px]">{truckGroups.length} Vehicles</Badge>
          </div>

          {truckGroups.length === 0 ? (
            <div className="py-8 text-center text-xs text-surface-400 space-y-2">
              <CheckCircleIcon className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="font-bold text-white">All vehicle registration documents are reviewed!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-surface-950/60 text-surface-400 uppercase text-[10px]">
                    <th className="text-left py-3 px-4 font-bold">Registration Number</th>
                    <th className="text-left py-3 px-4 font-bold">Body Type</th>
                    <th className="text-left py-3 px-4 font-bold">Transporter Owner</th>
                    <th className="text-left py-3 px-4 font-bold">Pending Documents</th>
                    <th className="text-right py-3 px-4 font-bold">Direct Verification Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {truckGroups.map((t) => (
                    <tr key={t.truckId} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">🆔 {t.registrationNumber}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant="default" size="sm" className="font-mono text-[10px]">{t.bodyType}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{t.ownerName || '—'}</p>
                        <p className="text-[11px] text-surface-400">{formatPhone(t.ownerPhone)}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="warning" size="sm" className="font-mono text-[10px]">{t.pendingDocs} Pending</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={actionLoading === t.truckId}
                            onClick={() =>
                              setVerifyModal({
                                truckId: t.truckId,
                                registration: t.registrationNumber,
                                action: 'Verified',
                              })
                            }
                            leftIcon={<CheckCircleIcon className="w-3.5 h-3.5" />}
                            className="font-bold text-xs py-1.5 shadow-glow-primary"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={actionLoading === t.truckId}
                            onClick={() =>
                              setVerifyModal({
                                truckId: t.truckId,
                                registration: t.registrationNumber,
                                action: 'Rejected',
                              })
                            }
                            leftIcon={<XCircleIcon className="w-3.5 h-3.5" />}
                            className="font-bold text-xs py-1.5"
                          >
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
      )}

      {/* ── SECTION: TOP MARKETPLACE CONTRIBUTORS ── */}
      {(activeSection === 'ALL' || activeSection === 'CONTRIBUTORS') && topUsers.length > 0 && (
        <div className="p-6 rounded-[20px] bg-[#0F131D] border border-white/10 shadow-modal space-y-4 font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-primary-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Top Marketplace Contributors ({topUsers.length})
              </h2>
            </div>
            <span className="text-xs text-surface-400">Order by Volume Contribution</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-surface-950/60 text-surface-400 uppercase text-[10px]">
                  <th className="text-left py-3 px-4 font-bold">User</th>
                  <th className="text-left py-3 px-4 font-bold">Role</th>
                  <th className="text-right py-3 px-4 font-bold">Loads Posted</th>
                  <th className="text-right py-3 px-4 font-bold">Trucks Registered</th>
                  <th className="text-right py-3 px-4 font-bold">Active Subscriptions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{u.name || 'User'}</p>
                      <p className="text-[11px] text-surface-400">{formatPhone(u.phone)}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={u.role === 'load_owner' ? 'info' : u.role === 'truck_owner' ? 'success' : 'danger'}
                        size="sm"
                        className="font-mono text-[10px]"
                      >
                        {u.role === 'load_owner' ? 'Load Owner' : u.role === 'truck_owner' ? 'Truck Owner' : 'Admin'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-amber-400">{u._count.loads}</td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-400">{u._count.trucks}</td>
                    <td className="py-3.5 px-4 text-right font-black text-purple-400">{u._count.subscriptions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verify Direct Modal */}
      {verifyModal && (
        <Modal
          open={true}
          onClose={() => setVerifyModal(null)}
          title={verifyModal.action === 'Verified' ? 'Directly Verify Truck' : 'Reject Vehicle Verification'}
          description={`Vehicle: ${verifyModal.registration}`}
          size="sm"
        >
          <div className="space-y-4 font-mono text-xs">
            <p className="text-surface-300 leading-relaxed">
              {verifyModal.action === 'Verified'
                ? 'Are you sure you want to directly verify this truck? This will grant verified status regardless of document upload status.'
                : 'Are you sure you want to reject this truck? The owner will need to re-submit registration details.'}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="ghost" size="sm" onClick={() => setVerifyModal(null)}>
                Cancel
              </Button>
              <Button
                variant={verifyModal.action === 'Verified' ? 'primary' : 'danger'}
                size="sm"
                loading={actionLoading !== null}
                onClick={handleTruckVerify}
                className="font-bold shadow-glow-primary"
              >
                {verifyModal.action === 'Verified' ? 'Verify Truck' : 'Reject Truck'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
