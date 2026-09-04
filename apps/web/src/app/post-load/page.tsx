'use client'

import React from 'react'
import { DashboardLayout } from '@/components/layout'
import { NeedLoadForm } from '@/components/forms/NeedLoadForm'

/** Backwards-compatible route for the global Post freight action. */
export default function PostLoadPage() {
  return (
    <DashboardLayout title="Need load">
      <NeedLoadForm />
    </DashboardLayout>
  )
}
