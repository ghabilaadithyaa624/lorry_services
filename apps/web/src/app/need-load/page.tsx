'use client'

import React from 'react'
import { DashboardLayout } from '@/components/layout'
import { NeedLoadForm } from '@/components/forms/NeedLoadForm'

export default function NeedLoadPage() {
  return (
    <DashboardLayout title="Need load">
      <NeedLoadForm />
    </DashboardLayout>
  )
}
