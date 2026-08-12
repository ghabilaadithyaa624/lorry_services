'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DocumentCheckIcon,
  ArrowUpTrayIcon,
  TruckIcon,
  EyeIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { usersApi, trucksApi } from '@/lib/api'
import {
  Button,
  Badge,
  Modal,
  GlassPanel,
  TelemetryMetric,
  Skeleton,
} from '@/components/ui'
import { DigitalDocumentChainCard } from '@/components/intelligence'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type DocFilterTab = 'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED' | 'EXPIRED'

export default function DocumentsPage() {
  const [data, setData] = useState<any>(null)
  const [trucks, setTrucks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<DocFilterTab>('ALL')

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadTruckId, setUploadTruckId] = useState('')
  const [uploadDocType, setUploadDocType] = useState<'RC' | 'Insurance'>('RC')
  const [uploadDocNumber, setUploadDocNumber] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const [docsRes, trucksRes] = await Promise.all([
        usersApi.getDocuments(),
        trucksApi.getMyTrucks().catch(() => ({ data: [] })),
      ])
      setData(docsRes.data)
      setTrucks(trucksRes.data || [])
      if (trucksRes.data?.length > 0) {
        setUploadTruckId(trucksRes.data[0].id)
      }
    } catch {
      setError('Failed to load compliance documents')
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadTruckId) {
      toast.error('Please select a registered truck')
      return
    }
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    try {
      setUploading(true)
      await trucksApi.uploadDocument(
        uploadTruckId,
        uploadDocType,
        selectedFile,
        uploadDocNumber.trim() || undefined
      )
      toast.success(`${uploadDocType} document uploaded to S3 successfully. Verification pending.`)
      setShowUploadModal(false)
      setSelectedFile(null)
      setUploadDocNumber('')
      fetchData()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to upload document'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const documents = data?.documents || []

  // Filter documents by tab
  const filteredDocuments = documents.filter((doc: any) => {
    if (activeTab === 'VERIFIED') return doc.verificationStatus === 'Verified'
    if (activeTab === 'PENDING') return doc.verificationStatus === 'Pending'
    if (activeTab === 'REJECTED') return doc.verificationStatus === 'Rejected'
    if (activeTab === 'EXPIRED') return doc.isExpired || doc.verificationStatus === 'Expired'
    return true
  })

  const verifiedCount = documents.filter((d: any) => d.verificationStatus === 'Verified').length
  const pendingCount = documents.filter((d: any) => d.verificationStatus === 'Pending').length
  const rejectedCount = documents.filter((d: any) => d.verificationStatus === 'Rejected').length
  const expiredCount = documents.filter((d: any) => d.isExpired || d.verificationStatus === 'Expired').length

  return (
    <DashboardLayout
      title="Documents"
      subtitle="Keep your freight and fleet documentation compliant."
      action={
        trucks.length > 0 ? (
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowUploadModal(true)}
            leftIcon={<ArrowUpTrayIcon className="w-4 h-4 shrink-0" />}
            className="shadow-glow-primary"
          >
            Upload document
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto font-sans">
        
        {/* ── COMPLIANCE TELEMETRY ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <TelemetryMetric
            label="Verified"
            value={loading ? <Skeleton className="h-8 w-12" /> : verifiedCount}
            subtitle="Active & compliant"
            classification="REAL METRIC"
            variant="success"
          />

          <TelemetryMetric
            label="Pending"
            value={loading ? <Skeleton className="h-8 w-12" /> : pendingCount}
            subtitle="Under review"
            classification="REAL METRIC"
            variant="warning"
          />

          <TelemetryMetric
            label="Rejected"
            value={loading ? <Skeleton className="h-8 w-12" /> : rejectedCount}
            subtitle="Re-upload required"
            classification="REAL METRIC"
            variant="danger"
          />

          <TelemetryMetric
            label="Expired"
            value={loading ? <Skeleton className="h-8 w-12" /> : expiredCount}
            subtitle="Renewal required"
            classification="REAL METRIC"
            variant="default"
          />
        </div>

        {/* ── FILTER TABS ── */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-white/10 pb-3">
          {[
            { id: 'ALL', label: `All (${documents.length})` },
            { id: 'VERIFIED', label: `Verified (${verifiedCount})` },
            { id: 'PENDING', label: `Pending (${pendingCount})` },
            { id: 'REJECTED', label: `Rejected (${rejectedCount})` },
            { id: 'EXPIRED', label: `Expired (${expiredCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as DocFilterTab)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-sans font-semibold transition-all whitespace-nowrap cursor-pointer',
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-900/80 text-surface-400 hover:text-white hover:bg-white/5 border border-white/10'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DOCUMENTS LIST PANEL ── */}
        <GlassPanel padding="lg" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <DocumentCheckIcon className="w-5 h-5 text-primary-400" />
              <h2 className="text-[15px] font-semibold text-white font-sans">
                Compliance records
              </h2>
            </div>
            <span className="text-xs text-surface-500 font-sans">Encrypted vault</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton.Card />
              <Skeleton.Card />
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-danger-950/40 border border-danger-900/60 text-center text-sm font-sans text-danger-300">
              {error}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-950 text-surface-400 flex items-center justify-center mx-auto border border-white/5">
                <DocumentCheckIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-sm font-semibold text-white font-sans">
                  No documents in this category
                </h3>
                <p className="text-xs text-surface-400 font-sans">
                  {trucks.length === 0
                    ? 'Register your fleet trucks first to upload RC and insurance certificates.'
                    : 'Upload your vehicle RC (Registration Certificate) and commercial insurance to get verified.'}
                </p>
              </div>
              {trucks.length > 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowUploadModal(true)}
                  leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
                  className="shadow-glow-primary"
                >
                  Upload document
                </Button>
              ) : (
                <Link
                  href="/dashboard/truck-owner"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-sans font-semibold hover:bg-primary-500 transition-colors shadow-glow-primary"
                >
                  <TruckIcon className="w-4 h-4" />
                  Register a truck
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredDocuments.map((doc: any) => {
                const isVerified = doc.verificationStatus === 'Verified'
                const isPending = doc.verificationStatus === 'Pending'

                return (
                  <div
                    key={doc.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors text-xs"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-surface-950 text-primary-400 flex items-center justify-center shrink-0 border border-white/10 mt-0.5">
                        <DocumentTextIcon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            {doc.type === 'RC' ? 'Registration Certificate (RC)' : 'Commercial Insurance'}
                          </span>
                          <Badge
                            variant={isVerified ? 'success' : isPending ? 'warning' : 'danger'}
                            size="sm"
                          >
                            {doc.verificationStatus}
                          </Badge>
                        </div>

                        <p className="text-xs text-surface-400 font-sans flex flex-wrap items-center gap-2">
                          <span className="font-mono text-white">
                            {doc.truckRegistration}
                          </span>
                          <span>&bull;</span>
                          <span>{doc.truckBodyType}</span>
                          {doc.docNumber && (
                            <>
                              <span>•</span>
                              <span>Doc #{doc.docNumber}</span>
                            </>
                          )}
                        </p>

                        {doc.verificationNotes && (
                          <p className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 p-2 rounded-xl mt-1">
                            Rejection Reason: {doc.verificationNotes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-[11px] text-surface-400 hidden md:inline">
                        Uploaded {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                      </span>

                      {doc.s3Url && (
                        <a
                          href={doc.s3Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-xs font-bold text-white transition-colors"
                        >
                          <EyeIcon className="w-4 h-4 text-primary-400" />
                          VIEW FILE
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassPanel>

        {/* ── DIGITAL FREIGHT DOCUMENT CHAIN ── */}
        <DigitalDocumentChainCard
          bookingId="b-freight-active-8492"
          bookingNumber="LC-8492-MAA"
          loadOwnerName="Shipper Enterprise Depot"
          truckRegNumber={trucks[0]?.registrationNumber || 'MH 12 QT 8492'}
          consigneeName="Depot Receiving Manager"
          status="InTransit"
          ewayBillNumber="EWB-2940-1928-3910"
          advanceConfirmed={true}
          balanceConfirmed={false}
          podSubmittedAt={new Date().toISOString()}
          onRefresh={fetchData}
        />

        {/* Modal: Upload Document */}
        <Modal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="Upload Vehicle KYC Document"
          size="md"
        >
          <form onSubmit={handleUpload} className="space-y-4 font-mono text-xs">
            <div>
              <label className="text-xs font-bold text-surface-300 block mb-1.5">
                Select Truck
              </label>
              <select
                value={uploadTruckId}
                onChange={(e) => setUploadTruckId(e.target.value)}
                className="w-full px-4 py-3 bg-surface-950 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-primary-500"
                required
              >
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.registrationNumber} ({t.bodyType} • {t.tonnageCapacity}T)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-surface-300 block mb-1.5">
                  Document Type
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value as any)}
                  className="w-full px-3.5 py-3 bg-surface-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500"
                >
                  <option value="RC">RC Certificate</option>
                  <option value="Insurance">Insurance Policy</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-surface-300 block mb-1.5">
                  Document # (Optional)
                </label>
                <input
                  type="text"
                  value={uploadDocNumber}
                  onChange={(e) => setUploadDocNumber(e.target.value)}
                  placeholder="e.g. MH12AB1234"
                  className="w-full px-3.5 py-3 bg-surface-950 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-surface-300 block mb-1.5">
                Upload File (PDF / JPG / PNG, Max 5MB)
              </label>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-surface-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-500 file:text-white cursor-pointer"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                loading={uploading}
                className="shadow-glow-primary font-bold"
              >
                Upload to S3
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
