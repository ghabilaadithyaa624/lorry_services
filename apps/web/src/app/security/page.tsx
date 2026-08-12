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
import {
  Badge,
  Button,
  GlassPanel,
  StatusDot,
  AlertBanner,
  Modal,
  Skeleton,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { formatPhone } from '@/lib/utils'

export default function SecurityPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [loggingOutAll, setLoggingOutAll] = useState(false)
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false)
  const [clientDetails, setClientDetails] = useState<any>({
    userAgent: '',
    platform: '',
    language: '',
  })

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await usersApi.getProfile()
      setUser(res.data)
    } catch {
      setError('Failed to load security profile')
      toast.error('Failed to load security profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
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

  return (
    <DashboardLayout
      title="Security"
      subtitle="Manage your active logins, token rotation, and credentials."
    >
      <div className="space-y-6 max-w-4xl mx-auto font-sans">
        
        {/* Prominent Security Status Banner */}
        {loading ? (
          <Skeleton.Card />
        ) : error ? (
          <AlertBanner variant="danger" title="Security profile error">
            {error}
          </AlertBanner>
        ) : (
          <GlassPanel padding="lg" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <StatusDot variant="active" pulse />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-semibold text-white font-sans">
                      Account protected
                    </h2>
                    <Badge variant="success" size="sm">
                      Protected
                    </Badge>
                  </div>
                  <p className="text-xs text-surface-400 mt-0.5 font-sans">
                    WhatsApp OTP authenticated · Cryptographic refresh token rotation active
                  </p>
                </div>
              </div>

              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 shrink-0 font-sans">
                <ShieldCheckIcon className="w-4 h-4" /> Cryptographically guarded
              </span>
            </div>
          </GlassPanel>
        )}

        {/* Current Active Session Card */}
        <GlassPanel padding="lg" className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <DevicePhoneMobileIcon className="w-5 h-5 text-primary-400" />
              <h2 className="text-[15px] font-semibold text-white font-sans">
                Active session
              </h2>
            </div>
            <Badge variant="success" size="sm">
              Current
            </Badge>
          </div>

          <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/5 space-y-3 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-white/5">
              <span className="text-surface-400">Environment & Browser</span>
              <span className="text-white truncate max-w-md font-bold">
                {clientDetails.userAgent || 'Web Browser'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-surface-400">Authenticated Mobile Identity</span>
              <span className="font-bold text-white">
                {user?.phone ? formatPhone(user.phone) : '—'}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-surface-400">Token Architecture</span>
              <span className="text-surface-300">
                Rotating Refresh Token Family + Short-Lived Access JWT
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-surface-400">Replay Protection</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckBadgeIcon className="w-4 h-4" /> Automatic Family Invalidation Active
              </span>
            </div>
          </div>

          {/* Session Actions */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="danger"
              size="sm"
              loading={loggingOut}
              onClick={handleLogoutCurrent}
              leftIcon={<ArrowRightOnRectangleIcon className="w-4 h-4" />}
            >
              Log out current session
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowLogoutAllModal(true)}
              leftIcon={<KeyIcon className="w-4 h-4 text-primary-400" />}
              className="font-bold text-xs border-white/10 hover:border-white/20"
            >
              REVOKE ALL OTHER SESSIONS
            </Button>
          </div>
        </GlassPanel>

        {/* Security Architecture Information */}
        <GlassPanel padding="lg" className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 font-mono">
            <LockClosedIcon className="w-5 h-5 text-primary-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Logistics Infrastructure Security
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-surface-950/60 border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white">
                <SignalIcon className="w-4 h-4 text-primary-400" />
                <span>SHA-256 Hashed OTP Authentication</span>
              </div>
              <p className="text-surface-400 leading-relaxed text-[11px]">
                One-Time Passwords are hashed before persistence with strict 10-minute expirations and brute-force throttling.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-950/60 border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white">
                <KeyIcon className="w-4 h-4 text-primary-400" />
                <span>Token Family Revocation</span>
              </div>
              <p className="text-surface-400 leading-relaxed text-[11px]">
                If an expired or stolen refresh token is replayed, our backend invalidates the entire token family automatically.
              </p>
            </div>
          </div>
        </GlassPanel>

        {/* Destructive Action Modal: Logout All Devices Confirmation */}
        <Modal
          open={showLogoutAllModal}
          onClose={() => setShowLogoutAllModal(false)}
          title="Revoke All Active Sessions?"
          size="md"
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-danger-950/40 border border-danger-500/30 text-danger-300 flex items-start gap-2.5">
              <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                This will terminate all active logins and refresh token sessions across any browsers or mobile devices. You will need to request a new WhatsApp OTP to sign back in.
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
                className="font-bold shadow-glow-primary text-xs"
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
