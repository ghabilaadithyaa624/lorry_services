'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

interface BookingTermsModalProps {
  loadId: string
  truckId: string
  truckInfo: {
    registrationNumber: string
    bodyType: string
    ownerName: string
  }
  onClose: () => void
  onSuccess: (bookingId?: string) => void
}

export function BookingTermsModal({
  loadId,
  truckId,
  truckInfo,
  onClose,
  onSuccess,
}: BookingTermsModalProps) {
  const [agreedPrice, setAgreedPrice] = useState('')
  const [ewayBillNumber, setEwayBillNumber] = useState('')
  const [liabilityAccepted, setLiabilityAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const calculatedAdvance = agreedPrice && !isNaN(parseFloat(agreedPrice))
    ? Math.round(parseFloat(agreedPrice) * 0.5)
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!liabilityAccepted || !agreedPrice || isNaN(parseFloat(agreedPrice))) return

    setLoading(true)
    setError('')

    try {
      const res = await api.post('/bookings', {
        loadId,
        truckId,
        agreedPrice: parseFloat(agreedPrice),
        ewayBillNumber: ewayBillNumber.trim() || undefined,
        liabilityAccepted,
      })
      onSuccess(res.data?.id)
    } catch (err: any) {
      if (err.response?.data?.code === 'SUBSCRIPTION_REQUIRED') {
        setError('Active subscription required to create bookings. Please subscribe to proceed.')
      } else {
        setError(err.response?.data?.message || 'Failed to create booking. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60  animate-fadeIn">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-terms-title"
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 id="booking-terms-title" className="text-lg font-bold text-ink">
              Confirm Booking
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selected Truck Card */}
          <div className="p-4 rounded-xl bg-orange-50/60 dark:bg-primary-950/20 border border-orange-100 dark:border-primary-900/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wider">
                Selected Truck
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                Verified Transporter
              </span>
            </div>
            <p className="text-base font-bold text-ink">
              {truckInfo.registrationNumber}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {truckInfo.bodyType} • Transporter: <span className="font-medium text-gray-800 dark:text-gray-200">{truckInfo.ownerName}</span>
            </p>
          </div>

          {/* Form Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="agreedPrice" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Agreed Freight Price (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400 text-sm font-semibold">
                  ₹
                </span>
                <input
                  id="agreedPrice"
                  type="number"
                  required
                  aria-required="true"
                  min="1"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(e.target.value)}
                  className="input pl-8 text-sm"
                  placeholder="e.g. 45000"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ewayBillNumber" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                E-Way Bill Number <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="ewayBillNumber"
                type="text"
                value={ewayBillNumber}
                onChange={(e) => setEwayBillNumber(e.target.value)}
                className="input text-sm"
                placeholder="e.g. 121000123456"
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              Standard Commercial Terms
            </h4>
            <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
              <li className="flex items-start space-x-2">
                <span className="font-bold text-primary-600 dark:text-primary-400">1.</span>
                <span>
                  <strong>50% Advance</strong> (₹{calculatedAdvance.toLocaleString()}) payable directly at loading point upon vehicle reporting.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-primary-600 dark:text-primary-400">2.</span>
                <span>
                  <strong>50% Balance</strong> payable immediately upon safe unloading & POD handover.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-primary-600 dark:text-primary-400">3.</span>
                <span>
                  Transporter assumes full liability for goods damage or shortage during transit.
                </span>
              </li>
            </ul>
          </div>

          {/* Liability Checkbox */}
          <div className="flex items-start space-x-3 pt-1">
            <input
              type="checkbox"
              id="liabilityAccepted"
              checked={liabilityAccepted}
              onChange={(e) => setLiabilityAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
            />
            <label htmlFor="liabilityAccepted" className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed cursor-pointer select-none">
              I accept the commercial payment terms and confirm that the transporter is liable 
              for any damage to cargo during transit. I understand this is a direct 
              booking without broker involvement.
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-sm py-2 px-4"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !liabilityAccepted || !agreedPrice}
              className="btn-primary text-sm py-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{loading ? 'Creating Booking...' : 'Confirm Booking'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
