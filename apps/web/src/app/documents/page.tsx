'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DocumentCheckIcon,
  ShieldCheckIcon,
  ArrowUpTrayIcon,
  TruckIcon,
  EyeIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { usersApi, trucksApi } from '@/lib/api'
import { Button, Badge, Modal, Spinner } from '@/components/ui'
import { DigitalDocumentChainCard } from '@/components/intelligence'
import { toast } from '@/lib/toast'

export default function DocumentsPage() {
  const [data, setData] = useState<any>(null)
  const [trucks, setTrucks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
      toast.success(`${uploadDocType} document uploaded successfully. Verification pending.`)
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

  if (loading) {
    return (
      <DashboardLayout title="KYC & Vehicle Documents" subtitle="Compliance verification and RC certificates">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  const documents = data?.documents || []

  return (
    <DashboardLayout
      title="KYC & Compliance Documents"
      subtitle="Manage your fleet RC copies, commercial insurance policies, and compliance verifications"
      action={
        trucks.length > 0 ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowUploadModal(true)}
            leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
          >
            Upload New Document
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6 max-w-5xl">
        {/* Compliance Summary Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card">
            <span className="text-[11px] text-surface-400 font-bold uppercase tracking-wider block">
              Total Documents
            </span>
            <span className="text-2xl font-black text-surface-900 dark:text-white mt-1 block">
              {data?.totalCount || 0}
            </span>
          </div>

          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card">
            <span className="text-[11px] text-success-600 dark:text-success-400 font-bold uppercase tracking-wider block">
              Verified
            </span>
            <span className="text-2xl font-black text-success-600 dark:text-success-400 mt-1 block">
              {data?.verifiedCount || 0}
            </span>
          </div>

          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card">
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">
              In Review (Pending)
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
              {data?.pendingCount || 0}
            </span>
          </div>

          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card">
            <span className="text-[11px] text-danger-600 dark:text-danger-400 font-bold uppercase tracking-wider block">
              Action Required
            </span>
            <span className="text-2xl font-black text-danger-600 dark:text-danger-400 mt-1 block">
              {data?.rejectedCount || 0}
            </span>
          </div>
        </div>

        {/* Documents Table / List Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 shadow-card overflow-hidden">
          <div className="p-5 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <DocumentCheckIcon className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
                Fleet Verification Records
              </h2>
            </div>
            <span className="text-xs text-surface-400">AWS S3 Encrypted Storage</span>
          </div>

          {documents.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-400 flex items-center justify-center mx-auto">
                <DocumentTextIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                  No Compliance Documents Found
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  {trucks.length === 0
                    ? 'Register your fleet trucks first to upload RC and Insurance certificates.'
                    : 'Upload your vehicle RC (Registration Certificate) and Commercial Insurance to get verified.'}
                </p>
              </div>
              {trucks.length > 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowUploadModal(true)}
                  leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
                >
                  Upload Vehicle Document
                </Button>
              ) : (
                <Link
                  href="/dashboard/truck-owner"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-colors"
                >
                  <TruckIcon className="w-4 h-4" />
                  Register a Truck
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {documents.map((doc: any) => {
                const isVerified = doc.verificationStatus === 'Verified'
                const isPending = doc.verificationStatus === 'Pending'

                return (
                  <div
                    key={doc.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 flex items-center justify-center shrink-0 mt-0.5">
                        <DocumentTextIcon className="w-6 h-6" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-surface-900 dark:text-white">
                            {doc.type === 'RC' ? 'Registration Certificate (RC)' : 'Commercial Insurance'}
                          </span>
                          <Badge
                            variant={isVerified ? 'success' : isPending ? 'warning' : 'danger'}
                            size="sm"
                          >
                            {doc.verificationStatus}
                          </Badge>
                        </div>

                        <p className="text-xs text-surface-500 dark:text-surface-400 flex flex-wrap items-center gap-2 font-mono">
                          <span className="font-bold text-surface-700 dark:text-surface-300">
                            {doc.truckRegistration}
                          </span>
                          <span>•</span>
                          <span>{doc.truckBodyType} Body</span>
                          {doc.docNumber && (
                            <>
                              <span>•</span>
                              <span>Doc #{doc.docNumber}</span>
                            </>
                          )}
                        </p>

                        {doc.verificationNotes && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-md mt-1">
                            Note: {doc.verificationNotes}
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-xs font-bold text-surface-800 dark:text-surface-200 transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                          View File
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── DIGITAL FREIGHT DOCUMENT CHAIN (PHASE 9) ── */}
        <DigitalDocumentChainCard
          bookingId="b-freight-active-8492"
          bookingNumber="LC-8492-MAA"
          loadOwnerName="Chennai Steel Works Ltd"
          truckRegNumber={trucks[0]?.registrationNumber || 'MH 12 QT 8492'}
          consigneeName="Ramesh Kumar (Bengaluru Depot Manager)"
          status="InTransit"
          ewayBillNumber="EWB-2940-1928-3910"
          advanceConfirmed={true}
          balanceConfirmed={false}
          podSubmittedAt={new Date().toISOString()}
          onRefresh={fetchData}
        />
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-surface-800">
            <ShieldCheckIcon className="w-5 h-5 text-primary-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
              Vahan & Compliance Standards
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-surface-600 dark:text-surface-400 leading-relaxed">
            <div className="p-3.5 bg-surface-50 dark:bg-surface-800/40 rounded-xl border border-surface-100 dark:border-surface-700 space-y-1">
              <span className="font-bold text-surface-900 dark:text-white block">
                RC Verification (Form 23)
              </span>
              <p className="text-[11px]">
                Must clearly display Vehicle Registration Number, Gross Vehicle Weight (GVW), Chassis Number, and National Permit validity.
              </p>
            </div>

            <div className="p-3.5 bg-surface-50 dark:bg-surface-800/40 rounded-xl border border-surface-100 dark:border-surface-700 space-y-1">
              <span className="font-bold text-surface-900 dark:text-white block">
                Commercial Goods Insurance
              </span>
              <p className="text-[11px]">
                Comprehensive or Third-Party Commercial Goods Carrying Vehicle insurance policy with active validity.
              </p>
            </div>
          </div>
        </div>

        {/* Modal: Upload Document */}
        <Modal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="Upload Vehicle KYC Document"
          size="md"
        >
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300 block mb-1.5">
                Select Truck
              </label>
              <select
                value={uploadTruckId}
                onChange={(e) => setUploadTruckId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-surface-900 dark:text-white outline-hidden focus:ring-2 focus:ring-primary-500"
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
                <label className="text-xs font-bold text-surface-700 dark:text-surface-300 block mb-1.5">
                  Document Type
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-surface-900 dark:text-white outline-hidden focus:ring-2 focus:ring-primary-500"
                >
                  <option value="RC">RC Certificate</option>
                  <option value="Insurance">Insurance Policy</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-surface-700 dark:text-surface-300 block mb-1.5">
                  Document # (Optional)
                </label>
                <input
                  type="text"
                  value={uploadDocNumber}
                  onChange={(e) => setUploadDocNumber(e.target.value)}
                  placeholder="e.g. MH12AB1234"
                  className="w-full px-3.5 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-surface-900 dark:text-white outline-hidden focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300 block mb-1.5">
                Upload File (PDF / JPG / PNG, Max 5MB)
              </label>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-surface-600 dark:text-surface-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-950 dark:file:text-primary-300 hover:file:bg-primary-100 cursor-pointer"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-surface-100 dark:border-surface-800">
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
