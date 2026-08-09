'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  TruckIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { authApi, setAuthCookies } from '@/lib/api'
import { Button, Card, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

function LoginForm() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp')
  const [resendTimer, setResendTimer] = useState(0)
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendTimer])

  const formatPhone = (input: string) => {
    const cleaned = input.replace(/\D/g, '')
    if (cleaned.length === 10) return `+91${cleaned}`
    if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`
    if (cleaned.startsWith('+')) return cleaned
    return cleaned
  }

  const handleRequestOtp = async () => {
    const formattedPhone = formatPhone(phone)
    if (!/^\+91[6-9]\d{9}$/.test(formattedPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g. 98765 43210)')
      return
    }

    setLoading(true)
    setError('')
    setDevOtpNotice(null)

    try {
      const res = await authApi.requestOtp(formattedPhone, channel)

      if (res.data.success) {
        setStep('otp')
        setResendTimer(30)
        toast.success(`OTP sent successfully via ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`)

        // Dev mode auto-fill convenience
        if (res.data.devOtp) {
          setOtp(res.data.devOtp)
          setDevOtpNotice(res.data.devOtp)
        }
      } else {
        setError(res.data.message || 'Failed to send verification code')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to connect to authentication service'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    const formattedPhone = formatPhone(phone)

    if (otp.length < 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await authApi.verifyOtp(formattedPhone, otp)
      const { accessToken, refreshToken, user } = res.data

      if (user.isNewUser) {
        toast.info('Welcome! Please select your account role.')
        router.push(`/role-select?phone=${encodeURIComponent(formattedPhone)}&otp=${otp}`)
        return
      }

      // Existing user session
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))

      setAuthCookies(accessToken, user.role)
      toast.success('Successfully logged in!')

      // Redirect destination
      if (redirect && redirect !== '/') {
        router.push(redirect)
      } else if (user.role === 'admin') {
        router.push('/admin')
      } else if (user.role === 'truck_owner') {
        router.push('/dashboard/truck-owner')
      } else {
        router.push('/dashboard/load-owner')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-background-dark flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
              <TruckIcon className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-surface-900 dark:text-white leading-none">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
          </Link>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight pt-2">
            {step === 'phone' ? 'Log in or Register' : 'Verify Your Number'}
          </h2>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400">
            {step === 'phone'
              ? 'Enter your mobile number to access loads, trucks, and bookings'
              : `We sent a 6-digit OTP to +91 ${phone}`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/60 text-danger-700 dark:text-danger-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <span className="shrink-0 text-base">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Dev Mode OTP Banner */}
        {devOtpNotice && (
          <div className="mt-4 p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-300 text-xs font-medium flex items-center justify-between">
            <span>Dev Mode OTP: <strong>{devOtpNotice}</strong></span>
            <span className="text-[10px] bg-primary-200/60 dark:bg-primary-900 px-2 py-0.5 rounded">Auto-filled</span>
          </div>
        )}

        {/* Auth Form Card */}
        <div className="mt-6">
          <Card padding="lg" className="shadow-elevated border-surface-200/80 dark:border-surface-700/80">
            {step === 'phone' ? (
              <div className="space-y-5">
                {/* Mobile Phone Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-2">
                    Mobile Number
                  </label>
                  <div className="flex rounded-input border border-surface-300 dark:border-surface-700 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 bg-white dark:bg-surface-800 transition-all">
                    <span className="inline-flex items-center px-4 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 font-bold text-sm border-r border-surface-300 dark:border-surface-700">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                        setError('')
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && phone.length === 10 && handleRequestOtp()}
                      placeholder="98765 43210"
                      className="flex-1 min-w-0 px-4 py-3 bg-transparent text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none text-base font-medium"
                      maxLength={10}
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-surface-400 mt-1.5">
                    We will send a one-time verification code. No password needed.
                  </p>
                </div>

                {/* Channel Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-2">
                    Deliver Code Via
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setChannel('whatsapp')}
                      className={cn(
                        'flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-bold transition-all',
                        channel === 'whatsapp'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-xs'
                          : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
                      )}
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChannel('sms')}
                      className={cn(
                        'flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-bold transition-all',
                        channel === 'sms'
                          ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 shadow-xs'
                          : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
                      )}
                    >
                      <DevicePhoneMobileIcon className="w-4 h-4 text-blue-600" />
                      <span>SMS Text</span>
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={phone.length < 10}
                  onClick={handleRequestOtp}
                >
                  Send Verification Code
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* OTP Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-2 text-center">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                      setError('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && handleVerifyOtp()}
                    placeholder="• • • • • •"
                    className="w-full px-4 py-3.5 border border-surface-300 dark:border-surface-700 rounded-xl bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-center text-2xl tracking-[0.4em] font-mono font-bold"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                {/* Verify Button */}
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={otp.length < 6}
                  onClick={handleVerifyOtp}
                >
                  Verify & Sign In
                </Button>

                {/* Auxiliary Navigation */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-surface-100 dark:border-surface-800">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone')
                      setOtp('')
                      setError('')
                    }}
                    className="text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 font-semibold"
                  >
                    ← Change phone number
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={resendTimer > 0 || loading}
                    className="text-primary-600 dark:text-primary-400 hover:underline font-bold disabled:opacity-50 disabled:no-underline"
                  >
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Security & Compliance Footer */}
        <div className="mt-8 text-center text-xs text-surface-400 flex items-center justify-center gap-1.5">
          <ShieldCheckIcon className="w-4 h-4 text-surface-400" />
          <span>Direct OTP authentication • End-to-end encrypted sessions</span>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-50 dark:bg-background-dark flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
