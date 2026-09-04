'use client'

import React, { useState } from 'react'
import { CurrencyRupeeIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { formatINR } from '@/lib/utils'
import { Badge, Button } from '@/components/ui'

interface PaymentSplitCardProps {
  booking: {
    id: string
    agreedPrice: number | string
    advanceConfirmed: boolean
    balanceConfirmed: boolean
    advanceConfirmedAt?: string | Date
    balanceConfirmedAt?: string | Date
    loadOwnerId: string
    truckOwnerId: string
    truck?: {
      registrationNumber?: string
      user?: { name?: string; phone?: string }
    }
  }
  currentUserId: string
  onPaymentComplete?: () => void
}

export function PaymentSplitCard({ booking, currentUserId, onPaymentComplete }: PaymentSplitCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentType, setPaymentType] = useState<'advance' | 'balance' | null>(null)

  const agreedPrice = Number(booking.agreedPrice)
  const advanceAmount = Math.round(agreedPrice * 0.5)
  const balanceAmount = agreedPrice - advanceAmount

  const isLoadOwner = booking.loadOwnerId === currentUserId
  const isTruckOwner = booking.truckOwnerId === currentUserId

  const handleInitiatePayment = async (type: 'advance' | 'balance') => {
    try {
      setIsProcessing(true)
      setPaymentType(type)

      const response = await api.post('/payments/booking/initialize', {
        bookingId: booking.id,
        paymentType: type,
        paymentMethod: 'upi',
      })

      if (response.data?.paymentLinkId && response.data?.shortUrl) {
        // Open payment link in new tab
        window.open(response.data.shortUrl, '_blank')
        toast.success('Payment link opened. Complete payment and return here.')
      } else {
        // Simulate success for demo
        toast.success(`${type === 'advance' ? 'Advance' : 'Balance'} payment initialized. In production, this would redirect to the payment gateway.`)
      }

      onPaymentComplete?.()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment')
    } finally {
      setIsProcessing(false)
      setPaymentType(null)
    }
  }

  const formatDate = (date?: string | Date) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-panel rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4">
        <div className="flex items-center gap-2">
          <CurrencyRupeeIcon className="w-5 h-5 text-emerald-200" />
          <h3 className="font-bold text-white">50/50 Payment Split</h3>
        </div>
        <p className="text-emerald-200 text-xs mt-1">
          Secure payment split between loading advance and delivery balance
        </p>
      </div>

      {/* Payment Breakdown */}
      <div className="p-4 space-y-4">
        {/* Total Amount */}
        <div className="flex items-center justify-between p-4 bg-surface-900/50 rounded-xl">
          <span className="text-surface-300 text-sm">Total Agreed Freight</span>
          <span className="text-2xl font-black text-white">
            {formatINR(agreedPrice)}
          </span>
        </div>

        {/* Advance Payment */}
        <div className={`p-4 rounded-xl border-2 ${booking.advanceConfirmed ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500/50 bg-amber-500/5'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">50% Loading Advance</span>
              {booking.advanceConfirmed ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              ) : (
                <ClockIcon className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <span className="text-lg font-black text-white">
              {formatINR(advanceAmount)}
            </span>
          </div>

          {booking.advanceConfirmed ? (
            <div className="space-y-2">
              <Badge variant="success" className="font-mono text-xs">
                PAID - {formatDate(booking.advanceConfirmedAt)}
              </Badge>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-surface-400">
                {isLoadOwner
                  ? 'Pay the loading advance to confirm booking with the transporter.'
                  : 'Waiting for cargo owner to pay the loading advance.'}
              </p>
              {isLoadOwner && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={isProcessing && paymentType === 'advance'}
                  onClick={() => handleInitiatePayment('advance')}
                  className="w-full"
                >
                  Pay ₹{advanceAmount.toLocaleString('en-IN')} via UPI/Card
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Balance Payment */}
        <div className={`p-4 rounded-xl border-2 ${booking.balanceConfirmed ? 'border-emerald-500 bg-emerald-500/10' : 'border-surface-600 bg-surface-800/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">50% Delivery Balance</span>
              {booking.balanceConfirmed ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              ) : (
                <ClockIcon className="w-5 h-5 text-surface-400" />
              )}
            </div>
            <span className="text-lg font-black text-white">
              {formatINR(balanceAmount)}
            </span>
          </div>

          {booking.balanceConfirmed ? (
            <div className="space-y-2">
              <Badge variant="success" className="font-mono text-xs">
                SETTLED - {formatDate(booking.balanceConfirmedAt)}
              </Badge>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-surface-900/50 rounded-lg">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-surface-400">
                  {isTruckOwner
                    ? 'Balance payment will be released automatically when you complete the trip after POD verification.'
                    : 'Balance payment will be released to the driver after successful delivery and POD confirmation.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Payment Gateway Info */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-1 text-surface-500">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-xs">Powered by Razorpay</span>
          </div>
          <div className="flex items-center gap-1 text-surface-500">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <span className="text-xs">256-bit SSL Encryption</span>
          </div>
        </div>
      </div>
    </div>
  )
}
