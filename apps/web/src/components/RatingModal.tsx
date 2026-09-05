'use client'

import React, { useState, useEffect, useId } from 'react'
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutline } from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  booking: {
    id: string
    truckOwnerId: string
    truckOwnerName?: string
    truckRegistrationNumber?: string
    loadOwnerName?: string
  }
  onRatingSubmitted?: () => void
}

export function RatingModal({ isOpen, onClose, booking, onRatingSubmitted }: RatingModalProps) {
  const reviewId = useId()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [review, setReview] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRating(0)
      setReview('')
      setRatingSubmitted(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose()
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    try {
      setIsSubmitting(true)
      await api.post('/ratings', {
        bookingId: booking.id,
        rating,
        review: review.trim() || undefined,
        ratedUserId: booking.truckOwnerId,
        category: 'driver_service',
      })
      setRatingSubmitted(true)
      toast.success('Thank you for your feedback!')
      onRatingSubmitted?.()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit rating')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rating-modal-title"
        className="relative bg-panel rounded-2xl border border-white/10 shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h2 id="rating-modal-title" className="text-xl font-bold text-white">Trip Completed!</h2>
          <p className="text-primary-200 text-sm mt-1">
            Your cargo has been delivered successfully
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {ratingSubmitted ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">⭐</div>
              <h3 className="text-lg font-bold text-white">Thank You!</h3>
              <p className="text-surface-300 text-sm">
                Your rating has been submitted successfully.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Driver Info */}
              <div className="flex items-center gap-4 p-4 bg-surface-900/50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-xl font-bold text-white">
                  {booking.truckOwnerName?.charAt(0) || 'D'}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">
                    {booking.truckOwnerName || 'Driver'}
                  </p>
                  <p className="text-xs text-surface-400">
                    {booking.truckRegistrationNumber || 'Truck'}
                  </p>
                </div>
              </div>

              {/* Rating Stars */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-surface-200">
                  Rate your delivery experience
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      aria-label={`Rate ${star} out of 5 stars`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
                    >
                      {star <= (hoverRating || rating) ? (
                        <StarIcon className="w-10 h-10 text-yellow-400 drop-shadow-lg" aria-hidden="true" />
                      ) : (
                        <StarOutline className="w-10 h-10 text-surface-600" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-surface-400">
                  {rating === 1 && 'Poor - Very disappointed'}
                  {rating === 2 && 'Fair - Below expectations'}
                  {rating === 3 && 'Good - Met expectations'}
                  {rating === 4 && 'Very Good - Exceeded expectations'}
                  {rating === 5 && 'Excellent - Outstanding service!'}
                  {!rating && 'Tap a star to rate'}
                </p>
              </div>

              {/* Review */}
              <div className="space-y-2">
                <label htmlFor={reviewId} className="block text-sm font-bold text-surface-200">
                  Share your experience (optional)
                </label>
                <textarea
                  id={reviewId}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="How was your experience with this driver? Did they deliver on time? Was the cargo handled properly?"
                  className="w-full px-4 py-3 bg-surface-900/50 border border-white/10 rounded-xl text-white placeholder-surface-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 font-bold transition-colors border border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  Skip for Now
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={rating === 0 || isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
