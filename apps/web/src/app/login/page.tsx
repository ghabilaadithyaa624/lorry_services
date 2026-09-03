'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  TruckIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline'
import { authApi, setAuthCookies } from '@/lib/api'
import { Button, Card, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type PublicRole = 'factory_owner' | 'truck_driver'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const initialRoleParam = searchParams.get('role')

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [selectedRole, setSelectedRole] = useState<PublicRole | null>(() => {
    if (initialRoleParam === 'truck_driver') return 'truck_driver'
    if (initialRoleParam === 'factory_owner') return 'factory_owner'
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('selectedRole')
      if (saved === 'truck_driver' || saved === 'factory_owner') return saved
    }
    return 'factory_owner'
  })

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp')
  const [resendTimer, setResendTimer] = useState(0)
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null)
  const [showRolePickerInOtp, setShowRolePickerInOtp] = useState(false)

  // Persist role choice in sessionStorage
  const handleSelectRole = (role: PublicRole) => {
    setSelectedRole(role)
    setError('')
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedRole', role)
    }
  }

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

    if (!selectedRole) {
      setError('Please select an account role before continuing')
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
      const res = await authApi.verifyOtp(
        formattedPhone,
        otp,
        selectedRole || undefined
      )
      const { accessToken, refreshToken, user } = res.data

      // Save user session
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))

      setAuthCookies(accessToken, user.role)
      toast.success(
        user.isNewUser
          ? `Welcome to LorryCarry as ${user.role === 'truck_driver' ? 'Truck Driver' : 'Factory Owner'}!`
          : 'Successfully logged in!'
      )

      // Redirect destination handling
      if (redirect && redirect !== '/') {
        if (redirect.startsWith('/admin')) {
          if (user.role === 'admin') {
            router.push(redirect)
          } else {
            // Non-admin attempting to access /admin -> route to appropriate user dashboard
            const fallback = user.role === 'truck_driver' ? '/dashboard/truck-driver' : '/dashboard/factory-owner'
            router.push(fallback)
          }
        } else {
          router.push(redirect)
        }
      } else if (user.role === 'admin') {
        router.push('/admin')
      } else if (user.role === 'truck_driver') {
        router.push('/dashboard/truck-driver')
      } else {
        router.push('/dashboard/factory-owner')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP. Please try again.'
      setError(msg)
      if (msg.toLowerCase().includes('role')) {
        setShowRolePickerInOtp(true)
      }
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-11 h-11 rounded-2xl bg-primary-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
              <TruckIcon className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white leading-none">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
          </Link>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-2">
            {step === 'phone' ? 'Log in or Register' : 'Verify Your Number'}
          </h2>
          <p className="text-xs sm:text-sm text-surface-400">
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
            <span className="text-[10px] bg-primary-200/60 dark:bg-primary-900 px-2 py-0.5 rounded font-semibold">Auto-filled</span>
          </div>
        )}

        {/* Auth Form Card */}
        <div className="mt-6">
          <Card padding="lg" className="shadow-elevated border-hairline/80">
            {step === 'phone' ? (
              <div className="space-y-5">
                {/* Mobile Phone Input */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted mb-2">
                    Mobile Number
                  </label>
                  <div className="flex rounded-input border border-hairline overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 bg-sunken transition-all">
                    <span className="inline-flex items-center px-4 bg-sunken text-muted font-bold text-sm border-r border-hairline">
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
                      className="flex-1 min-w-0 px-4 py-3 bg-transparent text-ink placeholder-surface-400 focus:outline-none text-base font-medium"
                      maxLength={10}
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-surface-400 mt-1.5">
                    We will send a one-time verification code. No password needed.
                  </p>
                </div>

                {/* Role Selection (I AM REGISTERING AS) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                      I AM REGISTERING AS
                    </label>
                    <span className="text-[11px] text-surface-400">For new users</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="I am registering as">
                    {/* Factory Owner Card */}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selectedRole === 'factory_owner'}
                      onClick={() => handleSelectRole('factory_owner')}
                      className={cn(
                        'p-3.5 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary-500/40',
                        selectedRole === 'factory_owner'
                          ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/40 shadow-xs ring-1 ring-primary-500/30'
                          : 'border-hairline bg-sunken hover:border-hairline-strong'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                            selectedRole === 'factory_owner'
                              ? 'bg-primary-500 text-white shadow-xs'
                              : 'bg-sunken text-muted group-hover:text-primary-500'
                          )}
                        >
                          <ArchiveBoxIcon className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-ink">
                              Factory Owner
                            </span>
                            {selectedRole === 'factory_owner' && (
                              <CheckCircleIcon className="w-4 h-4 text-primary-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-subtle mt-0.5 leading-snug">
                            Post loads and find suitable trucks
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Truck Driver Card */}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selectedRole === 'truck_driver'}
                      onClick={() => handleSelectRole('truck_driver')}
                      className={cn(
                        'p-3.5 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary-500/40',
                        selectedRole === 'truck_driver'
                          ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/40 shadow-xs ring-1 ring-primary-500/30'
                          : 'border-hairline bg-sunken hover:border-hairline-strong'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                            selectedRole === 'truck_driver'
                              ? 'bg-primary-500 text-white shadow-xs'
                              : 'bg-sunken text-muted group-hover:text-primary-500'
                          )}
                        >
                          <TruckIcon className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-ink">
                              Truck Driver
                            </span>
                            {selectedRole === 'truck_driver' && (
                              <CheckCircleIcon className="w-4 h-4 text-primary-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-subtle mt-0.5 leading-snug">
                            Register trucks and find available loads
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                  <p className="text-[11px] text-surface-400 mt-1.5">
                    Existing users will automatically log in with their registered account role.
                  </p>
                </div>

                {/* Channel Selection */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted mb-2">
                    Deliver Code Via
                  </label>
                  <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Deliver verification code via">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={channel === 'whatsapp'}
                      onClick={() => setChannel('whatsapp')}
                      className={cn(
                        'flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-bold transition-all',
                        channel === 'whatsapp'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-xs'
                          : 'border-hairline text-muted hover:bg-wash'
                      )}
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={channel === 'sms'}
                      onClick={() => setChannel('sms')}
                      className={cn(
                        'flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-bold transition-all',
                        channel === 'sms'
                          ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 shadow-xs'
                          : 'border-hairline text-muted hover:bg-wash'
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
                  disabled={phone.length < 10 || !selectedRole}
                  onClick={handleRequestOtp}
                >
                  Send Verification Code
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Active Role Indicator on OTP Screen */}
                <div className="p-3 rounded-xl bg-sunken/80 border border-hairline space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-subtle">Account Type:</span>
                      <span className="font-bold text-ink flex items-center gap-1.5">
                        {selectedRole === 'truck_driver' ? (
                          <>
                            <TruckIcon className="w-3.5 h-3.5 text-primary-500 shrink-0 inline" />
                            Truck Driver
                          </>
                        ) : selectedRole === 'factory_owner' ? (
                          <>
                            <ArchiveBoxIcon className="w-3.5 h-3.5 text-primary-500 shrink-0 inline" />
                            Factory Owner
                          </>
                        ) : (
                          <span className="text-danger-500 font-semibold">Select Role</span>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRolePickerInOtp((prev) => !prev)}
                      className="text-primary-600 dark:text-primary-400 font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>{showRolePickerInOtp ? 'Done' : 'Change role'}</span>
                      <ChevronUpDownIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Inline Role Selector if toggled or if no role selected */}
                  {(showRolePickerInOtp || !selectedRole) && (
                    <div className="pt-2 border-t border-hairline/80 grid grid-cols-2 gap-2 animate-fade-in" role="radiogroup" aria-label="Change account type to">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedRole === 'factory_owner'}
                        onClick={() => {
                          handleSelectRole('factory_owner')
                          setShowRolePickerInOtp(false)
                        }}
                        className={cn(
                          'p-2.5 rounded-lg border text-left transition-all',
                          selectedRole === 'factory_owner'
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 font-bold text-primary-700 dark:text-primary-300 shadow-2xs'
                            : 'border-hairline bg-sunken text-body'
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <ArchiveBoxIcon className="w-3.5 h-3.5" />
                          <span>Factory Owner</span>
                        </div>
                        <div className="text-[10px] text-subtle mt-0.5">
                          Post freight loads
                        </div>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedRole === 'truck_driver'}
                        onClick={() => {
                          handleSelectRole('truck_driver')
                          setShowRolePickerInOtp(false)
                        }}
                        className={cn(
                          'p-2.5 rounded-lg border text-left transition-all',
                          selectedRole === 'truck_driver'
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 font-bold text-primary-700 dark:text-primary-300 shadow-2xs'
                            : 'border-hairline bg-sunken text-body'
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <TruckIcon className="w-3.5 h-3.5" />
                          <span>Truck Driver</span>
                        </div>
                        <div className="text-[10px] text-subtle mt-0.5">
                          Register trucks
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* OTP Input */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted mb-2 text-center">
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
                    className="w-full px-4 py-3.5 border border-hairline rounded-xl bg-sunken text-ink placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-center text-2xl tracking-[0.4em] font-mono font-bold"
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
                <div className="flex items-center justify-between text-xs pt-2 border-t border-hairline">
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
