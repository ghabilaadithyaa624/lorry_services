import { redirect } from 'next/navigation'

/**
 * Legacy dashboard route kept only as a redirect to the canonical route.
 * Canonical: /dashboard/factory-owner
 */
export default function LegacyLoadOwnerDashboardPage() {
  redirect('/dashboard/factory-owner')
}
