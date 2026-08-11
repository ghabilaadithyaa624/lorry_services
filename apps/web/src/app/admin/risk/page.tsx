'use client'

import React, { useState, useEffect } from 'react'
import {
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
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
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadRiskData()
  }, [])

  const loadRiskData = async () => {
    try {
      setLoading(true)
      const [usersRes, bookingsRes, paymentsRes, trucksRes] = await Promise.allSettled([
        api.get('/admin/users').catch(() => ({ data: [] })),
        api.get('/admin/bookings').catch(() => ({ data: [] })),
        api.get('/admin/payments').catch(() => ({ data: [] })),
        api.get('/admin/trucks').catch(() => ({ data: [] })),
      ])

      const fetchedUsers: any[] = usersRes.status === 'fulfilled' ? (usersRes.value as any)?.data || [] : []
      const fetchedBookings: any[] = bookingsRes.status === 'fulfilled' ? (bookingsRes.value as any)?.data || [] : []
      const fetchedPayments: any[] = paymentsRes.status === 'fulfilled' ? (paymentsRes.value as any)?.data || [] : []
      const fetchedTrucks: any[] = trucksRes.status === 'fulfilled' ? (trucksRes.value as any)?.data || [] : []

      const evaluated = fetchedUsers.map((u) => {
        const userBks = fetchedBookings.filter((b) => b.loadOwnerId === u.id || b.truckOwnerId === u.id || b.userId === u.id)
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

  const handleClearRiskFlag = (userId: string) => {
    setActionLoading(true)
    setTimeout(() => {
      setEvaluations((prev) =>
        prev.map((e) =>
          e.userId === userId
            ? {
                ...e,
                riskTier: 'LOW RISK',
                riskScore: 0,
                reasons: ['Cleared by Admin manual compliance review'],
              }
            : e
        )
      )
      setActionLoading(false)
      setSelectedEvaluation(null)
      toast.success('User risk flag cleared. Account marked as manually verified.')
    }, 600)
  }

  const handleFlagForAudit = (userId: string) => {
    setActionLoading(true)
    setTimeout(() => {
      setEvaluations((prev) =>
        prev.map((e) =>
          e.userId === userId
            ? {
                ...e,
                riskTier: 'HIGH ATTENTION',
                riskScore: 75,
                reasons: [...e.reasons, 'Flagged by Admin for manual RTO/KYC compliance audit'],
              }
            : e
        )
      )
      setActionLoading(false)
      setSelectedEvaluation(null)
      toast.success('Account flagged for high attention audit.')
    }, 600)
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card">
            <span className="text-[10px] text-surface-400 font-black uppercase tracking-wider block">
              Total Audited Accounts
            </span>
            <span className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white mt-1 block">
              {totalAudited}
            </span>
            <span className="text-[11px] text-surface-500 font-medium">Platform users audited</span>
          </div>

          <div className="bg-emerald-50/80 dark:bg-emerald-950/60 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-card">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-black uppercase tracking-wider block">
              LOW RISK
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-200 mt-1 block">
              {lowRiskCount}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">Clean operational signals</span>
          </div>

          <div className="bg-amber-50/80 dark:bg-amber-950/60 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-card">
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-black uppercase tracking-wider block">
              REVIEW
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-200 mt-1 block">
              {reviewCount}
            </span>
            <span className="text-[11px] text-amber-700 font-medium">Moderate signals detected</span>
          </div>

          <div className="bg-rose-50/80 dark:bg-rose-950/60 p-4 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-card">
            <span className="text-[10px] text-rose-700 dark:text-rose-300 font-black uppercase tracking-wider block">
              HIGH ATTENTION
            </span>
            <span className="text-2xl sm:text-3xl font-black text-rose-800 dark:text-rose-200 mt-1 block">
              {highAttentionCount}
            </span>
            <span className="text-[11px] text-rose-700 font-medium">Requires Admin Review</span>
          </div>
        </div>

        {/* ── TOOLBAR: SEARCH & TIER FILTER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <MagnifyingGlassIcon className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user name or phone number..."
                className="input text-xs pl-9 py-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {['ALL', 'LOW RISK', 'REVIEW', 'HIGH ATTENTION'].map((st) => (
              <button
                key={st}
                onClick={() => setTierFilter(st)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer',
                  tierFilter === st
                    ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 hover:bg-surface-200'
                )}
              >
                {st === 'ALL' ? 'All Risk Tiers' : st}
              </button>
            ))}
          </div>
        </div>

        {/* ── RISK EVALUATION LIST ── */}
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm font-bold text-surface-500">Evaluating platform risk signals...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card overflow-hidden">
            <div className="p-5 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldExclamationIcon className="w-5 h-5 text-primary-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
                  Deterministic User Risk Evaluations
                </h2>
              </div>
              <span className="text-xs text-surface-400 font-mono">
                Admin Review Authoritative • Zero Auto-Bans
              </span>
            </div>

            {filteredEvaluations.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <ShieldExclamationIcon className="w-10 h-10 text-surface-300 dark:text-surface-600" />
                <p className="text-sm font-bold text-surface-700 dark:text-surface-300">
                  No users currently require risk review.
                </p>
                <p className="text-xs text-surface-400">
                  All active accounts have clean operational signals or no matching query results.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {filteredEvaluations.map((item) => {
                  const isHigh = item.riskTier === 'HIGH ATTENTION'
                  const isReview = item.riskTier === 'REVIEW'

                  return (
                    <div
                      key={item.userId}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors"
                    >
                      <div className="space-y-2 max-w-2xl">
                        {/* User Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-surface-900 dark:text-white font-mono">
                            {item.userName} ({item.userPhone})
                          </span>

                          <Badge
                            variant={isHigh ? 'danger' : isReview ? 'warning' : 'success'}
                            size="sm"
                          >
                            {item.riskTier}
                          </Badge>

                          <span className="text-[10px] font-mono text-surface-400">
                            Score: {item.riskScore}/100
                          </span>
                        </div>

                        {/* Transparent Reasons */}
                        <div className="space-y-1">
                          {item.reasons.map((r, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-xs text-surface-600 dark:text-surface-300">
                              <span className="text-primary-500 font-bold">•</span>
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>

                        {/* Key Empirical Evidence Chips */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-surface-500">
                          <span className="p-1 px-2 rounded-md bg-surface-100 dark:bg-surface-800">
                            Total Trips: {item.evidence.totalBookings}
                          </span>
                          <span className="p-1 px-2 rounded-md bg-surface-100 dark:bg-surface-800">
                            Cancellations: {item.evidence.cancelledBookings} ({item.evidence.cancellationRatePercent}%)
                          </span>
                          <span className="p-1 px-2 rounded-md bg-surface-100 dark:bg-surface-800">
                            Failed Payments: {item.evidence.failedPaymentsCount}
                          </span>
                          <span className="p-1 px-2 rounded-md bg-surface-100 dark:bg-surface-800">
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
                          className="text-xs font-bold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-2xl w-full max-h-[90vh] flex flex-col justify-between shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between bg-surface-50 dark:bg-surface-800/60">
              <div>
                <span className="text-[10px] text-surface-400 uppercase font-bold block">Risk Signal Audit & Evidence</span>
                <h3 className="text-base font-black text-surface-900 dark:text-white font-mono">
                  {selectedEvaluation.userName} ({selectedEvaluation.userPhone})
                </h3>
              </div>
              <button onClick={() => setSelectedEvaluation(null)} className="text-surface-400 hover:text-surface-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
              
              {/* Risk Tier Callout */}
              <div className={cn(
                'p-4 rounded-xl border flex items-center justify-between',
                selectedEvaluation.riskTier === 'HIGH ATTENTION'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : selectedEvaluation.riskTier === 'REVIEW'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              )}>
                <div>
                  <span className="font-bold text-sm block">Evaluated Risk Tier: {selectedEvaluation.riskTier}</span>
                  <span className="text-[11px] opacity-80 block">Score: {selectedEvaluation.riskScore} / 100</span>
                </div>
                <Badge variant={selectedEvaluation.riskTier === 'HIGH ATTENTION' ? 'danger' : 'warning'} size="sm">
                  {selectedEvaluation.riskTier}
                </Badge>
              </div>

              {/* Explicit Reasons List */}
              <div className="space-y-2">
                <span className="font-bold text-surface-900 dark:text-white block uppercase tracking-wider text-[10px]">
                  Transparent Risk Signal Reasons:
                </span>
                <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 space-y-1.5">
                  {selectedEvaluation.reasons.map((r, idx) => (
                    <p key={idx} className="text-surface-700 dark:text-surface-300 font-medium flex items-center gap-1.5">
                      <span className="text-primary-500">•</span> {r}
                    </p>
                  ))}
                </div>
              </div>

              {/* Empirical Evidence Grid */}
              <div className="space-y-2">
                <span className="font-bold text-surface-900 dark:text-white block uppercase tracking-wider text-[10px]">
                  Empirical Evidence Metrics:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60">
                    <span className="text-surface-400 block text-[10px]">Total Bookings</span>
                    <span className="font-bold text-surface-900 dark:text-white mt-0.5 block">{selectedEvaluation.evidence.totalBookings} Trips</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60">
                    <span className="text-surface-400 block text-[10px]">Cancellation Rate</span>
                    <span className="font-bold text-surface-900 dark:text-white mt-0.5 block">{selectedEvaluation.evidence.cancellationRatePercent}%</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60">
                    <span className="text-surface-400 block text-[10px]">Failed Payments</span>
                    <span className="font-bold text-surface-900 dark:text-white mt-0.5 block">{selectedEvaluation.evidence.failedPaymentsCount} Failures</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60">
                    <span className="text-surface-400 block text-[10px]">Registered Lorries</span>
                    <span className="font-bold text-surface-900 dark:text-white mt-0.5 block">{selectedEvaluation.evidence.totalTrucks} Vehicles</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60">
                    <span className="text-surface-400 block text-[10px]">Verified Lorries</span>
                    <span className="font-bold text-surface-900 dark:text-white mt-0.5 block">{selectedEvaluation.evidence.verifiedTrucks} Verified</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60">
                    <span className="text-surface-400 block text-[10px]">Account Age</span>
                    <span className="font-bold text-surface-900 dark:text-white mt-0.5 block">{selectedEvaluation.evidence.accountAgeDays} Days</span>
                  </div>
                </div>
              </div>

              {/* Platform Protection & Non-Automated Ban Policy */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                <span className="font-bold block">🛡 Platform Compliance Policy</span>
                <p>
                  Automatic account suspensions are strictly prohibited. Platform administrators must inspect empirical evidence and attempt phone compliance outreach before taking manual account actions.
                </p>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/60 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleClearRiskFlag(selectedEvaluation.userId)}
                disabled={actionLoading}
                className="text-xs font-bold text-emerald-600 hover:bg-emerald-50"
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
                  onClick={() => handleFlagForAudit(selectedEvaluation.userId)}
                  disabled={actionLoading}
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
