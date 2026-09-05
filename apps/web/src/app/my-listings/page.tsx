'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { usersApi } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import { MyListingsWorkspace } from '@/components/dashboard/MyListingsWorkspace'

/**
 * /my-listings — unified "My Listings" workspace.
 *
 * Transporters see both of their marketplace sides here (freight posts and
 * truck posts) behind tabs; factory owners and truck drivers land on their own
 * side with an onboarding CTA on the other (role gating lives in
 * `getListingsAccess` and renders inside `MyListingsWorkspace`). The route is
 * authenticated via the default-deny middleware — no role redirect, because
 * both tabs are meaningful for every operator role.
 */
interface SessionUser {
  id?: string
  name?: string
  role?: string
}

function MyListingsContent() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // Ignore malformed local state; the API profile below is the source of truth.
    }

    // Resolve id + role from the server so tab gating and the ownership gate
    // still work when the cached session predates either field.
    usersApi
      .getProfile()
      .then((res) => {
        const profile = res.data
        setUser((prev) => ({
          ...prev,
          id: profile?.id ?? prev?.id,
          role: profile?.role ?? prev?.role,
        }))
      })
      .catch(() => {
        // Keep whatever the local session provided.
      })
      .finally(() => setResolved(true))
  }, [])

  return (
    <DashboardLayout
      title="My listings"
      subtitle="Both sides of your account in one place — freight posts and truck listings, with lifecycle status, Vahan verification, and edit/delete for the records you own."
    >
      <Suspense
        fallback={
          <div className="space-y-4" aria-busy="true" aria-label="Loading listings workspace">
            <div className="h-10 w-72 rounded-lg bg-sunken animate-pulse" />
            <div className="h-40 rounded-card bg-panel border border-hairline animate-pulse" />
            <div className="h-40 rounded-card bg-panel border border-hairline animate-pulse" />
          </div>
        }
      >
        <MyListingsWorkspace role={user?.role} currentUserId={user?.id ?? null} resolved={resolved} />
      </Suspense>
    </DashboardLayout>
  )
}

export default function MyListingsPage() {
  return <MyListingsContent />
}
