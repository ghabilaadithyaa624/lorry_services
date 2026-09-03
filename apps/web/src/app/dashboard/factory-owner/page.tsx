'use client'

import React from 'react'
import { UnifiedDashboard } from '@/components/dashboard/UnifiedDashboard'

export default function FactoryOwnerDashboardPage() {
  return <UnifiedDashboard roleOverride="factory_owner" />
}
