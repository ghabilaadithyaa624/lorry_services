'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  TruckIcon,
  ArchiveBoxIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline'
import { adminApi } from '@/lib/api'
import { Badge, Button, Spinner, Modal } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatPhone, getInitials, cn } from '@/lib/utils'

interface User {
  id: string
  phone: string
  name: string | null
  role: 'load_owner' | 'truck_owner' | 'driver' | 'admin'
  createdAt: string
  updatedAt: string
  _count: { loads: number; trucks: number; subscriptions: number }
}

const ROLE_BADGE: Record<string, { variant: 'info' | 'success' | 'danger'; label: string }> = {
  load_owner: { variant: 'info', label: 'Factory Owner' },
  truck_owner: { variant: 'success', label: 'Transporter' },
  driver: { variant: 'success', label: 'Driver' },
  admin: { variant: 'danger', label: 'Admin' },
}

export default function UserOperationsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.listUsers(roleFilter || undefined, page, 20)
      setUsers(res.data.users || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load users'
      setError(msg)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRoleChange = (role: string) => {
    setRoleFilter(role)
    setPage(1)
  }

  // Local search filter over current page
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const name = (u.name || '').toLowerCase()
    const phone = u.phone.toLowerCase()
    return name.includes(q) || phone.includes(q)
  })

  // Role distribution metrics
  const loadOwnerCount = users.filter((u) => u.role === 'load_owner').length
  const truckOwnerCount = users.filter((u) => u.role === 'truck_owner').length
  const adminCount = users.filter((u) => u.role === 'admin').length

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 font-mono">
        <Spinner size="lg" />
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">
          Loading user operations database...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 bg-panel rounded-[20px] border border-white/10 text-center space-y-4 max-w-md mx-auto font-sans">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Failed to Load User Operations</h3>
        <p className="text-xs font-mono text-surface-400">{error}</p>
        <button
          onClick={fetchUsers}
          className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-mono text-xs font-bold shadow-glow-primary hover:bg-primary-500 transition-colors inline-flex items-center gap-2"
        >
          <ArrowPathIcon className="w-4 h-4" /> Retry Fetch
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-panel p-6 rounded-[20px] border border-white/10 shadow-modal relative overflow-hidden">
        {/* Ambient Background Glow & Grid */}

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              User Operations
            </h1>
          </div>
          <p className="text-xs font-mono text-surface-400 mt-1">
            Registered shipper profiles, transporter accounts, role assignments, and volume contributions.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="px-4 py-2 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-xs font-mono font-bold text-white transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <ArrowPathIcon className="w-4 h-4 text-primary-400" />
          <span>Refresh Database ({total})</span>
        </button>
      </div>

      {/* Role Distribution KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="p-5 rounded-[20px] bg-panel border border-white/10 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-surface-400 block">Total Registered</span>
          <span className="text-2xl sm:text-3xl font-black text-white block">{total}</span>
          <span className="text-[11px] text-surface-400 block">Verified platform accounts</span>
        </div>

        <div className="p-5 rounded-[20px] bg-panel border border-white/10 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-info-400 block">Factory Owners</span>
          <span className="text-2xl sm:text-3xl font-black text-info-300 block">{loadOwnerCount}</span>
          <span className="text-[11px] text-info-400/80 block">Cargo shippers (on page)</span>
        </div>

        <div className="p-5 rounded-[20px] bg-emerald-950/40 border border-emerald-500/30 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Transporters</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-300 block">{truckOwnerCount}</span>
          <span className="text-[11px] text-emerald-300/80 block">Transporters (on page)</span>
        </div>

        <div className="p-5 rounded-[20px] bg-danger-950/40 border border-danger-500/30 shadow-card space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-danger-400 block">Administrators</span>
          <span className="text-2xl sm:text-3xl font-black text-danger-300 block">{adminCount}</span>
          <span className="text-[11px] text-danger-300/80 block">Root operators (on page)</span>
        </div>
      </div>

      {/* Toolbar: Role Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-panel p-4 rounded-2xl border border-white/10 shadow-card font-mono text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <MagnifyingGlassIcon className="w-4 h-4 text-primary-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user name or phone number..."
              className="w-full pl-10 pr-4 py-2 bg-surface-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <FunnelIcon className="w-4 h-4 text-primary-400 shrink-0" />
          {[
            { id: '', label: 'All Roles' },
            { id: 'load_owner', label: 'Factory Owners' },
            { id: 'truck_owner', label: 'Transporters' },
            { id: 'driver', label: 'Drivers' },
            { id: 'admin', label: 'Admins' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => handleRoleChange(r.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer',
                roleFilter === r.id
                  ? 'bg-primary-500 text-white shadow-glow-primary'
                  : 'bg-surface-950 border border-white/10 text-surface-400 hover:text-white'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-panel rounded-[20px] border border-white/10 shadow-modal overflow-hidden font-mono text-xs">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            User Operational Directory (Page {page} of {pages})
          </span>
          <span className="text-[11px] text-surface-400">WhatsApp OTP Verified</span>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-surface-400 space-y-2">
            <UsersIcon className="w-12 h-12 text-surface-500 mx-auto" />
            <p className="font-bold text-white">No users matched search criteria</p>
            {roleFilter && (
              <button onClick={() => handleRoleChange('')} className="text-primary-400 font-bold hover:underline">
                Clear role filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-surface-950/60 text-surface-400 uppercase text-[10px]">
                  <th className="text-left py-3 px-4 font-bold">User Name</th>
                  <th className="text-left py-3 px-4 font-bold">Phone Identity</th>
                  <th className="text-left py-3 px-4 font-bold">Role</th>
                  <th className="text-right py-3 px-4 font-bold">Loads</th>
                  <th className="text-right py-3 px-4 font-bold">Trucks</th>
                  <th className="text-right py-3 px-4 font-bold">Passes</th>
                  <th className="text-right py-3 px-4 font-bold">Joined Date</th>
                  <th className="text-right py-3 px-4 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => {
                  const roleBadge = ROLE_BADGE[u.role] || { variant: 'default' as const, label: u.role }
                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-surface-950 border border-white/10 text-primary-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(u.name)}
                          </div>
                          <span className="font-bold text-white">{u.name || '—'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-surface-300 font-bold">
                        {formatPhone(u.phone)}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={roleBadge.variant} size="sm" className="font-mono text-[10px]">
                          {roleBadge.label}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-amber-400">{u._count.loads}</td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-400">{u._count.trucks}</td>
                      <td className="py-3.5 px-4 text-right font-black text-purple-400">{u._count.subscriptions}</td>

                      <td className="py-3.5 px-4 text-right text-surface-400">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedUser(u)}
                          leftIcon={<EyeIcon className="w-3.5 h-3.5" />}
                          className="font-bold text-xs border-white/10 py-1.5"
                        >
                          Profile
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pages > 1 && (
          <div className="p-4 border-t border-white/10 bg-surface-950/60 flex items-center justify-between text-xs">
            <span className="text-surface-400">Page {page} of {pages} · {total} Total Users</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                leftIcon={<ChevronLeftIcon className="w-4 h-4" />}
                className="font-bold border-white/10"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="font-bold border-white/10"
              >
                Next <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail View Modal */}
      {selectedUser && (
        <Modal
          open={true}
          onClose={() => setSelectedUser(null)}
          title="User Operational Profile"
          description={`Account ID: ${selectedUser.id}`}
          size="md"
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-surface-950 border border-white/10 space-y-2">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-surface-400">Full Name</span>
                <span className="font-bold text-white">{selectedUser.name || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-surface-400">Mobile Identity</span>
                <span className="font-bold text-white">{formatPhone(selectedUser.phone)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-surface-400">Role</span>
                <Badge variant={selectedUser.role === 'admin' ? 'danger' : 'info'} size="sm">
                  {selectedUser.role}
                </Badge>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-surface-400">Registration Date</span>
                <span className="text-surface-300">
                  {new Date(selectedUser.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-surface-950 rounded-2xl border border-white/5">
                <ArchiveBoxIcon className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="text-[10px] text-surface-400 block">Loads</span>
                <span className="font-bold text-white text-sm">{selectedUser._count.loads}</span>
              </div>
              <div className="p-3 bg-surface-950 rounded-2xl border border-white/5">
                <TruckIcon className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] text-surface-400 block">Trucks</span>
                <span className="font-bold text-white text-sm">{selectedUser._count.trucks}</span>
              </div>
              <div className="p-3 bg-surface-950 rounded-2xl border border-white/5">
                <CreditCardIcon className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <span className="text-[10px] text-surface-400 block">Passes</span>
                <span className="font-bold text-white text-sm">{selectedUser._count.subscriptions}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <Button variant="secondary" size="sm" onClick={() => setSelectedUser(null)} className="font-bold border-white/10">
                Close User Details
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
