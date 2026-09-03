import React, { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, MessageSquare, RefreshCw, ShieldAlert, Truck, X } from 'lucide-react'
import { adminApi } from '../lib/api'
import { formatINR, formatPhone, cn } from '../lib/utils'

interface Dispute {
  id: string
  category: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'Open' | 'Investigating' | 'Resolved' | 'Rejected'
  description: string
  resolution: string | null
  createdAt: string
  booking: { id: string; agreedPrice: number | string; status: string; load: { loadingAddress: string; unloadingAddress: string }; truck: { registrationNumber: string }; loadOwner: { name: string | null; phone: string }; truckOwner: { name: string | null; phone: string } }
  raisedBy: { name: string | null; phone: string; role: string }
}

type Filter = '' | 'Open' | 'Investigating' | 'Resolved' | 'Rejected'
const statusTone: Record<string, string> = { Open: 'bg-danger-500/15 text-danger-400 border-danger-500/30', Investigating: 'bg-warning-500/15 text-warning-400 border-warning-500/30', Resolved: 'bg-success-500/15 text-success-400 border-success-500/30', Rejected: 'bg-surface-700 text-surface-300 border-surface-600' }

export function Disputes() {
  const [filter, setFilter] = useState<Filter>('')
  const [data, setData] = useState<{ disputes: Dispute[]; total: number; pages: number; queue: { open: number; investigating: number } } | null>(null)
  const [selected, setSelected] = useState<Dispute | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await adminApi.listDisputes(filter || undefined); setData(result.data) } catch { setError('Could not load dispute queue') } finally { setLoading(false) }
  }, [filter])
  useEffect(() => { load() }, [load])

  const update = async (status: 'Investigating' | 'Resolved' | 'Rejected') => {
    if (!selected) return
    if ((status === 'Resolved' || status === 'Rejected') && note.trim().length < 10) { setError('Add at least 10 characters explaining the decision'); return }
    setSaving(true); setError('')
    try { await adminApi.resolveDispute(selected.id, status, note.trim() || undefined); setSelected(null); await load() } catch (err: any) { setError(err?.response?.data?.message || 'Could not update dispute') } finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-danger-400 text-xs font-bold uppercase tracking-widest"><ShieldAlert className="w-4 h-4" /> Counterparty trust</div><h1 className="text-2xl font-black tracking-tight text-white mt-2">Booking dispute resolution</h1><p className="text-sm text-surface-400 mt-1">Investigate freight claims and record accountable decisions.</p></div><button type="button" onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 self-start"><RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh queue</button></header>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Metric label="Open cases" value={data?.queue.open ?? '—'} tone="text-danger-400" detail="Needs triage" /><Metric label="Investigating" value={data?.queue.investigating ?? '—'} tone="text-warning-400" detail="Admin-owned" /><Metric label="All cases" value={data?.total ?? '—'} tone="text-white" detail="Current filter" /><Metric label="Target SLA" value="24h" tone="text-primary-400" detail="Critical claims" /></div>
    <section className="card overflow-hidden"><div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="font-bold text-white">Dispute operations queue</h2><p className="text-xs text-surface-400 mt-1">Higher priority and older cases appear first.</p></div><div className="flex gap-1 overflow-x-auto">{(['', 'Open', 'Investigating', 'Resolved', 'Rejected'] as Filter[]).map((item) => <button key={item || 'all'} type="button" onClick={() => setFilter(item)} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap', filter === item ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white')}>{item || 'All'}</button>)}</div></div>{loading && !data ? <div className="p-16 text-center"><RefreshCw className="w-8 h-8 mx-auto text-primary-400 animate-spin" /></div> : error && !data ? <div className="p-12 text-center text-danger-400"><AlertCircle className="w-8 h-8 mx-auto mb-2" />{error}</div> : !data?.disputes.length ? <div className="p-16 text-center"><CheckCircle2 className="w-10 h-10 mx-auto text-success-400 mb-2" /><p className="font-bold text-white">No disputes in this view</p><p className="text-xs text-surface-400 mt-1">Claims raised against bookings will appear here.</p></div> : <div className="divide-y divide-white/5">{data.disputes.map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item); setNote(item.resolution || '') }} className="w-full text-left p-5 hover:bg-white/5 transition-colors"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div className="space-y-2 min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-mono font-bold text-primary-400">CASE-{item.id.slice(0, 8).toUpperCase()}</span><span className={cn('badge border', statusTone[item.status])}>{item.status}</span><span className="badge bg-surface-800 text-surface-300 border-white/10">{item.priority} priority</span></div><div className="flex items-center gap-2 text-white font-bold text-sm"><span className="truncate max-w-[170px]">{item.booking.load.loadingAddress.split(',')[0]}</span><ArrowRight className="w-4 h-4 text-primary-400" /><span className="truncate max-w-[170px]">{item.booking.load.unloadingAddress.split(',')[0]}</span><span className="font-mono text-xs text-surface-400">· {item.booking.truck.registrationNumber}</span></div><p className="text-xs text-surface-300 truncate">{item.description}</p></div><div className="text-left lg:text-right shrink-0"><p className="text-[10px] uppercase text-surface-500">Raised by {item.raisedBy.role.replace('_', ' ')}</p><p className="text-xs font-bold text-white">{item.raisedBy.name || formatPhone(item.raisedBy.phone)}</p><p className="text-sm font-black text-success-400 mt-1">{formatINR(Number(item.booking.agreedPrice))}</p></div></div></button>)}</div>}</section>

    {selected && <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-[#0F131D] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"><div className="p-5 border-b border-white/10 flex justify-between"><div><span className="text-[10px] text-primary-400 font-mono uppercase">Case {selected.id.slice(0, 8)}</span><h2 className="text-lg font-black text-white">{selected.category.replace('_', ' ')} claim</h2></div><button type="button" onClick={() => setSelected(null)} className="text-surface-400 hover:text-white"><X className="w-5 h-5" /></button></div><div className="p-5 space-y-4"><div className="p-4 rounded-xl bg-[#070A11] border border-white/5"><p className="text-xs text-surface-400 font-mono uppercase">Booking context</p><p className="text-sm font-bold text-white mt-2">{selected.booking.load.loadingAddress} <ArrowRight className="inline w-4 h-4 text-primary-400" /> {selected.booking.load.unloadingAddress}</p><p className="text-xs text-surface-400 font-mono mt-2"><Truck className="inline w-3.5 h-3.5" /> {selected.booking.truck.registrationNumber} · {formatINR(Number(selected.booking.agreedPrice))} · {selected.booking.status}</p></div><div className="grid grid-cols-2 gap-3"><Party label="Shipper" name={selected.booking.loadOwner.name} phone={selected.booking.loadOwner.phone} /><Party label="Transporter" name={selected.booking.truckOwner.name} phone={selected.booking.truckOwner.phone} /></div><div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/20"><div className="flex gap-2 text-xs text-danger-300 font-bold"><MessageSquare className="w-4 h-4" /> Claim narrative</div><p className="text-sm text-white leading-relaxed mt-2">{selected.description}</p></div>{selected.status !== 'Resolved' && selected.status !== 'Rejected' ? <div><label className="text-xs text-surface-300 font-bold" htmlFor="dispute-note">Investigation / resolution note</label><textarea id="dispute-note" className="input mt-2 min-h-[100px] resize-none" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record evidence reviewed and the decision..." /><p className="text-[10px] text-surface-500 mt-1">Required when closing a case.</p></div> : <div className="p-4 rounded-xl bg-[#070A11] text-sm text-white">{selected.resolution || 'No resolution note recorded.'}</div>}</div>{selected.status !== 'Resolved' && selected.status !== 'Rejected' && <div className="p-4 border-t border-white/10 flex flex-wrap justify-between gap-2"><button type="button" className="btn-secondary flex items-center gap-2" onClick={() => update('Investigating')} disabled={saving}><Clock3 className="w-4 h-4" /> Investigating</button><div className="flex gap-2"><button type="button" className="btn-danger" onClick={() => update('Rejected')} disabled={saving}>Reject</button><button type="button" className="btn-primary" onClick={() => update('Resolved')} disabled={saving}>{saving ? 'Saving...' : 'Resolve case'}</button></div></div>}</div></div>}
  </div>
}

function Metric({ label, value, tone, detail }: { label: string; value: React.ReactNode; tone: string; detail: string }) { return <div className="card p-4"><p className="text-[10px] uppercase tracking-widest text-surface-400">{label}</p><p className={`text-2xl font-black mt-1 ${tone}`}>{value}</p><p className="text-[10px] text-surface-400 mt-1">{detail}</p></div> }
function Party({ label, name, phone }: { label: string; name: string | null; phone: string }) { return <div className="p-3 rounded-xl bg-surface-800/70 border border-white/5"><p className="text-[10px] uppercase text-surface-500">{label}</p><p className="text-sm font-bold text-white mt-1">{name || 'Unnamed party'}</p><p className="text-[11px] font-mono text-surface-400">{formatPhone(phone)}</p></div> }
