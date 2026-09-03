'use client'

import React from 'react'
import { UnifiedDashboard } from '@/components/dashboard/UnifiedDashboard'

/** Vehicle-side dashboard for individual driver registrations. */
export default function DriverDashboardPage() {
  return <UnifiedDashboard roleOverride="driver" />
}
