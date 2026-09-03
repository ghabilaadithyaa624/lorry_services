'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  DocumentCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { adminApi } from '@/lib/api'
import { Modal, Badge, Button, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatPhone } from '@/lib/utils'

interface PendingDoc {
  id: string
  type: string
  docNumber: string | null
  s3Url: string
  originalFilename: string | null
  fileSize: number | null
  mimeType: string | null
  verificationStatus: string
  createdAt: string
  truck: {
    id: string
    registrationNumber: string
    bodyType: string
    /** Vahan RC cross-check snapshot (present when the RC has been validated). */
    vahanValidatedAt: string | null
    vahanDetails: {
      registrationStatus?: string
      makerModel?: string | null
      fuelType?: string | null
      fitnessValidUpto?: string | null
      insuranceValidUpto?: string | null
      source?: string
    } | null
    fastagStatus?: string | null
    user: { name: string | null; phone: string }
  }
}

interface ConfirmState {
  doc: PendingDoc
  action: 'Verified' | 'Rejected'
}

export default function KycQueuePage() {
  const [docs, setDocs] = useState<PendingDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [vahanLoading, setVahanLoading] = useState<string | null>(null)
  const [vahanResults, setVahanResults] = useState<Record<string, { status: string; message: string; checkedAt?: string }>>({})

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.getPendingDocuments()
      setDocs(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load documents'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  const handleAction = async () => {
    if (!confirm) return
    const { doc, action } = confirm
    setActionLoading(doc.id)
    try {
      await adminApi.verifyDocument(doc.id, action, action === 'Rejected' && rejectionNote.trim() ? rejectionNote.trim() : undefined)
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success(`Document ${doc.type} for truck ${doc.truck.registrationNumber} marked as ${action}!`)
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { message?: string } } })?.response?.data
      toast.error(errorData?.message || 'Action failed. Please try again.')
    } finally {
      setActionLoading(null)
      setConfirm(null)
      setRejectionNote('')
    }
  }

  const handleVahanCheck = async (truckId: string, registrationNumber: string) => {
    setVahanLoading(truckId)
    try {
      const response = await adminApi.checkVahan(truckId)
      const result = response.data
      setVahanResults((current) => ({
        ...current,
        [truckId]: { status: result.status, message: result.message, checkedAt: result.checkedAt },
      }))
      if (result.success) {
        toast.success(`${registrationNumber} matched the Vahan provider response`)
      } else {
        toast.info(result.message || 'Vahan check needs manual review')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Vahan lookup failed')
    } finally {
      setVahanLoading(null)
    }
  }

  // Calculate pending duration helper
  const getPendingDuration = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours} hours ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} pending`
  }

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-mono font-bold text-surface-400 uppercase tracking-widest">
          Loading KYC verification queue...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 bg-panel rounded-[20px] border border-white/10 text-center space-y-4 max-w-md mx-auto font-sans">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Failed to Load KYC Queue</h3>
        <p className="text-xs font-mono text-surface-400">{error}</p>
        <button
          onClick={fetchDocs}
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
            <DocumentCheckIcon className="w-5 h-5 text-primary-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              KYC & Document Verification Workspace
            </h1>
          </div>
          <p className="text-xs font-mono text-surface-400 mt-1">
            Review submitted RTO RC books and commercial insurance policies before approving fleet capacity.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="info" size="sm" className="font-mono text-[10px]">RC document review</Badge>
            <Badge variant="success" size="sm" className="font-mono text-[10px]">Vahan / Parivahan lookup</Badge>
            <span className="text-[10px] text-surface-500 font-mono">Provider results never replace manual approval.</span>
          </div>
        </div>

        <button
          onClick={fetchDocs}
          className="px-4 py-2 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-xs font-mono font-bold text-white transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <ArrowPathIcon className="w-4 h-4 text-primary-400" />
          <span>Refresh Queue ({docs.length})</span>
        </button>
      </div>

      {/* Empty State */}
      {docs.length === 0 ? (
        <div className="p-12 bg-panel rounded-[20px] border border-white/10 text-center space-y-3 shadow-modal font-mono">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto text-2xl">
            ✓
          </div>
          <h3 className="text-base font-bold text-white">All KYC Submissions Processed</h3>
          <p className="text-xs text-surface-400 max-w-sm mx-auto">
            No pending vehicle RC or insurance documents require verification at this moment.
          </p>
        </div>
      ) : (
        /* KYC Queue Table Card */
        <div className="bg-panel rounded-[20px] border border-white/10 shadow-modal overflow-hidden font-mono">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Pending KYC Items ({docs.length})
            </span>
            <span className="text-[11px] text-surface-400">AWS S3 Encrypted Storage</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-surface-950/60 text-surface-400 uppercase text-[10px]">
                  <th className="text-left py-3 px-4 font-bold">Driver / User</th>
                  <th className="text-left py-3 px-4 font-bold">Vehicle</th>
                  <th className="text-left py-3 px-4 font-bold">Document Type</th>
                  <th className="text-left py-3 px-4 font-bold">Status</th>
                  <th className="text-left py-3 px-4 font-bold">Pending Duration</th>
                  <th className="text-right py-3 px-4 font-bold">Review & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{doc.truck.user.name || 'Transporter'}</p>
                      <p className="text-[11px] text-surface-400">{formatPhone(doc.truck.user.phone)}</p>
                    </td>

                    <td className="py-3.5 px-4 min-w-[190px]">
                      <p className="font-bold text-white">🆔 {doc.truck.registrationNumber}</p>
                      <Badge variant="default" size="sm" className="font-mono text-[10px]">{doc.truck.bodyType}</Badge>
                      {(() => {
                        const vahan = vahanResults[doc.truck.id]
                        const vahanStatus = vahan?.status || doc.truck.vahanStatus || 'NotChecked'
                        const isVerified = vahanStatus === 'Verified'
                        const isPending = vahanStatus === 'Pending' || vahanLoading === doc.truck.id
                        return (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={isVerified ? 'success' : isPending ? 'info' : vahanStatus === 'Mismatch' || vahanStatus === 'Error' ? 'danger' : 'warning'} size="sm" className="font-mono text-[9px]">
                                {isPending ? 'CHECKING...' : `VAHAN ${vahanStatus.toUpperCase()}`}
                              </Badge>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleVahanCheck(doc.truck.id, doc.truck.registrationNumber)}
                              disabled={vahanLoading !== null}
                              className="text-[10px] font-mono font-bold text-primary-300 hover:text-primary-200 disabled:opacity-40 inline-flex items-center gap-1"
                            >
                              <ArrowPathIcon className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} />
                              {vahanStatus === 'NotChecked' ? 'Run Vahan check' : 'Run again'}
                            </button>
                            {(vahan?.checkedAt || doc.truck.vahanLastCheckedAt) && <span className="block text-[9px] text-surface-500 font-mono">Checked {new Date(vahan?.checkedAt || doc.truck.vahanLastCheckedAt || '').toLocaleDateString('en-IN')}</span>}
                          </div>
                        )
                      })()}
                      {/* Vahan RC cross-check for the reviewer */}
                      {doc.truck.vahanValidatedAt && doc.truck.vahanDetails ? (
                        <p
                          className="mt-1 text-[10px] font-mono text-emerald-400"
                          title={`Vahan snapshot (${doc.truck.vahanDetails.source || 'vahan_api'}): ${
                            doc.truck.vahanDetails.registrationStatus || 'ACTIVE'
                          }${doc.truck.vahanDetails.makerModel ? ` · ${doc.truck.vahanDetails.makerModel}` : ''}${
                            doc.truck.vahanDetails.insuranceValidUpto ? ` · insurance till ${doc.truck.vahanDetails.insuranceValidUpto}` : ''
                          }`}
                        >
                          ✓ Vahan: {doc.truck.vahanDetails.registrationStatus || 'ACTIVE'}
                        </p>
                      ) : (
                        <p className="mt-1 text-[10px] font-mono text-surface-500" title="RC not yet validated against the Vahan database">
                          Vahan: not validated
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={doc.type === 'RC' ? 'info' : 'primary'} size="sm" className="font-mono text-[10px]">
                          {doc.type}
                        </Badge>
                        {doc.docNumber && (
                          <span className="text-surface-300 font-bold">#{doc.docNumber}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="warning" size="sm" className="font-mono text-[10px]">
                        PENDING
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-surface-300">
                      <div className="flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>{getPendingDuration(doc.createdAt)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={doc.s3Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                        >
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-primary-400" />
                          <span>Review</span>
                        </a>

                        <Button
                          variant="primary"
                          size="sm"
                          disabled={actionLoading === doc.id}
                          onClick={() => setConfirm({ doc, action: 'Verified' })}
                          leftIcon={<CheckCircleIcon className="w-3.5 h-3.5" />}
                          className="font-bold text-xs py-1.5 shadow-glow-primary"
                        >
                          Verify
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          disabled={actionLoading === doc.id}
                          onClick={() => setConfirm({ doc, action: 'Rejected' })}
                          leftIcon={<XCircleIcon className="w-3.5 h-3.5" />}
                          className="font-bold text-xs py-1.5"
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirm && (
        <Modal
          open={true}
          onClose={() => {
            setConfirm(null)
            setRejectionNote('')
          }}
          title={confirm.action === 'Verified' ? 'Confirm Document Verification' : 'Reject Document Verification'}
          description={`${confirm.doc.type} Document for Vehicle ${confirm.doc.truck.registrationNumber}`}
          size="sm"
        >
          <div className="space-y-4 font-mono text-xs">
            {confirm.action === 'Rejected' && (
              <div>
                <label className="block text-xs font-bold uppercase text-surface-300 mb-1.5">
                  Rejection Reason Notes (optional)
                </label>
                <textarea
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Explain why document was rejected (e.g. unreadable scan)..."
                  className="w-full p-3 bg-surface-950 border border-white/10 rounded-xl text-white outline-none focus:border-primary-500 min-h-[80px]"
                  rows={3}
                />
              </div>
            )}

            <p className="text-surface-300 leading-relaxed">
              {confirm.action === 'Verified'
                ? 'Are you sure you want to mark this document as VERIFIED? If all vehicle documents are verified, the truck status will update to Verified.'
                : 'Are you sure you want to REJECT this document? The truck driver will be notified to upload a new document.'}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirm(null)
                  setRejectionNote('')
                }}
                disabled={actionLoading !== null}
              >
                Cancel
              </Button>

              <Button
                variant={confirm.action === 'Verified' ? 'primary' : 'danger'}
                size="sm"
                loading={actionLoading !== null}
                onClick={handleAction}
                className="font-bold shadow-glow-primary"
              >
                {confirm.action === 'Verified' ? 'Confirm Verification' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
