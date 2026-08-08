'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi, setAuthCookies } from '@/lib/api'

function RoleSelectForm() {
  const [selectedRole, setSelectedRole] = useState<'load_owner' | 'truck_owner' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const phone = searchParams.get('phone')
  const otp = searchParams.get('otp')

  useEffect(() => {
    // Redirect if missing params
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

      // Store tokens
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))

      // Set cookies for middleware
      setAuthCookies(accessToken, user.role)

      // Redirect based on role
      if (user.role === 'load_owner') {
        router.push('/dashboard/load-owner')
      } else {
        router.push('/dashboard/truck-owner')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  if (!phone || !otp) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome to LorryCarry!
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Select how you'll use the platform
          </p>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {/* Load Owner Option */}
          <button
            type="button"
            onClick={() => setSelectedRole('load_owner')}
            className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
              selectedRole === 'load_owner'
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
            }`}
          >
            <div className="text-3xl mb-2">📦</div>
            <div className="font-bold text-gray-900 dark:text-white text-lg">
              I Need a Truck
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              I have goods to transport and need to find verified trucks
            </div>
          </button>

          {/* Truck Owner Option */}
          <button
            type="button"
            onClick={() => setSelectedRole('truck_owner')}
            className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
              selectedRole === 'truck_owner'
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
            }`}
          >
            <div className="text-3xl mb-2">🚛</div>
            <div className="font-bold text-gray-900 dark:text-white text-lg">
              I Have a Truck
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              I own trucks and want to find loads to avoid empty runs
            </div>
          </button>
        </div>

        <button
          type="button"
          disabled={!selectedRole || loading}
          onClick={handleSubmit}
          className="mt-6 w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating Account...' : 'Continue'}
        </button>

        <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
          You can't change this later. Choose carefully.
        </p>
      </div>
    </div>
  )
}

export default function RoleSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    }>
      <RoleSelectForm />
    </Suspense>
  )
}
