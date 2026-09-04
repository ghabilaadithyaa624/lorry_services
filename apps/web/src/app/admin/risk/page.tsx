'use client'

import React, { useState, useEffect } from 'react'
import {
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { api, adminApi } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import { Badge, Button, Spinner } from '@/components/ui'
import {
  evaluateUserTrustAndRisk,
  RiskEvaluationResult,
} from '@/lib/intelligence/trustRiskEngine'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

export default function AdminTrustRiskConsolePage() {
  const [evaluations, setEvaluations] = useState<RiskEvaluationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [tierFilter, setTierFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvaluation, setSelectedEvaluation] = useState<RiskEvaluationResult | null>(null)

  useEffect(() => {
    loadRiskData()
  }, [])

  const loadRiskData = async () => {
    try {
      setLoading(true)
      const [usersRes, bookingsRes, statsRes, trucksRes] = await Promise.allSettled([
        api.get('/admin/users').catch(() => ({ data: [] })),
        api.get('/admin/bookings').catch(() => ({ data: [] })),
        adminApi.getStats().catch(() => ({ data: { recentPayments: [] } })),
        api.get('/admin/trucks').catch(() => ({ data: [] })),
      ])

      const fetchedUsers: any[] = usersRes.status === 'fulfilled' ? (usersRes.value as any)?.data || [] : []
      const fetchedBookings: any[] = bookingsRes.status === 'fulfilled' ? (bookingsRes.value as any)?.data || [] : []
      const statsData: any = statsRes.status === 'fulfilled' ? (statsRes.value as any)?.data || {} : {}
      const fetchedPayments: any[] = Array.isArray(statsData.recentPayments) ? statsData.recentPayments : []
      const fetchedTrucks: any[] = trucksRes.status === 'fulfilled' ? (trucksRes.value as any)?.data || [] : []

      const evaluated = fetchedUsers.map((u) => {
        const userBks = fetchedBookings.filter((b) => b.factoryOwnerId === u.id || b.truckDriverId === u.id || b.userId === u.id)
        const userPmts = fetchedPayments.filter((p) => p.userId === u.id)
        const userTrks = fetchedTrucks.filter((t) => t.userId === u.id)

        return evaluateUserTrustAndRisk(u, userBks, userPmts, userTrks, [])
      })

      setEvaluations(evaluated)
    } catch {
      toast.error('Failed to load trust and risk audit records')
    } finally {
      setLoading(false)
    }
  }

  const handleClearRiskFlag = () => {
    setSelectedEvaluation(null)
    toast.info('Backend risk persistence endpoint required.')
  }

  const handleFlagForAudit = () => {
    setSelectedEvaluation(null)
    toast.info('Backend risk persistence endpoint required.')
  }

  // Calculate Risk KPIs
  const totalAudited = evaluations.length
  const lowRiskCount = evaluations.filter((e) => e.riskTier === 'LOW RISK').length
  const reviewCount = evaluations.filter((e) => e.riskTier === 'REVIEW').length
  const highAttentionCount = evaluations.filter((e) => e.riskTier === 'HIGH ATTENTION').length

  const filteredEvaluations = evaluations.filter((e) => {
    if (tierFilter !== 'ALL' && e.riskTier !== tierFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const name = (e.userName || '').toLowerCase()
      const phone = (e.userPhone || '').toLowerCase()
      return name.includes(q) || phone.includes(q)
    }
    return true
  })

  return (
    <DashboardLayout
      title="Trust & Risk Intelligence Console"
      subtitle="Deterministic, empirical risk signals, cancellation analysis, payment failure audits, and manual admin compliance review."
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* ── RISK OVERVIEW KPIS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
          <div className="bg-panel p-5 rounded-[20px] border border-white/10 shadow-modal space-y-2">
            <span className="text-[10px] text-surface-400 font-mono font-bold uppercase tracking-widest block">
              Total Audited Accounts
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-white block">
              {totalAudited}
            </span>
            <span className="text-[10px] font-mono text-surface-400 font-medium">Platform users audited</span>
          </div>

          <div className="bg-emerald-950/40 p-5 rounded-[20px] border border-emerald-500/30 shadow-modal space-y-2">
            <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest block">
              LOW RISK
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-300 block">
              {lowRiskCount}
            </span>
            <span className="text-[10px] font-mono text-emerald-300 font-medium">Clean operational signals</span>
          </div>

          <div className="bg-amber-950/40 p-5 rounded-[20px] border border-amber-500/30 shadow-modal space-y-2">
            <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-widest block">
              REVIEW
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-amber-300 block">
              {reviewCount}
            </span>
            <span className="text-[10px] font-mono text-amber-300 font-medium">Moderate signals detected</span>
          </div>

          <div className="bg-danger-950/40 p-5 rounded-[20px] border border-danger-500/30 shadow-modal space-y-2">
            <span className="text-[10px] text-danger-400 font-mono font-bold uppercase tracking-widest block">
              HIGH ATTENTION
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-danger-300 block">
              {highAttentionCount}
            </span>
            <span className="text-[10px] font-mono text-danger-300 font-medium">Requires Admin Review</span>
          </div>
        </div>

        {/* ── TOOLBAR: SEARCH & TIER FILTER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-panel p-5 rounded-[20px] border border-white/10 shadow-modal font-sans">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <MagnifyingGlassIcon className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user name or phone number..."
                className="input text-xs pl-9 py-2.5 bg-surface-950/80 border-white/10 text-white placeholder:text-surface-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {['ALL', 'LOW RISK', 'REVIEW', 'HIGH ATTENTION'].map((st) => (
              <button
                key={st}
                onClick={() => setTierFilter(st)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer',
                  tierFilter === st
                    ? 'bg-primary-500 text-white shadow-glow-primary'
                    : 'bg-surface-950/80 text-surface-400 hover:text-white hover:bg-white/5 border border-white/10'
                )}
              >
                {st === 'ALL' ? 'All Risk Tiers' : st}
              </button>
            ))}
          </div>
        </div>

        {/* ── RISK EVALUATION LIST ── */}
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 font-mono">
            <Spinner size="lg" />
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">Evaluating platform risk signals...</p>
          </div>
        ) : (
          <div className="bg-panel rounded-[20px] border border-white/10 shadow-modal overflow-hidden font-sans">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldExclamationIcon className="w-5 h-5 text-primary-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Deterministic User Risk Evaluations
                </h2>
              </div>
              <span className="text-xs text-surface-400 font-mono">
                Admin Review Authoritative • Zero Auto-Bans
              </span>
            </div>

            {filteredEvaluations.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2 font-mono">
                <ShieldExclamationIcon className="w-10 h-10 text-surface-500" />
                <p className="text-sm font-bold text-white">
                  No users currently require risk review.
                </p>
                <p className="text-xs text-surface-400">
                  All active accounts have clean operational signals or no matching query results.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {filteredEvaluations.map((item) => {
                  const isHigh = item.riskTier === 'HIGH ATTENTION'
                  const isReview = item.riskTier === 'REVIEW'

                  return (
                    <div
                      key={item.userId}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="space-y-2 max-w-2xl">
                        {/* User Header */}
                        <div className="flex items-center gap-2 flex-wrap font-mono">
                          <span className="font-extrabold text-sm text-white">
                            {item.userName} ({item.userPhone})
                          </span>

                          <Badge
                            variant={isHigh ? 'danger' : isReview ? 'warning' : 'success'}
                            size="sm"
                            className="font-mono text-[10px]"
                          >
                            {item.riskTier}
                          </Badge>

                          <span className="text-[10px] text-surface-400">
                            Score: {item.riskScore}/100
                          </span>
                        </div>

                        {/* Transparent Reasons */}
                        <div className="space-y-1">
                          {item.reasons.map((r, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-xs text-surface-300">
                              <span className="text-primary-400 font-bold">•</span>
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>

                        {/* Key Empirical Evidence Chips */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-surface-400">
                          <span className="p-1 px-2.5 rounded-lg bg-surface-950 border border-white/5">
                            Total Trips: {item.evidence.totalBookings}
                          </span>
                          <span className="p-1 px-2.5 rounded-lg bg-surface-950 border border-white/5">
                            Cancellations: {item.evidence.cancelledBookings} ({item.evidence.cancellationRatePercent}%)
                          </span>
                          <span className="p-1 px-2.5 rounded-lg bg-surface-950 border border-white/5">
                            Failed Payments: {item.evidence.failedPaymentsCount}
                          </span>
                          <span className="p-1 px-2.5 rounded-lg bg-surface-950 border border-white/5">
                            Account Age: {item.evidence.accountAgeDays} days
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedEvaluation(item)}
                          leftIcon={<EyeIcon className="w-4 h-4" />}
                          className="text-xs font-bold border-white/10 hover:border-white/20"
                        >
                          Inspect Risk Evidence
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── RISK EVIDENCE INSPECTION MODAL ── */}
      {selectedEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80  p-4 animate-fade-in font-sans">
          <div className="bg-panel rounded-[20px] border border-white/10 max-w-2xl w-full max-h-[90vh] flex flex-col justify-between shadow-modal overflow-hidden text-white">
            
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-surface-950/80">
              <div>
                <span className="text-[10px] font-mono text-surface-400 uppercase font-bold block">Risk Signal Audit & Evidence</span>
                <h3 className="text-base font-black text-white font-mono">
                  {selectedEvaluation.userName} ({selectedEvaluation.userPhone})
                </h3>
              </div>
              <button onClick={() => setSelectedEvaluation(null)} className="p-1 text-surface-400 hover:text-white rounded-xl">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
              
              {/* Risk Tier Callout */}
              <div className={cn(
                'p-4 rounded-2xl border flex items-center justify-between font-mono',
                selectedEvaluation.riskTier === 'HIGH ATTENTION'
                  ? 'bg-danger-950/50 border-danger-500/40 text-danger-300'
                  : selectedEvaluation.riskTier === 'REVIEW'
                  ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              )}>
                <div>
                  <span className="font-bold text-sm block">Evaluated Risk Tier: {selectedEvaluation.riskTier}</span>
                  <span className="text-[11px] opacity-80 block">Score: {selectedEvaluation.riskScore} / 100</span>
                </div>
                <Badge variant={selectedEvaluation.riskTier === 'HIGH ATTENTION' ? 'danger' : 'warning'} size="sm" className="font-mono text-[10px]">
                  {selectedEvaluation.riskTier}
                </Badge>
              </div>

              {/* Explicit Reasons List */}
              <div className="space-y-2">
                <span className="font-bold font-mono text-white block uppercase tracking-wider text-[10px]">
                  Transparent Risk Signal Reasons:
                </span>
                <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-1.5 font-mono">
                  {selectedEvaluation.reasons.map((r, idx) => (
                    <p key={idx} className="text-surface-300 font-medium flex items-center gap-1.5">
                      <span className="text-primary-400">•</span> {r}
                    </p>
                  ))}
                </div>
              </div>

              {/* Empirical Evidence Grid */}
              <div className="space-y-2">
                <span className="font-bold font-mono text-white block uppercase tracking-wider text-[10px]">
                  Empirical Evidence Metrics:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                  <div className="p-3 rounded-2xl bg-surface-950/80 border border-white/5">
                    <span className="text-surface-400 block text-[10px]">Total Bookings</span>
                    <span className="font-bold text-white mt-0.5 block">{selectedEvaluation.evidence.totalBookings} Trips</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-950/80 border border-white/5">
                    <span className="text-surface-400 block text-[10px]">Cancellation Rate</span>
                    <span className="font-bold text-white mt-0.5 block">{selectedEvaluation.evidence.cancellationRatePercent}%</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-950/80 border border-white/5">
                    <span className="text-surface-400 block text-[10px]">Failed Payments</span>
                    <span className="font-bold text-white mt-0.5 block">{selectedEvaluation.evidence.failedPaymentsCount} Failures</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-950/80 border border-white/5">
                    <span className="text-surface-400 block text-[10px]">Registered Lorries</span>
                    <span className="font-bold text-white mt-0.5 block">{selectedEvaluation.evidence.totalTrucks} Vehicles</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-950/80 border border-white/5">
                    <span className="text-surface-400 block text-[10px]">Verified Lorries</span>
                    <span className="font-bold text-white mt-0.5 block">{selectedEvaluation.evidence.verifiedTrucks} Verified</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-950/80 border border-white/5">
                    <span className="text-surface-400 block text-[10px]">Account Age</span>
                    <span className="font-bold text-white mt-0.5 block">{selectedEvaluation.evidence.accountAgeDays} Days</span>
                  </div>
                </div>
              </div>

              {/* Platform Protection & Non-Automated Ban Policy */}
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-[11px] space-y-1 font-mono">
                <span className="font-bold block">🛡 Platform Compliance Policy</span>
                <p>
                  Automatic account suspensions are strictly prohibited. Platform administrators must inspect empirical evidence and attempt phone compliance outreach before taking manual account actions.
                </p>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-white/10 bg-surface-950/80 flex items-center justify-between gap-3 font-mono">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearRiskFlag}
                className="text-xs font-bold text-emerald-400 hover:bg-emerald-950/40 border-emerald-500/30"
              >
                Mark Cleared / Verified
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvaluation(null)}
                >
                  Close
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleFlagForAudit}
                  className="text-xs font-bold"
                >
                  Flag for Audit
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  )
}
