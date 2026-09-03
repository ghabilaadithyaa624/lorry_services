'use client'

import React from 'react'
import { DashboardLayout } from '@/components/layout'
import { NeedVehicleForm } from '@/components/forms/NeedVehicleForm'

export default function NeedVehiclePage() {
  return (
    <DashboardLayout title="Need vehicle">
      <NeedVehicleForm />
    </DashboardLayout>
  )
}
