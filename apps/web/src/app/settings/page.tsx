'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Cog6ToothIcon,
  BellAlertIcon,
  MagnifyingGlassIcon,
  LanguageIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { usersApi } from '@/lib/api'
import {
  Button,
  Badge,
  GlassPanel,
  Skeleton,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn, formatPhone } from '@/lib/utils'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Account form
  const [name, setName] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)

  // Notification Preferences
  const [notifWhatsApp, setNotifWhatsApp] = useState(true)
  const [notifSMS, setNotifSMS] = useState(true)
  const [notifCheckpoints, setNotifCheckpoints] = useState(true)

  // Search Preferences
  const [defaultRadius, setDefaultRadius] = useState('50')
  const [preferredBodyType, setPreferredBodyType] = useState('All')
  const [autoGps, setAutoGps] = useState(true)

  // Language Preference
  const [language, setLanguage] = useState('en')

  // Theme / Appearance
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await usersApi.getProfile()
        setUser(res.data)
        setName(res.data.name || '')
      } catch {
        setError('Failed to load user profile settings')
        toast.error('Failed to load profile settings')
      } finally {
        setLoading(false)
      }
    }
    loadData()

    if (typeof window !== 'undefined') {
      try {
        const savedNotifs = localStorage.getItem('lc_notif_prefs')
        if (savedNotifs) {
          const parsed = JSON.parse(savedNotifs)
          setNotifWhatsApp(parsed.whatsapp ?? true)
          setNotifSMS(parsed.sms ?? true)
          setNotifCheckpoints(parsed.checkpoints ?? true)
        }

        const savedSearch = localStorage.getItem('lc_search_prefs')
        if (savedSearch) {
          const parsed = JSON.parse(savedSearch)
          setDefaultRadius(parsed.radius || '50')
          setPreferredBodyType(parsed.bodyType || 'All')
          setAutoGps(parsed.autoGps ?? true)
        }

        const savedLang = localStorage.getItem('lc_lang') || 'en'
        setLanguage(savedLang)

        const savedTheme = (localStorage.getItem('lc_theme') as any) || 'dark'
        setTheme(savedTheme)
      } catch (err) {
        console.warn('Could not read saved preferences', err)
      }
    }
  }, [])

  const handleSaveAccount = async () => {
    if (!name.trim()) {
      toast.error('Please enter a valid name')
      return
    }

    try {
      setSavingAccount(true)
      await usersApi.updateProfile({ name: name.trim() })
      toast.success('Account preferences saved')

      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const u = JSON.parse(storedUser)
        u.name = name.trim()
        localStorage.setItem('user', JSON.stringify(u))
      }
    } catch {
      toast.error('Failed to update account preferences')
    } finally {
      setSavingAccount(false)
    }
  }

  const handleSaveNotifications = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'lc_notif_prefs',
        JSON.stringify({
          whatsapp: notifWhatsApp,
          sms: notifSMS,
          checkpoints: notifCheckpoints,
        })
      )
      toast.success('Notification preferences saved')
    }
  }

  const handleSaveSearchPrefs = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'lc_search_prefs',
        JSON.stringify({
          radius: defaultRadius,
          bodyType: preferredBodyType,
          autoGps,
        })
      )
      toast.success('Search preferences saved')
    }
  }

  const handleSelectLanguage = (langCode: string) => {
    setLanguage(langCode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('lc_lang', langCode)
      toast.success(`Language preference set to ${langCode.toUpperCase()}`)
    }
  }

  const handleSelectTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('lc_theme', newTheme)
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else if (newTheme === 'light') {
        document.documentElement.classList.remove('dark')
      } else {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
      toast.success(`Theme mode set to ${newTheme.toUpperCase()}`)
    }
  }

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  ]

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Configure your LorryCarry experience."
    >
      <div className="space-y-6 max-w-4xl mx-auto font-sans">
        
        {loading ? (
          <div className="space-y-4">
            <Skeleton.Card />
            <Skeleton.Card />
          </div>
        ) : error ? (
          <GlassPanel padding="lg" className="text-center text-sm font-sans text-danger-300">
            {error}
          </GlassPanel>
        ) : (
          <>
            {/* 1. ACCOUNT PREFERENCES */}
            <GlassPanel padding="lg" className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <Cog6ToothIcon className="w-5 h-5 text-primary-400" />
                  <h2 className="text-[15px] font-semibold text-white font-sans">
                    Account preferences
                  </h2>
                </div>
                <Link
                  href="/profile"
                  className="text-xs font-semibold text-primary-400 hover:text-primary-300 flex items-center gap-1 font-sans"
                >
                  <span>Edit profile</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block mb-1.5">
                    Full name / business name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Adithya Transport Corp"
                    className="w-full px-4 py-3 bg-surface-950 border border-white/10 rounded-xl text-white font-sans text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block mb-1.5">
                    Registered mobile
                  </label>
                  <div className="px-4 py-3 bg-surface-950 border border-white/10 rounded-xl text-sm font-mono text-white flex items-center justify-between">
                    <span>{user?.phone ? formatPhone(user.phone) : '—'}</span>
                    <Badge variant="success" size="sm">
                      Verified
                    </Badge>
                  </div>
                  <p className="text-[11px] text-surface-500 mt-1 font-sans">
                    Mobile number is permanently bound to WhatsApp OTP login.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  loading={savingAccount}
                  onClick={handleSaveAccount}
                  className="shadow-glow-primary"
                >
                  Save changes
                </Button>
              </div>
            </GlassPanel>

            {/* 2. NOTIFICATION PREFERENCES */}
            <GlassPanel padding="lg" className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <BellAlertIcon className="w-5 h-5 text-amber-400" />
                  <h2 className="text-[15px] font-semibold text-white font-sans">
                    Notification preferences
                  </h2>
                </div>
                <Badge variant="warning" size="sm">
                  Active
                </Badge>
              </div>

              <div className="space-y-3">
                <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-surface-950/60 border border-white/5 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-white block font-sans">
                      WhatsApp operational alerts
                    </span>
                    <span id="notif-whatsapp-desc" className="text-[11px] text-surface-400 font-sans block leading-relaxed">
                      Receive operational alerts through WhatsApp for load matches, quote responses, and booking updates.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifWhatsApp}
                    aria-describedby="notif-whatsapp-desc"
                    onChange={(e) => setNotifWhatsApp(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-500 border-white/20 bg-surface-950 focus:ring-primary-500 mt-1 cursor-pointer"
                  />
                </label>

                <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-surface-950/60 border border-white/5 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-white block font-sans">
                      SMS fallback
                    </span>
                    <span id="notif-sms-desc" className="text-[11px] text-surface-400 font-sans block leading-relaxed">
                      Receive supported operational alerts through SMS if mobile data is disabled or offline.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSMS}
                    aria-describedby="notif-sms-desc"
                    onChange={(e) => setNotifSMS(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-500 border-white/20 bg-surface-950 focus:ring-primary-500 mt-1 cursor-pointer"
                  />
                </label>

                <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-surface-950/60 border border-white/5 cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-white block font-sans">
                      Checkpoint milestone notifications
                    </span>
                    <span id="notif-checkpoint-desc" className="text-[11px] text-surface-400 font-sans block leading-relaxed">
                      Receive shipment and 5-stage transit checkpoint notifications for active dispatches.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifCheckpoints}
                    aria-describedby="notif-checkpoint-desc"
                    onChange={(e) => setNotifCheckpoints(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-500 border-white/20 bg-surface-950 focus:ring-primary-500 mt-1 cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="secondary" size="sm" onClick={handleSaveNotifications} className="border-white/10 hover:border-white/20">
                  Save preferences
                </Button>
              </div>
            </GlassPanel>

            {/* 3. SEARCH PREFERENCES */}
            <GlassPanel padding="lg" className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <MagnifyingGlassIcon className="w-5 h-5 text-primary-400" />
                  <h2 className="text-[15px] font-semibold text-white font-sans">
                    Search preferences
                  </h2>
                </div>
                <span className="text-[11px] text-surface-500 font-sans">PostGIS defaults</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block mb-1.5">
                    Default search radius
                  </label>
                  <select
                    value={defaultRadius}
                    onChange={(e) => setDefaultRadius(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-950 border border-white/10 rounded-xl text-white font-sans text-sm focus:outline-none focus:border-primary-500"
                  >
                    <option value="25">25 km (Local metro)</option>
                    <option value="50">50 km (Standard regional)</option>
                    <option value="100">100 km (Inter-city corridor)</option>
                    <option value="250">250 km (State-wide logistics)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans block mb-1.5">
                    Preferred body type
                  </label>
                  <select
                    value={preferredBodyType}
                    onChange={(e) => setPreferredBodyType(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-950 border border-white/10 rounded-xl text-white font-sans text-sm focus:outline-none focus:border-primary-500"
                  >
                    <option value="All">All vehicle types</option>
                    <option value="Open">Open (Tarpaulin / General freight)</option>
                    <option value="Container">Container (Closed freight)</option>
                    <option value="OpenBody">Open body (Heavy flatbed trailer)</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGps}
                  onChange={(e) => setAutoGps(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-500 border-white/20 bg-surface-950 focus:ring-primary-500"
                />
                <span className="text-sm text-surface-300 font-sans">
                  Auto-initialize search via browser GPS
                </span>
              </label>

              <div className="pt-2 flex justify-end">
                <Button variant="secondary" size="sm" onClick={handleSaveSearchPrefs} className="border-white/10 hover:border-white/20">
                  Save preferences
                </Button>
              </div>
            </GlassPanel>

            {/* 4. LANGUAGE PREFERENCE */}
            <GlassPanel padding="lg" className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <LanguageIcon className="w-5 h-5 text-purple-400" />
                  <h2 className="text-[15px] font-semibold text-white font-sans">
                    Language
                  </h2>
                </div>
                <span className="text-[11px] text-surface-500 font-sans">Supported locales</span>
              </div>

              <p className="text-xs font-sans text-surface-400">
                Language preference controls account communications and localized notification headers.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {languages.map((l) => {
                  const isSelected = language === l.code
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => handleSelectLanguage(l.code)}
                      className={cn(
                        'p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer',
                        isSelected
                          ? 'border-primary-500 bg-primary-950/40 shadow-glow-primary'
                          : 'border-white/10 hover:border-white/20 bg-surface-950/60'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-white font-sans">
                          {l.label}
                        </span>
                        {isSelected && <CheckIcon className="w-4 h-4 text-primary-400 shrink-0" />}
                      </div>
                      <span className="text-sm font-medium text-surface-400">
                        {l.native}
                      </span>
                    </button>
                  )
                })}
              </div>
            </GlassPanel>

            {/* 5. THEME PREFERENCE */}
            <GlassPanel padding="lg" className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <SunIcon className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-[15px] font-semibold text-white font-sans">
                    Interface theme
                  </h2>
                </div>
                <span className="text-[11px] text-surface-500 font-sans">Default: Dark</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'light', label: 'Light', icon: SunIcon },
                  { key: 'dark', label: 'Dark', icon: MoonIcon },
                  { key: 'system', label: 'System', icon: ComputerDesktopIcon },
                ].map((t) => {
                  const Icon = t.icon
                  const isSelected = theme === t.key
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => handleSelectTheme(t.key as any)}
                      className={cn(
                        'p-4 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all cursor-pointer',
                        isSelected
                          ? 'border-primary-500 bg-primary-950/40 text-primary-400 shadow-glow-primary'
                          : 'border-white/10 text-surface-400 hover:border-white/20'
                      )}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs font-semibold font-sans">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </GlassPanel>

            {/* 6. SECURITY PANEL */}
            <GlassPanel padding="lg" className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-[15px] font-semibold text-white font-sans">Security controls</h3>
                </div>
                <Link
                  href="/security"
                  className="px-4 py-2 rounded-xl bg-primary-500/20 border border-primary-500/30 text-primary-300 hover:bg-primary-500/30 font-semibold font-sans transition-all inline-flex items-center gap-1.5"
                >
                  <span>Open security</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
              <p className="text-surface-400 leading-relaxed font-sans">
                Active session revocations, token rotation status, and device authorizations are managed securely inside the Security Center.
              </p>
            </GlassPanel>
          </>
        )}

      </div>
    </DashboardLayout>
  )
}
