import { redirect } from 'next/navigation'

/**
 * Legacy dashboard route kept only as a redirect to the canonical route.
 * Canonical: /dashboard/truck-driver
 */
export default function LegacyTruckOwnerDashboardPage() {
  redirect('/dashboard/truck-driver')
}
