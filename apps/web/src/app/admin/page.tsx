'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'

interface Stats {
  totalUsers: number
  totalLoads: number
  totalTrucks: number
  totalBookings: number
  pendingDocuments: number
  activeSubscriptions: number
  totalRevenue: number
  recentPayments: Array<{
    id: string
    amount: number
    paidAt: string
    metadata: { plan?: string }
    user: { name: string | null; phone: string }
  }>
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

type Tab = 'overview' | 'documents' | 'users' | 'subscriptions'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchStats() }, [])
  useEffect(() => { if (tab === 'documents') fetchPendingDocs() }, [tab])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/stats')
      setStats(res.data)
    } catch {
      // redirect to login handled by axios interceptor
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingDocs = async () => {
    const res = await api.get('/admin/documents/pending')
    setPendingDocs(res.data)
  }

  const handleVerifyDoc = async (docId: string, status: 'Verified' | 'Rejected', notes?: string) => {
    setVerifying(docId)
    try {
      await api.patch(`/admin/documents/${docId}/verify`, { status, notes })
      setPendingDocs(prev => prev.filter(d => d.id !== docId))
      setToast(`Document ${status === 'Verified' ? '✅ verified' : '❌ rejected'} successfully`)
      setTimeout(() => setToast(''), 3000)
      // Refresh stats badge
      fetchStats()
    } catch (err: any) {
      setToast('❌ ' + (err.response?.data?.message || 'Action failed'))
    } finally {
      setVerifying(null)
    }
  }

  const STAT_CARDS = stats ? [
    { label: 'Total Users',    value: stats.totalUsers,           icon: '👥', color: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-600' },
    { label: 'Total Loads',    value: stats.totalLoads,           icon: '📦', color: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600' },
    { label: 'Total Trucks',   value: stats.totalTrucks,          icon: '🚛', color: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600' },
    { label: 'Total Bookings', value: stats.totalBookings,        icon: '📋', color: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600' },
    { label: 'Active Subs',    value: stats.activeSubscriptions,  icon: '💳', color: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600' },
    {
      label: 'Total Revenue',
      value: `₹${Number(stats.totalRevenue).toLocaleString('en-IN')}`,
      icon: '💰',
      color: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-600',
    },
  ] : []

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview',      label: '📊 Overview' },
    { id: 'documents',     label: '📄 Documents', badge: stats?.pendingDocuments },
    { id: 'users',         label: '👥 Users' },
    { id: 'subscriptions', label: '💳 Subscriptions' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 dark:bg-gray-700 text-white px-5 py-3 rounded-card shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🛡️ Admin Panel</h1>
            <p className="text-xs text-gray-500 mt-0.5">LorryCarry Operations Dashboard</p>
          </div>
          {stats && stats.pendingDocuments > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
              {stats.pendingDocuments} docs pending
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === t.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {Boolean(t.badge && t.badge > 0) && (
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                  {STAT_CARDS.map(card => (
                    <div key={card.label} className={`card p-5 ${card.color}`}>
                      <div className="text-2xl mb-1">{card.icon}</div>
                      <div className={`text-2xl font-bold ${card.text}`}>{card.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent Payments */}
                <div className="card p-5">
                  <h2 className="font-semibold text-base mb-4">Recent Payments</h2>
                  {stats?.recentPayments.length === 0 ? (
                    <p className="text-gray-400 text-sm">No payments yet</p>
                  ) : (
                    <div className="space-y-3">
                      {stats?.recentPayments.map(p => (
                        <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <div>
                            <div className="text-sm font-medium">{p.user.name || p.user.phone}</div>
                            <div className="text-xs text-gray-500 capitalize">{(p.metadata as any)?.plan} plan</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-green-600">₹{Number(p.amount).toLocaleString()}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(p.paidAt).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Documents Tab ─────────────────────────────────────────────────── */}
        {tab === 'documents' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Pending KYC Documents ({pendingDocs.length})
            </h2>

            {pendingDocs.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-500">All documents verified — nothing pending!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingDocs.map(doc => (
                  <div key={doc.id} className="card p-5">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      {/* Document preview */}
                      <a
                        href={doc.s3Url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 w-full md:w-40 h-28 bg-gray-100 dark:bg-gray-800 rounded-card flex items-center justify-center hover:opacity-80 transition-opacity border border-gray-200 dark:border-gray-700"
                      >
                        <div className="text-center">
                          <div className="text-3xl mb-1">📄</div>
                          <div className="text-xs text-primary-500 underline">View Document</div>
                        </div>
                      </a>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <span className="font-semibold">{doc.type}</span>
                            {doc.docNumber && (
                              <span className="text-gray-500 text-sm ml-2">#{doc.docNumber}</span>
                            )}
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Truck: <strong>{doc.truck.registrationNumber}</strong> ({doc.truck.bodyType})
                            </div>
                            <div className="text-sm text-gray-500">
                              Owner: {doc.truck.user.name || '—'} · {doc.truck.user.phone}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">
                            {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleVerifyDoc(doc.id, 'Verified')}
                            disabled={verifying === doc.id}
                            className="btn-primary py-2 px-5 text-sm disabled:opacity-50"
                          >
                            {verifying === doc.id ? '⏳' : '✅'} Verify
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('Rejection reason (optional):')
                              handleVerifyDoc(doc.id, 'Rejected', notes || undefined)
                            }}
                            disabled={verifying === doc.id}
                            className="bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-5 rounded-button text-sm transition-colors disabled:opacity-50"
                          >
                            {verifying === doc.id ? '⏳' : '❌'} Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Users Tab ─────────────────────────────────────────────────────── */}
        {tab === 'users' && <UsersTab />}

        {/* ── Subscriptions Tab ─────────────────────────────────────────────── */}
        {tab === 'subscriptions' && <SubscriptionsTab />}
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/users').then(r => setUsers(r.data.users)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {['Name', 'Phone', 'Role', 'Loads', 'Trucks', 'Subs', 'Joined'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {users.map(u => (
            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 font-medium">{u.name || '—'}</td>
              <td className="px-4 py-3 text-gray-500">{u.phone}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  u.role === 'admin' ? 'bg-red-100 text-red-700' :
                  u.role === 'load_owner' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>{u.role}</span>
              </td>
              <td className="px-4 py-3">{u._count.loads}</td>
              <td className="px-4 py-3">{u._count.trucks}</td>
              <td className="px-4 py-3">{u._count.subscriptions}</td>
              <td className="px-4 py-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SubscriptionsTab() {
  const [subs, setSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/subscriptions').then(r => setSubs(r.data.subscriptions)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {['User', 'Plan', 'Status', 'Started', 'Expires'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {subs.map(s => (
            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium">{s.user.name || '—'}</div>
                <div className="text-xs text-gray-500">{s.user.phone}</div>
              </td>
              <td className="px-4 py-3 capitalize font-medium">{s.plan}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  s.status === 'active' ? 'bg-green-100 text-green-700' :
                  s.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                  'bg-red-100 text-red-600'
                }`}>{s.status}</span>
              </td>
              <td className="px-4 py-3 text-gray-500">{new Date(s.startedAt).toLocaleDateString('en-IN')}</td>
              <td className="px-4 py-3 text-gray-500">{new Date(s.expiresAt).toLocaleDateString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
