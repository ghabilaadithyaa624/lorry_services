import React, { useState } from 'react'
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Search,
  DollarSign,
  Calendar,
  User,
  Zap,
  X
} from 'lucide-react'

interface SubscriptionItem {
  id: string
  userName: string
  userPhone: string
  plan: 'Monthly Unlimited' | 'Pay-Per-Unlock'
  status: 'Active' | 'Expired' | 'Cancelled'
  startedAt: string
  expiresAt: string
  paymentId: string
  amount: string
}

const MOCK_SUBSCRIPTIONS: SubscriptionItem[] = [
  {
    id: 'SUB-1001',
    userName: 'Karthik Transport Solutions',
    userPhone: '+91 98860 12345',
    plan: 'Monthly Unlimited',
    status: 'Active',
    startedAt: '2026-08-01',
    expiresAt: '2026-09-01',
    paymentId: 'pay_CF_88992211',
    amount: '₹ 1,999'
  },
  {
    id: 'SUB-1002',
    userName: 'Mahadev Logistics',
    userPhone: '+91 97411 99887',
    plan: 'Pay-Per-Unlock',
    status: 'Active',
    startedAt: '2026-08-07',
    expiresAt: '2026-08-14',
    paymentId: 'pay_CF_77112233',
    amount: '₹ 199'
  },
  {
    id: 'SUB-1003',
    userName: 'Ganesh Logistics',
    userPhone: '+91 91234 88776',
    plan: 'Monthly Unlimited',
    status: 'Expired',
    startedAt: '2026-07-05',
    expiresAt: '2026-08-05',
    paymentId: 'pay_CF_11223344',
    amount: '₹ 1,999'
  }
]

export function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>(MOCK_SUBSCRIPTIONS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSub, setSelectedSub] = useState<SubscriptionItem | null>(null)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  const activeCount = subscriptions.filter((s) => s.status === 'Active').length
  const expiredCount = subscriptions.filter((s) => s.status === 'Expired').length

  const filteredSubs = subscriptions.filter(
    (s) =>
      s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.userPhone.includes(searchTerm) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.paymentId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCancelSubscription = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'Cancelled' as const } : s))
    )
    setActionFeedback(`Subscription ${id} cancelled successfully. Refund initiated.`)
    setTimeout(() => setActionFeedback(null), 4000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-orange-500" />
          Subscription & Paywall Management
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Monitor user subscriptions, manage pay-per-unlock access, and configure billing rules.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 font-semibold uppercase">Active Subscriptions</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{activeCount}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 font-semibold uppercase">Monthly Recurring Revenue</p>
          <p className="text-3xl font-bold text-white mt-2">₹ 98,500</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 font-semibold uppercase">Expired Plans</p>
          <p className="text-3xl font-bold text-amber-400 mt-2">{expiredCount}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 font-semibold uppercase">Pay-per-unlock Rate</p>
          <p className="text-3xl font-bold text-orange-400 mt-2">₹ 199 / load</p>
        </div>
      </div>

      {/* Notification Banner */}
      {actionFeedback && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            {actionFeedback}
          </span>
          <button onClick={() => setActionFeedback(null)} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search subscriber, phone, payment ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-orange-500 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Subscription Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4">Subscriber</th>
                <th className="px-6 py-4">Plan Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Payment Txn ID</th>
                <th className="px-6 py-4">Valid Period</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredSubs.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">{sub.userName}</p>
                    <p className="text-xs text-slate-400">{sub.userPhone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      {sub.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-emerald-400">{sub.amount}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">{sub.paymentId}</td>
                  <td className="px-6 py-4 text-xs text-slate-300">
                    {sub.startedAt} → {sub.expiresAt}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        sub.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : sub.status === 'Expired'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {sub.status === 'Active' && (
                      <button
                        onClick={() => handleCancelSubscription(sub.id)}
                        className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Cancel Plan
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
