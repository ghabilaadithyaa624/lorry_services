'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  TruckIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { authApi, setAuthCookies } from '@/lib/api'
import { Button, Badge, Spinner } from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

function RoleSelectForm() {
  const [selectedRole, setSelectedRole] = useState<'load_owner' | 'truck_owner' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const phone = searchParams.get('phone')
  const otp = searchParams.get('otp')
  const redirect = searchParams.get('redirect') || '/'

  useEffect(() => {
    if (!phone || !otp) {
      router.push('/login')
    }
  }, [phone, otp, router])

  const handleSubmit = async () => {
    if (!selectedRole || !phone || !otp) return

    setLoading(true)
    setError('')

    try {
      const response = await authApi.verifyOtp(phone, otp, selectedRole)
      const { accessToken, refreshToken, user } = response.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))

      setAuthCookies(accessToken, user.role)
      toast.success(`Account created as ${user.role === 'truck_owner' ? 'Truck Owner' : 'Load Owner'}!`)

      if (redirect && redirect !== '/') {
        if (redirect.startsWith('/admin')) {
          if (user.role === 'admin') {
            router.push(redirect)
          } else {
            const fallback = user.role === 'truck_owner' ? '/dashboard/truck-owner' : '/dashboard/load-owner'
            router.push(fallback)
          }
        } else {
          router.push(redirect)
        }
      } else if (user.role === 'load_owner') {
        router.push('/dashboard/load-owner')
      } else {
        router.push('/dashboard/truck-owner')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to complete registration. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!phone || !otp) return null

  return (
    <div className="min-h-screen bg-canvas text-surface-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center text-white shadow-sm">
              <TruckIcon className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-ink leading-none">
              Lorry<span className="text-primary-500">Carry</span>
            </span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight pt-2">
            Choose Your Account Type
          </h1>
          <p className="text-xs sm:text-sm text-subtle">
            Tell us how you intend to use LorryCarry to customize your marketplace experience.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/60 text-danger-700 dark:text-danger-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Load Owner Option */}
          <button
            type="button"
            onClick={() => setSelectedRole('load_owner')}
            className={cn(
              'p-6 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between space-y-4 cursor-pointer',
              selectedRole === 'load_owner'
                ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/30 shadow-card'
                : 'border-hairline bg-sunken hover:border-primary-300 dark:hover:border-primary-800'
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                  <ArchiveBoxIcon className="w-6 h-6 stroke-[2]" />
                </div>
                {selectedRole === 'load_owner' && (
                  <Badge variant="primary" size="sm">
                    Selected
                  </Badge>
                )}
              </div>

              <div>
                <h3 className="font-bold text-base text-ink">
                  I Need Trucks (Load Owner)
                </h3>
                <p className="text-xs text-subtle mt-1 leading-relaxed">
                  For manufacturers, traders, and logistics companies who have goods to transport.
                </p>
              </div>

              <ul className="text-xs text-muted space-y-1.5 pt-2 border-t border-hairline">
                <li className="flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4 text-success-500 shrink-0" />
                  <span>Post freight loads in minutes</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4 text-success-500 shrink-0" />
                  <span>Search 50km radius verified lorries</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4 text-success-500 shrink-0" />
                  <span>Zero broker commission</span>
                </li>
              </ul>
            </div>
          </button>

          {/* Truck Owner Option */}
          <button
            type="button"
            onClick={() => setSelectedRole('truck_owner')}
            className={cn(
              'p-6 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between space-y-4 cursor-pointer',
              selectedRole === 'truck_owner'
                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 shadow-card'
                : 'border-hairline bg-sunken hover:border-blue-300 dark:hover:border-blue-800'
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <TruckIcon className="w-6 h-6 stroke-[2]" />
                </div>
                {selectedRole === 'truck_owner' && (
                  <Badge variant="info" size="sm">
                    Selected
                  </Badge>
                )}
              </div>

              <div>
                <h3 className="font-bold text-base text-ink">
                  I Have Trucks (Truck Owner)
                </h3>
                <p className="text-xs text-subtle mt-1 leading-relaxed">
                  For individual truck drivers, fleet owners, and transport contractors.
                </p>
              </div>

              <ul className="text-xs text-muted space-y-1.5 pt-2 border-t border-hairline">
                <li className="flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4 text-success-500 shrink-0" />
                  <span>Avoid empty return trips</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4 text-success-500 shrink-0" />
                  <span>Direct shipper contact</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4 text-success-500 shrink-0" />
                  <span>Standard 50/50 advance terms</span>
                </li>
              </ul>
            </div>
          </button>
        </div>

        {/* Confirmation Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!selectedRole}
            onClick={handleSubmit}
            rightIcon={<ArrowRightIcon className="w-5 h-5" />}
          >
            {selectedRole
              ? `Continue as ${selectedRole === 'truck_owner' ? 'Truck Owner' : 'Load Owner'}`
              : 'Select an account type to proceed'}
          </Button>
        </div>

        <p className="text-center text-[11px] text-surface-400">
          Account role is permanent and configures your workspace dashboard.
        </p>
      </div>
    </div>
  )
}

export default function RoleSelectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-50 dark:bg-background-dark flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <RoleSelectForm />
    </Suspense>
  )
}
