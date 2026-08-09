import React, { useState, useEffect, useCallback } from 'react'
import {
  Users as UsersIcon,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatPhone, getInitials, cn } from '../lib/utils'

interface UserItem {
  id: string
  phone: string
  name: string | null
  role: 'load_owner' | 'truck_owner' | 'admin'
  createdAt: string
  updatedAt: string
  _count: { loads: number; trucks: number; subscriptions: number }
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  load_owner: { label: 'Load Owner', bg: 'bg-info-500/15', text: 'text-info-400', border: 'border-info-500/30' },
  truck_owner: { label: 'Truck Owner', bg: 'bg-success-500/15', text: 'text-success-400', border: 'border-success-500/30' },
  admin: { label: 'Admin', bg: 'bg-danger-500/15', text: 'text-danger-400', border: 'border-danger-500/30' },
}

export function Users() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
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
      const msg = err instanceof Error ? err.message : 'Failed to fetch user accounts'
      setError(msg)
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

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-surface-800 rounded w-48"></div>
          <div className="h-9 bg-surface-800 rounded w-24"></div>
        </div>
        <div className="card p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-700/40 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-12 text-center flex flex-col items-center">
        <AlertCircle className="w-12 h-12 text-danger-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Failed to load Users</h2>
        <p className="text-surface-400 text-sm max-w-md mb-6">{error}</p>
        <button onClick={fetchUsers} className="btn-primary flex items-center gap-2">
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
          <h1 className="text-2xl font-black tracking-tight text-white">Registered Users</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {total} total account{total !== 1 ? 's' : ''} in the system
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-surface-400" />
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

          <button
            onClick={fetchUsers}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {users.length === 0 ? (
          <div className="py-12 text-center text-surface-400 text-sm flex flex-col items-center">
            <UsersIcon className="w-12 h-12 text-surface-600 mb-3" />
            <p className="font-semibold text-white">No users found</p>
            {roleFilter && (
              <button onClick={() => handleRoleChange('')} className="text-primary-400 text-xs mt-2 underline">
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-800/80 border-b border-surface-700/60 text-[10px] font-bold uppercase tracking-wider text-surface-400">
                  <th className="text-left px-6 py-3.5">User</th>
                  <th className="text-left px-6 py-3.5">Phone</th>
                  <th className="text-left px-6 py-3.5">Role</th>
                  <th className="text-center px-6 py-3.5">Loads</th>
                  <th className="text-center px-6 py-3.5">Trucks</th>
                  <th className="text-center px-6 py-3.5">Subs</th>
                  <th className="text-right px-6 py-3.5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/40">
                {users.map((u) => {
                  const roleConfig = ROLE_CONFIG[u.role] || {
                    label: u.role,
                    bg: 'bg-surface-700',
                    text: 'text-surface-300',
                    border: 'border-surface-600',
                  }
                  return (
                    <tr key={u.id} className="hover:bg-surface-700/20 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {getInitials(u.name)}
                          </div>
                          <span className="font-semibold text-white">{u.name || '—'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 font-mono text-xs text-surface-300">
                        {formatPhone(u.phone)}
                      </td>

                      <td className="px-6 py-3.5">
                        <span className={cn('badge font-semibold border', roleConfig.bg, roleConfig.text, roleConfig.border)}>
                          {roleConfig.label}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-center font-semibold text-white">{u._count.loads}</td>
                      <td className="px-6 py-3.5 text-center font-semibold text-white">{u._count.trucks}</td>
                      <td className="px-6 py-3.5 text-center font-semibold text-white">{u._count.subscriptions}</td>

                      <td className="px-6 py-3.5 text-right text-xs text-surface-400">
                        <div className="flex items-center justify-end gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {users.length > 0 && pages > 1 && (
          <div className="px-6 py-3 border-t border-surface-700/60 flex items-center justify-between">
            <p className="text-xs text-surface-400">
              Page {page} of {pages} · {total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Users
