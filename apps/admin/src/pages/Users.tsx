import React, { useState } from 'react'
import {
  Users as UsersIcon,
  Shield,
  Truck,
  Package,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Phone,
  UserCheck,
  UserX,
  X
} from 'lucide-react'

type UserRole = 'load_owner' | 'truck_owner' | 'admin'

interface UserItem {
  id: string
  name: string
  phone: string
  role: UserRole
  status: 'Active' | 'Suspended'
  registeredAt: string
  loadsPostedCount?: number
  trucksRegisteredCount?: number
}

const MOCK_USERS: UserItem[] = [
  {
    id: 'USR-001',
    name: 'Rajesh Sharma',
    phone: '+91 98765 43210',
    role: 'load_owner',
    status: 'Active',
    registeredAt: '2026-07-15',
    loadsPostedCount: 14
  },
  {
    id: 'USR-002',
    name: 'Balwinder Singh',
    phone: '+91 91234 56789',
    role: 'truck_owner',
    status: 'Active',
    registeredAt: '2026-07-20',
    trucksRegisteredCount: 3
  },
  {
    id: 'USR-003',
    name: 'Super Admin',
    phone: '+91 90000 00000',
    role: 'admin',
    status: 'Active',
    registeredAt: '2026-06-01'
  },
  {
    id: 'USR-004',
    name: 'Fraud Test Account',
    phone: '+91 99999 88888',
    role: 'load_owner',
    status: 'Suspended',
    registeredAt: '2026-08-01',
    loadsPostedCount: 1
  }
]

export function Users() {
  const [users, setUsers] = useState<UserItem[]>(MOCK_USERS)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  const loadOwnerCount = users.filter((u) => u.role === 'load_owner').length
  const truckOwnerCount = users.filter((u) => u.role === 'truck_owner').length
  const adminCount = users.filter((u) => u.role === 'admin').length

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter

    return matchesSearch && matchesRole
  })

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const newStatus = u.status === 'Active' ? ('Suspended' as const) : ('Active' as const)
          setActionFeedback(`User ${u.name} status changed to ${newStatus}.`)
          return { ...u, status: newStatus }
        }
        return u
      })
    )
    setTimeout(() => setActionFeedback(null), 4000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <UsersIcon className="w-7 h-7 text-orange-500" />
          User Account Management
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage load owners, truck owners, and admin users. Toggle access and inspect user activity.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 font-semibold uppercase">Total Users</p>
          <p className="text-3xl font-bold text-white mt-2">{users.length}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 font-semibold uppercase">Load Owners</p>
          <p className="text-3xl font-bold text-blue-400 mt-2">{loadOwnerCount}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 font-semibold uppercase">Truck Owners</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{truckOwnerCount}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 font-semibold uppercase">Admins</p>
          <p className="text-3xl font-bold text-purple-400 mt-2">{adminCount}</p>
        </div>
      </div>

      {/* Notification Banner */}
      {actionFeedback && (
        <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            {actionFeedback}
          </span>
          <button onClick={() => setActionFeedback(null)} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, or user ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-orange-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 text-sm">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">All Roles</option>
            <option value="load_owner">Load Owner</option>
            <option value="truck_owner">Truck Owner</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Activity Count</th>
                <th className="px-6 py-4">Registered Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="text-xs font-mono text-slate-400">{u.id}</p>
                  </td>

                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {u.phone}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'load_owner'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : u.role === 'truck_owner'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}
                    >
                      {u.role === 'load_owner' && <Package className="w-3.5 h-3.5" />}
                      {u.role === 'truck_owner' && <Truck className="w-3.5 h-3.5" />}
                      {u.role === 'admin' && <Shield className="w-3.5 h-3.5" />}
                      {u.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-300 text-xs">
                    {u.role === 'load_owner' && `${u.loadsPostedCount || 0} loads posted`}
                    {u.role === 'truck_owner' && `${u.trucksRegisteredCount || 0} trucks registered`}
                    {u.role === 'admin' && 'Full System Access'}
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-400">{u.registeredAt}</td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => toggleUserStatus(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ml-auto ${
                          u.status === 'Active'
                            ? 'bg-rose-600/80 hover:bg-rose-600 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {u.status === 'Active' ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            Suspend
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Reactivate
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
