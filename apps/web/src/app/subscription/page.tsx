'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubscribe = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await api.post('/payments/subscription', {
        plan: 'monthly_unlimited',
        amount: 999, // ₹999/month
      })

      const { paymentSessionId } = res.data
      
      // Initialize Cashfree checkout SDK if loaded on window, or fallback
      const cashfree = (window as any).Cashfree
      if (cashfree) {
        cashfree.checkout({
          paymentSessionId,
          redirectTarget: '_self',
        })
      } else {
        // Fallback: redirect to checkout URL
        window.location.href = `https://sandbox.cashfree.com/pg/checkout?session_id=${paymentSessionId}`
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initiate subscription payment. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 tracking-wide uppercase">
            Direct Marketplace Access
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Unlock Full Access
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Subscribe to connect directly with verified truck owners and load owners across India without middleman commissions.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-sm text-rose-700 dark:text-rose-300 text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch pt-4">
          
          {/* Free Plan */}
          <div className="card p-8 flex flex-col justify-between border border-gray-200 dark:border-gray-800 hover:border-gray-300 transition-all">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Free Starter</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">For casual browsing and location previews</p>
              </div>

              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">₹0</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">/ forever</span>
              </div>

              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Browse load & truck listings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>View route summaries & tonnage</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-400 line-through">
                  <span>Contact details hidden</span>
                </li>
                <li className="flex items-center space-x-2 text-gray-400 line-through">
                  <span>Cannot create bookings</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <button disabled className="w-full btn-secondary text-sm opacity-60 cursor-default">
                Current Plan
              </button>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="card p-8 flex flex-col justify-between border-2 border-primary-500 shadow-xl relative bg-gradient-to-b from-white via-white to-orange-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-primary-950/20">
            <div className="absolute -top-3 right-6 bg-primary-500 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
              Most Popular
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pro Unlimited</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">For active load owners & fleet operators</p>
              </div>

              <div className="flex items-baseline">
                <span className="text-4xl font-black text-primary-600 dark:text-primary-400">₹999</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">/ month</span>
              </div>

              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
                <li className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                  <span className="font-medium">Unlimited phone contact reveals</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                  <span className="font-medium">Direct WhatsApp integration</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                  <span className="font-medium">Create unlimited direct bookings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                  <span>5-stage trip tracking & notifications</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                  <span>Priority customer support</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full btn-primary text-sm py-3 font-bold shadow-lg shadow-primary-500/25 flex items-center justify-center space-x-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{loading ? 'Processing...' : 'Subscribe Now'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
