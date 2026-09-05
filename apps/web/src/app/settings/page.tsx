'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  UserCircleIcon,
  AdjustmentsHorizontalIcon,
  BellAlertIcon,
  LockClosedIcon,
  EyeSlashIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { usersApi, authApi, type UserPreferences } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { LANGUAGE_SELECT_OPTIONS, isUiLanguage, normalizeLanguage } from '@/lib/language'
import { useLanguagePreference } from '@/lib/useLanguagePreference'
import { useTheme } from '@/components/theme/ThemeProvider'
import type { ThemePreference } from '@/lib/theme'
import {
  Button,
  Badge,
  Card,
  Input,
  Select,
  PageHeader,
  Skeleton,
  ErrorState,
  Modal,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn, formatPhone } from '@/lib/utils'
import { getRoleLabel } from '@/lib/roles'

type SectionId =
  | 'account'
  | 'preferences'
  | 'security'
  | 'notifications'
  | 'privacy'
  | 'subscription'
  | 'danger'

const SECTIONS: Array<{
  id: SectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  { id: 'account', label: 'Account', icon: UserCircleIcon, description: 'Your name and identity' },
  { id: 'preferences', label: 'Preferences', icon: AdjustmentsHorizontalIcon, description: 'Appearance, language, search defaults' },
  { id: 'notifications', label: 'Notifications', icon: BellAlertIcon, description: 'Where alerts are delivered' },
  { id: 'security', label: 'Security', icon: LockClosedIcon, description: 'Sign-in and sessions' },
  { id: 'privacy', label: 'Privacy', icon: EyeSlashIcon, description: 'Profile visibility' },
  { id: 'subscription', label: 'Subscription', icon: CreditCardIcon, description: 'Plan and billing' },
  { id: 'danger', label: 'Danger zone', icon: ExclamationTriangleIcon, description: 'Irreversible actions' },
]

// The picker is generated from the single source of truth in `@/lib/language`
// (தமிழ் | हिन्दी | English). It previously listed eight Indian languages while
// only three had translations, so selecting Telugu/Kannada/Bengali stored a
// code nothing could render and left the interface silently in English.
// Languages reappear here automatically once their locale catalogue lands.
const LANGUAGES = LANGUAGE_SELECT_OPTIONS

const BODY_TYPES = ['Open', 'Container', 'Trailer', 'Tipper', 'Tanker', 'Refrigerated']

/**
 * Settings centre.
 *
 * Preferences are persisted server-side through `/users/preferences`, so they
 * follow the operator across devices instead of living in localStorage. Theme
 * is additionally mirrored into the ThemeProvider for immediate effect.
 */
export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  // Language is a live interface preference, not a plain stored field: it must
  // apply to the document and every mounted picker the instant it changes.
  const { language, setLanguage } = useLanguagePreference()

  const [section, setSection] = useState<SectionId>('account')
  const [profile, setProfile] = useState<any>(null)
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [savingPref, setSavingPref] = useState<string | null>(null)
  const [signOutAllOpen, setSignOutAllOpen] = useState(false)
  const [signingOutAll, setSigningOutAll] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [profileRes, prefsRes] = await Promise.allSettled([
        usersApi.getProfile(),
        usersApi.getPreferences(),
      ])

      let profileData = profileRes.status === 'fulfilled' ? profileRes.value.data : null
      if (!profileData) {
        try {
          const stored = localStorage.getItem('user')
          if (stored) profileData = JSON.parse(stored)
        } catch {
          // Ignore parse errors
        }
      }

      let prefsData = prefsRes.status === 'fulfilled' ? prefsRes.value.data : null
      if (!prefsData) {
        prefsData = {
          theme: (theme as any) || 'system',
          language,
          currency: 'INR',
          distanceUnit: 'km',
          notifyWhatsapp: true,
          notifySms: true,
          notifyPush: true,
          notifyCheckpoints: true,
          defaultRadiusKm: 50,
          preferredBodyType: null,
          autoDetectLocation: true,
          profileVisible: true,
        }
      }

      if (profileData) {
        setProfile(profileData)
        setName(profileData?.name || '')
      }
      // Normalise a legacy/unsupported stored code so the picker reflects the
      // language the interface is genuinely rendering.
      setPrefs({ ...prefsData, language: normalizeLanguage(prefsData.language, language) })
    } catch {
      setError('We could not load your settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [theme, language])

  useEffect(() => {
    load()
  }, [load])

  const saveAccount = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Please enter your name')
      return
    }
    try {
      setSavingAccount(true)
      await usersApi.updateProfile({ name: trimmed })
      // Keep the cached user in sync so chrome updates without a reload.
      try {
        const stored = localStorage.getItem('user')
        if (stored) {
          const parsed = JSON.parse(stored)
          parsed.name = trimmed
          localStorage.setItem('user', JSON.stringify(parsed))
        }
      } catch {
        // Cache refresh is best-effort.
      }
      setProfile((prev: any) => ({ ...prev, name: trimmed }))
      toast.success('Name updated')
    } catch {
      toast.error('Could not update your name')
    } finally {
      setSavingAccount(false)
    }
  }

  /**
   * Optimistically persist a single preference field.
   * Reverts on failure so the control never lies about stored state.
   */
  const savePreference = useCallback(
    async (patch: Partial<UserPreferences>, labelKey: string) => {
      if (!prefs) return
      const snapshot = prefs
      setPrefs({ ...prefs, ...patch })
      setSavingPref(labelKey)
      try {
        const res = await usersApi.updatePreferences(patch)
        setPrefs(res.data.preferences)
      } catch {
        setPrefs(snapshot)
        toast.error('Could not save that preference')
      } finally {
        setSavingPref(null)
      }
    },
    [prefs]
  )

  const handleThemeChange = (next: ThemePreference) => {
    setTheme(next) // Immediate visual change.
    savePreference({ theme: next }, 'theme')
  }

  /**
   * Language changes must behave exactly like theme changes: apply instantly,
   * then persist. `setLanguage` writes localStorage, updates `<html lang/dir>`,
   * broadcasts to every mounted picker (including the header toggle) and
   * mirrors to `/users/preferences` — so the whole interface re-renders in the
   * new language without a reload. The local `prefs` copy is kept in step so
   * the form does not flash the old value.
   */
  const handleLanguageChange = (next: string) => {
    if (!isUiLanguage(next) || next === language) return
    setLanguage(next)
    setPrefs((prev) => (prev ? { ...prev, language: next } : prev))
    toast.success('Language updated')
  }

  const handleSignOutAll = async () => {
    try {
      setSigningOutAll(true)
      await authApi.logoutAll()
      toast.success('Signed out on all devices')
      router.push('/login')
    } catch {
      toast.error('Could not sign out other devices')
      setSigningOutAll(false)
    }
  }

  const activeSection = useMemo(
    () => SECTIONS.find((s) => s.id === section) ?? SECTIONS[0],
    [section]
  )

  return (
    <DashboardLayout title="Settings">
      <PageHeader
        title="Settings"
        description="Manage your account, preferences and privacy across LorryCarry."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6" aria-busy="true">
          <Skeleton className="h-[340px] w-full rounded-2xl hidden lg:block" />
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        </div>
      ) : error ? (
        <ErrorState title="Settings unavailable" message={error} onRetry={load} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Section navigation */}
          <nav aria-label="Settings sections" className="lg:sticky lg:top-24 lg:self-start">
            <ul className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-1 px-1">
              {SECTIONS.map((item) => {
                const Icon = item.icon
                const active = section === item.id
                const danger = item.id === 'danger'
                return (
                  <li key={item.id} className="shrink-0 lg:shrink">
                    <button
                      type="button"
                      onClick={() => setSection(item.id)}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] text-left',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                        active
                          ? danger
                            ? 'bg-danger-500/10 text-danger-600 dark:text-danger-400'
                            : 'bg-primary-500/10 text-primary-700 dark:text-primary-300'
                          : cn(
                              'text-body hover:bg-wash hover:text-ink',
                              danger && 'text-danger-600 dark:text-danger-400'
                            )
                      )}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Section content */}
          <div className="min-w-0 space-y-5">
            <div className="lg:hidden">
              <p className="text-xs text-subtle">{activeSection.description}</p>
            </div>

            {section === 'account' && (
              <Card>
                <Card.Title as="h2" className="mb-1">
                  Account details
                </Card.Title>
                <p className="text-sm text-muted mb-5">
                  Your mobile number is your login identity and cannot be changed here.
                </p>

                <div className="space-y-4 max-w-md">
                  <Input
                    label="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    maxLength={100}
                  />

                  <div>
                    <span className="block text-sm font-medium text-body mb-1.5">
                      Mobile number
                    </span>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-input bg-sunken border border-hairline">
                      <span className="text-sm font-mono text-ink">
                        {profile?.phone ? formatPhone(profile.phone) : '—'}
                      </span>
                      <Badge variant="success" size="sm">
                        Verified
                      </Badge>
                    </div>
                    <p className="text-xs text-subtle mt-1.5">
                      Contact support to change your registered number.
                    </p>
                  </div>

                  <div>
                    <span className="block text-sm font-medium text-body mb-1.5">Role</span>
                    <Badge variant="neutral">
                      {getRoleLabel(profile?.role)}
                    </Badge>
                  </div>

                  <div className="pt-1">
                    <Button onClick={saveAccount} loading={savingAccount} variant="primary">
                      Save changes
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {section === 'preferences' && prefs && (
              <>
                <Card>
                  <Card.Title as="h2" className="mb-1">
                    Appearance
                  </Card.Title>
                  <p className="text-sm text-muted mb-4">
                    Choose how LorryCarry looks. &ldquo;System&rdquo; follows your device setting.
                  </p>

                  <div
                    className="grid grid-cols-3 gap-2.5 max-w-md"
                    role="radiogroup"
                    aria-label="Theme"
                  >
                    {(
                      [
                        { value: 'light', label: 'Light', icon: SunIcon },
                        { value: 'dark', label: 'Dark', icon: MoonIcon },
                        { value: 'system', label: 'System', icon: ComputerDesktopIcon },
                      ] as const
                    ).map((option) => {
                      const Icon = option.icon
                      const active = theme === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => handleThemeChange(option.value)}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors min-h-[88px] justify-center',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                            active
                              ? 'border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300'
                              : 'border-hairline text-body hover:border-primary-500/40 hover:bg-wash-soft'
                          )}
                        >
                          <Icon className="w-5 h-5" aria-hidden="true" />
                          <span className="text-xs font-semibold">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </Card>

                <Card>
                  <Card.Title as="h2" className="mb-1">
                    {t('settings.language.title')}
                  </Card.Title>
                  <p className="text-sm text-muted mb-4">
                    {t('settings.language.description')}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                    <Select
                      label={t('common.language')}
                      // Bound to the live interface language rather than the
                      // raw stored value, so a legacy unsupported code shows
                      // the language actually being rendered.
                      value={language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </Select>

                    <Select
                      label="Distance unit"
                      value={prefs.distanceUnit}
                      onChange={(e) =>
                        savePreference({ distanceUnit: e.target.value as 'km' | 'mi' }, 'distanceUnit')
                      }
                      disabled={savingPref === 'distanceUnit'}
                    >
                      <option value="km">Kilometres (km)</option>
                      <option value="mi">Miles (mi)</option>
                    </Select>
                  </div>
                </Card>

                <Card>
                  <Card.Title as="h2" className="mb-1">
                    Search defaults
                  </Card.Title>
                  <p className="text-sm text-muted mb-4">
                    Applied automatically the next time you search the marketplace.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                    <Input
                      type="number"
                      label="Default search radius (km)"
                      min={5}
                      max={500}
                      value={prefs.defaultRadiusKm}
                      onChange={(e) =>
                        setPrefs({ ...prefs, defaultRadiusKm: Number(e.target.value) })
                      }
                      onBlur={(e) => {
                        const value = Math.min(500, Math.max(5, Number(e.target.value) || 50))
                        savePreference({ defaultRadiusKm: value }, 'defaultRadiusKm')
                      }}
                      hint="Between 5 and 500 km"
                    />

                    <Select
                      label="Preferred body type"
                      value={prefs.preferredBodyType ?? ''}
                      onChange={(e) =>
                        savePreference(
                          { preferredBodyType: e.target.value || null },
                          'preferredBodyType'
                        )
                      }
                      disabled={savingPref === 'preferredBodyType'}
                    >
                      <option value="">No preference</option>
                      {BODY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="mt-4 max-w-xl">
                    <ToggleRow
                      label="Auto-detect my location"
                      description="Use device GPS to pre-fill pickup and search locations."
                      checked={prefs.autoDetectLocation}
                      busy={savingPref === 'autoDetectLocation'}
                      onChange={(value) =>
                        savePreference({ autoDetectLocation: value }, 'autoDetectLocation')
                      }
                    />
                  </div>
                </Card>
              </>
            )}

            {section === 'notifications' && prefs && (
              <Card>
                <Card.Title as="h2" className="mb-1">
                  Notification channels
                </Card.Title>
                <p className="text-sm text-muted mb-4">
                  Critical verification and payment alerts are always delivered.
                </p>

                <div className="divide-y divide-hairline">
                  <ToggleRow
                    label="WhatsApp"
                    description="Booking confirmations and OTP delivery."
                    checked={prefs.notifyWhatsapp}
                    busy={savingPref === 'notifyWhatsapp'}
                    onChange={(value) => savePreference({ notifyWhatsapp: value }, 'notifyWhatsapp')}
                  />
                  <ToggleRow
                    label="SMS"
                    description="Fallback channel when WhatsApp is unavailable."
                    checked={prefs.notifySms}
                    busy={savingPref === 'notifySms'}
                    onChange={(value) => savePreference({ notifySms: value }, 'notifySms')}
                  />
                  <ToggleRow
                    label="Push notifications"
                    description="Browser alerts while LorryCarry is open."
                    checked={prefs.notifyPush}
                    busy={savingPref === 'notifyPush'}
                    onChange={(value) => savePreference({ notifyPush: value }, 'notifyPush')}
                  />
                  <ToggleRow
                    label="Checkpoint updates"
                    description="Notify me each time a shipment crosses a checkpoint."
                    checked={prefs.notifyCheckpoints}
                    busy={savingPref === 'notifyCheckpoints'}
                    onChange={(value) =>
                      savePreference({ notifyCheckpoints: value }, 'notifyCheckpoints')
                    }
                  />
                </div>

                <div className="mt-5 pt-4 border-t border-hairline">
                  <Link
                    href="/notifications"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Open notification centre
                    <ArrowRightIcon className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            )}

            {section === 'security' && (
              <>
                <Card>
                  <Card.Title as="h2" className="mb-1">
                    Sign-in method
                  </Card.Title>
                  <p className="text-sm text-muted mb-4">
                    LorryCarry uses one-time passwords sent to your registered mobile number. There
                    is no password to manage or leak.
                  </p>
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-success-500/5 border border-success-500/20">
                    <CheckIcon
                      className="w-5 h-5 text-success-600 dark:text-success-400 shrink-0"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-body">
                      OTP authentication is active on{' '}
                      <span className="font-mono font-medium text-ink">
                        {profile?.phone ? formatPhone(profile.phone) : 'your number'}
                      </span>
                    </p>
                  </div>
                </Card>

                <Card>
                  <Card.Title as="h2" className="mb-1">
                    Active sessions
                  </Card.Title>
                  <p className="text-sm text-muted mb-4">
                    Signing out everywhere revokes every refresh token issued to your account. You
                    will need to sign in again on each device.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => setSignOutAllOpen(true)}
                    leftIcon={<ArrowLeftOnRectangleIcon className="w-4 h-4" />}
                  >
                    Sign out on all devices
                  </Button>
                  <p className="text-xs text-subtle mt-3">
                    A per-device session list is not available — the platform does not record device
                    metadata.
                  </p>
                </Card>
              </>
            )}

            {section === 'privacy' && prefs && (
              <Card>
                <Card.Title as="h2" className="mb-1">
                  Profile visibility
                </Card.Title>
                <p className="text-sm text-muted mb-4">
                  Contact details are always released only to subscribers who unlock your listing.
                </p>

                <ToggleRow
                  label="Show my profile in marketplace results"
                  description="When off, your listings stay hidden from new searches. Existing bookings are unaffected."
                  checked={prefs.profileVisible}
                  busy={savingPref === 'profileVisible'}
                  onChange={(value) => savePreference({ profileVisible: value }, 'profileVisible')}
                />
              </Card>
            )}

            {section === 'subscription' && (
              <Card>
                <Card.Title as="h2" className="mb-1">
                  Plan & billing
                </Card.Title>
                <div className="flex items-center gap-2.5 mb-4 mt-3">
                  <span className="text-sm text-muted">Current status</span>
                  <Badge variant={profile?.subscription?.isActive ? 'success' : 'neutral'}>
                    {profile?.subscription?.isActive ? 'Active' : 'No active plan'}
                  </Badge>
                </div>
                <p className="text-sm text-muted mb-5 leading-relaxed">
                  A subscription unlocks verified contact details across the marketplace. Payments
                  are processed by Cashfree; LorryCarry never stores your card details.
                </p>
                <Button as={Link} href="/subscribe" variant="primary">
                  {profile?.subscription?.isActive ? 'Manage subscription' : 'View plans'}
                </Button>
              </Card>
            )}

            {section === 'danger' && (
              <Card className="border-danger-500/30">
                <Card.Title as="h2" className="mb-1 text-danger-600 dark:text-danger-400">
                  Danger zone
                </Card.Title>
                <p className="text-sm text-muted mb-5 leading-relaxed">
                  Account deletion is handled manually so that active bookings, payments and
                  statutory records are settled correctly first.
                </p>

                <div className="p-4 rounded-xl border border-danger-500/25 bg-danger-500/5">
                  <h3 className="text-sm font-semibold text-ink mb-1">Delete my account</h3>
                  <p className="text-sm text-muted mb-3.5 leading-relaxed">
                    Contact our support desk to begin closure. We will confirm your identity, settle
                    any open bookings, and remove your personal data.
                  </p>
                  <Button as={Link} href="/help" variant="danger" size="sm">
                    Contact support
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      <Modal
        open={signOutAllOpen}
        onClose={() => setSignOutAllOpen(false)}
        title="Sign out on all devices?"
        size="sm"
      >
        <p className="text-sm text-muted leading-relaxed">
          Every active session will be revoked, including this one. You will be returned to the
          sign-in screen.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 mt-6">
          <Button variant="secondary" onClick={() => setSignOutAllOpen(false)} fullWidth={false}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSignOutAll} loading={signingOutAll}>
            Sign out everywhere
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

/**
 * ToggleRow — labelled switch used across the settings sections.
 * Uses a real checkbox input so it is keyboard operable and announced correctly.
 */
function ToggleRow({
  label,
  description,
  checked,
  busy,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  busy?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3.5 cursor-pointer group">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-muted mt-0.5 leading-relaxed">{description}</span>
      </span>

      <span className="relative shrink-0 mt-0.5">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          disabled={busy}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden="true"
          className={cn(
            'block w-11 h-6 rounded-full transition-colors',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-panel',
            checked ? 'bg-primary-500' : 'bg-wash-strong',
            busy && 'opacity-60'
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-5'
          )}
        />
      </span>
    </label>
  )
}
