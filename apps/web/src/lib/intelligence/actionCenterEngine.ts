/**
 * LorryCarry Logistics Intelligence — Operational Action Center Engine
 * Derives actionable operational notifications directly from real database states.
 */

export interface OperationalTask {
  id: string
  title: string
  description: string
  category: 'COMPLIANCE' | 'PAYMENT' | 'DISPATCH' | 'COMMERCIAL'
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  actionUrl: string
  actionLabel: string
}

export function deriveOperationalTasks(params: {
  userRole: 'load_owner' | 'truck_owner' | 'admin'
  loads?: Array<{ id: string; status: string; tonnageRequired: number; loadingAddress: string }>
  trucks?: Array<{ id: string; registrationNumber: string; verificationStatus: string; documents?: any[] }>
  bookings?: Array<{ id: string; status: string; advanceConfirmed: boolean; balanceConfirmed: boolean; agreedPrice: number }>
  hasSubscription?: boolean
}): OperationalTask[] {
  const tasks: OperationalTask[] = []

  // 1. Subscription check for marketplace contact reveals
  if (params.hasSubscription === false) {
    tasks.push({
      id: 'sub-upgrade',
      title: 'Direct Transporter Pass Required',
      description: 'Subscribe to unlock direct phone and WhatsApp contact with verified transporters across India.',
      category: 'COMMERCIAL',
      urgency: 'MEDIUM',
      actionUrl: '/subscribe',
      actionLabel: 'Unlock Direct Access',
    })
  }

  // 2. Truck Owner Compliance Tasks
  if (params.userRole === 'truck_owner' && params.trucks) {
    params.trucks.forEach((truck) => {
      if (truck.verificationStatus === 'Pending') {
        tasks.push({
          id: `kyc-pending-${truck.id}`,
          title: `RC Verification Pending: ${truck.registrationNumber}`,
          description: 'Upload your clear RC copy and Insurance certificate to activate direct marketplace matching.',
          category: 'COMPLIANCE',
          urgency: 'HIGH',
          actionUrl: `/dashboard/truck-owner`,
          actionLabel: 'Upload Documents',
        })
      }
    })
  }

  // 3. Load Owner Booking & Dispatch Tasks
  if (params.userRole === 'load_owner' && params.bookings) {
    params.bookings.forEach((booking) => {
      if (!booking.advanceConfirmed && booking.status !== 'Cancelled') {
        tasks.push({
          id: `advance-pending-${booking.id}`,
          title: `Loading Advance Due: ₹${Math.round(Number(booking.agreedPrice) * 0.5).toLocaleString('en-IN')}`,
          description: 'Confirm standard 50% loading advance release to authorize transporter dispatch.',
          category: 'PAYMENT',
          urgency: 'HIGH',
          actionUrl: `/booking/${booking.id}`,
          actionLabel: 'Confirm Advance',
        })
      }
    })
  }

  // 4. Open Unmatched Loads Reminder
  if (params.userRole === 'load_owner' && params.loads) {
    const openLoads = params.loads.filter(l => l.status === 'Open')
    if (openLoads.length > 0) {
      tasks.push({
        id: 'open-loads-match',
        title: `${openLoads.length} Active Freight Requirements`,
        description: 'Matching trucks are available within your loading corridor. Review quotes and contact drivers directly.',
        category: 'DISPATCH',
        urgency: 'LOW',
        actionUrl: '/search?type=truck',
        actionLabel: 'Search Available Lorries',
      })
    }
  }

  return tasks
}
