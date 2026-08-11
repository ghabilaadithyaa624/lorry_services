'use client'

import React, { useState, useEffect } from 'react'
import {
  Cog6ToothIcon,
  BellAlertIcon,
  MagnifyingGlassIcon,
  LanguageIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { usersApi } from '@/lib/api'
import { Button, Badge, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn, formatPhone } from '@/lib/utils'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Account form
  const [name, setName] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)

  // Notification Preferences
  const [notifWhatsApp, setNotifWhatsApp] = useState(true)
  const [notifSMS, setNotifSMS] = useState(true)
  const [notifCheckpoints, setNotifCheckpoints] = useState(true)
  const [notifMarketing, setNotifMarketing] = useState(false)

  // Search Preferences
  const [defaultRadius, setDefaultRadius] = useState('50')
  const [preferredBodyType, setPreferredBodyType] = useState('All')
  const [autoGps, setAutoGps] = useState(true)

  // Language Preference
  const [language, setLanguage] = useState('en')

  // Theme / Appearance
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    // Load user profile
    const loadData = async () => {
      try {
        setLoading(true)
        const res = await usersApi.getProfile()
        setUser(res.data)
        setName(res.data.name || '')
      } catch {
        toast.error('Failed to load profile settings')
      } finally {
        setLoading(false)
      }
    }
    loadData()

    // Load persisted client preferences
    if (typeof window !== 'undefined') {
      try {
        const savedNotifs = localStorage.getItem('lc_notif_prefs')
        if (savedNotifs) {
          const parsed = JSON.parse(savedNotifs)
          setNotifWhatsApp(parsed.whatsapp ?? true)
          setNotifSMS(parsed.sms ?? true)
          setNotifCheckpoints(parsed.checkpoints ?? true)
          setNotifMarketing(parsed.marketing ?? false)
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

        const savedTheme = (localStorage.getItem('lc_theme') as any) || 'system'
        setTheme(savedTheme)
      } catch (err) {
        console.warn('Could not read saved preferences', err)
      }
    }
  }, [])

  const handleSaveAccount = async () => {
    try {
      setSavingAccount(true)
      await usersApi.updateProfile({ name: name.trim() })
      toast.success('Account information updated successfully')

      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const u = JSON.parse(storedUser)
        u.name = name.trim()
        localStorage.setItem('user', JSON.stringify(u))
      }
    } catch {
      toast.error('Failed to update account details')
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
          marketing: notifMarketing,
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
      toast.success(`Language set to ${langCode.toUpperCase()}`)
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
      toast.success(`Theme mode updated to ${newTheme}`)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Account Settings" subtitle="Preferences and operations configuration">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
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
      title="Settings & Preferences"
      subtitle="Configure your workspace, notifications, search defaults, and interface"
    >
      <div className="space-y-8 max-w-4xl">
        {/* 1. Account Settings Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <Cog6ToothIcon className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
                Account Identity & Contact
              </h2>
            </div>
            <span className="text-[11px] font-bold text-surface-400">Server Persisted</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300 block mb-1.5">
                Full Name / Business Trading Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Adithya Transport Corp"
                className="w-full px-3.5 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-surface-900 dark:text-white outline-hidden focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300 block mb-1.5">
                Registered Mobile Number
              </label>
              <div className="px-3.5 py-2.5 bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-mono font-bold text-surface-600 dark:text-surface-300 flex items-center justify-between">
                <span>{user?.phone ? formatPhone(user.phone) : '—'}</span>
                <span className="text-[10px] uppercase font-bold text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/60 px-2 py-0.5 rounded-md">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-surface-400 mt-1">
                Phone number is permanent and serves as your primary OTP login key.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              loading={savingAccount}
              onClick={handleSaveAccount}
            >
              Save Account Changes
            </Button>
          </div>
        </div>

        {/* 2. Notification Preferences Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <BellAlertIcon className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
                Notification Channels & Alerts
              </h2>
            </div>
            <Badge variant="warning" size="sm">
              Live Channels
            </Badge>
          </div>

          <div className="space-y-4">
            <label className="flex items-start justify-between gap-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-surface-900 dark:text-white block">
                  WhatsApp OTP & Consignment Alerts (Primary)
                </span>
                <span className="text-[11px] text-surface-500 dark:text-surface-400 block leading-relaxed">
                  Receive instant WhatsApp messages via Meta Cloud API for booking status changes, direct contact reveals, and checkpoint milestones.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifWhatsApp}
                onChange={(e) => setNotifWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-surface-300 mt-1 cursor-pointer"
              />
            </label>

            <label className="flex items-start justify-between gap-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-surface-900 dark:text-white block">
                  SMS Fallback Gateway (MSG91)
                </span>
                <span className="text-[11px] text-surface-500 dark:text-surface-400 block leading-relaxed">
                  Automatically dispatch SMS notifications if WhatsApp delivery fails or is unreachable in low connectivity transit areas.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifSMS}
                onChange={(e) => setNotifSMS(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-surface-300 mt-1 cursor-pointer"
              />
            </label>

            <label className="flex items-start justify-between gap-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-surface-900 dark:text-white block">
                  5-Stage Transit Checkpoint Milestone Crossing Alerts
                </span>
                <span className="text-[11px] text-surface-500 dark:text-surface-400 block leading-relaxed">
                  Push instant geofenced alerts when trucks cross intermediate highway hubs (e.g. Pune, Satara, Belagavi, Hubli, Bangalore).
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifCheckpoints}
                onChange={(e) => setNotifCheckpoints(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-surface-300 mt-1 cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="secondary" size="sm" onClick={handleSaveNotifications}>
              Save Notification Preferences
            </Button>
          </div>
        </div>

        {/* 3. Search & Marketplace Defaults Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <MagnifyingGlassIcon className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
                Search & Discovery Defaults
              </h2>
            </div>
            <span className="text-[11px] font-bold text-surface-400">PostGIS Filter</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300 block mb-1.5">
                Default Service Radius (PostGIS ST_DWithin)
              </label>
              <select
                value={defaultRadius}
                onChange={(e) => setDefaultRadius(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-surface-900 dark:text-white outline-hidden focus:ring-2 focus:ring-primary-500"
              >
                <option value="25">25 km (Local Metro)</option>
                <option value="50">50 km (Standard Regional)</option>
                <option value="100">100 km (Inter-City Corridor)</option>
                <option value="250">250 km (State-wide Logistics)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300 block mb-1.5">
                Default Body Type Filter
              </label>
              <select
                value={preferredBodyType}
                onChange={(e) => setPreferredBodyType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-surface-900 dark:text-white outline-hidden focus:ring-2 focus:ring-primary-500"
              >
                <option value="All">All Vehicle Configurations</option>
                <option value="Open">Open Body (Tarpaulin / General Freight)</option>
                <option value="Container">Closed Container (FMCG / High Value)</option>
                <option value="OpenBody">Heavy Trailer / Open Body Flatbed</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={autoGps}
              onChange={(e) => setAutoGps(e.target.checked)}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-surface-300"
            />
            <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
              Automatically detect GPS coordinates upon opening search page (via Mappls Reverse Geocoding)
            </span>
          </label>

          <div className="pt-2 flex justify-end">
            <Button variant="secondary" size="sm" onClick={handleSaveSearchPrefs}>
              Save Search Preferences
            </Button>
          </div>
        </div>

        {/* 4. Language & Regional Preference Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <LanguageIcon className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
                Language Preference
              </h2>
            </div>
            <span className="text-[11px] font-bold text-surface-400">Indian Languages</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {languages.map((l) => {
              const isSelected = language === l.code
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleSelectLanguage(l.code)}
                  className={cn(
                    'p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer',
                    isSelected
                      ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/30 shadow-xs'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 bg-surface-50/50 dark:bg-surface-800/40'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-surface-900 dark:text-white">
                      {l.label}
                    </span>
                    {isSelected && <CheckIcon className="w-4 h-4 text-primary-600 shrink-0" />}
                  </div>
                  <span className="text-sm font-medium text-surface-500 dark:text-surface-400">
                    {l.native}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 5. Appearance / Theme Mode Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <SunIcon className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
                Appearance & Theme
              </h2>
            </div>
            <span className="text-[11px] font-bold text-surface-400">UI Display</span>
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
                    'p-4 rounded-xl border text-center flex flex-col items-center gap-2 transition-all cursor-pointer',
                    isSelected
                      ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 shadow-xs'
                      : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-bold">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 6. Privacy & Data Governance Information */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-surface-800">
            <LockClosedIcon className="w-5 h-5 text-primary-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
              Data Privacy & Direct Contact Policy
            </h2>
          </div>

          <div className="space-y-2 text-xs text-surface-600 dark:text-surface-400 leading-relaxed">
            <p>
              • <strong>PII Masking:</strong> Contact numbers and vehicle registration numbers are masked across public search results.
            </p>
            <p>
              • <strong>Verified Reveal:</strong> Direct WhatsApp and phone contact is only unlocked for authenticated users with an active Transporter Contact Pass.
            </p>
            <p>
              • <strong>Zero Broker Intermediaries:</strong> LorryCarry does not sell lead lists or permit third-party broker spam.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
