'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { Badge, Button, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatPhone, getInitials, cn } from '@/lib/utils'

interface User {
  id: string
  phone: string
  name: string | null
  role: 'load_owner' | 'truck_owner' | 'admin'
  createdAt: string
  updatedAt: string
  _count: { loads: number; trucks: number; subscriptions: number }
}

const ROLE_BADGE: Record<string, { variant: 'info' | 'success' | 'danger'; label: string }> = {
  load_owner: { variant: 'info', label: 'Load Owner' },
  truck_owner: { variant: 'success', label: 'Truck Owner' },
  admin: { variant: 'danger', label: 'Admin' },
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (roleFilter) params.set('role', roleFilter)
      const res = await api.get(`/admin/users?${params.toString()}`)
      setUsers(res.data.users)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load users'
      setError(msg)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleRoleChange = (role: string) => {
    setRoleFilter(role)
    setPage(1)
  }

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mb-4" />
        <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Failed to load users</h3>
        <p className="text-sm text-surface-500 mb-6">{error}</p>
        <button onClick={fetchUsers} className="btn-primary flex items-center gap-2">
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
          <h1 className="text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">Users</h1>
          <p className="text-sm text-surface-500 mt-0.5">{total} total user{total !== 1 ? 's' : ''} registered</p>
        </div>
        <div className="flex items-center gap-3 self-start">
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-surface-400" />
            <select
              value={roleFilter}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="input py-1.5 px-3 text-sm w-auto min-w-[140px]"
            >
              <option value="">All Roles</option>
              <option value="load_owner">Load Owner</option>
              <option value="truck_owner">Truck Owner</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button onClick={fetchUsers} className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowPathIcon className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton variant="circular" width={36} height={36} />
                <div className="flex-1 space-y-2">
                  <Skeleton width="50%" className="h-4" />
                  <Skeleton width="30%" className="h-3" />
                </div>
                <Skeleton width={70} className="h-5" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center">
            <UsersIcon className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-surface-500 font-medium">No users found</p>
            {roleFilter && (
              <button onClick={() => handleRoleChange('')} className="text-primary-600 text-sm font-semibold mt-2 hover:underline">
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-700">
                  {['Name', 'Phone', 'Role', 'Loads', 'Trucks', 'Subs', 'Joined'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {users.map(u => {
                  const roleBadge = ROLE_BADGE[u.role] || { variant: 'default' as const, label: u.role }
                  return (
                    <tr key={u.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                            u.role === 'admin'
                              ? 'bg-danger-50 text-danger-600 dark:bg-danger-950 dark:text-danger-400'
                              : u.role === 'truck_owner'
                              ? 'bg-success-50 text-success-600 dark:bg-success-950 dark:text-success-400'
                              : 'bg-info-50 text-info-600 dark:bg-info-950 dark:text-info-400'
                          )}>
                            {getInitials(u.name)}
                          </div>
                          <span className="font-medium text-surface-900 dark:text-white">{u.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-surface-600 dark:text-surface-400 font-mono text-xs">
                        {formatPhone(u.phone)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleBadge.variant} size="sm">{roleBadge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-surface-700 dark:text-surface-300 font-medium">{u._count.loads}</td>
                      <td className="px-4 py-3 text-surface-700 dark:text-surface-300 font-medium">{u._count.trucks}</td>
                      <td className="px-4 py-3 text-surface-700 dark:text-surface-300 font-medium">{u._count.subscriptions}</td>
                      <td className="px-4 py-3 text-surface-500 text-xs">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && users.length > 0 && pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-surface-800">
            <p className="text-xs text-surface-500">
              Page {page} of {pages} · {total} total
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                leftIcon={<ChevronLeftIcon className="w-4 h-4" />}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                Next
                <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
