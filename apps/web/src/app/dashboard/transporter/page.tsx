'use client'

import React from 'react'
import { UnifiedDashboard } from '@/components/dashboard/UnifiedDashboard'

/**
 * Both-sides workspace for transporters: freight postings and truck listings
 * in one dashboard (mirrors the API RBAC added for the `transporter` role).
 */
export default function TransporterDashboardPage() {
  return <UnifiedDashboard roleOverride="transporter" />
}
