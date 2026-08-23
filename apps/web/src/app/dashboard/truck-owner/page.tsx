'use client'

import React from 'react'
import { UnifiedDashboard } from '@/components/dashboard/UnifiedDashboard'

export default function TruckOwnerDashboardPage() {
  return <UnifiedDashboard roleOverride="truck_owner" />
}
