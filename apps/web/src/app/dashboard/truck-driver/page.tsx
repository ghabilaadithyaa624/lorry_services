'use client'

import React from 'react'
import { UnifiedDashboard } from '@/components/dashboard/UnifiedDashboard'

export default function TruckDriverDashboardPage() {
  return <UnifiedDashboard roleOverride="truck_driver" />
}
