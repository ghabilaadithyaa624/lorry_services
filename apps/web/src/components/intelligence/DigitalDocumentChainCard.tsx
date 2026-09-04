'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DocumentTextIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  LockClosedIcon,
  XMarkIcon,
  PhotoIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Button, Badge, Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'
import { isFreightSideRole, isVehicleSideRole } from '@/lib/roles'
import { toast } from '@/lib/toast'
import {
  bookingDocumentsApi,
  type BookingDocumentRecord,
  type BookingDocumentStage,
} from '@/lib/api'

export interface DigitalDocumentChainCardProps {
  /** Real booking id — the card loads its chain from GET /bookings/:id/documents. */
  bookingId: string
  bookingNumber?: string
  factoryOwnerName?: string
  truckRegNumber?: string
  /** E-Way Bill number already linked to the booking (informational only). */
  ewayBillNumber?: string
  /** Role of the signed-in viewer ('factory_owner' | 'truck_driver' | 'admin'). */
  viewerRole?: string
  /** Invoked after a document upload registers successfully. */
  onRefresh?: () => void
}

interface ChainStageMeta {
  stageId: BookingDocumentStage
  title: string
  subtitle: string
}

const CHAIN_STAGES: ChainStageMeta[] = [
  {
    stageId: 'BOOKING',
    title: '1. Booking Advice & Freight Contract',
    subtitle: 'Digital agreement & agreed freight rate confirmation (LR / Form 23)',
  },
  {
    stageId: 'EWAY_BILL',
    title: '2. E-Way Bill (EWB-01)',
    subtitle: 'GST portal compliance & Part-B vehicle assignment',
  },
  {
    stageId: 'LOADING',
    title: '3. Loading Slip & Weighment',
    subtitle: 'Gross weight verification & payload inspection',
  },
  {
    stageId: 'TRANSIT',
    title: '4. National Transit Checkpoint Pass',
    subtitle: 'Highway geofence crossing logs & state border clearances',
  },
  {
    stageId: 'DELIVERY',
    title: '5. Arrival Gate Pass & Unloading Slip',
    subtitle: 'Unloading bay arrival timestamp & seal integrity log',
  },
  {
    stageId: 'POD',
    title: '6. Proof of Delivery (POD)',
    subtitle: 'Consignee sign-off, digital signature & photo proof',
  },
  {
    stageId: 'BALANCE',
    title: '7. Balance Payment Receipt & Invoice',
    subtitle: 'Final freight settlement & commercial tax invoice',
  },
]

const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB client-side cap

type RowPhase = 'VERIFIED' | 'UPLOADED' | 'REJECTED' | 'NOT_UPLOADED'

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DigitalDocumentChainCard({
  bookingId,
  bookingNumber,
  factoryOwnerName,
  truckRegNumber,
  ewayBillNumber,
  viewerRole,
  onRefresh,
}: DigitalDocumentChainCardProps) {
  const [documents, setDocuments] = useState<BookingDocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadStage, setUploadStage] = useState<BookingDocumentStage>('POD')
  const [docNumberInput, setDocNumberInput] = useState('')
  const [signatoryInput, setSignatoryInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<BookingDocumentRecord | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    if (!bookingId) return
    setLoading(true)
    setLoadError('')
    try {
      const res = await bookingDocumentsApi.list(bookingId)
      setDocuments(res.data.documents || [])
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Could not load the booking document chain'
      setLoadError(message)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const docsByStage = useMemo(() => {
    const map = new Map<BookingDocumentStage, BookingDocumentRecord[]>()
    for (const doc of documents) {
      const bucket = map.get(doc.stage)
      if (bucket) bucket.push(doc)
      else map.set(doc.stage, [doc])
    }
    // Newest first within a stage (Array.from keeps ES5 targets happy)
    Array.from(map.values()).forEach((bucket) =>
      bucket.sort((a: BookingDocumentRecord, b: BookingDocumentRecord) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )
    )
    return map
  }, [documents])

  const documentedStageCount = useMemo(() => {
    const stages = new Set(
      documents
        .filter((doc) => doc.verificationStatus !== 'Rejected')
        .map((doc) => doc.stage)
    )
    return stages.size
  }, [documents])

  // Only booking counterparties upload; admins (and unknown roles) are read-only.
  const canUpload =
    (isFreightSideRole(viewerRole) || isVehicleSideRole(viewerRole)) && !loading && !loadError

  const stagePhase = (docs: BookingDocumentRecord[] | undefined): RowPhase => {
    if (!docs || docs.length === 0) return 'NOT_UPLOADED'
    const latest = docs[0]
    if (latest.verificationStatus === 'Verified') return 'VERIFIED'
    if (latest.verificationStatus === 'Rejected') return 'REJECTED'
    return 'UPLOADED'
  }

  // ── Download / preview ───────────────────────────────────────────────────

  const openDownload = async (doc: BookingDocumentRecord) => {
    if (downloadingId) return
    setDownloadingId(doc.id)
    try {
      const res = await bookingDocumentsApi.getDownloadUrl(bookingId, doc.id)
      window.open(res.data.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not generate the download link. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const openPreview = async (doc: BookingDocumentRecord) => {
    setPreviewDocument(doc)
    setPreviewUrl('')
    setPreviewLoading(true)
    try {
      const res = await bookingDocumentsApi.getDownloadUrl(bookingId, doc.id)
      setPreviewUrl(res.data.downloadUrl)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load the document preview.')
      setPreviewDocument(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  // ── Upload flow (pre-signed, direct-to-storage) ─────────────────────────

  const fileContentType = (file: File): string => {
    const byExt: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (ALLOWED_UPLOAD_TYPES.includes(file.type as any)) return file.type
    return byExt[ext] || ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (!file) {
      setSelectedFile(null)
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('File too large — maximum allowed size is 10 MB.')
      setSelectedFile(null)
      e.target.value = ''
      return
    }
    if (!fileContentType(file)) {
      toast.error('Invalid file type. Only PDF, JPG and PNG are allowed.')
      setSelectedFile(null)
      e.target.value = ''
      return
    }
    setSelectedFile(file)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      toast.error('Please choose a file to upload.')
      return
    }
    const contentType = fileContentType(selectedFile) as 'image/jpeg' | 'image/png' | 'application/pdf'
    if (!contentType) return

    setUploading(true)
    try {
      // 1. Request a short-lived pre-signed PUT URL for this booking + stage.
      const uploadRes = await bookingDocumentsApi.requestUploadUrl(bookingId, {
        stage: uploadStage,
        fileName: selectedFile.name,
        contentType,
        docNumber: docNumberInput.trim() || undefined,
        signedBy: signatoryInput.trim() || undefined,
      })
      const { uploadUrl, key } = uploadRes.data

      // 2. PUT the file bytes straight to object storage. Deliberately plain
      //    fetch: S3/MinIO rejects extra auth headers, and CSRF tokens are for
      //    our API only.
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: selectedFile,
      })
      if (!put.ok) {
        throw new Error(`Storage rejected the upload (HTTP ${put.status})`)
      }

      // 3. Register the completed upload on the booking chain.
      const registered = await bookingDocumentsApi.register(bookingId, {
        stage: uploadStage,
        key,
        contentType,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        docNumber: docNumberInput.trim() || undefined,
        signedBy: signatoryInput.trim() || undefined,
      })

      toast.success(`${registered.data.stage} document uploaded to the booking chain`)
      setUploadModalOpen(false)
      setSelectedFile(null)
      setDocNumberInput('')
      setSignatoryInput('')
      await loadDocuments()
      if (onRefresh) onRefresh()
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Upload failed. Please try again.'
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const openUploadModal = (stage?: BookingDocumentStage) => {
    setUploadStage(stage || 'POD')
    setSelectedFile(null)
    setDocNumberInput('')
    setSignatoryInput('')
    setUploadModalOpen(true)
  }

  const uploadStageLabel = CHAIN_STAGES.find((s) => s.stageId === uploadStage)?.title || uploadStage

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-panel rounded-[20px] border border-white/10 p-6 shadow-modal space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-primary-400" />
            <h2 className="text-base font-bold text-white">Digital Freight Document Chain</h2>
            <Badge variant="primary" size="sm" className="font-mono text-[10px]">
              {documentedStageCount}/7 Stages Documented
            </Badge>
          </div>
          <p className="text-xs text-surface-300">
            {[bookingNumber ? `Booking #${bookingNumber}` : null, truckRegNumber, factoryOwnerName]
              .filter(Boolean)
              .join(' · ') || `Booking ${bookingId.slice(0, 8).toUpperCase()}`}
          </p>
          <p className="text-[11px] text-surface-400">
            End-to-end audit trail from booking advice to POD sign-off and balance settlement.
          </p>
        </div>

        {canUpload && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openUploadModal()}
            leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
            className="text-xs font-bold shrink-0 border-white/10 hover:border-white/20"
          >
            Upload Chain Document
          </Button>
        )}
      </div>

      {/* Storage Security Banner */}
      <div className="p-3.5 rounded-2xl bg-surface-950/80 border border-white/5 flex items-center gap-3 text-xs">
        <LockClosedIcon className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="flex-1">
          <span className="font-bold text-white block">
            Private Object Storage &amp; Time-Limited Pre-Signed Links
          </span>
          <span className="text-[11px] text-surface-400 font-mono block">
            Uploads go directly to storage via 5-minute pre-signed URLs; downloads are issued on
            demand and expire after 1 hour. Storage credentials never reach the browser.
          </span>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-10 text-xs text-surface-400">
          <Spinner size="sm" />
          <span>Syncing document chain from server…</span>
        </div>
      )}

      {/* Load error state */}
      {!loading && loadError && (
        <div className="p-5 rounded-2xl bg-danger-500/5 border border-danger-500/25 text-center space-y-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-danger-400 mx-auto" />
          <p className="text-xs text-surface-300">{loadError}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadDocuments}
            leftIcon={<ArrowPathIcon className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>
        </div>
      )}

      {/* 7-Stage lifecycle list */}
      {!loading && !loadError && (
        <div className="space-y-3">
          {CHAIN_STAGES.map((stage) => {
            const docs = docsByStage.get(stage.stageId)
            const phase = stagePhase(docs)
            const primary = docs?.[0]
            const isDone = phase === 'VERIFIED' || phase === 'UPLOADED'

            return (
              <div
                key={stage.stageId}
                className={cn(
                  'p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                  isDone
                    ? 'bg-surface-950/70 border-white/5 hover:border-white/15'
                    : 'bg-amber-500/5 border-amber-500/20'
                )}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border',
                      isDone
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    )}
                  >
                    {isDone ? <CheckIcon className="w-4 h-4 stroke-[3]" /> : <ClockIcon className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-xs sm:text-sm">{stage.title}</span>
                      <Badge
                        variant={isDone ? (phase === 'VERIFIED' ? 'success' : 'info') : 'warning'}
                        size="sm"
                        className="font-mono text-[10px]"
                      >
                        {phase === 'NOT_UPLOADED' ? 'NOT UPLOADED' : phase}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-surface-300">
                      {stage.stageId === 'EWAY_BILL' && ewayBillNumber && !primary
                        ? `${stage.subtitle} — EWB ${ewayBillNumber} linked to booking, attach GSTN copy`
                        : stage.stageId === 'EWAY_BILL' && ewayBillNumber
                          ? `${stage.subtitle} (EWB ${ewayBillNumber})`
                          : stage.subtitle}
                    </p>

                    {primary && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-surface-400 font-mono mt-1 min-w-0">
                        <span className="truncate max-w-[260px]">{primary.originalFilename || 'Uploaded file'}</span>
                        {formatBytes(primary.fileSize) && (
                          <>
                            <span>•</span>
                            <span>{formatBytes(primary.fileSize)}</span>
                          </>
                        )}
                        {primary.docNumber && (
                          <>
                            <span>•</span>
                            <span>Doc #: {primary.docNumber}</span>
                          </>
                        )}
                        {primary.signedBy && (
                          <>
                            <span>•</span>
                            <span>Sign-off: {primary.signedBy}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>Uploaded: {new Date(primary.uploadedAt).toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {phase === 'REJECTED' && primary?.verificationNotes && (
                      <p className="text-[11px] text-danger-400 mt-1">
                        Rejection note: {primary.verificationNotes}
                      </p>
                    )}

                    {phase === 'VERIFIED' && primary && (
                      <p className="text-[11px] text-emerald-400/90 mt-1">
                        ✓ Verified by admin
                        {primary.verifiedBy?.name ? ` (${primary.verifiedBy.name})` : ''}
                        {primary.verifiedAt
                          ? ` on ${new Date(primary.verifiedAt).toLocaleString('en-IN')}`
                          : ''}
                        {primary.verificationNotes ? ` — ${primary.verificationNotes}` : ''}
                      </p>
                    )}

                    {(docs?.length || 0) > 1 && (
                      <p className="text-[10px] text-surface-500 font-mono">
                        + {(docs?.length || 0) - 1} earlier upload(s) on this stage
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {phase === 'NOT_UPLOADED' || phase === 'REJECTED' ? (
                    canUpload ? (
                      <button
                        onClick={() => openUploadModal(stage.stageId)}
                        className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-bold text-[11px] flex items-center gap-1.5 hover:bg-amber-200 transition-colors cursor-pointer"
                      >
                        <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                        {phase === 'REJECTED' ? 'Re-attach Document' : 'Attach Document'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-surface-500 font-mono">Awaiting upload</span>
                    )
                  ) : (
                    primary && (
                      <>
                        {primary.mimeType?.startsWith('image/') && (
                          <button
                            onClick={() => openPreview(primary)}
                            className="px-3 py-1.5 rounded-lg bg-sunken hover:bg-wash text-muted font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <PhotoIcon className="w-3.5 h-3.5 text-primary-500" />
                            Preview
                          </button>
                        )}
                        <button
                          onClick={() => openDownload(primary)}
                          disabled={downloadingId === primary.id}
                          className="px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 text-primary-700 dark:text-primary-300 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                          {downloadingId === primary.id ? 'Linking…' : 'Secure Download'}
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Backend architecture callout */}
      <div className="p-4 rounded-xl bg-surface-950/80 border border-white/5 text-xs space-y-1">
        <span className="font-bold text-white block">
          ℹ Server-Backed Document Chain
        </span>
        <p className="text-[11px] text-surface-400">
          Chain metadata is stored server-side and served by GET /bookings/:id/documents. Uploads use
          the pre-signed flow (upload-url → direct storage PUT → register); each download link is
          minted on demand via GET /bookings/:id/documents/:documentId/download-url and expires
          automatically. Admin verification happens in the KYC review queue.
        </p>
      </div>

      {/* ── Upload modal ── */}
      {uploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in"
        >
          <div className="bg-panel rounded-2xl border border-white/15 max-w-md w-full p-6 shadow-modal space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 id="upload-modal-title" className="text-base font-bold text-white">
                Upload to Digital Freight Chain
              </h3>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                aria-label="Close upload modal"
                className="p-1 rounded-lg text-surface-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-surface-300 mb-1">Document Stage</label>
                <select
                  value={uploadStage}
                  onChange={(e) => setUploadStage(e.target.value as BookingDocumentStage)}
                  className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-primary-500"
                >
                  {CHAIN_STAGES.map((s) => (
                    <option key={s.stageId} value={s.stageId}>
                      {s.title.replace(/^\d+\.\s*/, '')} ({s.stageId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-surface-300 mb-1">
                  Document Number / Reference (optional)
                </label>
                <input
                  type="text"
                  value={docNumberInput}
                  onChange={(e) => setDocNumberInput(e.target.value)}
                  placeholder="e.g. EWB-294019283910 or POD-8492"
                  className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block font-bold text-surface-300 mb-1">
                  Sign-off Authority (optional)
                </label>
                <input
                  type="text"
                  value={signatoryInput}
                  onChange={(e) => setSignatoryInput(e.target.value)}
                  placeholder="e.g. Ramesh Kumar (Warehouse Depot Manager)"
                  className="w-full px-3 py-2.5 bg-surface-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block font-bold text-surface-300 mb-1">
                  Attachment File (PDF, JPG, PNG — direct encrypted storage upload)
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="w-full text-xs text-surface-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-500/10 file:text-primary-400 cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-[10px] text-emerald-400 font-mono mt-1.5">
                    ✓ {selectedFile.name} ({formatBytes(selectedFile.size)}) — {fileContentType(selectedFile)}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={uploading}
                  className="font-bold py-3 text-xs shadow-glow-primary"
                  leftIcon={uploading ? <Spinner size="xs" /> : undefined}
                >
                  {uploading ? `Uploading to ${uploadStageLabel}…` : 'Upload & Sign Document'}
                </Button>
                <p className="text-[10px] text-surface-500 text-center mt-2">
                  File bytes go straight to private object storage via a 5-minute pre-signed URL —
                  never through the API.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Document preview modal ── */}
      {previewDocument && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-preview-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in"
        >
          <div className="bg-panel rounded-2xl border border-white/15 max-w-2xl w-full p-5 shadow-modal space-y-4 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 id="document-preview-modal-title" className="text-sm font-bold text-white">
                {previewDocument.stage} Attachment Preview
                <span className="block text-[10px] text-surface-400 font-mono">
                  {previewDocument.originalFilename || previewDocument.docNumber || ''}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                aria-label="Close document preview"
                className="p-1 rounded-lg text-surface-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-surface-950 border border-white/5 p-2 text-center min-h-[16rem] flex items-center justify-center">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-2 text-surface-400">
                  <Spinner size="sm" />
                  <span className="text-[11px] font-mono">Minting secure preview link…</span>
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`${previewDocument.stage} attachment preview`}
                  className="max-w-full max-h-[60vh] rounded-lg object-contain"
                />
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewDocument(null)}
                className="border-white/10"
              >
                Close
              </Button>
              {previewUrl && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                >
                  Open Full Size
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
