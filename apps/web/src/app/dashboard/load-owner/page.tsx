'use client'

import React from 'react'
import { UnifiedDashboard } from '@/components/dashboard/UnifiedDashboard'

export default function LoadOwnerDashboardPage() {
  return <UnifiedDashboard roleOverride="load_owner" />
}
