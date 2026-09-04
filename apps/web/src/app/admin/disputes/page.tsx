'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  ShieldExclamationIcon,
  TruckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { adminApi } from '@/lib/api'
import { Badge, Button, Spinner } from '@/components/ui'
import { formatINR, formatPhone } from '@/lib/utils'
import { toast } from '@/lib/toast'

interface Dispute {
  id: string
  category: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'Open' | 'Investigating' | 'Resolved' | 'Rejected'
  description: string
  resolution: string | null
  createdAt: string
  updatedAt: string
  booking: {
    id: string
    agreedPrice: number | string
    status: string
    load: { loadingAddress: string; unloadingAddress: string }
    truck: { registrationNumber: string }
    loadOwner: { id: string; name: string | null; phone: string }
    truckOwner: { id: string; name: string | null; phone: string }
  }
  raisedBy: { id: string; name: string | null; phone: string; role: string }
  resolvedBy: { name: string | null } | null
}

interface QueueResponse {
  disputes: Dispute[]
  total: number
  page: number
  pages: number
  queue: { open: number; investigating: number }
}

type QueueFilter = '' | 'Open' | 'Investigating' | 'Resolved' | 'Rejected'

const priorityVariant: Record<Dispute['priority'], 'default' | 'warning' | 'danger'> = {
  Low: 'default',
  Medium: 'warning',
  High: 'danger',
  Critical: 'danger',
}

const statusVariant: Record<Dispute['status'], 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
  Open: 'danger',
  Investigating: 'warning',
  Resolved: 'success',
  Rejected: 'default',
}

export default function AdminDisputesPage() {
  const [filter, setFilter] = useState<QueueFilter>('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<QueueResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Dispute | null>(null)
  const [resolution, setResolution] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadDisputes = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminApi.listDisputes(filter || undefined, page, 20)
      setData(response.data)
    } catch {
      toast.error('Could not load the dispute queue')
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    loadDisputes()
  }, [loadDisputes])

  const changeFilter = (next: QueueFilter) => {
    setFilter(next)
    setPage(1)
  }

  const openDispute = (dispute: Dispute) => {
    setSelected(dispute)
    setResolution(dispute.resolution || '')
  }

  const updateDispute = async (nextStatus: 'Investigating' | 'Resolved' | 'Rejected') => {
    if (!selected) return
    if ((nextStatus === 'Resolved' || nextStatus === 'Rejected') && resolution.trim().length < 10) {
      toast.error('Add at least 10 characters explaining the decision')
      return
    }
    setActionLoading(true)
    try {
      await adminApi.resolveDispute(selected.id, nextStatus, resolution.trim() || undefined)
      toast.success(`Dispute moved to ${nextStatus.toLowerCase()}`)
      setSelected(null)
      await loadDisputes()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not update dispute')
    } finally {
      setActionLoading(false)
    }
  }

  const disputes = data?.disputes || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      <section className="bg-panel rounded-[20px] border border-white/10 shadow-modal p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_80%_at_50%_0%,#000_65%,transparent_100%)] pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldExclamationIcon className="w-5 h-5 text-danger-400" />
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-danger-300 bg-danger-500/10 border border-danger-500/20 px-3 py-1 rounded-full">Counterparty trust</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Booking dispute resolution</h1>
            <p className="text-xs sm:text-sm text-surface-400 mt-2 max-w-2xl leading-relaxed">Investigate payment, delay, document, and cargo claims with both booking parties visible. Decisions are recorded on the dispute audit trail.</p>
          </div>
          <button type="button" onClick={loadDisputes} disabled={loading} className="px-4 py-2.5 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-xs font-mono font-bold text-white inline-flex items-center gap-2 self-start lg:self-auto disabled:opacity-50">
            <ArrowPathIcon className={`w-4 h-4 text-primary-400 ${loading ? 'animate-spin' : ''}`} /> Refresh queue
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 font-mono">
        <QueueMetric label="Open cases" value={data?.queue.open ?? '—'} tone="danger" detail="Needs triage" />
        <QueueMetric label="Investigating" value={data?.queue.investigating ?? '—'} tone="warning" detail="Admin-owned" />
        <QueueMetric label="All cases" value={data?.total ?? '—'} tone="neutral" detail="Current filter" />
        <QueueMetric label="Resolution SLA" value="24h" tone="primary" detail="Target for critical claims" />
      </section>

      <section className="bg-panel rounded-[20px] border border-white/10 shadow-modal overflow-hidden">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Dispute operations queue</h2>
            <p className="text-[11px] text-surface-400 font-mono mt-1">Review older and higher-priority cases first</p>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {([
              ['', 'All'],
              ['Open', 'Open'],
              ['Investigating', 'Investigating'],
              ['Resolved', 'Resolved'],
              ['Rejected', 'Rejected'],
            ] as Array<[QueueFilter, string]>).map(([value, label]) => (
              <button key={label} type="button" onClick={() => changeFilter(value)} className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition-colors ${filter === value ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white hover:bg-white/5'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && !data ? (
          <div className="py-16 flex flex-col items-center gap-3"><Spinner size="lg" /><p className="text-xs font-mono font-bold uppercase tracking-widest text-surface-400">Loading case files...</p></div>
        ) : disputes.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <CheckCircleIcon className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
            <p className="font-bold text-white">No disputes in this view</p>
            <p className="text-xs text-surface-400 mt-1 max-w-md mx-auto">When a shipper or transporter raises a claim against a booking, it will appear here with the route and counterparty evidence.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {disputes.map((dispute) => (
              <button key={dispute.id} type="button" onClick={() => openDispute(dispute)} className="w-full text-left p-5 hover:bg-white/5 transition-colors cursor-pointer">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-primary-300">CASE-{dispute.id.slice(0, 8).toUpperCase()}</span>
                      <Badge variant={statusVariant[dispute.status]} size="sm" dot>{dispute.status}</Badge>
                      <Badge variant={priorityVariant[dispute.priority]} size="sm">{dispute.priority} priority</Badge>
                      <span className="text-[10px] text-surface-500 font-mono">{new Date(dispute.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-white font-bold">
                      <span className="truncate max-w-[170px]">{dispute.booking.load.loadingAddress.split(',')[0]}</span>
                      <ArrowRightIcon className="w-4 h-4 text-primary-400 shrink-0" />
                      <span className="truncate max-w-[170px]">{dispute.booking.load.unloadingAddress.split(',')[0]}</span>
                      <span className="text-[11px] font-mono text-surface-400 ml-1">· {dispute.booking.truck.registrationNumber}</span>
                    </div>
                    <p className="text-xs text-surface-300 line-clamp-1">{dispute.description}</p>
                  </div>
                  <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0">
                    <div className="text-left lg:text-right"><span className="block text-[10px] uppercase tracking-widest text-surface-500 font-mono">Raised by</span><span className="block text-xs font-bold text-white">{dispute.raisedBy.name || formatPhone(dispute.raisedBy.phone)}</span><span className="block text-[10px] text-surface-400">{dispute.category.replace('_', ' ')}</span></div>
                    <div className="text-left lg:text-right"><span className="block text-[10px] uppercase tracking-widest text-surface-500 font-mono">Value</span><span className="block text-sm font-black text-emerald-300">{formatINR(Number(dispute.booking.agreedPrice))}</span><span className="block text-[10px] text-primary-300">Inspect <ArrowRightIcon className="inline w-3 h-3" /></span></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!!data && data.pages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-surface-400">Page {data.page} of {data.pages}</span>
            <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="px-3 py-1.5 rounded-lg border border-white/10 text-surface-300 disabled:opacity-40">Previous</button><button type="button" disabled={page >= data.pages} onClick={() => setPage((current) => current + 1)} className="px-3 py-1.5 rounded-lg border border-white/10 text-surface-300 disabled:opacity-40">Next</button></div>
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Dispute case review">
          <div className="bg-panel border border-white/10 rounded-[20px] shadow-modal max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4 bg-surface-950/60">
              <div><span className="text-[10px] font-mono text-primary-400 uppercase tracking-widest">Case {selected.id.slice(0, 8).toUpperCase()}</span><h2 className="text-lg font-black text-white mt-1">{selected.category.replace('_', ' ')} claim</h2><div className="flex items-center gap-2 mt-2"><Badge variant={statusVariant[selected.status]} size="sm" dot>{selected.status}</Badge><Badge variant={priorityVariant[selected.priority]} size="sm">{selected.priority} priority</Badge></div></div>
              <button type="button" onClick={() => setSelected(null)} className="p-2 rounded-xl text-surface-400 hover:text-white hover:bg-white/10" aria-label="Close dispute review"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-5 sm:p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-surface-400 mb-3"><MapPinIcon className="w-4 h-4 text-primary-400" /> Booking context</div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center text-sm"><div><span className="block text-[10px] text-surface-500 uppercase font-mono">Origin</span><strong className="text-white">{selected.booking.load.loadingAddress}</strong></div><ArrowRightIcon className="hidden sm:block w-5 h-5 text-primary-400" /><div><span className="block text-[10px] text-surface-500 uppercase font-mono">Destination</span><strong className="text-white">{selected.booking.load.unloadingAddress}</strong></div></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs font-mono"><span><span className="block text-surface-500 text-[10px]">Truck</span><strong className="text-white">{selected.booking.truck.registrationNumber}</strong></span><span><span className="block text-surface-500 text-[10px]">Trip status</span><strong className="text-white">{selected.booking.status}</strong></span><span><span className="block text-surface-500 text-[10px]">Agreed value</span><strong className="text-emerald-300">{formatINR(Number(selected.booking.agreedPrice))}</strong></span><span><span className="block text-surface-500 text-[10px]">Raised</span><strong className="text-white">{new Date(selected.createdAt).toLocaleDateString('en-IN')}</strong></span></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PartyCard label="Shipper / load owner" name={selected.booking.loadOwner.name} phone={selected.booking.loadOwner.phone} />
                <PartyCard label="Transporter / truck owner" name={selected.booking.truckOwner.name} phone={selected.booking.truckOwner.phone} />
              </div>

              <div className="p-4 rounded-2xl bg-danger-950/30 border border-danger-500/20"><div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-danger-300 mb-2"><ChatBubbleLeftRightIcon className="w-4 h-4" /> Claim submitted by {selected.raisedBy.name || formatPhone(selected.raisedBy.phone)}</div><p className="text-sm text-white leading-relaxed">{selected.description}</p></div>

              {selected.status !== 'Resolved' && selected.status !== 'Rejected' ? (
                <div className="space-y-2"><label htmlFor="resolution-note" className="text-xs font-mono font-bold uppercase tracking-widest text-surface-300">Investigation / resolution note</label><textarea id="resolution-note" value={resolution} onChange={(event) => setResolution(event.target.value)} rows={4} placeholder="Record evidence reviewed, agreed action, refund instruction, or reason for rejection..." className="input resize-none" /><p className="text-[10px] text-surface-500 font-mono">A note of 10+ characters is required to close a case. Notes are saved with the case record.</p></div>
              ) : (
                <div className="p-4 rounded-2xl bg-surface-950 border border-white/5"><span className="text-[10px] text-surface-500 uppercase tracking-widest font-mono">Resolution record</span><p className="text-sm text-white mt-2">{selected.resolution || 'No resolution note recorded.'}</p>{selected.resolvedBy && <p className="text-[10px] text-surface-400 font-mono mt-2">Closed by {selected.resolvedBy.name || 'admin'}</p>}</div>
              )}
            </div>
            {selected.status !== 'Resolved' && selected.status !== 'Rejected' && <div className="p-4 border-t border-white/10 bg-surface-950/60 flex flex-wrap items-center justify-between gap-3"><Button variant="secondary" size="sm" onClick={() => updateDispute('Investigating')} disabled={actionLoading} leftIcon={<ClockIcon className="w-4 h-4" />}>Mark investigating</Button><div className="flex gap-2"><Button variant="danger" size="sm" onClick={() => updateDispute('Rejected')} disabled={actionLoading}>Reject claim</Button><Button variant="primary" size="sm" onClick={() => updateDispute('Resolved')} disabled={actionLoading} leftIcon={<CheckCircleIcon className="w-4 h-4" />}>{actionLoading ? 'Saving...' : 'Resolve case'}</Button></div></div>}
          </div>
        </div>
      )}
    </div>
  )
}

function QueueMetric({ label, value, tone, detail }: { label: string; value: React.ReactNode; tone: 'danger' | 'warning' | 'primary' | 'neutral'; detail: string }) {
  const classes = { danger: 'text-danger-300 border-danger-500/30 bg-danger-950/30', warning: 'text-amber-300 border-amber-500/30 bg-amber-950/30', primary: 'text-primary-300 border-primary-500/30 bg-primary-950/20', neutral: 'text-white border-white/10 bg-panel' }
  return <div className={`p-4 sm:p-5 rounded-2xl border shadow-card ${classes[tone]}`}><span className="block text-[10px] font-black uppercase tracking-widest text-surface-400">{label}</span><span className="block text-2xl sm:text-3xl font-black mt-1">{value}</span><span className="block text-[10px] text-surface-400 mt-1">{detail}</span></div>
}

function PartyCard({ label, name, phone }: { label: string; name: string | null; phone: string }) {
  return <div className="p-4 rounded-2xl bg-surface-950/70 border border-white/5 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center"><TruckIcon className="w-4 h-4 text-primary-400" /></div><div className="min-w-0"><span className="block text-[10px] text-surface-500 uppercase tracking-widest font-mono">{label}</span><strong className="block text-sm text-white truncate">{name || 'Unnamed party'}</strong><span className="block text-[11px] text-surface-400 font-mono">{formatPhone(phone)}</span></div></div>
}
