'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Building2,
  Check,
  Repeat,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react'
import { REGISTRATION_ROLES, type PublicRegistrationRole } from '@/lib/roles'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { cn } from '@/lib/utils'

const ROLE_ICONS: Record<string, typeof Building2> = {
  factory_owner: Building2,
  truck_driver: Truck,
  // Transporters work both sides of the marketplace.
  transporter: Repeat,
}

/** Fallback icon so a newly added role never renders `undefined` (build-safe). */
const DEFAULT_ROLE_ICON = Building2

/** The first, deliberately low-friction step of new-operator onboarding. */
export default function RoleSelectPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<PublicRegistrationRole | null>(null)

  const continueToVerification = () => {
    if (!selectedRole) return
    sessionStorage.setItem('selectedRole', selectedRole)
    router.push(`/login?role=${selectedRole}`)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas px-4 py-6 sm:px-6 sm:py-10">
      {/* Top-bar language selector — accessible before sign-in */}
      <div className="absolute top-4 inset-x-0 flex justify-center sm:justify-end sm:pe-6 lg:pe-8 z-10">
        <LanguageToggle />
      </div>
      <div className="pointer-events-none absolute left-[5%] top-[-7rem] h-72 w-72 rounded-full bg-primary-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-9rem] right-[5%] h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-center">
        <header className="mb-7 flex items-center justify-between sm:mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-glow-primary">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-ink">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
          </Link>
          <Link
            href="/login"
            className="rounded-lg px-2 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Already have an account? <span className="text-primary-600 dark:text-primary-400">Sign in</span>
          </Link>
        </header>

        <div className="mx-auto w-full max-w-5xl">
          <div className="mx-auto mb-7 max-w-2xl text-center sm:mb-9">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-500/25 bg-primary-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary-700 dark:text-primary-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Step 1 of 3 · Set up your workspace
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              What brings you to LorryCarry?
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Choose the role that best matches your work. We&apos;ll tailor your dashboard, recommended actions, and tools from day one.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {REGISTRATION_ROLES.map((role) => {
              const Icon = ROLE_ICONS[role.value] ?? DEFAULT_ROLE_ICON
              const selected = selectedRole === role.value
              return (
                <button
                  key={role.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedRole(role.value)}
                  className={cn(
                    'group relative min-h-[300px] rounded-[22px] border-2 bg-panel p-5 text-left shadow-card transition-all duration-200 sm:p-6',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                    selected
                      ? 'border-primary-500 bg-primary-500/[0.07] shadow-elevated'
                      : 'border-hairline hover:-translate-y-0.5 hover:border-primary-500/45 hover:shadow-card-hover'
                  )}
                >
                  <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border border-hairline bg-panel">
                    {selected && <Check className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />}
                  </span>
                  <span
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl transition-colors',
                      selected ? 'bg-primary-500 text-white shadow-glow-primary' : 'bg-sunken text-muted group-hover:text-primary-600 dark:group-hover:text-primary-400'
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-[0.13em] text-primary-600 dark:text-primary-400">{role.eyebrow}</p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight text-ink">{role.label}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{role.description}</p>
                  <ul className="mt-5 space-y-2 border-t border-hairline pt-4" aria-label={`${role.label} benefits`}>
                    {role.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-2 text-xs font-medium text-body">
                        <Check className="h-4 w-4 shrink-0 text-success-500" aria-hidden="true" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary-500/25 bg-panel/80 p-4 shadow-xs backdrop-blur-sm sm:flex-row sm:px-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-600 dark:bg-success-950/40 dark:text-success-400">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm text-body">
                <strong className="block text-ink">90 days of full access, on us.</strong>
                No card required. Upgrade only when your business is ready.
              </p>
            </div>
            <button
              type="button"
              onClick={continueToVerification}
              disabled={!selectedRole}
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3 text-sm font-bold text-white shadow-glow-primary transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
            >
              {selectedRole ? `Continue as ${REGISTRATION_ROLES.find((role) => role.value === selectedRole)?.label}` : 'Choose a role to continue'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
