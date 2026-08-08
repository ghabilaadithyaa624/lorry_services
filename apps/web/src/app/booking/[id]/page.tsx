'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import Link from 'next/link'

interface Booking {
  id: string
  status: string
  agreedPrice: number
  advanceConfirmed: boolean
  balanceConfirmed: boolean
  ewayBillNumber?: string
  load: {
    loadingAddress: string
    unloadingAddress: string
    tonnageRequired: number
  }
  truck: {
    registrationNumber: string
    bodyType: string
    user: {
      name: string
      phone: string
    }
  }
  checkpoints: Array<{
    seq: number
    name: string
    crossed: boolean
    crossedAt?: string
  }>
}

export default function BookingDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      loadBooking()
    }
  }, [id])

  const loadBooking = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/bookings/${id}`)
      setBooking(res.data)
    } catch (err: any) {
      console.error('Failed to load booking:', err)
      setError(err.response?.data?.message || 'Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
        <div className="max-w-md w-full text-center p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Booking Not Found</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error || 'The requested booking details could not be loaded.'}</p>
          <Link href="/my-bookings" className="btn-primary inline-block text-sm">
            Back to My Bookings
          </Link>
        </div>
      </div>
    )
  }

  const cleanPhone = booking.truck.user.phone.replace(/[^0-9]/g, '')
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${booking.truck.user.name}, regarding LorryCarry Booking #${booking.id.slice(0, 8)}`)}`

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/my-bookings" className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            My Bookings
          </Link>
          <span className="text-xs text-gray-500 dark:text-gray-400">ID: #{booking.id.slice(0, 8)}</span>
        </div>

        {/* Header / Status Card */}
        <div className="card p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Details</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  booking.status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : booking.status === 'InTransit'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 animate-pulse'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {booking.status}
                </span>
              </div>
              {booking.ewayBillNumber && (
                <p className="text-xs text-gray-500 dark:text-gray-400">E-Way Bill: {booking.ewayBillNumber}</p>
              )}
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Agreed Freight</span>
              <span className="text-2xl font-black text-primary-600 dark:text-primary-400">
                ₹{Number(booking.agreedPrice).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Route Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="flex items-start space-x-3">
              <div className="mt-1 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Loading Address</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{booking.load.loadingAddress}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="mt-1 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Unloading Address</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{booking.load.unloadingAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transporter Details */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
            <span>Transporter Information</span>
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  {booking.truck.registrationNumber}
                </span>
                <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {booking.truck.bodyType}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Owner/Driver: <span className="font-medium text-gray-900 dark:text-white">{booking.truck.user.name}</span>
              </p>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-button bg-whatsapp hover:bg-emerald-600 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.156 4.225 4.256-1.117z"/>
              </svg>
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Trip Progress / Checkpoints */}
        <div className="card p-6 sm:p-8">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">
            Trip Progress Tracking
          </h2>

          <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
            {booking.checkpoints.map((cp) => (
              <div key={cp.seq} className="relative flex items-start space-x-4 group">
                {/* Step indicator */}
                <div className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  cp.crossed
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-950'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {cp.crossed ? '✓' : cp.seq}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold ${
                      cp.crossed 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {cp.name}
                    </p>
                    {cp.crossed && cp.crossedAt && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Crossed {format(new Date(cp.crossedAt), 'h:mm a, MMM d')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {cp.crossed ? 'Geofence event confirmed' : 'Pending vehicle arrival'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Terms & Status */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
            Direct Payment Status
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">50% Advance (At Loading)</span>
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  ₹{Math.round(Number(booking.agreedPrice) * 0.5).toLocaleString()}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                booking.advanceConfirmed
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {booking.advanceConfirmed ? '✓ Paid' : 'Pending'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">50% Balance (At Delivery)</span>
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  ₹{Math.round(Number(booking.agreedPrice) * 0.5).toLocaleString()}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                booking.balanceConfirmed
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {booking.balanceConfirmed ? '✓ Paid' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
