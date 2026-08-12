'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { TruckIcon, ArrowPathIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App Router Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-background-dark flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative text-center">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 space-y-6">
        <div className="inline-flex items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-white shadow-sm">
            <TruckIcon className="w-7 h-7 stroke-[2.2]" />
          </div>
          <span className="text-2xl font-black tracking-tight text-surface-900 dark:text-white leading-none">
            Lorry<span className="text-primary-500">Carry</span>
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => reset()}
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
          >
            Try Again
          </Button>

          <Link href="/">
            <Button variant="primary" size="md" leftIcon={<ArrowLeftIcon className="w-4 h-4" />}>
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
