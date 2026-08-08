'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi, setAuthCookies } from '@/lib/api'

function LoginForm() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const formatPhone = (input: string) => {
    const cleaned = input.replace(/\D/g, '')
    if (cleaned.length === 10) return `+91${cleaned}`
    if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`
    if (cleaned.startsWith('+')) return cleaned
    return cleaned
  }

  const requestOtp = async () => {
    const formattedPhone = formatPhone(phone)
    if (!/^\+91[6-9]\d{9}$/.test(formattedPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await authApi.requestOtp(formattedPhone, channel)
      
      if (res.data.success) {
        setStep('otp')
        // Auto-fill dev OTP in development
        if (res.data.devOtp) {
          setOtp(res.data.devOtp)
        }
      } else {
        setError(res.data.message || 'Failed to send OTP')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    const formattedPhone = formatPhone(phone)
    
    setLoading(true)
    setError('')

    try {
      const res = await authApi.verifyOtp(formattedPhone, otp)
      const { accessToken, refreshToken, user } = res.data

      if (user.isNewUser) {
        // Redirect to role selection for new users
        router.push(`/role-select?phone=${encodeURIComponent(formattedPhone)}&otp=${otp}`)
        return
      }

      // Existing user - store tokens and redirect
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
      
      setAuthCookies(accessToken, user.role)

      // Redirect based on role or original destination
      if (redirect !== '/') {
        router.push(redirect)
      } else if (user.role === 'load_owner') {
        router.push('/dashboard/load-owner')
      } else {
        router.push('/dashboard/truck-owner')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {step === 'phone' 
              ? 'Enter your phone number to continue' 
              : `Enter the OTP sent to ${phone}`}
          </p>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 bg-white dark:bg-slate-800 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-800">
          {step === 'phone' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="flex rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500">
                  <span className="inline-flex items-center px-4 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 font-medium text-sm border-r border-gray-300 dark:border-gray-700">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="flex-1 min-w-0 block w-full px-4 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-base"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Channel Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Send OTP Via
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setChannel('whatsapp')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                      channel === 'whatsapp' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    💬 WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannel('sms')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                      channel === 'sms' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    📱 SMS
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={loading || phone.length < 10}
                onClick={requestOtp}
                className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : `Send OTP via ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <button
                type="button"
                disabled={loading || otp.length < 6}
                onClick={verifyOtp}
                className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <div className="flex items-center justify-between text-sm pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone')
                    setOtp('')
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-medium"
                >
                  ← Change number
                </button>

                <button
                  type="button"
                  onClick={requestOtp}
                  disabled={loading}
                  className="text-orange-600 dark:text-orange-400 hover:underline text-xs font-medium"
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
