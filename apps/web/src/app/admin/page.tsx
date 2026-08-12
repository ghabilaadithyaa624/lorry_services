'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui'

export default function AdminIndexPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-[#070A11] text-surface-100 flex flex-col items-center justify-center p-4 font-sans font-mono">
      <div className="flex flex-col items-center space-y-4">
        <Spinner size="lg" />
        <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">
          Navigating to Admin Command Tower...
        </p>
      </div>
    </div>
  )
}
