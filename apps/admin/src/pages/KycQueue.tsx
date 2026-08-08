import React, { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Filter,
  FileText,
  Truck as TruckIcon,
  User,
  Calendar,
  ExternalLink,
  Check,
  X
} from 'lucide-react'

export type VerificationStatus = 'Pending' | 'Verified' | 'Rejected'
export type DocumentType = 'RC' | 'Insurance'

export interface KycDocumentItem {
  id: string
  truckId: string
  truckRegNumber: string
  truckType: string
  tonnage: string
  ownerName: string
  ownerPhone: string
  docType: DocumentType
  docNumber: string
  s3Url: string
  submittedAt: string
  status: VerificationStatus
  notes?: string
}

const INITIAL_MOCK_DOCUMENTS: KycDocumentItem[] = [
  {
    id: 'doc-101',
    truckId: 'trk-001',
    truckRegNumber: 'KA-01-EQ-9876',
    truckType: 'Container (24 ft)',
    tonnage: '16 Tons',
    ownerName: 'Ramesh Kumar',
    ownerPhone: '+91 98765 43210',
    docType: 'RC',
    docNumber: 'KA0120230009876',
    s3Url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    submittedAt: '2026-08-07 14:30',
    status: 'Pending'
  },
  {
    id: 'doc-102',
    truckId: 'trk-001',
    truckRegNumber: 'KA-01-EQ-9876',
    truckType: 'Container (24 ft)',
    tonnage: '16 Tons',
    ownerName: 'Ramesh Kumar',
    ownerPhone: '+91 98765 43210',
    docType: 'Insurance',
    docNumber: 'POL-9988776655',
    s3Url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    submittedAt: '2026-08-07 14:32',
    status: 'Pending'
  },
  {
    id: 'doc-103',
    truckId: 'trk-002',
    truckRegNumber: 'MH-12-AB-1234',
    truckType: 'Open body (18 ft)',
    tonnage: '10 Tons',
    ownerName: 'Suresh Patil',
    ownerPhone: '+91 91234 56789',
    docType: 'RC',
    docNumber: 'MH1220240001234',
    s3Url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
    submittedAt: '2026-08-07 11:15',
    status: 'Pending'
  },
  {
    id: 'doc-104',
    truckId: 'trk-003',
    truckRegNumber: 'TN-09-CD-5544',
    truckType: 'Open (32 ft)',
    tonnage: '25 Tons',
    ownerName: 'Anand Sharma',
    ownerPhone: '+91 99887 76655',
    docType: 'RC',
    docNumber: 'TN0920220005544',
    s3Url: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80',
    submittedAt: '2026-08-06 18:45',
    status: 'Verified',
    notes: 'Verified via Cashfree Vahan API.'
  },
  {
    id: 'doc-105',
    truckId: 'trk-004',
    truckRegNumber: 'DL-01-XY-9900',
    truckType: 'Container (14 ft)',
    tonnage: '7 Tons',
    ownerName: 'Vikram Singh',
    ownerPhone: '+91 97654 32109',
    docType: 'Insurance',
    docNumber: 'INS-EXPIRED-00',
    s3Url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    submittedAt: '2026-08-05 09:20',
    status: 'Rejected',
    notes: 'Policy expired on July 31, 2026. Needs renewed policy.'
  }
]

export function KycQueue() {
  const [documents, setDocuments] = useState<KycDocumentItem[]>(INITIAL_MOCK_DOCUMENTS)
  const [activeTab, setActiveTab] = useState<VerificationStatus>('Pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState<string>('ALL')
  const [selectedDoc, setSelectedDoc] = useState<KycDocumentItem | null>(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null)

  const pendingCount = documents.filter((d) => d.status === 'Pending').length
  const verifiedCount = documents.filter((d) => d.status === 'Verified').length
  const rejectedCount = documents.filter((d) => d.status === 'Rejected').length

  const filteredDocs = documents.filter((doc) => {
    const matchesTab = doc.status === activeTab
    const matchesSearch =
      doc.truckRegNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.ownerPhone.includes(searchTerm) ||
      doc.docNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = docTypeFilter === 'ALL' || doc.docType === docTypeFilter

    return matchesTab && matchesSearch && matchesType
  })

  const handleUpdateStatus = (id: string, status: VerificationStatus, notes?: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, status, notes: notes || doc.notes } : doc))
    )
    if (selectedDoc?.id === id) {
      setSelectedDoc((prev) => (prev ? { ...prev, status, notes: notes || prev.notes } : null))
    }
    setVerificationFeedback(`Document ${id} marked as ${status}.`)
    setTimeout(() => setVerificationFeedback(null), 4000)
  }

  const handleVerifyCashfree = (doc: KycDocumentItem) => {
    setVerificationFeedback(`Checking Cashfree Vahan API for ${doc.docNumber}...`)
    setTimeout(() => {
      handleUpdateStatus(doc.id, 'Verified', 'Verified automatically via Cashfree API.')
    }, 1200)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-orange-500" />
            KYC Verification Queue
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review truck RC & Insurance documents, verify with Cashfree/DigiLocker, and update verification statuses.
          </p>
        </div>

        {/* Tab Badges */}
        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('Pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'Pending'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('Verified')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'Verified'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Verified ({verifiedCount})
          </button>
          <button
            onClick={() => setActiveTab('Rejected')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'Rejected'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <XCircle className="w-4 h-4" />
            Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Verification Feedback Banner */}
      {verificationFeedback && (
        <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 px-4 py-3 rounded-xl flex items-center justify-between text-sm animate-fade-in">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            {verificationFeedback}
          </span>
          <button onClick={() => setVerificationFeedback(null)} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search reg no, owner, phone, or doc no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-orange-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 text-sm">Doc Type:</span>
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">All Documents</option>
            <option value="RC">RC (Registration Certificate)</option>
            <option value="Insurance">Insurance Policy</option>
          </select>
        </div>
      </div>

      {/* Queue List Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 text-base font-medium">No {activeTab.toLowerCase()} documents found</p>
            <p className="text-slate-500 text-sm mt-1">
              Try adjusting your search criteria or switching status tabs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs uppercase text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">Truck Details</th>
                  <th className="px-6 py-4">Owner Info</th>
                  <th className="px-6 py-4">Document Type</th>
                  <th className="px-6 py-4">Doc Number</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
                          <TruckIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{doc.truckRegNumber}</p>
                          <p className="text-xs text-slate-400">
                            {doc.truckType} • {doc.tonnage}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-200">{doc.ownerName}</p>
                          <p className="text-xs text-slate-400">{doc.ownerPhone}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          doc.docType === 'RC'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {doc.docType}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono text-slate-300">{doc.docNumber}</td>

                    <td className="px-6 py-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {doc.submittedAt}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          doc.status === 'Pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : doc.status === 'Verified'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {doc.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                        {doc.status === 'Verified' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {doc.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                        {doc.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review
                        </button>

                        {doc.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleVerifyCashfree(doc)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                              title="Auto verify with Cashfree/Vahan"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>

                            <button
                              onClick={() => {
                                setSelectedDoc(doc)
                              }}
                              className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Inspection Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-900/40">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Review Document: {selectedDoc.truckRegNumber} ({selectedDoc.docType})
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Submitted by {selectedDoc.ownerName} ({selectedDoc.ownerPhone})
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Document Image Preview */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-slate-400">Uploaded Document Image</p>
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center group">
                  <img
                    src={selectedDoc.s3Url}
                    alt={`${selectedDoc.docType} for ${selectedDoc.truckRegNumber}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <a
                    href={selectedDoc.s3Url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-orange-500 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Full Resolution
                  </a>
                </div>
              </div>

              {/* Document Info & Verification Controls */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Document Verification Details</p>

                <div className="bg-slate-900/60 p-4 rounded-xl space-y-2 border border-slate-700/50 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Document Number:</span>
                    <span className="font-mono text-white font-semibold">{selectedDoc.docNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Truck Registration:</span>
                    <span className="text-white font-medium">{selectedDoc.truckRegNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vehicle Specification:</span>
                    <span className="text-white">{selectedDoc.truckType} ({selectedDoc.tonnage})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Owner Name:</span>
                    <span className="text-white">{selectedDoc.ownerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Owner Phone:</span>
                    <span className="text-white">{selectedDoc.ownerPhone}</span>
                  </div>
                </div>

                {/* API Quick Check */}
                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-orange-400 uppercase">Cashfree / Vahan Lookup</p>
                    <p className="text-xs text-slate-300 mt-0.5">Automated registration & insurance check</p>
                  </div>
                  <button
                    onClick={() => handleVerifyCashfree(selectedDoc)}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Run Vahan API Check
                  </button>
                </div>

                {/* Rejection / Approval Notes */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Verification Notes / Rejection Reason
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter reason if rejecting (e.g. Blurry image, Name mismatch, Expired policy)..."
                    value={rejectionNote || selectedDoc.notes || ''}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 border-t border-slate-700 bg-slate-900/40 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Current Status:{' '}
                <strong className={`ml-1 ${
                  selectedDoc.status === 'Verified'
                    ? 'text-emerald-400'
                    : selectedDoc.status === 'Rejected'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}>
                  {selectedDoc.status}
                </strong>
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    handleUpdateStatus(selectedDoc.id, 'Rejected', rejectionNote || 'Document verification rejected by admin.')
                    setSelectedDoc(null)
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm rounded-xl font-medium flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Document
                </button>

                <button
                  onClick={() => {
                    handleUpdateStatus(selectedDoc.id, 'Verified', rejectionNote || 'Manually approved by admin.')
                    setSelectedDoc(null)
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-medium flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Mark Verified
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
