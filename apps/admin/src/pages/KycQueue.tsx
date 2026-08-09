import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  Truck,
  Calendar,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatPhone, cn } from '../lib/utils'

interface PendingDocument {
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
    user: { name: string | null; phone: string }
  }
}

interface ConfirmAction {
  doc: PendingDocument
  action: 'Verified' | 'Rejected'
}

export function KycQueue() {
  const [documents, setDocuments] = useState<PendingDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<ConfirmAction | null>(null)
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/documents/pending')
      setDocuments(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch pending documents'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleVerifyOrReject = async () => {
    if (!confirmModal) return
    const { doc, action } = confirmModal
    setActionLoading(doc.id)
    setStatusMessage(null)

    try {
      const body: { status: string; notes?: string } = { status: action }
      if (action === 'Rejected' && rejectionNotes.trim()) {
        body.notes = rejectionNotes.trim()
      }

      await api.patch(`/admin/documents/${doc.id}/verify`, body)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      setStatusMessage({
        text: `Document ${doc.type} for ${doc.truck.registrationNumber} has been ${action === 'Verified' ? 'verified' : 'rejected'}.`,
        type: 'success',
      })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Verification update failed'
      setStatusMessage({ text: msg, type: 'error' })
    } finally {
      setActionLoading(null)
      setConfirmModal(null)
      setRejectionNotes('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-surface-800 rounded w-48"></div>
          <div className="h-9 bg-surface-800 rounded w-24"></div>
        </div>
        <div className="card p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-700/40 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-12 text-center flex flex-col items-center">
        <AlertCircle className="w-12 h-12 text-danger-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Failed to load KYC Queue</h2>
        <p className="text-surface-400 text-sm max-w-md mb-6">{error}</p>
        <button onClick={fetchDocuments} className="btn-primary flex items-center gap-2">
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
          <h1 className="text-2xl font-black tracking-tight text-white">KYC Verification Queue</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Review and approve vehicle registration certificates and insurance documents
          </p>
        </div>
        <button
          onClick={fetchDocuments}
          className="btn-secondary flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Queue
        </button>
      </div>

      {/* Notification Toast Banner */}
      {statusMessage && (
        <div
          className={cn(
            'p-4 rounded-xl text-sm font-medium flex items-center justify-between',
            statusMessage.type === 'success'
              ? 'bg-success-500/15 text-success-400 border border-success-500/30'
              : 'bg-danger-500/15 text-danger-400 border border-danger-500/30'
          )}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs underline opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Content */}
      {documents.length === 0 ? (
        <div className="card p-16 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-success-500/10 flex items-center justify-center text-success-400 mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">KYC Queue is Clear!</h3>
          <p className="text-sm text-surface-400 max-w-sm">
            All submitted driver and vehicle documents have been reviewed and verified.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-700/60 flex items-center justify-between">
            <span className="text-sm font-bold text-white">
              Pending Submissions ({documents.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-800/80 border-b border-surface-700/60 text-[10px] font-bold uppercase tracking-wider text-surface-400">
                  <th className="text-left px-6 py-3.5">Truck Owner</th>
                  <th className="text-left px-6 py-3.5">Vehicle</th>
                  <th className="text-left px-6 py-3.5">Document</th>
                  <th className="text-left px-6 py-3.5">Document No.</th>
                  <th className="text-left px-6 py-3.5">Submitted</th>
                  <th className="text-right px-6 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/40">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-surface-300">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{doc.truck.user.name || '—'}</p>
                          <p className="text-xs text-surface-400 font-mono">{formatPhone(doc.truck.user.phone)}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-surface-400" />
                        <div>
                          <p className="font-bold text-white font-mono text-xs">{doc.truck.registrationNumber}</p>
                          <span className="badge bg-surface-700 text-surface-300 text-[10px]">
                            {doc.truck.bodyType}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'badge font-bold',
                            doc.type === 'RC'
                              ? 'bg-info-500/20 text-info-400 border border-info-500/30'
                              : 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          )}
                        >
                          {doc.type}
                        </span>
                        <a
                          href={doc.s3Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-primary-400 hover:text-primary-300 transition-colors"
                          title="View uploaded document file"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-surface-300">
                      {doc.docNumber || '—'}
                    </td>

                    <td className="px-6 py-4 text-xs text-surface-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(doc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={actionLoading === doc.id}
                          onClick={() => setConfirmModal({ doc, action: 'Verified' })}
                          className="btn-primary text-xs py-1.5 px-3 bg-success-600 hover:bg-success-700 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verify
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === doc.id}
                          onClick={() => setConfirmModal({ doc, action: 'Rejected' })}
                          className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setConfirmModal(null)
              setRejectionNotes('')
            }}
          />
          <div className="relative z-10 w-full max-w-md bg-surface-800 border border-surface-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {confirmModal.action === 'Verified' ? 'Verify Document' : 'Reject Document'}
            </h3>
            <p className="text-sm text-surface-300">
              {confirmModal.action === 'Verified'
                ? `Confirm verification for ${confirmModal.doc.type} (${confirmModal.doc.truck.registrationNumber}). This will mark the document as valid.`
                : `Are you sure you want to reject ${confirmModal.doc.type} for ${confirmModal.doc.truck.registrationNumber}?`}
            </p>

            {confirmModal.action === 'Rejected' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Rejection Reason (optional)
                </label>
                <textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="e.g. Document image is blurry or expired..."
                  className="input min-h-[80px] resize-none"
                  rows={3}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmModal(null)
                  setRejectionNotes('')
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={handleVerifyOrReject}
                className={cn(
                  'text-sm font-semibold py-2 px-4 rounded-button shadow-sm',
                  confirmModal.action === 'Verified'
                    ? 'bg-success-600 hover:bg-success-700 text-white'
                    : 'bg-danger-600 hover:bg-danger-700 text-white'
                )}
              >
                {actionLoading ? 'Processing...' : confirmModal.action === 'Verified' ? 'Confirm Verification' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KycQueue
