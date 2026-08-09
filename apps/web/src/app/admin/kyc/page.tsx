'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { Modal, Badge, Button, Skeleton } from '@/components/ui'
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

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/documents/pending')
      setDocs(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load documents'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleAction = async () => {
    if (!confirm) return
    const { doc, action } = confirm
    setActionLoading(doc.id)
    try {
      const body: { status: string; notes?: string } = { status: action }
      if (action === 'Rejected' && rejectionNote.trim()) {
        body.notes = rejectionNote.trim()
      }
      await api.patch(`/admin/documents/${doc.id}/verify`, body)
      setDocs(prev => prev.filter(d => d.id !== doc.id))
      toast.success(`Document ${action === 'Verified' ? 'verified' : 'rejected'} successfully`)
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { message?: string } } })?.response?.data
      toast.error(errorData?.message || 'Action failed. Please try again.')
    } finally {
      setActionLoading(null)
      setConfirm(null)
      setRejectionNote('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Skeleton width={250} className="h-7" />
          <Skeleton width={100} className="h-9" />
        </div>
        <div className="card overflow-hidden">
          <div className="p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="flex-1 space-y-2">
                  <Skeleton width="60%" className="h-4" />
                  <Skeleton width="40%" className="h-3" />
                </div>
                <Skeleton width={80} className="h-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-danger-400 mb-4" />
        <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Failed to load KYC queue</h3>
        <p className="text-sm text-surface-500 mb-6">{error}</p>
        <button onClick={fetchDocs} className="btn-primary flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900 dark:text-white tracking-tight">KYC Queue</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {docs.length > 0 ? `${docs.length} document${docs.length !== 1 ? 's' : ''} pending review` : 'All documents reviewed'}
          </p>
        </div>
        <button onClick={fetchDocs} className="btn-secondary flex items-center gap-2 text-sm self-start">
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Empty State */}
      {docs.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircleIcon className="w-16 h-16 text-success-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">All caught up!</h3>
          <p className="text-sm text-surface-500">No pending KYC documents to review.</p>
        </div>
      ) : (
        /* Documents Table */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-700">
                  {['Truck Owner', 'Truck', 'Document', 'Doc Number', 'Submitted', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-surface-900 dark:text-white">{doc.truck.user.name || '—'}</p>
                      <p className="text-xs text-surface-500">{formatPhone(doc.truck.user.phone)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-surface-900 dark:text-white">{doc.truck.registrationNumber}</p>
                      <Badge variant="default" size="sm">{doc.truck.bodyType}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={doc.type === 'RC' ? 'info' : 'primary'} size="sm">{doc.type}</Badge>
                        <a href={doc.s3Url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 dark:text-primary-400">
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-surface-600 dark:text-surface-400 font-mono text-xs">
                      {doc.docNumber || '—'}
                    </td>
                    <td className="px-4 py-3 text-surface-500 text-xs">
                      {new Date(doc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={actionLoading === doc.id}
                          loading={actionLoading === doc.id}
                          onClick={() => setConfirm({ doc, action: 'Verified' })}
                          leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                        >
                          Verify
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={actionLoading === doc.id}
                          onClick={() => setConfirm({ doc, action: 'Rejected' })}
                          leftIcon={<XCircleIcon className="w-4 h-4" />}
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

      {/* Confirmation Modal */}
      {confirm && (
        <Modal
          open={true}
          onClose={() => { setConfirm(null); setRejectionNote('') }}
          title={confirm.action === 'Verified' ? 'Verify Document' : 'Reject Document'}
          description={`${confirm.doc.type} for truck ${confirm.doc.truck.registrationNumber}`}
          size="sm"
        >
          {confirm.action === 'Rejected' && (
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-2">
                Rejection Reason (optional)
              </label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="input min-h-[80px] resize-none"
                rows={3}
              />
            </div>
          )}
          <p className="text-sm text-surface-600 dark:text-surface-400">
            {confirm.action === 'Verified'
              ? 'Are you sure you want to verify this document? This will mark it as approved.'
              : 'Are you sure you want to reject this document? The truck owner will need to re-upload.'}
          </p>
          <Modal.Footer>
            <Button variant="secondary" size="md" onClick={() => { setConfirm(null); setRejectionNote('') }}>
              Cancel
            </Button>
            <Button
              variant={confirm.action === 'Verified' ? 'primary' : 'danger'}
              size="md"
              loading={actionLoading !== null}
              disabled={actionLoading !== null}
              onClick={handleAction}
            >
              {confirm.action === 'Verified' ? 'Verify Document' : 'Reject Document'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  )
}
