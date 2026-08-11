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
import { Badge, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn, formatPhone } from '@/lib/utils'

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
      toast.success('Name updated successfully')
      setEditingName(false)
      
      // Update local storage user session
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const u = JSON.parse(storedUser)
        u.name = nameInput.trim()
        localStorage.setItem('user', JSON.stringify(u))
      }
      
      fetchProfile()
    } catch {
      toast.error('Failed to update name')
    } finally {
      setSavingName(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="User Profile" subtitle="Account verification and operations credentials">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  const isTruckOwner = profile?.role === 'truck_owner'
  const isAdmin = profile?.role === 'admin'

  const score = profile?.profileCompletion?.score || 50
  const missingSteps = profile?.profileCompletion?.missingSteps || []

  return (
    <DashboardLayout
      title="User Profile"
      subtitle="Manage your identity, account maturity index, and marketplace credentials"
    >
      <div className="space-y-6 max-w-5xl">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200/90 dark:border-surface-800 p-6 sm:p-8 shadow-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md shrink-0">
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'LC'}
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
                        className="px-3 py-1.5 text-base font-bold bg-surface-50 dark:bg-surface-800 border border-primary-400 rounded-lg text-surface-900 dark:text-white outline-hidden focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={savingName}
                        className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false)
                          setNameInput(profile?.name || '')
                        }}
                        className="p-1.5 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black text-surface-900 dark:text-white">
                        {profile?.name || 'Transporter / Shipper'}
                      </h1>
                      <button
                        onClick={() => setEditingName(true)}
                        className="p-1 rounded-md text-surface-400 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                        title="Edit name"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <Badge
                    variant={isTruckOwner ? 'info' : isAdmin ? 'danger' : 'primary'}
                    size="sm"
                    className="capitalize font-bold"
                  >
                    {isTruckOwner ? 'Lorry Owner' : isAdmin ? 'Administrator' : 'Load Owner'}
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 flex items-center gap-2">
                  <PhoneIcon className="w-3.5 h-3.5" />
                  <span>{profile?.phone ? formatPhone(profile.phone) : '—'}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-success-600 dark:text-success-400 font-semibold ml-1">
                    <CheckBadgeIcon className="w-3.5 h-3.5" /> OTP Verified
                  </span>
                </p>

                <p className="text-xs text-surface-400">
                  Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '2026'}
                </p>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
              <Link
                href="/settings"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-xs font-bold text-surface-700 dark:text-surface-200 transition-colors"
              >
                Account Settings
              </Link>
              {isTruckOwner && (
                <Link
                  href="/documents"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-xs font-bold text-primary-600 dark:text-primary-400 transition-colors"
                >
                  <DocumentCheckIcon className="w-4 h-4" />
                  KYC Documents
                </Link>
              )}
            </div>
          </div>

          {/* Profile Completion Index Bar */}
          <div className="mt-8 pt-6 border-t border-surface-100 dark:border-surface-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-primary-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300">
                  Account Maturity Index
                </span>
              </div>
              <span className="font-mono text-sm font-black text-primary-600 dark:text-primary-400">
                {score}% Complete
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  score >= 80 ? 'bg-success-500' : score >= 60 ? 'bg-primary-500' : 'bg-warning-500'
                )}
                style={{ width: `${score}%` }}
              />
            </div>

            {missingSteps.length > 0 && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/50 text-xs space-y-1.5">
                <span className="font-bold text-amber-800 dark:text-amber-300 block">
                  Next Steps to 100% Verified Profile:
                </span>
                <ul className="space-y-1 text-amber-700 dark:text-amber-400 pl-4 list-disc">
                  {missingSteps.map((step: string, i: number) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Role-Specific Detail Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business & Operations Information Card */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
              <div className="flex items-center gap-2">
                <IdentificationIcon className="w-5 h-5 text-primary-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
                  Operational Credentials
                </h2>
              </div>
              <Badge variant="success" size="sm">
                Verified
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800/60">
                <span className="text-surface-500">Account Type</span>
                <span className="font-bold text-surface-900 dark:text-white capitalize">
                  {profile?.role?.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800/60">
                <span className="text-surface-500">Primary Mobile</span>
                <span className="font-mono font-bold text-surface-900 dark:text-white">
                  {profile?.phone ? formatPhone(profile.phone) : '—'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800/60">
                <span className="text-surface-500">Auth Method</span>
                <span className="font-medium text-surface-800 dark:text-surface-200">
                  WhatsApp OTP (Gupshup BSP)
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-100 dark:border-surface-800/60">
                <span className="text-surface-500">Business Verification</span>
                <span className="font-bold text-surface-800 dark:text-surface-200 flex items-center gap-1">
                  <ShieldCheckIcon className="w-4 h-4 text-primary-500" />
                  {isTruckOwner
                    ? profile?.verification?.fleetStatus || 'Pending'
                    : 'Active Cargo Shipper'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-surface-500">GST / Tax Registration</span>
                <span className="text-surface-400 italic">
                  Recorded per E-Way Bill on active consignments
                </span>
              </div>
            </div>
          </div>

          {/* Role-Specific Stats & Context Card */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200/90 dark:border-surface-800 p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
              <div className="flex items-center gap-2">
                {isTruckOwner ? (
                  <TruckIcon className="w-5 h-5 text-blue-500" />
                ) : (
                  <ArchiveBoxIcon className="w-5 h-5 text-primary-500" />
                )}
                <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
                  {isTruckOwner ? 'Fleet Portfolio Overview' : 'Shipper Volume & Activity'}
                </h2>
              </div>
              <Link
                href={isTruckOwner ? '/dashboard/truck-owner' : '/my-loads'}
                className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {isTruckOwner ? (
                <>
                  <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-100 dark:border-surface-700">
                    <span className="text-[11px] text-surface-400 block">Registered Trucks</span>
                    <span className="text-xl font-black text-surface-900 dark:text-white">
                      {profile?.stats?.totalTrucks || 0}
                    </span>
                  </div>
                  <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-100 dark:border-surface-700">
                    <span className="text-[11px] text-surface-400 block">Completed Trips</span>
                    <span className="text-xl font-black text-surface-900 dark:text-white">
                      {profile?.stats?.totalBookings || 0}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-100 dark:border-surface-700">
                    <span className="text-[11px] text-surface-400 block">Posted Loads</span>
                    <span className="text-xl font-black text-surface-900 dark:text-white">
                      {profile?.stats?.totalLoads || 0}
                    </span>
                  </div>
                  <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-100 dark:border-surface-700">
                    <span className="text-[11px] text-surface-400 block">Active Bookings</span>
                    <span className="text-xl font-black text-surface-900 dark:text-white">
                      {profile?.stats?.totalBookings || 0}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Direct Transporter Pass / Subscription Widget */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary-500/10 to-amber-500/10 border border-primary-200/60 dark:border-primary-900/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-surface-900 dark:text-white block">
                  Transporter Contact Pass
                </span>
                <span className="text-[11px] text-surface-500 dark:text-surface-400">
                  {profile?.subscription?.isActive
                    ? `Active Plan (${profile.subscription.plan})`
                    : 'Unlimited direct driver phone & WhatsApp reveal'}
                </span>
              </div>
              <Link
                href="/subscribe"
                className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors"
              >
                {profile?.subscription?.isActive ? 'Manage' : 'Upgrade'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
