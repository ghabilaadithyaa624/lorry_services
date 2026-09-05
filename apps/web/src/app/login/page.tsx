'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Repeat,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
} from 'lucide-react'
import { authApi, setAuthCookies } from '@/lib/api'
import {
  getDashboardForRole,
  getRoleLabel,
  normalizeRole,
  REGISTRATION_ROLES,
  type PublicRegistrationRole,
} from '@/lib/roles'
import { OnboardingLanguagePicker } from '@/components/layout/OnboardingLanguagePicker'
import { readStoredLanguage } from '@/lib/language'
import { syncLanguageToAccount } from '@/lib/useLanguagePreference'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const ROLE_ICONS: Record<string, typeof Building2> = {
  factory_owner: Building2,
  truck_driver: Truck,
  // Transporters work both sides of the marketplace.
  transporter: Repeat,
}

/** Fallback icon so a newly added role never renders `undefined` (build-safe). */
const DEFAULT_ROLE_ICON = Building2

function OnboardingProgress({ step }: { step: 2 | 3 }) {
  return (
    <div className="mx-auto mb-7 flex max-w-md items-center justify-center gap-2.5" aria-label={`Onboarding step ${step} of 3`}>
      {[1, 2, 3].map((item) => (
        <React.Fragment key={item}>
          {item > 1 && <span className={cn('h-px w-8 sm:w-12', item <= step ? 'bg-primary-500' : 'bg-hairline')} aria-hidden="true" />}
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold',
              item < step ? 'bg-primary-500 text-white' : item === step ? 'bg-primary-500 text-white shadow-glow-primary' : 'bg-sunken text-subtle'
            )}
            aria-current={item === step ? 'step' : undefined}
          >
            {item < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : item}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const initialRole = searchParams.get('role')

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [selectedRole, setSelectedRole] = useState<PublicRegistrationRole | null>(() => {
    // Normalize so legacy ?role=load_owner deep links and stale
    // sessionStorage values still resolve to a canonical role.
    const fromQuery = normalizeRole(initialRole)
    if (fromQuery && fromQuery !== 'admin') return fromQuery
    if (typeof window !== 'undefined') {
      const saved = normalizeRole(sessionStorage.getItem('selectedRole'))
      if (saved && saved !== 'admin') return saved
    }
    return null
  })
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(0)
  const [devOtp, setDevOtp] = useState<string | null>(null)

  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = window.setInterval(() => setResendTimer((time) => Math.max(0, time - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendTimer])

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length === 10) return `+91${digits}`
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
    return value.startsWith('+') ? value : digits
  }

  const chooseRole = (role: PublicRegistrationRole) => {
    setSelectedRole(role)
    setError('')
    sessionStorage.setItem('selectedRole', role)
  }

  const requestOtp = async () => {
    const formattedPhone = formatPhone(phone)
    if (!selectedRole) {
      setError('Choose the workspace you need before continuing.')
      return
    }
    if (!/^\+91[6-9]\d{9}$/.test(formattedPhone)) {
      setError('Enter a valid 10-digit Indian mobile number, for example 98765 43210.')
      return
    }

    setLoading(true)
    setError('')
    setDevOtp(null)
    try {
      const response = await authApi.requestOtp(formattedPhone, channel)
      if (!response.data?.success) {
        setError(response.data?.message || 'We could not send a verification code. Please try again.')
        return
      }
      setStep('otp')
      setResendTimer(30)
      if (response.data.devOtp) {
        setOtp(response.data.devOtp)
        setDevOtp(response.data.devOtp)
      }
      toast.success(`Verification code sent via ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`)
    } catch (err: any) {
      const message = err.response?.data?.message || 'Could not reach the authentication service.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const completeOnboarding = async () => {
    const formattedPhone = formatPhone(phone)
    if (otp.length !== 6 || !selectedRole) return

    setLoading(true)
    setError('')
    try {
      const response = await authApi.verifyOtp(formattedPhone, otp, selectedRole)
      const { accessToken, refreshToken, user } = response.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
      setAuthCookies(accessToken, user.role)
      sessionStorage.removeItem('selectedRole')

      // Carry the language chosen before sign-in onto the freshly authenticated
      // account. Without this the pre-auth choice lived only in localStorage
      // and was overwritten by the account default ('en') the first time any
      // surface read `/users/preferences` — the reported "my language resets
      // after I log in" bug.
      syncLanguageToAccount(readStoredLanguage())

      const dashboard = getDashboardForRole(user.role)
      toast.success(
        user.isNewUser
          ? `Welcome, ${getRoleLabel(user.role)}. Your 90-day free trial is active.`
          : `Welcome back, ${getRoleLabel(user.role)}.`
      )

      // A deep link remains useful for returning users, but a first-time signup
      // always lands in the role-aware dashboard so they see the trial status.
      const safeRedirect = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : null
      router.push(user.isNewUser ? dashboard : safeRedirect || dashboard)
      router.refresh()
    } catch (err: any) {
      const message = err.response?.data?.message || 'The verification code is invalid or has expired.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const activeRole = REGISTRATION_ROLES.find((role) => role.value === selectedRole)

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute left-1/2 top-[-12rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-14rem] right-[-5rem] h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
        <header className="mb-7 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-glow-primary">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-ink">Lorry<span className="text-primary-500">Carry</span></span>
          </Link>
          {step === 'phone' && (
            <Link href="/role-select" className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
              Change role
            </Link>
          )}
        </header>

        {/* The operator may land here directly (deep link / returning user)
            without passing through role-select, so the language choice must be
            reachable on the verification screen too. */}
        <OnboardingLanguagePicker className="mb-5" />

        <OnboardingProgress step={step === 'phone' ? 2 : 3} />

        <section className="rounded-[26px] border border-hairline bg-panel p-5 shadow-elevated sm:p-7">
          {step === 'phone' ? (
            <>
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-primary-700 dark:text-primary-300">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Step 2 · Verify your number
                </span>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Start your free workspace</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted">Verify your mobile number to activate 90 days of full LorryCarry access. No card required.</p>
              </div>

              <fieldset className="mt-6">
                <legend className="mb-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-muted">Your role</legend>
                <div className="grid gap-2.5" role="radiogroup" aria-label="Choose your role">
                  {REGISTRATION_ROLES.map((role) => {
                    const Icon = ROLE_ICONS[role.value] ?? DEFAULT_ROLE_ICON
                    const isSelected = selectedRole === role.value
                    return (
                      <button
                        key={role.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => chooseRole(role.value)}
                        className={cn(
                          'flex min-h-[68px] items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-all',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-panel',
                          isSelected ? 'border-primary-500 bg-primary-500/[0.07]' : 'border-hairline bg-sunken/50 hover:border-primary-500/40'
                        )}
                      >
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', isSelected ? 'bg-primary-500 text-white' : 'bg-panel text-muted')}>
                          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-ink">{role.label}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted">{role.description}</span>
                        </span>
                        <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', isSelected ? 'border-primary-500 bg-primary-500 text-white' : 'border-hairline')}>
                          {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <div className="mt-5">
                <label htmlFor="mobile-number" className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-muted">Mobile number</label>
                <div className="flex overflow-hidden rounded-xl border border-hairline bg-sunken transition-shadow focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20">
                  <span className="flex items-center border-r border-hairline px-3.5 text-sm font-bold text-ink">+91</span>
                  <input
                    id="mobile-number"
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))
                      setError('')
                    }}
                    onKeyDown={(event) => event.key === 'Enter' && requestOtp()}
                    placeholder="98765 43210"
                    inputMode="numeric"
                    autoComplete="tel"
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base font-semibold text-ink placeholder:text-subtle focus:outline-none"
                  />
                </div>
              </div>

              <fieldset className="mt-5">
                <legend className="mb-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-muted">Send code via</legend>
                <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Send verification code via">
                  {[
                    { value: 'whatsapp' as const, label: 'WhatsApp', Icon: MessageCircle, activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' },
                    { value: 'sms' as const, label: 'SMS', Icon: Smartphone, activeClass: 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300' },
                  ].map(({ value, label, Icon, activeClass }) => (
                    <button
                      type="button"
                      key={value}
                      role="radio"
                      aria-checked={channel === value}
                      onClick={() => setChannel(value)}
                      className={cn(
                        'flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                        channel === value ? activeClass : 'border-hairline bg-panel text-body hover:bg-wash'
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {error && <p role="alert" className="mt-4 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-medium text-danger-700 dark:border-danger-900/60 dark:bg-danger-950/35 dark:text-danger-300">{error}</p>}

              <button
                type="button"
                onClick={requestOtp}
                disabled={loading || !selectedRole || phone.length !== 10}
                className="mt-5 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-extrabold text-white shadow-glow-primary transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <>Continue to verification <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
              </button>
            </>
          ) : (
            <>
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-success-700 dark:bg-success-950/40 dark:text-success-400">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Step 3 · Secure sign in
                </span>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Enter your verification code</h1>
                <p className="mt-2 text-sm text-muted">We sent a 6-digit code to <strong className="font-bold text-ink">+91 {phone}</strong>.</p>
              </div>

              <div className="mt-6 rounded-2xl border border-primary-500/25 bg-primary-500/[0.07] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-glow-primary">
                    {activeRole && React.createElement(ROLE_ICONS[activeRole.value], { className: 'h-5 w-5', 'aria-hidden': true })}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-muted">Setting up your workspace as</p>
                    <p className="text-sm font-extrabold text-ink">{activeRole?.label || 'LorryCarry operator'}</p>
                    {activeRole && (
                      <p className="mt-0.5 text-xs leading-relaxed text-body">{activeRole.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-primary-500/20 pt-3 text-xs text-body">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                  Your 90-day full-access trial starts after verification.
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="otp" className="mb-2 block text-center text-[11px] font-black uppercase tracking-[0.1em] text-muted">6-digit code</label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                    setError('')
                  }}
                  onKeyDown={(event) => event.key === 'Enter' && completeOnboarding()}
                  placeholder="••••••"
                  maxLength={6}
                  autoFocus
                  className="w-full rounded-xl border border-hairline bg-sunken px-4 py-3.5 text-center font-mono text-2xl font-extrabold tracking-[0.42em] text-ink placeholder:text-subtle focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                {devOtp && <p className="mt-2 text-center text-xs font-semibold text-primary-700 dark:text-primary-300">Development code: {devOtp}</p>}
              </div>

              {error && <p role="alert" className="mt-4 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-medium text-danger-700 dark:border-danger-900/60 dark:bg-danger-950/35 dark:text-danger-300">{error}</p>}

              <button
                type="button"
                onClick={completeOnboarding}
                disabled={loading || otp.length !== 6}
                className="mt-5 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-extrabold text-white shadow-glow-primary transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <>Activate workspace <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
              </button>

              <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4 text-xs font-semibold">
                <button type="button" onClick={() => { setStep('phone'); setOtp(''); setError('') }} className="inline-flex items-center gap-1 text-muted hover:text-ink">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Change number
                </button>
                <button type="button" onClick={requestOtp} disabled={loading || resendTimer > 0} className="text-primary-600 hover:text-primary-700 disabled:cursor-not-allowed disabled:text-subtle dark:text-primary-400">
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                </button>
              </div>
            </>
          )}
        </section>

        <p className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-subtle">
          <LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          OTP-secured sign in. Your information stays protected.
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-canvas" />}>
      <LoginForm />
    </Suspense>
  )
}
