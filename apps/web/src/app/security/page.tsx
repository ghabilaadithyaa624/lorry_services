'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  ArrowRightOnRectangleIcon,
  KeyIcon,
  LockClosedIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { authApi, usersApi } from '@/lib/api'
import { Button, Badge, Modal, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatPhone } from '@/lib/utils'

export default function SecurityPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [loggingOutAll, setLoggingOutAll] = useState(false)
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false)
  const [clientDetails, setClientDetails] = useState<any>({
    userAgent: '',
    platform: '',
    language: '',
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        const res = await usersApi.getProfile()
        setUser(res.data)
      } catch {
        toast.error('Failed to load security profile')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()

    if (typeof window !== 'undefined') {
      setClientDetails({
        userAgent: navigator.userAgent,
        platform: navigator.platform || 'Desktop / Mobile',
        language: navigator.language,
      })
    }
  }, [])

  const handleLogoutCurrent = async () => {
    try {
      setLoggingOut(true)
      await authApi.logout()
      toast.success('Logged out successfully')
      router.push('/login')
    } catch {
      toast.error('Logout failed')
    } finally {
      setLoggingOut(false)
    }
  }

  const handleLogoutAllDevices = async () => {
    try {
      setLoggingOutAll(true)
      await authApi.logoutAll()
      toast.success('All active sessions revoked across all devices')
      setShowLogoutAllModal(false)
      router.push('/login')
    } catch {
      toast.error('Failed to revoke all sessions')
    } finally {
      setLoggingOutAll(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Account Security" subtitle="Active sessions and authentication protection">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Security & Session Management"
      subtitle="Manage your active logins, cryptographic token rotation, and credentials security"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Security Health Banner */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success-50 dark:bg-success-950/60 text-success-600 dark:text-success-400 flex items-center justify-center shrink-0">
              <ShieldCheckIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-surface-900 dark:text-white">
                  Account Protection Active
                </h2>
                <Badge variant="success" size="sm">
                  Optimal
                </Badge>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">
                Your account is protected by WhatsApp Cloud OTP verification and 30-day rotating cryptographic refresh tokens with reuse prevention.
              </p>
            </div>
          </div>
        </div>

        {/* Current Active Session Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <DevicePhoneMobileIcon className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
                Current Active Session
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success-600 dark:text-success-400">
              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              Active Now
            </span>
          </div>

          <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-700 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-surface-200/60 dark:border-surface-700">
              <span className="text-surface-500 font-medium">Device & Browser Environment</span>
              <span className="font-mono text-surface-800 dark:text-surface-200 truncate max-w-md">
                {clientDetails.userAgent || 'Web Browser'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-surface-500 font-medium">Authenticated Phone Identity</span>
              <span className="font-mono font-bold text-surface-900 dark:text-white">
                {user?.phone ? formatPhone(user.phone) : '—'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-surface-500 font-medium">Token Lifecycle</span>
              <span className="font-medium text-surface-800 dark:text-surface-200">
                15-Min Access Token + 30-Day Rotating Refresh Token (Redis JTI)
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-surface-500 font-medium">Session Protection</span>
              <span className="text-success-600 dark:text-success-400 font-bold flex items-center gap-1">
                <CheckBadgeIcon className="w-4 h-4" /> Automatic Reuse Invalidation Active
              </span>
            </div>
          </div>

          {/* Session Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="danger"
              size="sm"
              loading={loggingOut}
              onClick={handleLogoutCurrent}
              leftIcon={<ArrowRightOnRectangleIcon className="w-4 h-4" />}
            >
              Log Out This Session
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowLogoutAllModal(true)}
              leftIcon={<KeyIcon className="w-4 h-4" />}
            >
              Revoke All Device Sessions
            </Button>
          </div>
        </div>

        {/* Security Architecture & Guidelines Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100 dark:border-surface-800">
            <LockClosedIcon className="w-5 h-5 text-primary-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
              Logistics Security Architecture
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-100 dark:border-surface-700 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-surface-900 dark:text-white">
                <SignalIcon className="w-4 h-4 text-primary-500" />
                <span>SHA-256 Hashed OTP Store</span>
              </div>
              <p className="text-surface-500 dark:text-surface-400 leading-relaxed text-[11px]">
                One-Time Passwords are cryptographic hashes stored in Redis with 10-minute expiry and max 3 failed attempt triggers to prevent brute-force attacks.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-100 dark:border-surface-700 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-surface-900 dark:text-white">
                <KeyIcon className="w-4 h-4 text-primary-500" />
                <span>Token Family Revocation</span>
              </div>
              <p className="text-surface-500 dark:text-surface-400 leading-relaxed text-[11px]">
                If an expired or revoked refresh token is replayed, our backend immediately invalidates the entire token family, safeguarding your account from token theft.
              </p>
            </div>
          </div>
        </div>

        {/* Modal: Logout All Devices Confirmation */}
        <Modal
          open={showLogoutAllModal}
          onClose={() => setShowLogoutAllModal(false)}
          title="Revoke All Active Sessions?"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/60 text-xs text-danger-700 dark:text-danger-300 flex items-start gap-2.5">
              <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                This will terminate all active logins and refresh token sessions across any browsers or mobile devices. You will need to request a new OTP to log back in.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogoutAllModal(false)}
                disabled={loggingOutAll}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={loggingOutAll}
                onClick={handleLogoutAllDevices}
              >
                Yes, Revoke All Devices
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
