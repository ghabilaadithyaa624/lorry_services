'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  PhoneIcon,
  IdentificationIcon,
  TruckIcon,
  ArchiveBoxIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CheckBadgeIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ArrowRightIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline'
import { DashboardLayout } from '@/components/layout'
import { usersApi } from '@/lib/api'
import { Badge, GlassPanel, Skeleton } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn, formatPhone } from '@/lib/utils'
import { getDashboardForRole, getRoleLabel, isVehicleSideRole } from '@/lib/roles'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await usersApi.getProfile()
      setProfile(res.data)
      setNameInput(res.data.name || '')
    } catch {
      toast.error('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      toast.error('Please enter a valid name')
      return
    }

    try {
      setSavingName(true)
      await usersApi.updateProfile({ name: nameInput.trim() })
      toast.success('Profile name updated successfully')
      setEditingName(false)
      
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const u = JSON.parse(storedUser)
        u.name = nameInput.trim()
        localStorage.setItem('user', JSON.stringify(u))
      }
      
      fetchProfile()
    } catch {
      toast.error('Failed to update profile name')
    } finally {
      setSavingName(false)
    }
  }

  const isTruckOwner = isVehicleSideRole(profile?.role)
  const isAdmin = profile?.role === 'admin'

  const score = profile?.profileCompletion?.score || 50
  const missingSteps = profile?.profileCompletion?.missingSteps || []

  return (
    <DashboardLayout
      title="Account & profile"
      subtitle="Identity credentials, account maturity, and trust verification status."
    >
      <div className="space-y-6 max-w-5xl mx-auto font-sans">
        
        {/* Profile Header Glass Panel */}
        <GlassPanel padding="lg" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary-500 text-white font-mono font-black text-2xl sm:text-3xl flex items-center justify-center shadow-glow-primary shrink-0 border border-primary-400/30">
                {loading ? '...' : profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'LC'}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Enter full name / company"
                        className="px-3 py-1.5 text-base font-bold bg-surface-950 border border-primary-500 rounded-xl text-white outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        disabled={savingName}
                        className="p-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 cursor-pointer"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(false)
                          setNameInput(profile?.name || '')
                        }}
                        className="p-2 rounded-xl bg-surface-950 text-surface-400 hover:text-white cursor-pointer"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-white font-sans">
                        {loading ? <Skeleton className="h-8 w-32" /> : profile?.name || 'LorryCarry Partner'}
                      </h1>
                      <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-white/5 transition-colors cursor-pointer"
                        title="Edit name"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <Badge
                    variant={isTruckOwner ? 'info' : isAdmin ? 'danger' : 'primary'}
                    size="sm"
                    className="capitalize"
                  >
                    {getRoleLabel(profile?.role)}
                  </Badge>
                </div>

                <p className="text-xs text-surface-300 flex items-center gap-2">
                  <PhoneIcon className="w-3.5 h-3.5 text-primary-400" />
                  <span>{profile?.phone ? formatPhone(profile.phone) : '—'}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold ml-1">
                    <CheckBadgeIcon className="w-3.5 h-3.5" /> WhatsApp OTP Verified
                  </span>
                </p>

                <p className="text-xs text-surface-400">
                  Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '2026'}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
              <Link
                href="/settings"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-sm font-sans font-semibold text-white transition-colors"
              >
                Account settings
              </Link>
              <Link
                href="/security"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-950 border border-white/10 hover:border-white/20 text-sm font-sans font-semibold text-white transition-colors"
              >
                Security & sessions
              </Link>
              {isTruckOwner && (
                <Link
                  href="/documents"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500/20 border border-primary-500/30 text-xs font-bold text-primary-300 hover:bg-primary-500/30 transition-colors"
                >
                  <DocumentCheckIcon className="w-4 h-4" />
                  KYC Documents
                </Link>
              )}
            </div>
          </div>

          {/* Account Maturity Index Progress Bar */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-primary-400" />
                <span className="text-[15px] font-semibold text-white font-sans">
                  Account maturity
                </span>
              </div>
              <span className="text-sm font-black text-primary-400">
                {score}% Complete
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-surface-950 p-0.5 border border-white/5 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 shadow-glow-primary',
                  score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-primary-500' : 'bg-amber-400'
                )}
                style={{ width: `${score}%` }}
              />
            </div>

            {missingSteps.length > 0 && (
              <div className="p-4 bg-amber-950/40 rounded-2xl border border-amber-500/30 text-xs space-y-1.5">
                <span className="font-bold text-amber-300 block">
                  Next Steps to 100% Verified Profile:
                </span>
                <ul className="space-y-1 text-amber-200/80 pl-4 list-disc">
                  {missingSteps.map((step: string, i: number) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </GlassPanel>

        {/* Operational Credentials & Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
          {/* Operational Credentials */}
          <GlassPanel padding="lg" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <IdentificationIcon className="w-5 h-5 text-primary-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Verified Credentials
                </h2>
              </div>
              <Badge variant="success" size="sm">
                Verified
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-surface-400">Account Role</span>
                <span className="font-bold text-white uppercase">
                  {profile?.role?.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-surface-400">Primary Mobile</span>
                <span className="font-bold text-white">
                  {profile?.phone ? formatPhone(profile.phone) : '—'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-surface-400">Authentication</span>
                <span className="font-bold text-white">
                  WhatsApp OTP Gateway
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-surface-400">Business Verification</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheckIcon className="w-4 h-4" />
                  {isTruckOwner
                    ? profile?.verification?.fleetStatus || 'Pending RTO Audit'
                    : 'Active Cargo Shipper'}
                </span>
              </div>
            </div>
          </GlassPanel>

          {/* Portfolio Volume & Subscription */}
          <GlassPanel padding="lg" className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                {isTruckOwner ? (
                  <TruckIcon className="w-5 h-5 text-blue-400" />
                ) : (
                  <ArchiveBoxIcon className="w-5 h-5 text-primary-400" />
                )}
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  {isTruckOwner ? 'Fleet Portfolio Overview' : 'Shipper Activity Volume'}
                </h2>
              </div>
              <Link
                href={isTruckOwner ? getDashboardForRole(profile?.role) : '/my-loads'}
                className="text-xs font-bold text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                <span>View Dashboard</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {isTruckOwner ? (
                <>
                  <div className="p-3.5 bg-surface-950/80 rounded-2xl border border-white/5">
                    <span className="text-[11px] text-surface-400 block">Registered Trucks</span>
                    <span className="text-xl font-black text-white mt-1 block">
                      {profile?.stats?.totalTrucks || 0}
                    </span>
                  </div>
                  <div className="p-3.5 bg-surface-950/80 rounded-2xl border border-white/5">
                    <span className="text-[11px] text-surface-400 block">Completed Trips</span>
                    <span className="text-xl font-black text-white mt-1 block">
                      {profile?.stats?.totalBookings || 0}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 bg-surface-950/80 rounded-2xl border border-white/5">
                    <span className="text-[11px] text-surface-400 block">Posted Loads</span>
                    <span className="text-xl font-black text-white mt-1 block">
                      {profile?.stats?.totalLoads || 0}
                    </span>
                  </div>
                  <div className="p-3.5 bg-surface-950/80 rounded-2xl border border-white/5">
                    <span className="text-[11px] text-surface-400 block">Active Bookings</span>
                    <span className="text-xl font-black text-white mt-1 block">
                      {profile?.stats?.totalBookings || 0}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Direct Transporter Pass Widget */}
            <div className="p-4 rounded-2xl bg-surface-950/80 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  Transporter Contact Pass
                </span>
                <span className="text-[11px] text-surface-400">
                  {profile?.subscription?.isActive
                    ? `Active Plan (${profile.subscription.plan})`
                    : 'Unlimited direct driver phone & WhatsApp reveal'}
                </span>
              </div>
              <Link
                href="/subscribe"
                className="px-4 py-2 rounded-xl bg-primary-500 hover:from-primary-600 hover:to-primary-700 text-white text-xs font-bold transition-all shadow-glow-primary"
              >
                {profile?.subscription?.isActive ? 'Manage' : 'Upgrade'}
              </Link>
            </div>
          </GlassPanel>
        </div>

      </div>
    </DashboardLayout>
  )
}
